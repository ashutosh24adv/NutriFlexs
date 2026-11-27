import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/wallet/verify
 * Authenticated via Bearer JWT.
 * Verifies razorpay_order_id, razorpay_payment_id, razorpay_signature using HMAC-SHA256 (RAZORPAY_KEY_SECRET).
 * Atomically increments user.passBalance in Neon Postgres.
 * Returns { walletBalance: updatedUser.passBalance }.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const razorpayOrderId = body.razorpay_order_id || body.razorpayOrderId;
    const razorpayPaymentId = body.razorpay_payment_id || body.razorpayPaymentId;
    const razorpaySignature = body.razorpay_signature || body.razorpaySignature;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        {
          success: false,
          error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
        },
        { status: 400 }
      );
    }

    // Verify payment signature using HMAC-SHA256 with RAZORPAY_KEY_SECRET
    const isValid = verifyRazorpaySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Determine authoritative top-up amount from Razorpay (never trust client-supplied amounts in production)
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const hasLiveRazorpay = Boolean(
      keyId && keySecret && keySecret !== "demo_secret" && !keyId.includes("demo")
    );

    if (process.env.NODE_ENV === "production" && !hasLiveRazorpay) {
      return NextResponse.json(
        { success: false, error: "Payment verification is not configured on this server" },
        { status: 503 }
      );
    }

    let topupAmount = 0;
    if (hasLiveRazorpay) {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpRes = await fetch(
        `https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpayOrderId)}`,
        {
          headers: { Authorization: `Basic ${authHeader}` },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!rzpRes.ok) {
        return NextResponse.json(
          { success: false, error: "Unable to verify Razorpay order details" },
          { status: 400 }
        );
      }
      const rzpOrder = await rzpRes.json();
      if (rzpOrder?.notes?.userId && rzpOrder.notes.userId !== authUser.id) {
        return NextResponse.json(
          { success: false, error: "Forbidden: Razorpay order belongs to another user" },
          { status: 403 }
        );
      }
      if (rzpOrder?.status !== "paid" && (rzpOrder?.amount_paid || 0) < (rzpOrder?.amount || 0)) {
        return NextResponse.json(
          { success: false, error: "Payment has not been captured by Razorpay" },
          { status: 400 }
        );
      }
      topupAmount = Math.round(Number(rzpOrder.amount) || 0) / 100;
    } else {
      // Non-production demo mode fallback: strictly clamped to [100, 10000]
      if (typeof body.amount === "number") {
        topupAmount = body.amount;
      } else if (typeof body.amountInINR === "number") {
        topupAmount = body.amountInINR;
      } else if (typeof body.amountInPaise === "number") {
        topupAmount = body.amountInPaise / 100;
      } else if (typeof body.amount === "string" && !isNaN(parseFloat(body.amount))) {
        topupAmount = parseFloat(body.amount);
      }
    }

    if (!topupAmount || isNaN(topupAmount) || topupAmount < 100 || topupAmount > 10000) {
      return NextResponse.json(
        { success: false, error: "Valid top-up amount between ₹100 and ₹10,000 is required" },
        { status: 400 }
      );
    }

    // Atomically prevent replay attacks & credit user passBalance in Neon Postgres
    const txResult = await withDbRetry(() =>
      prisma.$transaction(async (tx) => {
        const alreadyProcessed = await tx.subscriptionAuditLog.findFirst({
          where: {
            targetType: "WALLET_TOPUP",
            targetId: razorpayPaymentId,
          },
          select: { id: true },
        });

        if (alreadyProcessed) {
          const existingUser = await tx.user.findUniqueOrThrow({
            where: { id: authUser.id },
            select: { id: true, name: true, email: true, passBalance: true },
          });
          return { user: existingUser, replayed: true };
        }

        await tx.subscriptionAuditLog.create({
          data: {
            action: "WALLET_TOPUP_VERIFIED",
            performedBy: authUser.id,
            targetType: "WALLET_TOPUP",
            targetId: razorpayPaymentId,
            details: JSON.stringify({ razorpayOrderId, topupAmount }),
          },
        });

        const creditedUser = await tx.user.update({
          where: { id: authUser.id },
          data: {
            passBalance: {
              increment: topupAmount,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            passBalance: true,
          },
        });

        return { user: creditedUser, replayed: false };
      })
    );

    const updatedUser = txResult.user;

    return NextResponse.json({
      success: true,
      walletBalance: updatedUser.passBalance,
      passBalance: updatedUser.passBalance,
      creditedAmount: txResult.replayed ? 0 : topupAmount,
      message: txResult.replayed
        ? "Payment already processed"
        : `Wallet successfully credited with ₹${topupAmount}`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        passBalance: updatedUser.passBalance,
      },
    });
  } catch (error: any) {
    console.error("[Wallet Verify Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify wallet payment" },
      { status: 500 }
    );
  }
}
