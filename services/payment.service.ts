import { prisma } from "@/lib/prisma";
import { PaymentStatus, OrderStatus } from "@/types/enums";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { processTrainerReferralOnPaymentSuccess } from "./referral.service";

export async function verifyAndCompletePayment(params: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
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
    return { order: existingOrder, payment: existingOrder.payment };
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

  // 4. Atomic transaction to mark payment & order as paid
  const { updatedPayment, updatedOrder } = await prisma.$transaction(async (tx) => {
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
        status: OrderStatus.ACCEPTED,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        trainer: true,
      },
    });

    return { updatedPayment, updatedOrder };
  });

  // 5. Process referral reward idempotently (only once upon first payment transition)
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

  return { order: updatedOrder, payment: updatedPayment };
}
