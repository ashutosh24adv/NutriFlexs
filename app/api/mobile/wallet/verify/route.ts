import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { verifyRazorpaySignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/wallet/verify
 * Authenticated. Verifies Razorpay payment signature,
 * increments user's passBalance (walletBalance) in Neon Postgres,
 * and returns the updated balance.
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
          error: "razorpayOrderId, razorpayPaymentId, and razorpaySignature are required",
        },
        { status: 400 }
      );
    }

    // Verify payment signature
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

    // Determine credit amount in INR
    let topupAmount = 0;
    if (typeof body.amount === "number") {
      topupAmount = body.amount;
    } else if (typeof body.amountInINR === "number") {
      topupAmount = body.amountInINR;
    } else if (typeof body.amountInPaise === "number") {
      topupAmount = body.amountInPaise / 100;
    } else if (typeof body.amount === "string" && !isNaN(parseFloat(body.amount))) {
      topupAmount = parseFloat(body.amount);
    }

    if (!topupAmount || isNaN(topupAmount) || topupAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid top-up amount greater than 0 is required" },
        { status: 400 }
      );
    }

    // Increment user passBalance in Neon Postgres
    const updatedUser = await withDbRetry(() =>
      prisma.user.update({
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
      })
    );

    return NextResponse.json({
      success: true,
      passBalance: updatedUser.passBalance,
      walletBalance: updatedUser.passBalance,
      creditedAmount: topupAmount,
      message: `Wallet successfully credited with ₹${topupAmount}`,
    });
  } catch (error: any) {
    console.error("[Wallet Verify Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify wallet payment" },
      { status: 500 }
    );
  }
}

