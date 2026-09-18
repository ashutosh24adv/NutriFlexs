import { NextRequest, NextResponse } from "next/server";
import { getAllActiveGyms } from "@/services/gym.service";

export const dynamic = "force-dynamic";


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;

    const gyms = await getAllActiveGyms(search);
    return NextResponse.json({ success: true, gyms });
  } catch (error: any) {
    console.error("Failed to fetch active gyms:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch gyms" },
      { status: 500 }
    );
  }
}
