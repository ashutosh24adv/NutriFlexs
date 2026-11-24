import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTrainerReferralDetail } from "@/services/referral.service";
import { stripSensitiveFields, safeErrorResponse } from "@/lib/api-security";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (
      !session ||
      !userId ||
      (userRole !== "TRAINER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Trainer role required." },
        { status: 403 }
      );
    }

    const result = await getTrainerReferralDetail(userId, params.id);
    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success: true,
      detail: stripSensitiveFields(result.detail),
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to load referral detail", 500);
  }
}
