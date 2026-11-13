/**
 * Order and Payment Domain Types
 */
import { BillSummary } from "../constants/pricing";

export type OrderStatus =
  | "ORDER_PLACED"
  | "ACCEPTED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface OrderItemDetail {
  id?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  imageUrl?: string;
  isVeg: boolean;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  userId: string;
  outletId: string;
  outletName?: string;
  gymName?: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  gstAmount?: number;
  totalAmount: number;
  totalProtein: number;
  totalCalories: number;
  paymentStatus: PaymentStatus;
  trainerId?: string | null;
  couponId?: string | null;
  estimatedPrepMinutes: number;
  pickupSlot?: string;
  logToDiary?: boolean;
  items: OrderItemDetail[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateOrderResult {
  order: OrderDetail;
  bill: BillSummary;
  razorpayOrder?: {
    id: string;
    amount: number;
    currency: string;
    keyId: string;
  };
}

export interface LiveOrderStatus {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  estimatedMinutesRemaining: number;
  pickupCode: string;
  outletName: string;
  loggedToDiary: boolean;
  updatedAt: string;
}
