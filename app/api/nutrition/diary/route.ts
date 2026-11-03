import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDailyNutritionDiary, getLocalDateKey } from "@/services/nutrition.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const timeZone = searchParams.get("timeZone") || "Asia/Kolkata";
    const dateKey = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getLocalDateKey(timeZone);

    const diary = await getDailyNutritionDiary(userId, dateKey);

    return NextResponse.json({
      success: true,
      diary,
    });
  } catch (error: any) {
    console.error("Error fetching daily nutrition diary:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch nutrition diary" },
      { status: 500 }
    );
  }
}

