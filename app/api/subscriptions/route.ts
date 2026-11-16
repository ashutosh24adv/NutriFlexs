import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionPlans } from "@/services/subscription.service";
import {
  getUserActiveSubscription,
  getUserEntitlements,
} from "@/services/subscription-entitlement.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const plans = await getSubscriptionPlans();

    let activeSubscription: any = null;
    let entitlements = null;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase().trim() },
      });

      if (user) {
        activeSubscription = await getUserActiveSubscription(user.id);
        entitlements = await getUserEntitlements(user.id);
      }
    }

    return NextResponse.json({
      success: true,
      plans,
      activeSubscription,
      entitlements,
    });
  } catch (error: any) {
    console.error("GET /api/subscriptions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load subscriptions" },
      { status: 500 }
    );
  }
}
