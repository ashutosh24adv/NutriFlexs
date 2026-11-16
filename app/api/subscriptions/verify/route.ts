import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyAndActivateSubscription } from "@/services/subscription.service";
import { z } from "zod";

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required to verify subscription payment" },
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
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid payment payload" },
        { status: 400 }
      );
    }

    const result = await verifyAndActivateSubscription({
      userId: user.id,
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/subscriptions/verify error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify and activate subscription" },
      { status: 400 }
    );
  }
}
