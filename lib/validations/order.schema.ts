import { z } from "zod";

export const createOrderSchema = z.object({
  outletId: z.string().min(1, "Outlet is required"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1, "At least one item must be in cart"),
  trainerReferralCode: z.string().optional(),
  couponCode: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "ORDER_PLACED",
    "ACCEPTED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CANCELLED",
  ]),
});
