import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { OrderStatus, PaymentStatus } from "@/types/enums";
import { processTrainerReferralOnPaymentSuccess } from "@/services/referral.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/orders/verify
 * Authenticated via Bearer JWT.
 * Verifies Razorpay payment signature for an order.
 * In a Prisma transaction:
 * - Atomically deducts walletUsed (if partial wallet was applied) from user.passBalance
 * - Confirms order (status CONFIRMED, paymentStatus PAID)
 * - Marks payment as PAID
 * - Returns updated balance and confirmed order
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

    const orderId = body.orderId || body.order_id;
    const razorpayOrderId =
      body.razorpayOrderId || body.razorpay_order_id;
    const razorpayPaymentId =
      body.razorpayPaymentId || body.razorpay_payment_id;
    const razorpaySignature =
      body.razorpaySignature || body.razorpay_signature;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId is required" },
        { status: 400 }
      );
    }

    // 1. Fetch existing order and payment state
    const existingOrder = await withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              passBalance: true,
            },
          },
          payment: true,
        },
      })
    );

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Ownership check if authUser present
    if (authUser && existingOrder.userId !== authUser.id && authUser.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not own this order" },
        { status: 403 }
      );
    }

    // Idempotency: If already marked PAID, return existing state safely
    if (existingOrder.paymentStatus === PaymentStatus.PAID) {
      const freshUser = await prisma.user.findUnique({
        where: { id: existingOrder.userId },
        select: { passBalance: true },
      });
      return NextResponse.json({
        success: true,
        order: existingOrder,
        payment: existingOrder.payment,
        walletBalance: freshUser?.passBalance || 0,
        passBalance: freshUser?.passBalance || 0,
        message: "Order already verified and paid",
      });
    }

    // Validate signature params
    const finalRzpOrderId =
      razorpayOrderId ||
      existingOrder.payment?.razorpayOrderId ||
      (process.env.NODE_ENV !== "production" ? "order_demo_1001" : "");
    const finalRzpPaymentId =
      razorpayPaymentId ||
      (process.env.NODE_ENV !== "production" ? "pay_demo_1001" : "");
    const finalRzpSignature =
      razorpaySignature ||
      (process.env.NODE_ENV !== "production" ? "demo_sig_valid" : "");

    if (!finalRzpOrderId || !finalRzpPaymentId || !finalRzpSignature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing razorpayOrderId, razorpayPaymentId, or razorpaySignature",
        },
        { status: 400 }
      );
    }

    // Cryptographic signature verification
    const isValid = verifyRazorpaySignature(
      finalRzpOrderId,
      finalRzpPaymentId,
      finalRzpSignature
    );

    if (!isValid) {
      await prisma.payment.updateMany({
        where: { orderId },
        data: { status: PaymentStatus.FAILED },
      });
      return NextResponse.json(
        { success: false, error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    // Determine walletUsed amount (if partial wallet was applied)
    let walletUsed = 0;
    if (typeof body.walletUsed === "number" && body.walletUsed > 0) {
      walletUsed = body.walletUsed;
    } else if (typeof body.walletAmountUsed === "number" && body.walletAmountUsed > 0) {
      walletUsed = body.walletAmountUsed;
    } else if (existingOrder.paymentMethod?.startsWith("PARTIAL_WALLET:")) {
      const parsed = parseFloat(existingOrder.paymentMethod.replace("PARTIAL_WALLET:", ""));
      if (!isNaN(parsed) && parsed > 0) {
        walletUsed = parsed;
      }
    } else if (existingOrder.payment?.method?.startsWith("RAZORPAY_WALLET:")) {
      const parsed = parseFloat(existingOrder.payment.method.replace("RAZORPAY_WALLET:", ""));
      if (!isNaN(parsed) && parsed > 0) {
        walletUsed = parsed;
      }
    }

    // Atomically in a transaction: deduct walletUsed from user.passBalance, confirm order & payment
    const { updatedOrder, updatedPayment, updatedUser } = await prisma.$transaction(
      async (tx) => {
        let updatedUser = null;
        if (walletUsed > 0) {
          updatedUser = await tx.user.update({
            where: { id: existingOrder.userId },
            data: {
              passBalance: {
                decrement: walletUsed,
              },
            },
            select: { id: true, passBalance: true },
          });
        } else {
          updatedUser = await tx.user.findUnique({
            where: { id: existingOrder.userId },
            select: { id: true, passBalance: true },
          });
        }

        const updatedPayment = await tx.payment.update({
          where: { orderId },
          data: {
            razorpayPaymentId: finalRzpPaymentId,
            razorpaySignature: finalRzpSignature,
            status: PaymentStatus.PAID,
          },
        });

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
          },
          include: {
            items: true,
            outlet: true,
            payment: true,
          },
        });

        return { updatedOrder, updatedPayment, updatedUser };
      }
    );

    // Non-fatal referral processing
    if (updatedOrder.trainerId) {
      try {
        await processTrainerReferralOnPaymentSuccess(
          updatedOrder.trainerId,
          updatedOrder.userId,
          updatedOrder.discount
        );
      } catch (referralErr) {
        console.error("[Payment Security] Non-fatal referral processing error:", referralErr);
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      payment: updatedPayment,
      walletBalance: updatedUser?.passBalance ?? 0,
      passBalance: updatedUser?.passBalance ?? 0,
      walletUsed,
      message: "Order payment verified and confirmed",
    });
  } catch (error: any) {
    console.error("[Order Verify Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to verify order payment",
      },
      { status: 500 }
    );
  }
}
