import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { code, subtotal } = await request.json();
    if (!code) {
      return NextResponse.json({ success: false, error: "Coupon code required" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim(), isActive: true },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, error: "Invalid or expired coupon code" }, { status: 404 });
    }

    if (subtotal < coupon.minOrderAmount) {
      return NextResponse.json(
        { success: false, error: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}` },
        { status: 400 }
      );
    }

    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      const calculated = (subtotal * coupon.discountValue) / 100;
      discount = coupon.maxDiscount ? Math.min(calculated, coupon.maxDiscount) : calculated;
    } else {
      discount = Math.min(coupon.discountValue, subtotal);
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
