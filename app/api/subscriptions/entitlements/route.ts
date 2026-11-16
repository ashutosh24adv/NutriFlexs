import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserEntitlements } from "@/services/subscription-entitlement.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({
        success: true,
        entitlements: {
          hasActiveSubscription: false,
          planType: null,
          status: "FREE",
          canAccessFoodDiscount: false,
          foodDiscountPercent: 0,
          canAccessAiScan: false,
          aiScanAllowance: 0,
          aiScansUsed: 0,
          aiScansRemaining: 0,
          canAccessAdvancedInsights: false,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        entitlements: {
          hasActiveSubscription: false,
          planType: null,
          status: "FREE",
          canAccessFoodDiscount: false,
          foodDiscountPercent: 0,
          canAccessAiScan: false,
          aiScanAllowance: 0,
          aiScansUsed: 0,
          aiScansRemaining: 0,
          canAccessAdvancedInsights: false,
        },
      });
    }

    const entitlements = await getUserEntitlements(user.id);
    return NextResponse.json({ success: true, entitlements });
  } catch (error: any) {
    console.error("GET /api/subscriptions/entitlements error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load entitlements" },
      { status: 500 }
    );
  }
}
