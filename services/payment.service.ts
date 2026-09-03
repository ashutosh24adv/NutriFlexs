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

  const isValid = verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isValid) {
    await prisma.payment.update({
      where: { orderId },
      data: { status: PaymentStatus.FAILED },
    });
    throw new Error("Invalid payment signature verification");
  }

  // Update Payment record
  const payment = await prisma.payment.update({
    where: { orderId },
    data: {
      razorpayPaymentId,
      razorpaySignature,
      status: PaymentStatus.PAID,
    },
  });

  // Update Order payment status and move order to ACCEPTED
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.PAID,
      status: OrderStatus.ACCEPTED,
    },
    include: {
      user: true,
      trainer: true,
    },
  });

  // Process referral logic if trainer ID exists
  if (order.trainerId) {
    await processTrainerReferralOnPaymentSuccess(order.trainerId, order.userId, order.discount);
  }

  return { order, payment };
}
