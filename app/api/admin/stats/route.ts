import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripSensitiveFields, safeErrorResponse } from "@/lib/api-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Administrator role required." },
        { status: 403 }
      );
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalOrdersAgg,
      todayOrdersAgg,
      activeCustomersCount,
      activeSubscriptionsCount,
      allOrders,
      products,
      coupons,
      inventoryItems,
    ] = await Promise.all([
      prisma.order.aggregate({
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfDay } },
        _count: { _all: true },
        _sum: { totalAmount: true },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.order.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          totalProtein: true,
          totalCalories: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              priceAtPurchase: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
          outlet: {
            select: {
              id: true,
              name: true,
              gym: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          protein: true,
          calories: true,
          isVeg: true,
          isAvailable: true,
          isFeatured: true,
          isPopular: true,
          category: { select: { id: true, name: true, slug: true } },
          dietGoals: { select: { goal: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.coupon.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
      }),
      prisma.inventoryItem.findMany({
        take: 100,
        select: {
          id: true,
          quantity: true,
          reservedQuantity: true,
          lowStockThreshold: true,
          unit: true,
          ingredient: { select: { id: true, name: true } },
          outlet: {
            select: {
              id: true,
              name: true,
              gym: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    const totalOrdersCount = totalOrdersAgg._count._all;
    const todayOrdersCount = todayOrdersAgg._count._all;
    const todayRevenue = todayOrdersAgg._sum.totalAmount || 0;
    const totalRevenue = totalOrdersAgg._sum.totalAmount || 0;

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

    const formattedProducts = products.map((p) => ({
      ...p,
      dietGoals: Array.isArray(p.dietGoals) ? p.dietGoals.map((dg: any) => dg.goal || dg) : [],
    }));

    return NextResponse.json(
      stripSensitiveFields({
        success: true,
        stats: {
          totalOrdersCount,
          todayOrdersCount,
          todayRevenue,
          totalRevenue,
          activeCustomersCount,
          activeSubscriptionsCount,
        },
        categoryData,
        recentOrders: allOrders,
        products: formattedProducts,
        coupons,
        inventoryItems,
      })
    );
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to load administrative analytics", 500);
  }
}
