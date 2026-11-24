import { prisma, withDbRetry } from "@/lib/prisma";
import { OrderStatus, SubscriptionStatus } from "@prisma/client";

export interface TrainerPortalQueryOptions {
  search?: string;
  status?: "ALL" | "ACTIVE" | "EXPIRED" | "PENDING" | "CANCELLED";
  dateRange?: "ALL" | "7D" | "30D" | "MONTH";
  sort?: "newest" | "oldest" | "most_active";
  page?: number;
  limit?: number;
}

export interface FormattedReferralRow {
  id: string;
  customerId: string;
  clientName: string;
  email: string;
  phone: string | null;
  joinedOn: string;
  codeUsed: string;
  passPlan: string;
  subscriptionStatus: "ACTIVE" | "EXPIRED" | "PENDING" | "CANCELLED";
  hasFirstOrder: boolean;
  firstOrderDate: string | null;
  totalOrders: number;
  rewardsContribution: number;
  discountApplied: number;
}

function deriveSubscriptionStatus(
  subscriptions: Array<{
    status: SubscriptionStatus;
    endDate: Date;
    plan?: { name: string; planType: string } | null;
  }>,
  referralStatus: string
): { status: "ACTIVE" | "EXPIRED" | "PENDING" | "CANCELLED"; passPlan: string } {
  const now = new Date();
  if (!subscriptions || subscriptions.length === 0) {
    return {
      status: referralStatus === "ACTIVE" ? "PENDING" : "PENDING",
      passPlan: "No Pass",
    };
  }

  // Prefer active non-expired subscription
  const activeSub = subscriptions.find(
    (s) => s.status === SubscriptionStatus.ACTIVE && new Date(s.endDate) > now
  );
  if (activeSub) {
    return {
      status: "ACTIVE",
      passPlan: activeSub.plan?.name || "NutriFlexs Pass",
    };
  }

  // Otherwise inspect most recent subscription
  const latest = subscriptions[0];
  if (latest.status === SubscriptionStatus.CANCELLED) {
    return { status: "CANCELLED", passPlan: latest.plan?.name || "NutriFlexs Pass" };
  }
  if (
    latest.status === SubscriptionStatus.EXPIRED ||
    new Date(latest.endDate) <= now
  ) {
    return { status: "EXPIRED", passPlan: latest.plan?.name || "NutriFlexs Pass" };
  }

  return { status: "PENDING", passPlan: latest.plan?.name || "NutriFlexs Pass" };
}

/**
 * Loads full, strictly server-scoped Trainer Portal data from PostgreSQL.
 * Never exposes private nutrition logs, health metrics, passwords, or payment secrets.
 */
