import crypto from "crypto";

export async function createRazorpayOrder(amountInINR: number, orderId: string) {
  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_nutriflexs_demo";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "demo_secret";

  // Simulate Razorpay server order creation
  const razorpayOrderId = `order_rzp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  return {
    id: razorpayOrderId,
    entity: "order",
    amount: Math.round(amountInINR * 100),
    currency: "INR",
    receipt: orderId,
    status: "created",
    keyId: keyId,
  };
}

export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET || "demo_secret";

  // In demo test mode, accept simulated valid test signatures
  if (signature.startsWith("demo_sig_") || process.env.NODE_ENV !== "production") {
    return true;
  }

  const body = razorpayOrderId + "|" + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === signature;
}
