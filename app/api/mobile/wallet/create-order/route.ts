import { NextRequest, NextResponse } from "next/server";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { Razorpay } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/wallet/create-order
 * Authenticated via Bearer JWT.
 * Validates top-up amount (₹100 to ₹10,000).
 * Generates Razorpay order (amount * 100 paise, INR).
 * Returns { orderId, amount, currency, keyId }.
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
    let amountInINR = 0;

    if (typeof body.amount === "number") {
      amountInINR = body.amount;
    } else if (typeof body.amountInINR === "number") {
      amountInINR = body.amountInINR;
    } else if (typeof body.amountInPaise === "number") {
      amountInINR = body.amountInPaise / 100;
    } else if (typeof body.amount === "string" && !isNaN(parseFloat(body.amount))) {
      amountInINR = parseFloat(body.amount);
    }

    // Validate amount: strictly ₹100 to ₹10,000
    if (!amountInINR || isNaN(amountInINR) || amountInINR < 100 || amountInINR > 10000) {
      return NextResponse.json(
        {
          success: false,
          error: "Top-up amount must be between ₹100 and ₹10,000",
        },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_nutriflexs_demo";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "demo_secret";
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const amountInPaise = Math.round(amountInINR * 100);
    const receipt = `topup_${authUser.id.slice(0, 8)}_${Date.now()}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        userId: authUser.id,
        purpose: "WALLET_TOPUP",
      },
    });

    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // in paise
      amountInINR,
      currency: "INR",
      keyId,
      key: keyId,
    });
  } catch (error: any) {
    console.error("[Wallet Create-Order Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create wallet top-up order" },
      { status: 500 }
    );
  }
}
