import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@/types/enums";
import { Razorpay } from "@/lib/razorpay";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      items = [],
      kioskLocation = "Cult.fit HSR Layout",
      outletId: requestedOutletId,
      trainerCode,
      user: userInfo = {},
      totalAmount: clientTotalAmount,
    } = body;

    // 1. Resolve or find user in Neon PostgreSQL
    const email = (userInfo.email || "ashu@nutriflexs.com").toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
    }
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: userInfo.name || "Ashu",
          email,
          phone: userInfo.phone || "+91 99999 88888",
          role: "CUSTOMER",
          streakDays: 5,
          proteinGoalGrams: 120,
        },
      });
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

    // 3. Resolve products & order items
    const dbProducts = await prisma.product.findMany({
      where: { isAvailable: true },
      take: 20,
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
        const qty = item.quantity || 1;
        const itemPrice = item.price || product.price;
        subtotal += itemPrice * qty;
        totalProtein += (item.proteinGrams || product.protein) * qty;
        totalCalories += (item.calories || product.calories) * qty;

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

    const finalAmount =
      clientTotalAmount !== undefined && clientTotalAmount > 0
        ? clientTotalAmount
        : Math.max(0, subtotal);

    const orderNumber = `NF-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Create Order record in Neon DB
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        outletId: outlet ? outlet.id : "default-outlet",
        status: OrderStatus.ORDER_PLACED,
        subtotal: subtotal || finalAmount,
        discount: 0,
        totalAmount: finalAmount,
        totalProtein,
        totalCalories,
        paymentStatus: PaymentStatus.PENDING,
        estimatedPrepMinutes: 5,
        items: {
          create: orderItemsCreate,
        },
      },
      include: {
        items: true,
        outlet: true,
      },
    });

    // 5. Initialize Razorpay and generate Payment order
    const key_id = process.env.RAZORPAY_KEY_ID || "rzp_test_nutriflexs_demo";
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "demo_secret";
    const razorpay = new Razorpay({ key_id, key_secret });

    const amountInPaise = Math.round(finalAmount * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order.id,
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        status: PaymentStatus.PENDING,
        method: "RAZORPAY",
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount, // in paise
      amountInPaise: razorpayOrder.amount,
      currency: "INR",
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
