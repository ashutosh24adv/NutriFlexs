import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/coupons/validate
 * Validates coupon against DB table Coupon or built-in promo codes:
 * - WELCOME10: 10% off up to ₹100
 * - FIT50: ₹50 flat off on cart total >= ₹250
 * Returns { valid: true, code, discountAmount, message, finalTotal } or clean error response.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = body.code;
    const cartTotalRaw =
      body.cartTotal !== undefined
        ? body.cartTotal
        : body.subtotal !== undefined
        ? body.subtotal
        : body.total;

    if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
      return NextResponse.json(
        { valid: false, error: "Coupon code is required" },
        { status: 400 }
      );
    }

    const code = rawCode.toUpperCase().trim();
    const cartTotal =
      typeof cartTotalRaw === "number" && !isNaN(cartTotalRaw)
        ? Math.max(0, cartTotalRaw)
        : 0;

    // 1. Built-in promo code: WELCOME10 (10% off up to ₹100)
    if (code === "WELCOME10") {
      const calculatedDiscount = Math.round(cartTotal * 0.1 * 100) / 100;
      const discountAmount = Math.min(100, calculatedDiscount);
      const finalTotal = Math.max(
        0,
        Math.round((cartTotal - discountAmount) * 100) / 100
      );

      return NextResponse.json({
        valid: true,
        code: "WELCOME10",
        discountAmount,
        finalTotal,
        message: `Coupon WELCOME10 applied! Saved ₹${discountAmount}`,
        coupon: {
          code: "WELCOME10",
          discountType: "PERCENTAGE",
          discountValue: 10,
          maxDiscount: 100,
          description: "10% off up to ₹100",
        },
      });
    }

    // 2. Built-in promo code: FIT50 (₹50 flat off on cart total >= ₹250)
    if (code === "FIT50") {
      if (cartTotal < 250) {
        return NextResponse.json(
          {
            valid: false,
            code: "FIT50",
            error: "FIT50 requires a minimum cart total of ₹250",
          },
          { status: 400 }
        );
      }

      const discountAmount = Math.min(50, cartTotal);
      const finalTotal = Math.max(
        0,
        Math.round((cartTotal - discountAmount) * 100) / 100
      );

      return NextResponse.json({
        valid: true,
        code: "FIT50",
        discountAmount,
        finalTotal,
        message: "Coupon FIT50 applied! Saved ₹50 flat",
        coupon: {
          code: "FIT50",
          discountType: "FLAT",
          discountValue: 50,
          minOrderAmount: 250,
          description: "₹50 flat off on orders of ₹250 or more",
        },
      });
    }

    // 3. Validate against Neon Postgres Coupon table
    const dbCoupon = await withDbRetry(() =>
      prisma.coupon.findUnique({
        where: { code, isActive: true },
      })
    );

    if (!dbCoupon) {
      return NextResponse.json(
        { valid: false, error: "Invalid coupon code" },
        { status: 400 }
      );
    }

    // Check validity window
    if (dbCoupon.validUntil && new Date(dbCoupon.validUntil).getTime() < Date.now()) {
      return NextResponse.json(
        { valid: false, error: "Coupon code has expired" },
        { status: 400 }
      );
    }

    // Check usage limit
    if (dbCoupon.usageLimit && dbCoupon.usageCount >= dbCoupon.usageLimit) {
      return NextResponse.json(
        { valid: false, error: "Coupon usage limit reached" },
        { status: 400 }
      );
    }

    // Check minimum order amount
    if (cartTotal < dbCoupon.minOrderAmount) {
      return NextResponse.json(
        {
          valid: false,
          error: `Minimum order amount for this coupon is ₹${dbCoupon.minOrderAmount}`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (dbCoupon.discountType === "PERCENTAGE") {
      const calculated = (cartTotal * dbCoupon.discountValue) / 100;
      discountAmount = dbCoupon.maxDiscount
        ? Math.min(calculated, dbCoupon.maxDiscount)
        : calculated;
    } else {
      discountAmount = Math.min(dbCoupon.discountValue, cartTotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalTotal = Math.max(
      0,
      Math.round((cartTotal - discountAmount) * 100) / 100
    );

    return NextResponse.json({
      valid: true,
      code: dbCoupon.code,
      discountAmount,
      finalTotal,
      message: `Coupon ${dbCoupon.code} applied! Saved ₹${discountAmount}`,
      coupon: {
        code: dbCoupon.code,
        discountType: dbCoupon.discountType,
        discountValue: dbCoupon.discountValue,
      },
    });
  } catch (error: any) {
    console.error("[Mobile Coupon Validate Error]:", error);
    return NextResponse.json(
      { valid: false, error: error.message || "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
