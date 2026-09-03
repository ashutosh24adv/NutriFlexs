import {
  Role as PrismaRole,
  OrderStatus as PrismaOrderStatus,
  PaymentStatus as PrismaPaymentStatus,
  SubscriptionStatus as PrismaSubscriptionStatus,
  DiscountType as PrismaDiscountType,
  InventoryTxType as PrismaInventoryTxType,
} from "@prisma/client";

export const Role = PrismaRole;
export type Role = PrismaRole;

export const OrderStatus = PrismaOrderStatus;
export type OrderStatus = PrismaOrderStatus;

export const PaymentStatus = PrismaPaymentStatus;
export type PaymentStatus = PrismaPaymentStatus;

export const SubscriptionStatus = PrismaSubscriptionStatus;
export type SubscriptionStatus = PrismaSubscriptionStatus;

export const DiscountType = PrismaDiscountType;
export type DiscountType = PrismaDiscountType;

export const InventoryTxType = PrismaInventoryTxType;
export type InventoryTxType = PrismaInventoryTxType;
