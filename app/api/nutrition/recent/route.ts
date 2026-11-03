import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecentFoods } from "@/services/nutrition.service";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ success: true, recents: [] });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const recents = await getRecentFoods(userId, limit);

    return NextResponse.json({
      success: true,
      recents,
    });
  } catch (error: any) {
    console.error("Error fetching recent foods:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load recent foods" },
      { status: 500 }
    );
  }
}

