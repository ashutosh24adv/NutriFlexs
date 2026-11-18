import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyAndCompletePayment } from "@/services/payment.service";
import { safeErrorResponse, stripSensitiveFields } from "@/lib/api-security";
import { getMobileAuthUser } from "@/lib/mobile-auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    let currentUser = session?.user as any;
    if (!currentUser) {
      const mobileUser = await getMobileAuthUser(request);
      if (mobileUser) {
        currentUser = mobileUser;
      }
    }

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Authentication required to verify payment" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const orderId = body.orderId || body.order_id;
    const razorpayOrderId = body.razorpayOrderId || body.razorpay_order_id;
    const razorpayPaymentId = body.razorpayPaymentId || body.razorpay_payment_id;
    const razorpaySignature = body.razorpaySignature || body.razorpay_signature;
    const walletUsed =
      typeof body.walletUsed === "number"
        ? body.walletUsed
        : typeof body.walletAmountUsed === "number"
        ? body.walletAmountUsed
        : undefined;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required for verification" },
        { status: 400 }
      );
    }

    // Authorization & Ownership Verification
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const currentUserId = currentUser?.id;
    const currentUserRole = currentUser?.role;
    const isOwner = Boolean(currentUserId && order.userId === currentUserId);
    const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not authorized to verify this payment" },
        { status: 403 }
      );
    }

    const finalRzpOrderId = razorpayOrderId || (process.env.NODE_ENV !== "production" ? "order_demo_1001" : "");
    const finalRzpPaymentId = razorpayPaymentId || (process.env.NODE_ENV !== "production" ? "pay_demo_1001" : "");
    const finalRzpSignature = razorpaySignature || (process.env.NODE_ENV !== "production" ? "demo_sig_valid" : "");

    const result = await verifyAndCompletePayment({
      orderId,
      razorpayOrderId: finalRzpOrderId,
      razorpayPaymentId: finalRzpPaymentId,
      razorpaySignature: finalRzpSignature,
      walletUsed,
    });

    return NextResponse.json({ success: true, ...stripSensitiveFields(result) });
  } catch (error: any) {
    return safeErrorResponse(error, "Payment verification could not be completed", 400);
  }
}
