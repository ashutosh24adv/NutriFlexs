import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getNearbyGyms } from "@/services/gym.service";

export const dynamic = "force-dynamic";


const querySchema = z.object({
  lat: z.coerce
    .number()
    .finite("Latitude must be a valid number")
    .min(-90, "Latitude must be >= -90")
    .max(90, "Latitude must be <= 90"),
  lng: z.coerce
    .number()
    .finite("Longitude must be a valid number")
    .min(-180, "Longitude must be >= -180")
    .max(180, "Longitude must be <= 180"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    const parsed = querySchema.safeParse({ lat: latParam, lng: lngParam });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or missing coordinates (lat, lng)",
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const { lat, lng } = parsed.data;
    const gyms = await getNearbyGyms(lat, lng);

    return NextResponse.json({
      success: true,
      gyms,
    });
  } catch (error: any) {
    console.error("Failed to fetch nearby gyms:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to find nearby gyms" },
      { status: 500 }
    );
  }
}
