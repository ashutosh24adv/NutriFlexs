import { prisma } from "@/lib/prisma";

export async function getTrainerDashboardData(trainerUserId: string) {
  const trainer = await prisma.trainer.findUnique({
    where: { userId: trainerUserId },
    include: {
      user: true,
      referrals: {
        include: {
          customer: true,
        },
        orderBy: { createdAt: "desc" },
      },
      rewards: {
        orderBy: { createdAt: "desc" },
      },
      orders: {
        include: {
          items: true,
          user: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!trainer) {
    throw new Error("Trainer profile not found");
  }

  return trainer;
}

export async function processTrainerReferralOnPaymentSuccess(
  trainerId: string,
  customerId: string,
  discountApplied: number
) {
  // Check if referral record already exists
  const existingReferral = await prisma.referral.findFirst({
    where: { trainerId, customerId },
  });

  if (!existingReferral) {
    const trainer = await prisma.trainer.findUnique({ where: { id: trainerId } });
    if (trainer) {
      // Create new referral record
      await prisma.referral.create({
        data: {
          trainerId,
          customerId,
          codeUsed: trainer.referralCode,
          discountApplied,
          status: "ACTIVE",
        },
      });

      // Increment trainer metrics
      const updatedTrainer = await prisma.trainer.update({
        where: { id: trainerId },
        data: {
          totalReferrals: { increment: 1 },
          activeSubscribers: { increment: 1 },
        },
      });

      // Check for 5 active subscribers reward threshold
      if (updatedTrainer.activeSubscribers % 5 === 0) {
        await prisma.trainerReward.create({
          data: {
            trainerId,
            rewardTitle: `Free Post-Workout Meal / Juice Voucher #${Math.floor(
              updatedTrainer.activeSubscribers / 5
            )}`,
            isClaimed: false,
          },
        });

        await prisma.trainer.update({
          where: { id: trainerId },
          data: { rewardsEarned: { increment: 1 } },
        });
      }
    }
  }
}
