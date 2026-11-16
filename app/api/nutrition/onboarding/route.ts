import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getUserOnboardingStatus,
  completeOnboarding,
  saveOnboardingProgress,
} from "@/services/nutrition-onboarding.service";
import { safeErrorResponse, stripSensitiveFields } from "@/lib/api-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const status = await getUserOnboardingStatus(userId);
    if (!status) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...stripSensitiveFields(status),
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to load nutrition onboarding status", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to complete onboarding" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const result = await completeOnboarding(userId, body);

    return NextResponse.json({
      success: true,
      message: "Personalized nutrition onboarding completed successfully",
      targets: result.targets,
      goal: result.goal,
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to complete nutrition onboarding", 500);
  }
}

