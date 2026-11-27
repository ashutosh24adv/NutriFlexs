import crypto from "crypto";
import { prisma, withDbRetry } from "@/lib/prisma";
import {
  PaymentStatus,
  RewardActivityType,
  RewardRedemptionStatus,
  RewardTransactionType,
} from "@prisma/client";

export function getTodayDateKeyIST(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Ensures initial FuelPoints rules and catalogue rewards exist idempotently.
 */
export async function ensureFuelPointsDefaults() {
  const defaultRules: Array<{
    activityType: RewardActivityType;
    label: string;
    description: string;
    points: number;
    dailyLimit: number | null;
    configuration: any;
  }> = [
    {
      activityType: RewardActivityType.DAILY_CHECK_IN,
      label: "Daily Check-in",
      description: "Check in daily to stay consistent with your nutrition journey.",
      points: 5,
      dailyLimit: 1,
      configuration: null,
    },
    {
      activityType: RewardActivityType.MEAL_LOGGING,
      label: "Log Daily Meals",
      description: "Log at least one verified meal in your daily food diary.",
      points: 10,
      dailyLimit: 1,
      configuration: null,
    },
    {
      activityType: RewardActivityType.WATER_GOAL,
      label: "Complete Water Goal",
      description: "Reach your configured daily hydration goal.",
      points: 10,
      dailyLimit: 1,
      configuration: null,
    },
    {
      activityType: RewardActivityType.FOOD_PURCHASE,
      label: "Purchase NutriFlexs Food",
      description: "Earn 1 FuelPoint for every ₹10 spent on eligible paid orders.",
      points: 1,
      dailyLimit: null,
      configuration: { rupeesPerPoint: 10 },
    },
  ];

  for (const rule of defaultRules) {
    await withDbRetry(() =>
      prisma.rewardRule.upsert({
        where: { activityType: rule.activityType },
        create: {
          activityType: rule.activityType,
          label: rule.label,
          description: rule.description,
          points: rule.points,
          enabled: true,
          dailyLimit: rule.dailyLimit,
          configuration: rule.configuration,
        },
        update: {},
      })
    );
  }

  const catalogueCount = await withDbRetry(() => prisma.rewardCatalogue.count());
  if (catalogueCount === 0) {
    await withDbRetry(() =>
      prisma.rewardCatalogue.createMany({
        data: [
          {
            name: "₹20 OFF",
            description: "Instant ₹20 discount on eligible NutriFlexs meal orders.",
            pointsRequired: 300,
            discountAmount: 20,
            minimumOrderValue: 100,
            enabled: true,
            expiryDays: 30,
          },
          {
            name: "₹50 OFF",
            description: "Instant ₹50 discount on eligible NutriFlexs meal orders.",
            pointsRequired: 600,
            discountAmount: 50,
            minimumOrderValue: 250,
            enabled: true,
            expiryDays: 30,
          },
        ],
      })
    );
  }
}

/**
 * Ensures a RewardAccount exists for the given user and returns it.
 */
export async function getOrCreateRewardAccount(userId: string) {
  return await withDbRetry(() =>
    prisma.rewardAccount.upsert({
      where: { userId },
      create: {
        userId,
        availableBalance: 0,
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
      },
      update: {},
    })
  );
}

/**
 * Atomically awards FuelPoints with DB-level idempotencyKey uniqueness.
 */
async function awardPointsIdempotent(params: {
  userId: string;
  points: number;
  source: string;
  sourceReference?: string;
  idempotencyKey: string;
  description: string;
}) {
  const cleanPoints = Math.floor(params.points);
  if (cleanPoints <= 0) return { awarded: false, points: 0 };

  try {
    const result = await withDbRetry(() =>
      prisma.$transaction(async (tx) => {
        await tx.rewardAccount.upsert({
          where: { userId: params.userId },
          create: { userId: params.userId, availableBalance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 },
          update: {},
        });

        const txn = await tx.rewardTransaction.create({
          data: {
            userId: params.userId,
            type: RewardTransactionType.EARNED,
            points: cleanPoints,
            source: params.source,
            sourceReference: params.sourceReference || null,
            idempotencyKey: params.idempotencyKey,
            description: params.description,
            status: "COMPLETED",
          },
        });

        const account = await tx.rewardAccount.update({
          where: { userId: params.userId },
          data: {
            availableBalance: { increment: cleanPoints },
            lifetimeEarned: { increment: cleanPoints },
          },
        });

        return { awarded: true, points: cleanPoints, txn, account };
      })
    );
    return result;
  } catch (err: any) {
    // P2002: idempotencyKey already exists -> already awarded safely
    if (err?.code === "P2002") {
      return { awarded: false, points: 0, duplicate: true };
    }
    throw err;
  }
}

/**
 * Atomically reverses previously awarded points (for cancelled/refunded orders or water goal drop).
 */
async function reversePointsIdempotent(params: {
  userId: string;
  originalIdempotencyKey: string;
  reversalIdempotencyKey: string;
  source: string;
  sourceReference?: string;
  description: string;
}) {
  try {
    return await withDbRetry(() =>
      prisma.$transaction(async (tx) => {
        const original = await tx.rewardTransaction.findUnique({
          where: { idempotencyKey: params.originalIdempotencyKey },
        });
        if (!original || original.points <= 0) {
          return { reversed: false, points: 0 };
        }

        const account = await tx.rewardAccount.findUnique({
          where: { userId: params.userId },
        });
        if (!account) {
          return { reversed: false, points: 0 };
        }

        const deductPoints = Math.min(account.availableBalance, original.points);

        await tx.rewardTransaction.create({
          data: {
            userId: params.userId,
            type: RewardTransactionType.REVERSED,
            points: -original.points,
            source: params.source,
            sourceReference: params.sourceReference || null,
            idempotencyKey: params.reversalIdempotencyKey,
            description: params.description,
            status: "REVERSED",
          },
        });

        const updatedAccount = await tx.rewardAccount.update({
          where: { userId: params.userId },
          data: {
            availableBalance: { decrement: deductPoints },
          },
        });

        return { reversed: true, points: original.points, account: updatedAccount };
      })
    );
  } catch (err: any) {
    if (err?.code === "P2002") {
      return { reversed: false, points: 0, duplicate: true };
    }
    throw err;
  }
}

/**
 * Daily Check-in: awards configured points once per calendar day (IST).
 */
export async function performDailyCheckIn(userId: string) {
  await ensureFuelPointsDefaults();

  const rule = await withDbRetry(() =>
    prisma.rewardRule.findUnique({
      where: { activityType: RewardActivityType.DAILY_CHECK_IN },
    })
  );

  if (!rule || !rule.enabled || rule.points <= 0) {
    throw new Error("Daily check-in reward is currently disabled.");
  }

  const todayKey = getTodayDateKeyIST();
  const idempotencyKey = `CHECK_IN:${userId}:${todayKey}`;

  const res = await awardPointsIdempotent({
    userId,
    points: rule.points,
    source: "DAILY_CHECK_IN",
    sourceReference: todayKey,
    idempotencyKey,
    description: "Daily check-in",
  });

  const account = await getOrCreateRewardAccount(userId);

  return {
    checkedInToday: true,
    alreadyCheckedIn: !res.awarded,
    pointsEarned: res.awarded ? res.points : 0,
    dateKey: todayKey,
    account,
  };
}

/**
 * Evaluates verified FoodLog records for today and awards meal logging FP once per day.
 * Never rewards merely opening the page or clicking a button.
 */
export async function evaluateMealLoggingReward(userId: string, dateKey: string) {
  const todayKey = getTodayDateKeyIST();
  if (dateKey !== todayKey) {
    return { awarded: false, points: 0 };
  }

  await ensureFuelPointsDefaults();
  const rule = await withDbRetry(() =>
    prisma.rewardRule.findUnique({
      where: { activityType: RewardActivityType.MEAL_LOGGING },
    })
  );
  if (!rule || !rule.enabled || rule.points <= 0) {
    return { awarded: false, points: 0 };
  }

  const foodCount = await withDbRetry(() =>
    prisma.foodLog.count({
      where: { userId, dateKey: todayKey },
    })
  );

  if (foodCount <= 0) {
    return { awarded: false, points: 0 };
  }

  return await awardPointsIdempotent({
    userId,
    points: rule.points,
    source: "MEAL_LOGGING",
    sourceReference: todayKey,
    idempotencyKey: `MEAL_LOG:${userId}:${todayKey}`,
    description: "Meals logged",
  });
}

/**
 * Evaluates verified WaterEntry totals against NutritionGoal.waterGoalMl for today.
 * Awards once when goal is reached; reverses cleanly if entries are deleted below goal.
 */
export async function evaluateWaterGoalReward(userId: string, dateKey: string) {
  const todayKey = getTodayDateKeyIST();
  if (dateKey !== todayKey) {
    return { awarded: false, reversed: false, points: 0 };
  }

  await ensureFuelPointsDefaults();
  const rule = await withDbRetry(() =>
    prisma.rewardRule.findUnique({
      where: { activityType: RewardActivityType.WATER_GOAL },
    })
  );
  if (!rule || !rule.enabled || rule.points <= 0) {
    return { awarded: false, reversed: false, points: 0 };
  }

  const [entries, goal] = await Promise.all([
    withDbRetry(() =>
      prisma.waterEntry.findMany({
        where: { userId, dateKey: todayKey },
        select: { amountMl: true },
      })
    ),
    withDbRetry(() =>
      prisma.nutritionGoal.findUnique({
        where: { userId },
        select: { waterGoalMl: true },
      })
    ),
  ]);

  const totalMl = entries.reduce((sum, e) => sum + e.amountMl, 0);
  const goalMl = goal?.waterGoalMl || 3000;
  const awardKey = `WATER_GOAL:${userId}:${todayKey}`;
  const revKey = `WATER_GOAL_REV:${userId}:${todayKey}`;

  if (totalMl >= goalMl) {
    // Only award if not previously reversed today (prevents award/delete/re-add farming)
    const wasReversedToday = await prisma.rewardTransaction.findUnique({
      where: { idempotencyKey: revKey },
      select: { id: true },
    });
    if (wasReversedToday) {
      return { awarded: false, reversed: false, points: 0 };
    }
    const res = await awardPointsIdempotent({
      userId,
      points: rule.points,
      source: "WATER_GOAL",
      sourceReference: todayKey,
      idempotencyKey: awardKey,
      description: "Water goal completed",
    });
    return { awarded: res.awarded, reversed: false, points: res.points };
  } else {
    // Dropped below goal after editing/deleting water entries -> reverse if awarded today
    const rev = await reversePointsIdempotent({
      userId,
      originalIdempotencyKey: awardKey,
      reversalIdempotencyKey: revKey,
      source: "WATER_GOAL",
      sourceReference: todayKey,
      description: "Water goal reversed (below daily target)",
    });
    return { awarded: false, reversed: rev.reversed, points: rev.points };
  }
}

/**
 * Awards FuelPoints for an eligible PAID order (default 1 FP per ₹10 paid).
 * Never awards for unpaid or failed orders.
 */
export async function awardPurchaseFuelPoints(orderId: string) {
  await ensureFuelPointsDefaults();

  const [order, rule] = await Promise.all([
    withDbRetry(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          totalAmount: true,
          paymentStatus: true,
        },
      })
    ),
    withDbRetry(() =>
      prisma.rewardRule.findUnique({
        where: { activityType: RewardActivityType.FOOD_PURCHASE },
      })
    ),
  ]);

  if (!order || order.paymentStatus !== PaymentStatus.PAID || order.totalAmount <= 0) {
    return { awarded: false, points: 0 };
  }

  if (!rule || !rule.enabled || rule.points <= 0) {
    return { awarded: false, points: 0 };
  }

  const config = (rule.configuration as { rupeesPerPoint?: number } | null) || {};
  const rupeesPerPoint = Math.max(1, Math.floor(config.rupeesPerPoint || 10));
  const pointsEarned = Math.floor(order.totalAmount / rupeesPerPoint) * rule.points;

  if (pointsEarned <= 0) {
    return { awarded: false, points: 0 };
  }

  return await awardPointsIdempotent({
    userId: order.userId,
    points: pointsEarned,
    source: "FOOD_PURCHASE",
    sourceReference: order.id,
    idempotencyKey: `ORDER_EARN:${order.id}`,
    description: `Food order completed (#${order.orderNumber})`,
  });
}

