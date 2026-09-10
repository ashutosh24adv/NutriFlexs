import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserNutritionGoal } from "@/services/nutrition-goal.service";

export async function GET(req: NextRequest) {
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
      weightKg: true,
      customDailyProteinGoal: true,
      proteinGoalGrams: true,
    },
  });

  if (!user) {
    return NextResponse.json({ success: true, user: null });
  }

  const { searchParams } = new URL(req.url);
  const timeZone = searchParams.get("timeZone") || "Asia/Kolkata";
  const dateStr = searchParams.get("date") || undefined;

  // Parallelize recent orders fetch and today's nutrition goal calculation
  const [recentOrders, nutritionGoal] = await Promise.all([
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
    getUserNutritionGoal(user.id, timeZone, dateStr),
  ]);

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      streakDays: user.streakDays || 12,
      weightKg: nutritionGoal.weightKg,
      proteinGoalGrams: nutritionGoal.proteinGoal,
      todayConsumedProtein: nutritionGoal.completedProtein,
      nutritionGoal,
      recentOrders,
    },
  });
}

