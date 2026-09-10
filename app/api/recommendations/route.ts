import { NextResponse } from "next/server";
import { getRecommendations } from "@/services/recommendation.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const heightCm = Number(body.heightCm);
    const weightKg = Number(body.weightKg);

    if (
      !heightCm ||
      !weightKg ||
      isNaN(heightCm) ||
      isNaN(weightKg) ||
      heightCm <= 0 ||
      weightKg <= 0
    ) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid height and weight." },
        { status: 400 }
      );
    }

    const data = await getRecommendations(heightCm, weightKg);
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to calculate recommendations.",
      },
      { status: 400 }
    );
  }
}
