import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { OrderStatus, PaymentStatus } from "@/types/enums";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/orders/wallet-checkout
 * Authenticated. Accepts order payload with 100% wallet coverage.
 * Verifies user has sufficient passBalance, decrements passBalance in a Prisma transaction,
 * creates the Order with status CONFIRMED and paymentMethod WALLET, and returns the order.
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
    } = body;

    // 1. Fetch fresh user with passBalance
    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: { id: true, name: true, email: true, passBalance: true },
      })
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    // 2. Resolve outlet
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

    // 3. Resolve products & calculate totals
    const dbProducts = await prisma.product.findMany({
      where: { isAvailable: true },
      take: 50,
    });

    let subtotal = 0;
    let totalProtein = 0;
    let totalCalories = 0;
    const orderItemsCreate = [];

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
        const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
        const itemPrice = typeof item.price === "number" ? item.price : product.price;
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

    const discount = typeof clientDiscount === "number" ? Math.max(0, clientDiscount) : 0;
    const computedTotal = Math.max(0, subtotal - discount);
    const finalAmount =
      typeof clientTotalAmount === "number" && clientTotalAmount >= 0
        ? clientTotalAmount
        : computedTotal;

    // 4. Verify user has sufficient passBalance (100% wallet coverage)
    const currentBalance = typeof user.passBalance === "number" ? user.passBalance : 0;
    if (currentBalance < finalAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient wallet balance. You have ₹${currentBalance.toFixed(
            2
          )}, but order total is ₹${finalAmount.toFixed(2)}.`,
          passBalance: currentBalance,
          walletBalance: currentBalance,
          requiredAmount: finalAmount,
        },
        { status: 400 }
      );
    }

    const orderNumber = `NF-${Math.floor(1000 + Math.random() * 9000)}`;

    // 5. Decrement passBalance and create CONFIRMED Order in a Prisma transaction
    const [updatedUser, order] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passBalance: {
            decrement: finalAmount,
          },
        },
        select: {
          id: true,
          passBalance: true,
        },
      }),
      prisma.order.create({
        data: {
          orderNumber,
          userId: user.id,
          outletId: outlet.id,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          paymentMethod: "WALLET",
          subtotal: subtotal || finalAmount,
          discount,
          totalAmount: finalAmount,
          totalProtein,
          totalCalories,
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
      }),
    ]);

    return NextResponse.json({
      success: true,
      order,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: "WALLET",
      passBalance: updatedUser.passBalance,
      walletBalance: updatedUser.passBalance,
      message: "Order confirmed and paid with wallet balance",
    });
  } catch (error: any) {
    console.error("[Wallet Checkout Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process wallet checkout" },
      { status: 500 }
    );
  }
}

