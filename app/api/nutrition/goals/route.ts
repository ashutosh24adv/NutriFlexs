import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateNutritionGoalSchema } from "@/lib/validations/nutrition.schema";
import { getNutritionGoals, upsertNutritionGoals } from "@/services/nutrition.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const goals = await getNutritionGoals(userId);
    return NextResponse.json({
      success: true,
      goals,
    });
  } catch (error: any) {
    console.error("Error fetching nutrition goals:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch nutrition goals" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = updateNutritionGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid goals data" },
        { status: 400 }
      );
    }

    const updated = await upsertNutritionGoals(userId, parsed.data);
    return NextResponse.json({
      success: true,
      goals: updated,
    });
  } catch (error: any) {
    console.error("Error updating nutrition goals:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update nutrition goals" },
      { status: 500 }
    );
  }
}

