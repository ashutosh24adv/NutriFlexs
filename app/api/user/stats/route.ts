import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: true, user: null });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: {
      id: true,
      name: true,
      email: true,
      streakDays: true,
      proteinGoalGrams: true,
    },
  });

  if (!user) {
    return NextResponse.json({ success: true, user: null });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Parallelize recent orders fetch and today's protein calculation
  const [recentOrders, todayOrders] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        totalProtein: true,
        totalCalories: true,
        status: true,
        createdAt: true,
        items: {
          take: 1,
          select: {
            id: true,
            quantity: true,
            priceAtPurchase: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                protein: true,
                calories: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: startOfDay },
        status: { not: "CANCELLED" },
      },
      select: {
        totalProtein: true,
      },
    }),
  ]);

  const todayConsumedProtein = todayOrders.reduce((sum, ord) => sum + (ord.totalProtein || 0), 0);

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      streakDays: user.streakDays || 12,
      proteinGoalGrams: user.proteinGoalGrams || 120,
      todayConsumedProtein: Math.round(todayConsumedProtein),
      recentOrders,
    },
  });
}
