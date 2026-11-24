import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateWaterGoalSchema } from "@/lib/validations/nutrition.schema";
import { updateWaterGoal } from "@/services/nutrition.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  return handleUpdate(req);
}

export async function PUT(req: NextRequest) {
  return handleUpdate(req);
}

async function handleUpdate(req: NextRequest) {
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
    const parsed = updateWaterGoalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid water goal" },
        { status: 400 }
      );
    }

    const result = await updateWaterGoal(userId, parsed.data.waterGoalMl);

    return NextResponse.json({
      success: true,
      waterGoalMl: result.waterGoalMl,
    });
  } catch (error: any) {
    console.error("Error updating water goal:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update water goal" },
      { status: 500 }
    );
  }
}
