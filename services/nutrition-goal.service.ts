import { prisma } from "@/lib/prisma";

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
 * Retrieves the user's weight, daily protein goal, and calculates today's completed protein.
 */
export async function getUserNutritionGoal(
  userId: string,
  timeZone = "Asia/Kolkata",
  dateStr?: string
): Promise<NutritionGoalData> {
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

  const { startOfDay, endOfDay } = getLocalDayBounds(timeZone, dateStr);

  // Fetch only COMPLETED orders for the user placed on the target calendar day
  const completedOrders = await prisma.order.findMany({
    where: {
      userId: user.id,
      status: "COMPLETED",
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      id: true,
      items: {
        select: {
          quantity: true,
          product: {
            select: {
              protein: true,
            },
          },
        },
      },
    },
  });

  // Calculate sum of (quantity * product.protein)
  let totalProteinGrams = 0;
  for (const order of completedOrders) {
    for (const item of order.items) {
      if (item.product && item.quantity > 0) {
        totalProteinGrams += item.quantity * (item.product.protein || 0);
      }
    }
  }

  const completedProtein = Math.round(totalProteinGrams);

  const hasWeight = typeof user.weightKg === "number" && user.weightKg > 0;
  const hasCustomGoal =
    typeof user.customDailyProteinGoal === "number" &&
    user.customDailyProteinGoal > 0;

  let proteinGoal = 0;
  let isCustomGoal = false;

  if (hasCustomGoal && user.customDailyProteinGoal) {
    proteinGoal = user.customDailyProteinGoal;
    isCustomGoal = true;
  } else if (hasWeight && user.weightKg) {
    // Default fitness rule: weight (kg) * 1.6g
    proteinGoal = Math.round(user.weightKg * 1.6);
    isCustomGoal = false;
  } else {
    // No weight and no custom goal
    proteinGoal = 0;
    isCustomGoal = false;
  }

  const remainingProtein = Math.max(0, proteinGoal - completedProtein);
  const progressPercent =
    proteinGoal > 0
      ? Math.min(100, Math.round((completedProtein / proteinGoal) * 100))
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
 * Automatically recalculates default protein goal (weight * 1.6).
 */
export async function updateUserWeight(userId: string, weightKg: number) {
  if (!weightKg || isNaN(weightKg) || weightKg <= 0 || weightKg > 500) {
    throw new Error("Invalid weight value. Please provide a positive numeric weight in kg.");
  }

  const calculatedGoal = Math.round(weightKg * 1.6);

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      weightKg: Math.round(weightKg * 10) / 10,
      proteinGoalGrams: calculatedGoal,
    },
    select: {
      id: true,
      weightKg: true,
      customDailyProteinGoal: true,
      proteinGoalGrams: true,
    },
  });

  return updatedUser;
}

/**
 * Updates the user's manual custom daily protein goal.
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

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      customDailyProteinGoal: Math.round(customDailyProteinGoal),
      proteinGoalGrams: Math.round(customDailyProteinGoal),
    },
    select: {
      id: true,
      weightKg: true,
      customDailyProteinGoal: true,
      proteinGoalGrams: true,
    },
  });

  return updatedUser;
}
