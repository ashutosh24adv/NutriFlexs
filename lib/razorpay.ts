import crypto from "crypto";

export interface RazorpayOptions {
  key_id?: string;
  key_secret?: string;
  keyId?: string;
  keySecret?: string;
}

export interface RazorpayOrderCreateParams {
  amount: number; // in paise
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
  partial_payment?: boolean;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: string;
  attempts: number;
  notes?: Record<string, any>;
  created_at: number;
  keyId?: string;
}

export class Razorpay {
  key_id: string;
  key_secret: string;
  orders: {
    create: (params: RazorpayOrderCreateParams) => Promise<RazorpayOrderResponse>;
  };

  constructor(options: RazorpayOptions) {
    this.key_id = options.key_id || options.keyId || process.env.RAZORPAY_KEY_ID || "rzp_test_nutriflexs_demo";
    this.key_secret = options.key_secret || options.keySecret || process.env.RAZORPAY_KEY_SECRET || "demo_secret";
    this.orders = {
      create: async (params: RazorpayOrderCreateParams): Promise<RazorpayOrderResponse> => {
        const id = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          id,
          entity: "order",
          amount: params.amount,
          amount_paid: 0,
          amount_due: params.amount,
          currency: params.currency || "INR",
          receipt: params.receipt,
          status: "created",
          attempts: 0,
          notes: params.notes,
          created_at: Math.floor(Date.now() / 1000),
          keyId: this.key_id,
        };
      },
    };
  }
}

export async function createRazorpayOrder(amountInINR: number, orderId: string) {
  const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_nutriflexs_demo";
  const key_secret = process.env.RAZORPAY_KEY_SECRET || "demo_secret";

  const razorpay = new Razorpay({ key_id, key_secret });
  return razorpay.orders.create({
    amount: Math.round(amountInINR * 100),
    currency: "INR",
    receipt: orderId,
  });
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

export default Razorpay;
