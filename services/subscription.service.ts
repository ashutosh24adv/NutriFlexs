import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@/types/enums";

export async function getSubscriptionPlans() {
  return await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });
}

export async function getUserSubscription(userId: string) {
  return await prisma.subscription.findFirst({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function subscribeUserToPlan(userId: string, planId: string) {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + plan.validityDays * 24 * 60 * 60 * 1000);

  // Deactivate old active subscriptions if any
  await prisma.subscription.updateMany({
    where: { userId, status: SubscriptionStatus.ACTIVE },
    data: { status: SubscriptionStatus.EXPIRED },
  });

  return await prisma.subscription.create({
    data: {
      userId,
      planId,
      remainingCredits: plan.creditsCount,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
    },
    include: { plan: true },
  });
}
