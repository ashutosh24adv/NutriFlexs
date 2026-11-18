import { prisma } from "@/lib/prisma";
import { PaymentStatus, OrderStatus } from "@/types/enums";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { processTrainerReferralOnPaymentSuccess } from "./referral.service";

export async function verifyAndCompletePayment(params: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  walletUsed?: number;
}) {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error("Missing required payment verification parameters.");
  }

  // 1. Fetch existing order and payment state
  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          passBalance: true,
        },
      },
      trainer: true,
      payment: true,
    },
  });

  if (!existingOrder) {
    throw new Error("Order not found");
  }

  // 2. Anti-replay & Idempotency: If already marked PAID, return existing state safely
  if (existingOrder.paymentStatus === PaymentStatus.PAID) {
    const freshUser = await prisma.user.findUnique({
      where: { id: existingOrder.userId },
      select: { passBalance: true },
    });
    return {
      order: existingOrder,
      payment: existingOrder.payment,
      walletBalance: freshUser?.passBalance ?? 0,
    };
  }

  // 3. Cryptographic signature verification
  const isValid = verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isValid) {
    await prisma.payment.updateMany({
      where: { orderId },
      data: { status: PaymentStatus.FAILED },
    });
    throw new Error("Invalid payment signature verification");
  }

  // 4. Determine walletUsed amount (if partial wallet was applied)
  let walletUsed = 0;
  if (typeof params.walletUsed === "number" && params.walletUsed > 0) {
    walletUsed = params.walletUsed;
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

  // 5. Atomic transaction to deduct walletUsed (if any), mark payment & order as paid
  const { updatedPayment, updatedOrder, updatedUser } = await prisma.$transaction(
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
          razorpayPaymentId,
          razorpaySignature,
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              passBalance: true,
            },
          },
          trainer: true,
        },
      });

      return { updatedPayment, updatedOrder, updatedUser };
    }
  );

  // 6. Process referral reward idempotently (only once upon first payment transition)
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

  return {
    order: updatedOrder,
    payment: updatedPayment,
    walletBalance: updatedUser?.passBalance ?? 0,
    passBalance: updatedUser?.passBalance ?? 0,
    walletUsed,
  };
}
