import { z } from "zod";

export const OrderStatusEnum = z.enum([
  "ORDER_PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
]);

export const PaymentStatusEnum = z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]);

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const createOrderSchema = z.object({
  outletId: z.string().min(1, "Outlet is required"),
  items: z.array(orderItemInputSchema).min(1, "At least one item must be in cart"),
  trainerReferralCode: z.string().trim().optional().nullable(),
  couponCode: z.string().trim().optional().nullable(),
  isVegetarian: z.boolean().optional(),
  pickupSlot: z.enum(["NOW", "IN_15_MIN", "IN_30_MIN"]).optional().default("NOW"),
  logToDiary: z.boolean().optional().default(false),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  status: OrderStatusEnum,
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  razorpayOrderId: z.string().min(1, "Razorpay Order ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay Payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay Signature is required"),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "Coupon code is required").toUpperCase(),
  subtotal: z.number().min(0, "Subtotal cannot be negative"),
  outletId: z.string().optional().nullable(),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
