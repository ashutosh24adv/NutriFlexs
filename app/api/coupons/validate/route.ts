import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-security";

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  // Rate limiting: Max 20 coupon validations per IP per 5 minutes to prevent dictionary attacks
  const rateLimit = checkRateLimit({
    key: `coupon_validate:${clientIp}`,
    maxRequests: 20,
    windowMs: 5 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many coupon validation requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
        },
      }
    );
  }

  try {
    const { code, subtotal } = await request.json();
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Coupon code required" }, { status: 400 });
    }

    const cleanCode = code.toUpperCase().trim();
    if (cleanCode.length > 30) {
      return NextResponse.json({ success: false, error: "Invalid coupon code format" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: cleanCode, isActive: true },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, error: "Invalid or expired coupon code" }, { status: 404 });
    }

    const validSubtotal = typeof subtotal === "number" && !isNaN(subtotal) ? subtotal : 0;
    if (validSubtotal < coupon.minOrderAmount) {
      return NextResponse.json(
        { success: false, error: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}` },
        { status: 400 }
      );
    }

    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      const calculated = (validSubtotal * coupon.discountValue) / 100;
      discount = coupon.maxDiscount ? Math.min(calculated, coupon.maxDiscount) : calculated;
    } else {
      discount = Math.min(coupon.discountValue, validSubtotal);
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        discount,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to validate coupon", 500);
  }
}