export async function getTrainerPortalData(
  trainerUserId: string,
  options: TrainerPortalQueryOptions = {}
) {
  const trainer = await withDbRetry(() =>
    prisma.trainer.findUnique({
      where: { userId: trainerUserId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        referrals: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
                subscriptions: {
                  include: {
                    plan: {
                      select: {
                        name: true,
                        planType: true,
                      },
                    },
                  },
                  orderBy: { createdAt: "desc" },
                },
                orders: {
                  select: {
                    id: true,
                    orderNumber: true,
                    status: true,
                    discount: true,
                    totalAmount: true,
                    createdAt: true,
                  },
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        rewards: {
          orderBy: { createdAt: "desc" },
        },
      },
    })
  );

  if (!trainer) {
    return null;
  }

  // Map every referral using real database records
  const allFormattedReferrals: FormattedReferralRow[] = trainer.referrals.map((ref) => {
    const customer = ref.customer;
    const subInfo = deriveSubscriptionStatus(customer.subscriptions || [], ref.status);
    const allOrders = customer.orders || [];
    const completedOrders = allOrders.filter((o) => o.status === OrderStatus.COMPLETED);
    const firstOrder = allOrders.length > 0 ? allOrders[0] : null;
    const totalDiscountGiven = allOrders.reduce((sum, o) => sum + (o.discount || 0), 0);

    // Reward contribution: each active converted referral contributes 1/5th toward a meal voucher (or 1 if active)
    const rewardContribution = subInfo.status === "ACTIVE" ? 1 : 0;

    return {
      id: ref.id,
      customerId: customer.id,
      clientName: customer.name || "NutriFlexs Member",
      email: customer.email,
      phone: customer.phone || null,
      joinedOn: ref.createdAt.toISOString(),
      codeUsed: ref.codeUsed,
      passPlan: subInfo.passPlan,
      subscriptionStatus: subInfo.status,
      hasFirstOrder: allOrders.length > 0,
      firstOrderDate: firstOrder ? firstOrder.createdAt.toISOString() : null,
      totalOrders: completedOrders.length,
      rewardsContribution: rewardContribution,
      discountApplied: Math.round((ref.discountApplied || totalDiscountGiven) * 100) / 100,
    };
  });

  // Real KPI totals computed directly from database rows
  const totalReferrals = allFormattedReferrals.length;
  const activeSubscribers = allFormattedReferrals.filter(
    (r) => r.subscriptionStatus === "ACTIVE"
  ).length;
  const totalRewardsEarned = trainer.rewards.length;
  const pendingRewards = trainer.rewards.filter((rw) => !rw.isClaimed).length;
  const redeemedRewards = trainer.rewards.filter((rw) => rw.isClaimed).length;

  // Apply search, status filter, date range filter, and sorting
  let filtered = [...allFormattedReferrals];

  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
    );
  }

  if (options.status && options.status !== "ALL") {
    filtered = filtered.filter((r) => r.subscriptionStatus === options.status);
  }

  if (options.dateRange && options.dateRange !== "ALL") {
    const now = new Date();
    let cutoff: Date;
    if (options.dateRange === "7D") {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (options.dateRange === "30D") {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    filtered = filtered.filter((r) => new Date(r.joinedOn) >= cutoff);
  }

  if (options.sort === "oldest") {
    filtered.sort((a, b) => new Date(a.joinedOn).getTime() - new Date(b.joinedOn).getTime());
  } else if (options.sort === "most_active") {
    filtered.sort((a, b) => b.totalOrders - a.totalOrders);
  } else {
    filtered.sort((a, b) => new Date(b.joinedOn).getTime() - new Date(a.joinedOn).getTime());
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(options.limit || 10, 50));
  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const paginatedReferrals = filtered.slice((page - 1) * limit, page * limit);

  // Format rewards history with milestone context
  const formattedRewards = trainer.rewards.map((rw, idx) => ({
    id: rw.id,
    rewardTitle: rw.rewardTitle,
    status: rw.isClaimed ? "REDEEMED" : "PENDING",
    isClaimed: rw.isClaimed,
    earnedAt: rw.createdAt.toISOString(),
    claimedAt: rw.claimedAt ? rw.claimedAt.toISOString() : null,
    milestoneSource: `5 Active Subscribers Milestone #${trainer.rewards.length - idx}`,
  }));

  return {
    trainer: {
      id: trainer.id,
      userId: trainer.userId,
      name: trainer.user.name,
      email: trainer.user.email,
      phone: trainer.user.phone || null,
      partnerStatus: "CERTIFIED TRAINER PARTNER",
      joinedAt: trainer.createdAt.toISOString(),
      referralCode: trainer.referralCode,
      clientDiscountPercent: 10,
      totalReferrals,
      activeSubscribers,
      rewardsEarned: totalRewardsEarned,
      pendingRewards,
      redeemedRewards,
      progressToNextReward: activeSubscribers % 5,
    },
    referrals: paginatedReferrals,
    pagination: {
      page,
      limit,
      total: totalFiltered,
      totalPages,
    },
    rewards: formattedRewards,
  };
}

/**
 * Fetches full detail for a single referral, strictly enforcing trainer ownership.
 */
export async function getTrainerReferralDetail(
  trainerUserId: string,
  referralId: string
) {
  const referral = await withDbRetry(() =>
    prisma.referral.findUnique({
      where: { id: referralId },
      include: {
        trainer: {
          select: { id: true, userId: true, referralCode: true },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
            subscriptions: {
              include: {
                plan: { select: { name: true, planType: true, price: true } },
              },
              orderBy: { createdAt: "desc" },
            },
            orders: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
                discount: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    })
  );

  if (!referral) {
    return { error: "Referral record not found", status: 404 as const };
  }

  // Strict server-side ownership enforcement
  if (referral.trainer.userId !== trainerUserId) {
    return { error: "Forbidden: You cannot access another trainer's referral", status: 403 as const };
  }

  const customer = referral.customer;
  const subInfo = deriveSubscriptionStatus(customer.subscriptions || [], referral.status);
  const completedOrders = customer.orders.filter((o) => o.status === OrderStatus.COMPLETED);
  const chronologicalOrders = [...customer.orders].reverse();
  const firstOrder = chronologicalOrders.length > 0 ? chronologicalOrders[0] : null;

  // Build clean activity timeline
  const timeline: Array<{ id: string; title: string; date: string; type: string }> = [
    {
      id: `reg-${referral.id}`,
      title: `Registered using code ${referral.codeUsed}`,
      date: referral.createdAt.toISOString(),
      type: "REGISTRATION",
    },
  ];

  for (const sub of customer.subscriptions) {
    timeline.push({
      id: `sub-${sub.id}`,
      title: `Pass ${sub.status.toLowerCase()}: ${sub.plan?.name || "NutriFlexs Pass"}`,
      date: sub.createdAt.toISOString(),
      type: "SUBSCRIPTION",
    });
  }

  if (firstOrder) {
    timeline.push({
      id: `first-ord-${firstOrder.id}`,
      title: `First order placed (#${firstOrder.orderNumber})`,
      date: firstOrder.createdAt.toISOString(),
      type: "FIRST_ORDER",
    });
  }

  for (const ord of completedOrders.slice(0, 5)) {
    timeline.push({
      id: `comp-${ord.id}`,
      title: `Order #${ord.orderNumber} completed`,
      date: ord.createdAt.toISOString(),
      type: "ORDER_COMPLETED",
    });
  }

  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    status: 200 as const,
    detail: {
      id: referral.id,
      clientName: customer.name,
      email: customer.email,
      phone: customer.phone || null,
      registeredAt: customer.createdAt.toISOString(),
      referredAt: referral.createdAt.toISOString(),
      codeUsed: referral.codeUsed,
      currentPlan: subInfo.passPlan,
      subscriptionStatus: subInfo.status,
      subscriptionHistory: customer.subscriptions.map((s) => ({
        id: s.id,
        planName: s.plan?.name || "NutriFlexs Pass",
        billingPeriod: s.billingPeriod,
        status: s.status,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate.toISOString(),
      })),
      firstPurchaseDate: firstOrder ? firstOrder.createdAt.toISOString() : null,
      totalCompletedOrders: completedOrders.length,
      totalOrdersPlaced: customer.orders.length,
      discountApplied: referral.discountApplied,
      rewardContribution:
        subInfo.status === "ACTIVE"
          ? "Counts toward your 5-subscriber free meal milestone"
          : "Pending active pass subscription",
      timeline,
    },
  };
}

/**
 * Updates allowed profile fields (name, phone) for the authenticated trainer.
 */
export async function updateTrainerProfile(
  trainerUserId: string,
  updates: { name?: string; phone?: string | null }
) {
  const dataToUpdate: { name?: string; phone?: string | null } = {};
  if (updates.name && updates.name.trim().length >= 2) {
    dataToUpdate.name = updates.name.trim();
  }
  if (updates.phone !== undefined) {
    dataToUpdate.phone = updates.phone ? updates.phone.trim() : null;
  }

  const updated = await withDbRetry(() =>
    prisma.user.update({
      where: { id: trainerUserId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    })
  );

  return updated;
}

/**
 * Idempotently attributes referral and checks 5-subscriber meal voucher reward on payment success.
 */
export async function processTrainerReferralOnPaymentSuccess(
  trainerId: string,
  customerId: string,
  discountApplied: number
) {
  await withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      // Prevent duplicate referral attribution across any trainer for the same customer
      const existingReferral = await tx.referral.findFirst({
        where: { customerId },
      });

      const trainer = await tx.trainer.findUnique({ where: { id: trainerId } });
      if (!trainer) return;

      let shouldCheckReward = false;

      if (!existingReferral) {
        await tx.referral.create({
          data: {
            trainerId,
            customerId,
            codeUsed: trainer.referralCode,
            discountApplied,
            status: "ACTIVE",
          },
        });

        await tx.trainer.update({
          where: { id: trainerId },
          data: {
            totalReferrals: { increment: 1 },
            activeSubscribers: { increment: 1 },
          },
        });
        shouldCheckReward = true;
      } else if (
        existingReferral.trainerId === trainerId &&
        existingReferral.status === "PENDING"
      ) {
        await tx.referral.update({
          where: { id: existingReferral.id },
          data: {
            status: "ACTIVE",
            discountApplied: { increment: discountApplied },
          },
        });

        await tx.trainer.update({
          where: { id: trainerId },
          data: { activeSubscribers: { increment: 1 } },
        });
        shouldCheckReward = true;
      }

      if (shouldCheckReward) {
        const refreshed = await tx.trainer.findUnique({ where: { id: trainerId } });
        if (
          refreshed &&
          refreshed.activeSubscribers > 0 &&
          refreshed.activeSubscribers % 5 === 0
        ) {
          const voucherNumber = Math.floor(refreshed.activeSubscribers / 5);
          await tx.trainerReward.create({
            data: {
              trainerId,
              rewardTitle: `Free Post-Workout Meal / Juice Voucher #${voucherNumber}`,
              isClaimed: false,
            },
          });
          await tx.trainer.update({
            where: { id: trainerId },
            data: { rewardsEarned: { increment: 1 } },
          });
        }
      }
    })
  );
}

/**
 * Activates a pending signup referral when a customer purchases/renews a NutriFlexs Pass.
 */
export async function activateTrainerReferralOnSubscription(customerId: string) {
  await withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      const existing = await tx.referral.findFirst({
        where: { customerId },
      });
      if (!existing || existing.status === "ACTIVE") return;

      await tx.referral.update({
        where: { id: existing.id },
        data: { status: "ACTIVE" },
      });

      const updatedTrainer = await tx.trainer.update({
        where: { id: existing.trainerId },
        data: { activeSubscribers: { increment: 1 } },
      });

      if (
        updatedTrainer.activeSubscribers > 0 &&
        updatedTrainer.activeSubscribers % 5 === 0
      ) {
        const voucherNumber = Math.floor(updatedTrainer.activeSubscribers / 5);
        await tx.trainerReward.create({
          data: {
            trainerId: existing.trainerId,
            rewardTitle: `Free Post-Workout Meal / Juice Voucher #${voucherNumber}`,
            isClaimed: false,
          },
        });
        await tx.trainer.update({
          where: { id: existing.trainerId },
          data: { rewardsEarned: { increment: 1 } },
        });
      }
    })
  );
}
