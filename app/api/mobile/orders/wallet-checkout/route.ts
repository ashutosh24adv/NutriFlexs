import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { OrderStatus, PaymentStatus } from "@/types/enums";
import { RewardRedemptionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/orders/wallet-checkout
 * Authenticated via Bearer JWT.
 * In a Prisma transaction:
 * - Verifies user has sufficient passBalance
 * - Deducts walletUsed from passBalance
 * - Creates confirmed Order with items and paymentMethod WALLET
 * - Returns the order and updated walletBalance
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      items = [],
      outletId: requestedOutletId,
      couponCode,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // 1. Resolve outlet
    let outlet = requestedOutletId
      ? await prisma.outlet.findUnique({ where: { id: requestedOutletId } })
      : null;

    if (!outlet) {
      outlet = await prisma.outlet.findFirst({
        where: { isAvailable: true },
      });
    }

    if (!outlet) {
      outlet = await prisma.outlet.findFirst();
    }

    if (!outlet) {
      return NextResponse.json(
        { success: false, error: "No available outlet found" },
        { status: 400 }
      );
    }

    // 2. Resolve products & calculate totals
    const dbProducts = await prisma.product.findMany({
      where: { isAvailable: true },
      take: 50,
    });

    let subtotal = 0;
    let totalProtein = 0;
    let totalCalories = 0;
    const orderItemsCreate: any[] = [];

    for (const item of items) {
      const product = dbProducts.find(
        (p) =>
          p.id === item.id ||
          p.id === item.productId ||
          (item.name && p.name.toLowerCase() === String(item.name).toLowerCase())
      );

      if (!product) {
        return NextResponse.json(
          { success: false, error: "One or more selected products are unavailable" },
          { status: 400 }
        );
      }

      const qty =
        typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 50
          ? item.quantity
          : 1;
      // Always use authoritative server-side Product.price
      const itemPrice = product.price;
      subtotal += itemPrice * qty;
      totalProtein += (product.protein || 0) * qty;
      totalCalories += (product.calories || 0) * qty;

      orderItemsCreate.push({
        productId: product.id,
        quantity: qty,
        priceAtPurchase: itemPrice,
        productJson: JSON.stringify({
          name: product.name,
          price: itemPrice,
          protein: product.protein,
          calories: product.calories,
          imageUrl: product.imageUrl,
        }),
      });
    }

    // Validate optional coupon strictly server-side
    let couponId: string | null = null;
    let discount = 0;
    if (couponCode) {
      const dbCoupon = await prisma.coupon.findUnique({
        where: { code: String(couponCode).toUpperCase().trim() },
      });
      if (
        !dbCoupon ||
        !dbCoupon.isActive ||
        (dbCoupon.validUntil && new Date() > dbCoupon.validUntil) ||
        (dbCoupon.usageLimit !== null && dbCoupon.usageCount >= dbCoupon.usageLimit) ||
        (dbCoupon.userId && dbCoupon.userId !== authUser.id) ||
        subtotal < dbCoupon.minOrderAmount
      ) {
        return NextResponse.json(
          { success: false, error: "Invalid, expired, or ineligible coupon code" },
          { status: 400 }
        );
      }
      couponId = dbCoupon.id;
      discount =
        dbCoupon.discountType === "PERCENTAGE"
          ? Math.round((subtotal * dbCoupon.discountValue) / 100)
          : dbCoupon.discountValue;
    }

    discount = Math.min(subtotal, Math.max(0, discount));
    const finalAmount = Math.max(0, subtotal - discount);
    const walletUsed = finalAmount;

    const orderNumber = `NF-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. In an atomic Prisma transaction: verify & deduct balance conditionally to prevent race conditions
    const { updatedUser, order } = await prisma.$transaction(async (tx) => {
      if (walletUsed > 0) {
        const debit = await tx.user.updateMany({
          where: {
            id: authUser.id,
            passBalance: { gte: walletUsed },
          },
          data: {
            passBalance: { decrement: walletUsed },
          },
        });

        if (debit.count === 0) {
          const freshUser = await tx.user.findUnique({
            where: { id: authUser.id },
            select: { passBalance: true },
          });
          const currentBalance = freshUser?.passBalance || 0;
          const err: any = new Error(
            `Insufficient wallet balance. You have ₹${currentBalance.toFixed(
              2
            )}, but order requires ₹${walletUsed.toFixed(2)}.`
          );
          err.code = "INSUFFICIENT_BALANCE";
          err.currentBalance = currentBalance;
          err.requiredAmount = walletUsed;
          throw err;
        }
      }

      if (couponId) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usageCount: { increment: 1 } },
        });
        await tx.rewardRedemption.updateMany({
          where: { couponId, userId: authUser.id, status: RewardRedemptionStatus.ACTIVE },
          data: { status: RewardRedemptionStatus.USED, usedAt: new Date() },
        });
      }

      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: authUser.id },
        select: {
          id: true,
          passBalance: true,
        },
      });

      // Create confirmed Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: authUser.id,
          outletId: outlet.id,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: "WALLET",
          subtotal: subtotal || finalAmount,
          discount,
          totalAmount: finalAmount,
          totalProtein,
          totalCalories,
          couponId,
          estimatedPrepMinutes: 5,
          items: {
            create: orderItemsCreate,
          },
          payment: {
            create: {
              amount: finalAmount,
              status: PaymentStatus.PAID,
              method: "WALLET",
              razorpayPaymentId: `wallet_pay_${Date.now()}`,
              razorpayOrderId: null,
              razorpaySignature: "wallet_verified",
            },
          },
        },
        include: {
          items: true,
          outlet: true,
          payment: true,
        },
      });

      return { updatedUser, order };
    });

    return NextResponse.json({
      success: true,
      order,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: "WALLET",
      walletBalance: updatedUser.passBalance,
      passBalance: updatedUser.passBalance,
      walletUsed,
      message: "Order confirmed and paid with wallet balance",
    });
  } catch (error: any) {
    if (error?.code === "INSUFFICIENT_BALANCE") {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          walletBalance: error.currentBalance,
          passBalance: error.currentBalance,
          requiredAmount: error.requiredAmount,
        },
        { status: 400 }
      );
    }
    console.error("[Wallet Checkout Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process wallet checkout",
      },
      { status: 500 }
    );
  }
}
