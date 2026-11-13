/**
 * NutriFlexs Pricing, Pickup Slots, and Billing Constants
 */
import { calculateGst, DEFAULT_GST_RATE, GstBreakdown } from "./gst";

export const CURRENCY = {
  CODE: "INR",
  SYMBOL: "₹",
  LOCALE: "en-IN",
} as const;

export const PICKUP_SLOTS = [
  { id: "NOW", label: "Ready Now", minutes: 0 },
  { id: "IN_15_MIN", label: "In 15 mins", minutes: 15 },
  { id: "IN_30_MIN", label: "In 30 mins", minutes: 30 },
] as const;

export type PickupSlotId = (typeof PICKUP_SLOTS)[number]["id"];

export const PRICING_RULES = {
  // Estimated food preparation time at gym kiosks
  DEFAULT_PREPARATION_MINUTES: 5,
  PREPARATION_LABEL: "~5 min",

  // Trainer referral discount percentage
  TRAINER_REFERRAL_DISCOUNT_PERCENT: 10,

  // Kiosk self-pickup convenience fee
  KIOSK_PICKUP_FEE: 0,

  // Default packaging charge
  DEFAULT_PACKAGING_FEE: 0,

  // Minimum order amount
  MIN_ORDER_AMOUNT: 1,

  // Price tier thresholds
  TIER_UNDER_199_MAX: 199,
  HIGH_PROTEIN_MIN_GRAMS: 25,
} as const;

export interface BillSummary {
  subtotal: number;
  discount: number;
  taxableAmount: number;
  packagingFee: number;
  kioskPickupFee: number;
  gst: GstBreakdown;
  totalPayable: number;
}

/**
 * Server-authoritative bill calculation.
 * Ensures the exact same formula is referenced by API endpoints and client displays.
 */
export function calculateBill(params: {
  subtotal: number;
  discount?: number;
  packagingFee?: number;
  gstRate?: number;
}): BillSummary {
  const subtotal = Math.max(0, Math.round(params.subtotal * 100) / 100);
  const discount = Math.min(
    subtotal,
    Math.max(0, Math.round((params.discount ?? 0) * 100) / 100)
  );
  const packagingFee = Math.max(0, params.packagingFee ?? PRICING_RULES.DEFAULT_PACKAGING_FEE);
  const kioskPickupFee = PRICING_RULES.KIOSK_PICKUP_FEE;

  const taxableAmount = Math.max(0, subtotal - discount);
  const gst = calculateGst(taxableAmount, params.gstRate ?? DEFAULT_GST_RATE);
  const totalPayable = Math.round((gst.netPayable + packagingFee + kioskPickupFee) * 100) / 100;

  return {
    subtotal,
    discount,
    taxableAmount,
    packagingFee,
    kioskPickupFee,
    gst,
    totalPayable,
  };
}

/**
 * Standard Indian Rupee price formatting utility
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY.SYMBOL}${amount.toLocaleString(CURRENCY.LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
