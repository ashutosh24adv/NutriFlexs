import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@/types/enums";
import { Razorpay } from "@/lib/razorpay";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { getUserOrders } from "@/services/order.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/orders
 * Returns orders for the authenticated mobile user.
 */
export async function GET(request: Request) {
  try {
    let userId: string | null = null;
    const authUser = await getMobileAuthUser(request);
    if (authUser) {
      userId = authUser.id;
    }

    if (!userId) {
      const url = new URL(request.url);
      const queryUserId = url.searchParams.get("userId");
      const queryEmail = url.searchParams.get("email");

      if (queryUserId) {
        userId = queryUserId;
      } else if (queryEmail) {
        const dbUser = await withDbRetry(() =>
          prisma.user.findUnique({
            where: { email: queryEmail.toLowerCase().trim() },
            select: { id: true },
          })
        );
        if (dbUser) userId = dbUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const orders = await getUserOrders(userId);
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error("[Mobile Orders GET Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobile/orders
 * Creates an order with support for walletUsed (partial wallet payment) and Razorpay.
 * Generates Razorpay order for finalPayable (amount * 100 paise).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      items = [],
      kioskLocation = "Cult.fit HSR Layout",
      outletId: requestedOutletId,
      trainerCode,
      user: userInfo = {},
      totalAmount: clientTotalAmount,
      discount: clientDiscount = 0,
      couponCode,
      walletUsed: inputWalletUsed,
      walletAmountUsed,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // 1. Resolve authenticated user in Neon PostgreSQL
    let user = null;
    const authUser = await getMobileAuthUser(request);
    if (authUser) {
      user = await withDbRetry(() =>
        prisma.user.findUnique({ where: { id: authUser.id } })
      );
    }
    if (!user && userInfo.email) {
      user = await withDbRetry(() =>
        prisma.user.findUnique({
          where: { email: String(userInfo.email).toLowerCase().trim() },
        })
      );
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized or user not found" },
        { status: 401 }
      );
    }

    // 2. Resolve wallet deduction amount
    const rawWalletUsed =
      typeof inputWalletUsed === "number"
        ? inputWalletUsed
        : typeof walletAmountUsed === "number"
        ? walletAmountUsed
        : 0;
    const walletUsed = Math.max(0, rawWalletUsed);

    if (walletUsed > 0) {
      const currentBalance = user.passBalance || 0;
      if (walletUsed > currentBalance) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient wallet balance. You have ₹${currentBalance.toFixed(
              2
            )}, but selected ₹${walletUsed.toFixed(2)} from wallet.`,
            walletBalance: currentBalance,
          },
          { status: 400 }
        );
      }
    }

    // 3. Resolve outlet
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

    // 4. Resolve products & order items
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
          p.name?.toLowerCase() === (item.name || "").toLowerCase()
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
    const totalBill = Math.max(0, subtotal - discount);

    // Final payable amount (after deducting walletUsed)
    const computedFinalPayable = Math.max(
      0,
      Math.round((totalBill - walletUsed) * 100) / 100
    );
    const finalPayable =
      typeof clientTotalAmount === "number" && clientTotalAmount >= 0
        ? clientTotalAmount
        : computedFinalPayable;

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
    const paymentMethod =
      walletUsed > 0 ? `PARTIAL_WALLET:${walletUsed}` : "RAZORPAY";

    // 5. Create Order record in Neon PostgreSQL
    const order = await withDbRetry(() =>
      prisma.order.create({
        data: {
          orderNumber,
          userId: user.id,
          outletId: outlet ? outlet.id : "default-outlet",
          status: OrderStatus.ORDER_PLACED,
          subtotal: subtotal || (finalPayable + walletUsed),
          discount,
          totalAmount: finalPayable,
          totalProtein,
          totalCalories,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod,
          couponId,
          estimatedPrepMinutes: 5,
          items: {
            create: orderItemsCreate,
          },
        },
        include: {
          items: true,
          outlet: true,
        },
      })
    );

    // 6. Initialize Razorpay and generate order for finalPayable
    const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_nutriflexs_demo";
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "demo_secret";
    const razorpay = new Razorpay({ key_id, key_secret });

    const amountInPaise = Math.max(100, Math.round(finalPayable * 100)); // Razorpay min 1 INR (100 paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order.id,
      notes: {
        orderId: order.id,
        userId: user.id,
        walletUsed,
        finalPayable,
      },
    });

    const payment = await withDbRetry(() =>
      prisma.payment.create({
        data: {
          orderId: order.id,
          razorpayOrderId: razorpayOrder.id,
          amount: finalPayable,
          status: PaymentStatus.PENDING,
          method: walletUsed > 0 ? `RAZORPAY_WALLET:${walletUsed}` : "RAZORPAY",
        },
      })
    );

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      keyId: key_id,
      key: key_id,
      amount: razorpayOrder.amount, // in paise
      amountInPaise: razorpayOrder.amount,
      currency: "INR",
      finalPayable,
      walletUsed,
      order,
      payment,
    });
  } catch (error: any) {
    console.error("Mobile order creation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
