import { NextRequest, NextResponse } from "next/server";
import { getAllActiveGyms } from "@/services/gym.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || searchParams.get("q") || undefined;
    const city = searchParams.get("city") || undefined;
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    const lat = latParam ? parseFloat(latParam) : undefined;
    const lng = lngParam ? parseFloat(lngParam) : undefined;

    const result = await getAllActiveGyms({
      search,
      city,
      lat: !isNaN(lat as number) ? lat : undefined,
      lng: !isNaN(lng as number) ? lng : undefined,
    });

    return NextResponse.json({
      success: true,
      gyms: result.gyms,
      cities: result.cities,
      total: result.total,
    });
  } catch (error: any) {
    console.error("Failed to fetch active gyms:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch partner gyms from database" },
      { status: 500 }
    );
  }
}
