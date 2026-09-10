import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getUserNutritionGoal,
  updateUserWeight,
  updateUserCustomGoal,
} from "@/services/nutrition-goal.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: true, user: null, data: null },
        { status: 200 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: true, user: null, data: null },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const timeZone = searchParams.get("timeZone") || "Asia/Kolkata";
    const dateStr = searchParams.get("date") || undefined;

    const nutritionData = await getUserNutritionGoal(user.id, timeZone, dateStr);

    return NextResponse.json({
      success: true,
      data: nutritionData,
    });
  } catch (error: any) {
    console.error("Error fetching nutrition goal:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch nutrition goal" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action, weightKg, customDailyProteinGoal, proteinGoal, timeZone } = body;

    if (action === "set_weight" || typeof weightKg === "number" || (typeof weightKg === "string" && !isNaN(Number(weightKg)))) {
      const numWeight = Number(weightKg);
      if (isNaN(numWeight) || numWeight <= 0 || numWeight > 500) {
        return NextResponse.json(
          { success: false, error: "Please enter a valid positive weight in kg." },
          { status: 400 }
        );
      }
      await updateUserWeight(user.id, numWeight);
    } else if (
      action === "set_goal" ||
      typeof customDailyProteinGoal === "number" ||
      typeof proteinGoal === "number" ||
      (typeof customDailyProteinGoal === "string" && !isNaN(Number(customDailyProteinGoal))) ||
      (typeof proteinGoal === "string" && !isNaN(Number(proteinGoal)))
    ) {
      const targetGoal = Number(customDailyProteinGoal ?? proteinGoal);
      if (isNaN(targetGoal) || targetGoal <= 0 || targetGoal > 600) {
        return NextResponse.json(
          { success: false, error: "Please enter a valid positive daily protein target in grams." },
          { status: 400 }
        );
      }
      await updateUserCustomGoal(user.id, targetGoal);
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action or payload. Specify weightKg or customDailyProteinGoal." },
        { status: 400 }
      );
    }

    const updatedData = await getUserNutritionGoal(
      user.id,
      timeZone || "Asia/Kolkata"
    );

    return NextResponse.json({
      success: true,
      data: updatedData,
      message: "Nutrition goal updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating nutrition goal:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update nutrition goal" },
      { status: 500 }
    );
  }
}
