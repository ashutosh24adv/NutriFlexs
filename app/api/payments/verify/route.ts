import { NextResponse } from "next/server";
import { verifyAndCompletePayment } from "@/services/payment.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    const result = await verifyAndCompletePayment({
      orderId,
      razorpayOrderId: razorpayOrderId || "order_demo_1001",
      razorpayPaymentId: razorpayPaymentId || "pay_demo_1001",
      razorpaySignature: razorpaySignature || "demo_sig_valid",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