/**
 * Reverses FuelPoints when an order is cancelled or refunded.
 */
export async function reversePurchaseFuelPoints(orderId: string, reason?: string) {
  const order = await withDbRetry(() =>
    prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, userId: true },
    })
  );
  if (!order) return { reversed: false, points: 0 };

  return await reversePointsIdempotent({
    userId: order.userId,
    originalIdempotencyKey: `ORDER_EARN:${order.id}`,
    reversalIdempotencyKey: `ORDER_REV:${order.id}`,
    source: "FOOD_PURCHASE",
    sourceReference: order.id,
    description: `Order cancelled/refunded (#${order.orderNumber})${reason ? `: ${reason}` : ""}`,
  });
}

/**
 * Atomically redeems FuelPoints for a catalogue reward and issues a user-specific single-use coupon.
 */
export async function redeemReward(userId: string, rewardId: string) {
  await ensureFuelPointsDefaults();

  return await withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      const reward = await tx.rewardCatalogue.findUnique({
        where: { id: rewardId },
      });

      if (!reward || !reward.enabled) {
        throw new Error("Selected reward is unavailable or disabled.");
      }

      // Ensure account exists
      await tx.rewardAccount.upsert({
        where: { userId },
        create: { userId, availableBalance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 },
        update: {},
      });

      // Atomic conditional balance deduction (prevents concurrent negative balance / overspend)
      const debitResult = await tx.rewardAccount.updateMany({
        where: {
          userId,
          availableBalance: { gte: reward.pointsRequired },
        },
        data: {
          availableBalance: { decrement: reward.pointsRequired },
          lifetimeRedeemed: { increment: reward.pointsRequired },
        },
      });

      if (debitResult.count === 0) {
        throw new Error(
          `Insufficient FuelPoints. You need ${reward.pointsRequired} FP to redeem this reward.`
        );
      }

      const expiresAt = new Date(
        Date.now() + Math.max(1, reward.expiryDays) * 24 * 60 * 60 * 1000
      );
      const randomToken = crypto.randomBytes(4).toString("hex").toUpperCase();
      const couponCode = `FP-${reward.discountAmount}-${randomToken}`;

      // Create user-specific single-use coupon in existing Coupon system
      const coupon = await tx.coupon.create({
        data: {
          code: couponCode,
          userId,
          discountType: "FLAT",
          discountValue: reward.discountAmount,
          minOrderAmount: reward.minimumOrderValue,
          validUntil: expiresAt,
          usageLimit: 1,
          usageCount: 0,
          isActive: true,
        },
      });

      const redemption = await tx.rewardRedemption.create({
        data: {
          userId,
          rewardId: reward.id,
          pointsSpent: reward.pointsRequired,
          discountAmount: reward.discountAmount,
          couponCode,
          couponId: coupon.id,
          status: RewardRedemptionStatus.ACTIVE,
          expiresAt,
        },
      });

      await tx.rewardTransaction.create({
        data: {
          userId,
          type: RewardTransactionType.REDEEMED,
          points: -reward.pointsRequired,
          source: "REWARD_REDEMPTION",
          sourceReference: redemption.id,
          idempotencyKey: `REDEEM:${redemption.id}`,
          description: `Reward redeemed: ${reward.name} (${couponCode})`,
          status: "COMPLETED",
        },
      });

      const updatedAccount = await tx.rewardAccount.findUnique({
        where: { userId },
      });

      return {
        redemption,
        couponCode,
        account: updatedAccount,
      };
    })
  );
}

