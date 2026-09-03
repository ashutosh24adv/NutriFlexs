import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Find logged-in user or fall back to default customer (Ashu)
  const userEmail = session?.user?.email || "ashu@nutriflexs.com";
  let user = await prisma.user.findUnique({
    where: { email: userEmail.toLowerCase().trim() },
    include: {
      orders: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!user) {
    user = await prisma.user.findFirst({
      where: { role: "CUSTOMER" },
      include: {
        orders: {
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });
  }

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  // Calculate today's consumed protein from today's completed/placed orders
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayOrders = await prisma.order.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: startOfDay },
      status: { not: "CANCELLED" },
    },
  });

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
      recentOrders: user.orders,
    },
  });
}
