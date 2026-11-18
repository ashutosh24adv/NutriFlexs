import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { OrderStatus, PaymentStatus } from "@/types/enums";

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
      trainerCode,
      totalAmount: clientTotalAmount,
      discount: clientDiscount = 0,
      couponCode,
      walletUsed: clientWalletUsed,
    } = body;

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
      let product = dbProducts.find(
        (p) =>
          p.id === item.id ||
          p.id === item.productId ||
          p.name.toLowerCase() === (item.name || "").toLowerCase()
      );
      if (!product && dbProducts.length > 0) {
        product = dbProducts[0];
      }

      if (product) {
        const qty =
          typeof item.quantity === "number" && item.quantity > 0
            ? item.quantity
            : 1;
        const itemPrice =
          typeof item.price === "number" ? item.price : product.price;
        subtotal += itemPrice * qty;
        totalProtein += (item.proteinGrams || product.protein || 0) * qty;
        totalCalories += (item.calories || product.calories || 0) * qty;

        orderItemsCreate.push({
          productId: product.id,
          quantity: qty,
          priceAtPurchase: itemPrice,
          productJson: JSON.stringify({
            name: item.name || product.name,
            price: itemPrice,
            protein: item.proteinGrams || product.protein,
            calories: item.calories || product.calories,
            imageUrl: item.imageUrl || product.imageUrl,
          }),
        });
      }
    }

    const discount =
      typeof clientDiscount === "number" ? Math.max(0, clientDiscount) : 0;
    const computedTotal = Math.max(0, subtotal - discount);
    const finalAmount =
      typeof clientTotalAmount === "number" && clientTotalAmount >= 0
        ? clientTotalAmount
        : computedTotal;

    const walletUsed =
      typeof clientWalletUsed === "number" && clientWalletUsed > 0
        ? clientWalletUsed
        : finalAmount;

    // Resolve optional coupon
    let couponId: string | null = null;
    if (couponCode) {
      const dbCoupon = await prisma.coupon.findUnique({
        where: { code: String(couponCode).toUpperCase().trim() },
        select: { id: true },
      });
      if (dbCoupon) {
        couponId = dbCoupon.id;
      }
    }

    const orderNumber = `NF-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. In a Prisma transaction: verify balance, deduct walletUsed, create confirmed Order
    const { updatedUser, order } = await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUnique({
        where: { id: authUser.id },
        select: { id: true, passBalance: true },
      });

      if (!freshUser) {
        throw new Error("USER_NOT_FOUND");
      }

      const currentBalance = freshUser.passBalance || 0;
      if (currentBalance < walletUsed) {
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

      // Deduct walletUsed from user's passBalance
      const updatedUser = await tx.user.update({
        where: { id: authUser.id },
        data: {
          passBalance: {
            decrement: walletUsed,
          },
        },
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