/**
 * Fetches full customer Rewards Dashboard data from Neon PostgreSQL.
 */
export async function getCustomerRewardsDashboard(userId: string) {
  await ensureFuelPointsDefaults();

  const todayKey = getTodayDateKeyIST();
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    last7Days.push(getTodayDateKeyIST(d));
  }

  const [
    account,
    rules,
    catalogue,
    transactions,
    redemptions,
    checkInTxns,
    todayFoodCount,
    todayWaterEntries,
    nutritionGoal,
  ] = await Promise.all([
    getOrCreateRewardAccount(userId),
    withDbRetry(() => prisma.rewardRule.findMany({ orderBy: { activityType: "asc" } })),
    withDbRetry(() =>
      prisma.rewardCatalogue.findMany({
        where: { enabled: true },
        orderBy: { pointsRequired: "asc" },
      })
    ),
    withDbRetry(() =>
      prisma.rewardTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      })
    ),
    withDbRetry(() =>
      prisma.rewardRedemption.findMany({
        where: { userId },
        include: { reward: { select: { name: true, minimumOrderValue: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    ),
    withDbRetry(() =>
      prisma.rewardTransaction.findMany({
        where: {
          userId,
          source: "DAILY_CHECK_IN",
          sourceReference: { in: last7Days },
        },
        select: { sourceReference: true },
      })
    ),
    withDbRetry(() =>
      prisma.foodLog.count({
        where: { userId, dateKey: todayKey },
      })
    ),
    withDbRetry(() =>
      prisma.waterEntry.findMany({
        where: { userId, dateKey: todayKey },
        select: { amountMl: true },
      })
    ),
    withDbRetry(() =>
      prisma.nutritionGoal.findUnique({
        where: { userId },
        select: { waterGoalMl: true },
      })
    ),
  ]);

  const checkedInSet = new Set(checkInTxns.map((t) => t.sourceReference));
  const sevenDayCheckIns = last7Days.map((dk) => ({
    dateKey: dk,
    label: new Date(`${dk}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
    checkedIn: checkedInSet.has(dk),
    isToday: dk === todayKey,
  }));

  const mealLoggedAwarded = transactions.some(
    (t) => t.source === "MEAL_LOGGING" && t.sourceReference === todayKey
  );
  const waterAwarded = transactions.some(
    (t) =>
      t.source === "WATER_GOAL" &&
      t.sourceReference === todayKey &&
      t.type === RewardTransactionType.EARNED
  );
  const waterReversed = transactions.some(
    (t) =>
      t.source === "WATER_GOAL" &&
      t.sourceReference === todayKey &&
      t.type === RewardTransactionType.REVERSED
  );

  const totalWaterMl = todayWaterEntries.reduce((sum, e) => sum + e.amountMl, 0);
  const waterGoalMl = nutritionGoal?.waterGoalMl || 3000;

  // Next reward progress
  const nextReward =
    catalogue.find((r) => r.pointsRequired > account.availableBalance) ||
    catalogue[catalogue.length - 1] ||
    null;
  const pointsToNextReward = nextReward
    ? Math.max(0, nextReward.pointsRequired - account.availableBalance)
    : 0;

  return {
    account: {
      availableBalance: account.availableBalance,
      lifetimeEarned: account.lifetimeEarned,
      lifetimeRedeemed: account.lifetimeRedeemed,
    },
    nextReward: nextReward
      ? {
          id: nextReward.id,
          name: nextReward.name,
          pointsRequired: nextReward.pointsRequired,
          pointsNeeded: pointsToNextReward,
          progressPercent: Math.min(
            100,
            Math.round((account.availableBalance / Math.max(1, nextReward.pointsRequired)) * 100)
          ),
        }
      : null,
    dailyCheckIn: {
      checkedInToday: checkedInSet.has(todayKey),
      sevenDayHistory: sevenDayCheckIns,
    },
    activities: {
      dailyCheckInCompleted: checkedInSet.has(todayKey),
      mealLoggingCompleted: mealLoggedAwarded || todayFoodCount > 0,
      waterGoalCompleted:
        (waterAwarded && !waterReversed) || totalWaterMl >= waterGoalMl,
      todayFoodCount,
      totalWaterMl,
      waterGoalMl,
    },
    rules,
    catalogue,
    redemptions,
    transactions,
  };
}

/**
 * Admin: Overview of rules, catalogue, transactions, and suspicious activity.
 */
export async function getAdminRewardsOverview() {
  await ensureFuelPointsDefaults();

  const [rules, catalogue, transactions] = await Promise.all([
    withDbRetry(() => prisma.rewardRule.findMany({ orderBy: { activityType: "asc" } })),
    withDbRetry(() =>
      prisma.rewardCatalogue.findMany({ orderBy: { pointsRequired: "asc" } })
    ),
    withDbRetry(() =>
      prisma.rewardTransaction.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    ),
  ]);

  // Flag potential suspicious activity (e.g. multiple reversals or >= 5 transactions in 1 hour for same user)
  const reversalTxns = transactions.filter(
    (t) => t.type === RewardTransactionType.REVERSED
  );

  return {
    rules,
    catalogue,
    transactions,
    suspiciousSummary: {
      recentReversalsCount: reversalTxns.length,
    },
  };
}

export async function adminUpdateRewardRule(params: {
  activityType: RewardActivityType;
  points?: number;
  enabled?: boolean;
  rupeesPerPoint?: number;
}) {
  await ensureFuelPointsDefaults();
  const existing = await prisma.rewardRule.findUnique({
    where: { activityType: params.activityType },
  });
  if (!existing) throw new Error("Reward rule not found");

  const nextConfig =
    params.rupeesPerPoint !== undefined
      ? { ...((existing.configuration as object) || {}), rupeesPerPoint: params.rupeesPerPoint }
      : existing.configuration;

  return await withDbRetry(() =>
    prisma.rewardRule.update({
      where: { activityType: params.activityType },
      data: {
        ...(params.points !== undefined ? { points: params.points } : {}),
        ...(params.enabled !== undefined ? { enabled: params.enabled } : {}),
        ...(nextConfig !== undefined ? { configuration: nextConfig as any } : {}),
      },
    })
  );
}

export async function adminUpsertCatalogueReward(params: {
  id?: string;
  name: string;
  description: string;
  pointsRequired: number;
  discountAmount: number;
  minimumOrderValue: number;
  enabled: boolean;
  expiryDays: number;
}) {
  if (params.id) {
    return await withDbRetry(() =>
      prisma.rewardCatalogue.update({
        where: { id: params.id },
        data: {
          name: params.name,
          description: params.description,
          pointsRequired: params.pointsRequired,
          discountAmount: params.discountAmount,
          minimumOrderValue: params.minimumOrderValue,
          enabled: params.enabled,
          expiryDays: params.expiryDays,
        },
      })
    );
  }
  return await withDbRetry(() =>
    prisma.rewardCatalogue.create({
      data: {
        name: params.name,
        description: params.description,
        pointsRequired: params.pointsRequired,
        discountAmount: params.discountAmount,
        minimumOrderValue: params.minimumOrderValue,
        enabled: params.enabled,
        expiryDays: params.expiryDays,
      },
    })
  );
}

export async function adminManualAdjustPoints(params: {
  adminUserId: string;
  targetUserId: string;
  pointsDelta: number;
  reason: string;
}) {
  return await withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      const account = await tx.rewardAccount.upsert({
        where: { userId: params.targetUserId },
        create: {
          userId: params.targetUserId,
          availableBalance: 0,
          lifetimeEarned: 0,
          lifetimeRedeemed: 0,
        },
        update: {},
      });

      if (params.pointsDelta < 0 && account.availableBalance + params.pointsDelta < 0) {
        throw new Error(
          `Cannot deduct ${Math.abs(params.pointsDelta)} FP from balance of ${account.availableBalance} FP.`
        );
      }

      const txn = await tx.rewardTransaction.create({
        data: {
          userId: params.targetUserId,
          type: RewardTransactionType.ADJUSTED,
          points: params.pointsDelta,
          source: "ADMIN_ADJUSTMENT",
          idempotencyKey: `ADMIN_ADJ:${params.adminUserId}:${params.targetUserId}:${Date.now()}:${crypto.randomBytes(3).toString("hex")}`,
          description: `Admin adjustment: ${params.reason}`,
          performedBy: params.adminUserId,
          status: "COMPLETED",
        },
      });

      const updatedAccount = await tx.rewardAccount.update({
        where: { userId: params.targetUserId },
        data: {
          availableBalance: { increment: params.pointsDelta },
          ...(params.pointsDelta > 0
            ? { lifetimeEarned: { increment: params.pointsDelta } }
            : {}),
        },
      });

      return { txn, account: updatedAccount };
    })
  );
}
