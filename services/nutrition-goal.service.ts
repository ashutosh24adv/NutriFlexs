import { prisma } from "@/lib/prisma";
import { getDailyNutritionDiary, syncCompletedOrderToNutritionDiary } from "@/services/nutrition.service";

export interface NutritionGoalData {
  weightKg: number | null;
  proteinGoal: number;
  completedProtein: number;
  remainingProtein: number;
  progressPercent: number;
  hasWeight: boolean;
  isCustomGoal: boolean;
}

/**
 * Calculates start and end of day in UTC for a given timezone or date.
 * Defaults to Asia/Kolkata (IST, UTC+5:30) as standard for NutriFlexs gym kiosks.
 */
export function getLocalDayBounds(timeZone = "Asia/Kolkata", specificDateStr?: string) {
  const now = new Date();
  
  // Format current date in target timezone as YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  
  const targetDateStr = specificDateStr || formatter.format(now);
  const [yearStr, monthStr, dayStr] = targetDateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  // Approximate offset for start of day
  // To get exact UTC timestamp of midnight in target timezone:
  const startLocalAsUtc = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const endLocalAsUtc = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  // Determine timezone offset difference for precise UTC bounds
  const getTzOffsetMs = (date: Date, tz: string) => {
    const tzDateStr = date.toLocaleString("en-US", { timeZone: tz });
    const localDate = new Date(tzDateStr);
    return date.getTime() - localDate.getTime();
  };

  const startOffset = getTzOffsetMs(startLocalAsUtc, timeZone);
  const startOfDay = new Date(startLocalAsUtc.getTime() + startOffset);

  const endOffset = getTzOffsetMs(endLocalAsUtc, timeZone);
  const endOfDay = new Date(endLocalAsUtc.getTime() + endOffset);

  return { startOfDay, endOfDay, dateStr: targetDateStr };
}

/**
 * Retrieves the user's weight, daily protein goal, and calculates today's completed protein
 * using the unified Daily Nutrition Diary aggregation (single source of truth).
 */
export async function getUserNutritionGoal(
  userId: string,
  timeZone = "Asia/Kolkata",
  dateStr?: string
): Promise<NutritionGoalData> {
  const { startOfDay, endOfDay, dateStr: targetDateKey } = getLocalDayBounds(timeZone, dateStr);

  // 1. Ensure any completed NutriFlexs kiosk orders for this day are synced to FoodLog (idempotent)
  const completedOrders = await prisma.order.findMany({
    where: {
      userId,
      status: "COMPLETED",
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: { id: true },
  });

  for (const order of completedOrders) {
    await syncCompletedOrderToNutritionDiary(order.id);
  }

  // 2. Fetch daily nutrition diary (the single server-side source of truth for all logged foods)
  const diary = await getDailyNutritionDiary(userId, targetDateKey);

  // 3. Fetch user record for weight and fallback goals
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      weightKg: true,
      customDailyProteinGoal: true,
      proteinGoalGrams: true,
    },
  });

  if (!user) {
    return {
      weightKg: null,
      proteinGoal: 0,
      completedProtein: 0,
      remainingProtein: 0,
      progressPercent: 0,
      hasWeight: false,
      isCustomGoal: false,
    };
  }

  const completedProtein = Math.round(diary.totals.protein * 10) / 10;
  const hasWeight = typeof user.weightKg === "number" && user.weightKg > 0;

  // Resolve protein goal: prefer explicit diary goal (from NutritionGoal or User), then user fields
  let proteinGoal = 0;
  let isCustomGoal = false;

  if (diary.goals.proteinGoal && diary.goals.proteinGoal > 0) {
    proteinGoal = diary.goals.proteinGoal;
    isCustomGoal = true;
  } else if (user.customDailyProteinGoal && user.customDailyProteinGoal > 0) {
    proteinGoal = user.customDailyProteinGoal;
    isCustomGoal = true;
  } else if (user.proteinGoalGrams && user.proteinGoalGrams > 0) {
    proteinGoal = user.proteinGoalGrams;
    isCustomGoal = false;
  } else if (hasWeight && user.weightKg) {
    proteinGoal = Math.round(user.weightKg * 1.6);
    isCustomGoal = false;
  }

  const remainingProtein = Math.max(0, Math.round((proteinGoal - completedProtein) * 10) / 10);
  const progressPercent =
    proteinGoal > 0
      ? Math.round((completedProtein / proteinGoal) * 10000) / 100
      : 0;

  return {
    weightKg: user.weightKg,
    proteinGoal,
    completedProtein,
    remainingProtein,
    progressPercent,
    hasWeight,
    isCustomGoal,
  };
}

/**
 * Updates the user's weight in kilograms.
 * Automatically recalculates default protein goal (weight * 1.6) and keeps NutritionGoal synchronized.
 */
export async function updateUserWeight(userId: string, weightKg: number) {
  if (!weightKg || isNaN(weightKg) || weightKg <= 0 || weightKg > 500) {
    throw new Error("Invalid weight value. Please provide a positive numeric weight in kg.");
  }

  const roundedWeight = Math.round(weightKg * 10) / 10;
  const calculatedGoal = Math.round(roundedWeight * 1.6);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      weightKg: roundedWeight,
      proteinGoalGrams: calculatedGoal,
    },
    select: {
      id: true,
      weightKg: true,
      customDailyProteinGoal: true,
      proteinGoalGrams: true,
    },
  });

  // If user does not have an explicit custom goal, also sync to NutritionGoal table
  if (!updatedUser.customDailyProteinGoal) {
    await prisma.nutritionGoal.upsert({
      where: { userId },
      create: {
        userId,
        proteinGoal: calculatedGoal,
      },
      update: {
        proteinGoal: calculatedGoal,
      },
    });
  }

  return updatedUser;
}

/**
 * Updates the user's manual custom daily protein goal.
 * Keeps both User and NutritionGoal tables synchronized.
 */
export async function updateUserCustomGoal(
  userId: string,
  customDailyProteinGoal: number
) {
  if (
    !customDailyProteinGoal ||
    isNaN(customDailyProteinGoal) ||
    customDailyProteinGoal <= 0 ||
    customDailyProteinGoal > 600
  ) {
    throw new Error(
      "Invalid protein goal. Please provide a positive numeric protein target in grams."
    );
  }

  const rounded = Math.round(customDailyProteinGoal);

  const [updatedUser] = await Promise.all([
    prisma.user.update({
      where: { id: userId },
      data: {
        customDailyProteinGoal: rounded,
        proteinGoalGrams: rounded,
      },
      select: {
        id: true,
        weightKg: true,
        customDailyProteinGoal: true,
        proteinGoalGrams: true,
      },
    }),
    prisma.nutritionGoal.upsert({
      where: { userId },
      create: {
        userId,
        proteinGoal: rounded,
      },
      update: {
        proteinGoal: rounded,
      },
    }),
  ]);

  return updatedUser;
}
