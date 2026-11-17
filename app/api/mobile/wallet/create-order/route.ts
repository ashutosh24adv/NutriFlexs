import { NextRequest, NextResponse } from "next/server";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { Razorpay } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/wallet/create-order
 * Authenticated. Generates a Razorpay order for wallet top-up.
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

    if (!amountInINR || isNaN(amountInINR) || amountInINR <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid top-up amount greater than 0 is required" },
        { status: 400 }
      );
    }

    const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_nutriflexs_demo";
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "demo_secret";
    const razorpay = new Razorpay({ key_id, key_secret });

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
      amount: razorpayOrder.amount,
      amountInPaise: razorpayOrder.amount,
      amountInINR: amountInINR,
      currency: "INR",
      key: key_id,
      keyId: key_id,
    });
  } catch (error: any) {
    console.error("[Wallet Create-Order Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create wallet top-up order" },
      { status: 500 }
    );
  }
}

