import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalOrdersCount,
      todayOrders,
      activeCustomersCount,
      activeSubscriptionsCount,
      allOrders,
      products,
      coupons,
      inventoryItems,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({
        where: { createdAt: { gte: startOfDay } },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.order.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { product: { include: { category: true } } } },
          user: true,
          outlet: { include: { gym: true } },
        },
      }),
      prisma.product.findMany({
        include: { category: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.inventoryItem.findMany({
        include: {
          ingredient: true,
          outlet: { include: { gym: true } },
        },
      }),
    ]);

    const todayRevenue = todayOrders.reduce((sum, ord) => sum + ord.totalAmount, 0);
    const totalRevenue = allOrders.reduce((sum, ord) => sum + ord.totalAmount, 0);

    // Sales by Category calculation
    const categorySalesMap: Record<string, number> = {};
    for (const ord of allOrders) {
      for (const item of ord.items) {
        const catName = item.product.category.name;
        categorySalesMap[catName] = (categorySalesMap[catName] || 0) + item.quantity;
      }
    }

    const categoryData = Object.entries(categorySalesMap).map(([category, sales]) => ({
      category,
      sales,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalOrdersCount,
        todayOrdersCount: todayOrders.length,
        todayRevenue,
        totalRevenue,
        activeCustomersCount,
        activeSubscriptionsCount,
      },
      categoryData,
      recentOrders: allOrders,
      products,
      coupons,
      inventoryItems,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
