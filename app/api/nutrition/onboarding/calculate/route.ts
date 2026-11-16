import { NextRequest, NextResponse } from "next/server";
import { calculateNutritionTargets, OnboardingData } from "@/services/nutrition-onboarding.service";
import { safeErrorResponse } from "@/lib/api-security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OnboardingData;
    const targets = calculateNutritionTargets(body);

    return NextResponse.json({
      success: true,
      targets,
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to calculate nutrition targets", 400);
  }
}

