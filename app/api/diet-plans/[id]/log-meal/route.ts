import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logDietPlanMealToTracker } from "@/services/dietitian.service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Please sign in to log meals to your Food Diary." },
      { status: 401 }
    );
  }

  const customerId = (session.user as any).id;

  try {
    let mealId: string | undefined;
    try {
      const body = await req.json();
      mealId = body.mealId;
    } catch {
      // Body was omitted or not valid JSON
    }

    if (!mealId) {
      mealId = params.id;
    }

    if (!mealId) {
      return NextResponse.json(
        { success: false, error: "mealId is required." },
        { status: 400 }
      );
    }

    const foodLog = await logDietPlanMealToTracker(mealId, customerId);

    return NextResponse.json({
      success: true,
      foodLog,
      message: `Successfully logged "${foodLog.foodNameSnapshot}" (${foodLog.calories} kcal) to today's Food Diary!`,
    });
  } catch (error: any) {
    console.error("[API /api/diet-plans/[id]/log-meal] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to log meal to Nutrition Tracker." },
      { status: 400 }
    );
  }
}
