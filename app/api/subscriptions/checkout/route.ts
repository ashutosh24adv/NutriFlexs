import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSubscriptionCheckout } from "@/services/subscription.service";
import { z } from "zod";

const checkoutSchema = z.object({
  planId: z.string().uuid("Invalid plan ID format"),
  billingPeriod: z.enum(["MONTHLY", "QUARTERLY", "ANNUAL"]).default("MONTHLY"),
  idempotencyKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required to purchase a NutriFlexs Pass" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Customer account not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid checkout payload" },
        { status: 400 }
      );
    }

    const checkout = await createSubscriptionCheckout({
      userId: user.id,
      planId: parsed.data.planId,
      billingPeriod: parsed.data.billingPeriod,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    return NextResponse.json(checkout);
  } catch (error: any) {
    console.error("POST /api/subscriptions/checkout error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initialize subscription checkout" },
      { status: 500 }
    );
  }
}
