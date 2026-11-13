/**
 * NutriFlexs GST (Goods and Services Tax - India) Constants and Calculations
 */

export const GST_RATES = {
  // Prepared foods, cold-pressed juices, protein bowls & fresh shakes (Restaurant/Kiosk service)
  FOOD_AND_BEVERAGES: 0.05,
  // Packaged retail snacks and nutrition bars
  PACKAGED_GOODS: 0.12,
  // Fitness supplements, vitamins, and protein powders
  SUPPLEMENTS: 0.18,
  // Default GST applied to kiosk food and beverage orders
  DEFAULT: 0.05,
} as const;

export const DEFAULT_GST_RATE = GST_RATES.DEFAULT;

// Standard split for Intra-State supply (Karnataka / Same state kiosk pickup)
export const CGST_PERCENTAGE = 2.5; // 2.5%
export const SGST_PERCENTAGE = 2.5; // 2.5%
export const TOTAL_GST_PERCENTAGE = 5.0; // 5%

export interface GstBreakdown {
  taxableAmount: number;
  cgstRate: number;
  sgstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalGst: number;
  netPayable: number;
}

/**
 * Calculates CGST, SGST and total GST for a given taxable amount.
 * Rounds to 2 decimal places.
 */
export function calculateGst(
  taxableAmount: number,
  rate: number = DEFAULT_GST_RATE
): GstBreakdown {
  const safeTaxable = Math.max(0, taxableAmount);
  const halfRate = rate / 2;
  
  const cgstAmount = Math.round(safeTaxable * halfRate * 100) / 100;
  const sgstAmount = Math.round(safeTaxable * halfRate * 100) / 100;
  const totalGst = Math.round((cgstAmount + sgstAmount) * 100) / 100;
  const netPayable = Math.round((safeTaxable + totalGst) * 100) / 100;

  return {
    taxableAmount: safeTaxable,
    cgstRate: halfRate,
    sgstRate: halfRate,
    cgstAmount,
    sgstAmount,
    totalGst,
    netPayable,
  };
}
