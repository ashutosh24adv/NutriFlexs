import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logSavedMeal } from "@/services/nutrition.service";
import { MealType } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to log saved meals" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const mealType = body.mealType as MealType;
    const dateKey = body.dateKey as string;

    if (!mealType || !["BREAKFAST", "LUNCH", "SNACKS", "DINNER"].includes(mealType)) {
      return NextResponse.json(
        { success: false, error: "Valid meal type is required (BREAKFAST, LUNCH, SNACKS, DINNER)" },
        { status: 400 }
      );
    }
    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return NextResponse.json(
        { success: false, error: "Valid dateKey format (YYYY-MM-DD) is required" },
        { status: 400 }
      );
    }

    const result = await logSavedMeal(userId, params.id, mealType, dateKey);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error logging saved meal:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to log saved meal" },
      { status: 500 }
    );
  }
}
