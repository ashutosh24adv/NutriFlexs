import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { migrateGuestNutritionData } from "@/services/nutrition.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to migrate guest nutrition data" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = await migrateGuestNutritionData(userId, body);

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("Guest nutrition migration error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to migrate guest nutrition data" },
      { status: 500 }
    );
  }
}
