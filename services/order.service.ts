import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@/types/enums";
import { createRazorpayOrder } from "@/lib/razorpay";

export interface CreateOrderParams {
  userId: string;
  outletId: string;
  items: Array<{ productId: string; quantity: number }>;
  couponCode?: string;
  trainerReferralCode?: string;
  isVegetarian?: boolean;
}

export async function createOrder(params: CreateOrderParams) {
  const { userId, outletId, items, couponCode, trainerReferralCode, isVegetarian } = params;

  // 1. Fetch user & outlet validation
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
  if (!outlet) throw new Error("Outlet not found");
  if (!outlet.isAvailable) throw new Error("Selected kiosk outlet is currently unavailable.");

  // 2. Fetch products and calculate prices & macros server-side
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isAvailable: true },
  });

  if (products.length !== productIds.length) {
    throw new Error("One or more selected products are unavailable or invalid.");
  }

  // Server-side strict dietary check
  const activeVegetarianMode = isVegetarian !== undefined ? isVegetarian : Boolean(user.isVegetarian);
  if (activeVegetarianMode) {
    const hasNonVegProduct = products.some((p) => !p.isVeg);
    if (hasNonVegProduct) {
      throw new Error("One or more items are not available in Vegetarian Mode.");
    }
  }

  let subtotal = 0;
  let totalProtein = 0;
  let totalCalories = 0;
  const orderItemsData = [];

  for (const item of items) {
    const dbProduct = products.find((p) => p.id === item.productId)!;
    const itemSubtotal = dbProduct.price * item.quantity;

    subtotal += itemSubtotal;
    totalProtein += dbProduct.protein * item.quantity;
    totalCalories += dbProduct.calories * item.quantity;

    orderItemsData.push({
      productId: dbProduct.id,
      quantity: item.quantity,
      priceAtPurchase: dbProduct.price,
      productJson: JSON.stringify({
        name: dbProduct.name,
        price: dbProduct.price,
        protein: dbProduct.protein,
        calories: dbProduct.calories,
        imageUrl: dbProduct.imageUrl,
      }),
    });
  }

  let discount = 0;
  let couponId: string | undefined = undefined;
  let trainerId: string | undefined = undefined;

  // 3. Server-side coupon discount calculation
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode.toUpperCase().trim(), isActive: true },
    });

    if (coupon && subtotal >= coupon.minOrderAmount) {
      couponId = coupon.id;
      if (coupon.discountType === "PERCENTAGE") {
        const calculatedDiscount = (subtotal * coupon.discountValue) / 100;
        discount = coupon.maxDiscount
          ? Math.min(calculatedDiscount, coupon.maxDiscount)
          : calculatedDiscount;
      } else {
        discount = Math.min(coupon.discountValue, subtotal);
      }
    }
  }

  // 4. Server-side Trainer referral discount (10% off)
  if (trainerReferralCode) {
    const trainer = await prisma.trainer.findUnique({
      where: { referralCode: trainerReferralCode.toUpperCase().trim() },
    });

    if (trainer) {
      trainerId = trainer.id;
      const referralDiscount = (subtotal * 10) / 100;
      discount = Math.max(discount, referralDiscount);
    }
  }

  const finalAmount = Math.max(0, subtotal - discount);
  const orderNumber = `NF-${Math.floor(1000 + Math.random() * 9000)}`;

  // 5. Create Order transaction
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      outletId,
      status: OrderStatus.ORDER_PLACED,
      subtotal,
      discount,
      totalAmount: finalAmount,
      totalProtein,
      totalCalories,
      paymentStatus: PaymentStatus.PENDING,
      trainerId,
      couponId,
      estimatedPrepMinutes: 3,
      items: {
        create: orderItemsData,
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      outlet: {
        include: {
          gym: true,
        },
      },
    },
  });

  // 6. Create Razorpay Payment order
  const rzpOrder = await createRazorpayOrder(finalAmount, order.id);

  const payment = await prisma.payment.create({
    data: {
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: finalAmount,
      status: PaymentStatus.PENDING,
      method: "RAZORPAY",
    },
  });

  return {
    order,
    payment,
    razorpay: rzpOrder,
  };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  return await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      items: {
        include: { product: true },
      },
      user: true,
      outlet: true,
    },
  });
}

export async function getOrderById(orderId: string) {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      outlet: {
        include: {
          gym: true,
        },
      },
      payment: true,
      user: true,
    },
  });
}

export async function getUserOrders(userId: string) {
  return await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      outlet: {
        include: { gym: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getKitchenOrders(outletId?: string) {
  const where: any = {};
  if (outletId) where.outletId = outletId;

  return await prisma.order.findMany({
    where,
    include: {
      items: {
        include: { product: true },
      },
      user: true,
      outlet: { include: { gym: true } },
      payment: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
