import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveOnboardingProgress } from "@/services/nutrition-onboarding.service";
import { safeErrorResponse } from "@/lib/api-security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const step = Number(body.step) || 1;
    const partialData = body.data || {};

    const updatedUser = await saveOnboardingProgress(userId, step, partialData);

    return NextResponse.json({
      success: true,
      currentStep: updatedUser.nutritionOnboardingStep,
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to save onboarding progress", 500);
  }
}

