import { NextRequest, NextResponse } from "next/server";
import { getGymById } from "@/services/gym.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gym = await getGymById(params.id);
    if (!gym) {
      return NextResponse.json(
        { success: false, error: "Partner gym not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      gym,
    });
  } catch (error: any) {
    console.error("Failed to fetch gym details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load gym details" },
      { status: 500 }
    );
  }
}

