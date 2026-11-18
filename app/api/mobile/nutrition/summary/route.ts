import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { calculateBaselineGoals } from "@/lib/nutrition-baseline";
import { MealType } from "@prisma/client";

export const dynamic = "force-dynamic";

function getLocalDateString(date = new Date(), timeZone = "Asia/Kolkata"): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * GET /api/mobile/nutrition/summary?date=YYYY-MM-DD
 * Returns targets, consumed macros, food logs for target date, water intake,
 * today's activeCalories (burned calories) from DailyHealthMetric,
 * remaining calories calculated dynamically as:
 * Math.max(0, calorieTarget - consumedCalories + (todayMetric?.activeCalories || 0)),
 * and 7-day macro trends array.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authUser.id;

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const targetDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getLocalDateString();

    // 1. Fetch user's nutrition goals, baseline, and today's DailyHealthMetric from Neon Postgres
    const [initialGoalRecord, userRecord, todayMetric] = await withDbRetry(() =>
      Promise.all([
        prisma.nutritionGoal.findUnique({
          where: { userId },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            proteinGoalGrams: true,
            customDailyProteinGoal: true,
            weightKg: true,
            heightCm: true,
            sex: true,
            dateOfBirth: true,
            workoutFrequency: true,
            primaryGoal: true,
          },
        }),
        prisma.dailyHealthMetric.findUnique({
          where: {
            userId_dateKey: {
              userId,
              dateKey: targetDate,
            },
          },
        }),
      ])
    );

    let goalRecord = initialGoalRecord;
    const baseline = calculateBaselineGoals({
      weightKg: userRecord?.weightKg,
      heightCm: userRecord?.heightCm,
      sex: userRecord?.sex,
      dateOfBirth: userRecord?.dateOfBirth,
      workoutFrequency: userRecord?.workoutFrequency,
      primaryGoal: userRecord?.primaryGoal,
      customDailyProteinGoal: userRecord?.customDailyProteinGoal,
      proteinGoalGrams: userRecord?.proteinGoalGrams,
    });

    if (!goalRecord && userRecord) {
      try {
        goalRecord = await withDbRetry(() =>
          prisma.nutritionGoal.create({
            data: {
              userId,
              dailyCalorieGoal: baseline.dailyCalorieGoal,
              proteinGoal: baseline.proteinGoal,
              carbohydrateGoal: baseline.carbohydrateGoal,
              fatGoal: baseline.fatGoal,
              calorieTarget: baseline.dailyCalorieGoal,
              proteinTarget: baseline.proteinGoal,
              carbsTarget: baseline.carbohydrateGoal,
              fatsTarget: baseline.fatGoal,
              waterGoalMl: baseline.waterGoalMl,
              onboardingCompleted: true,
              sex: userRecord.sex,
              dateOfBirth: userRecord.dateOfBirth,
              heightCm: userRecord.heightCm,
              weightKg: userRecord.weightKg,
              workoutFrequency: userRecord.workoutFrequency,
              primaryGoal: userRecord.primaryGoal,
            },
          })
        );
      } catch {
        goalRecord = await withDbRetry(() =>
          prisma.nutritionGoal.findUnique({ where: { userId } })
        );
      }
    }

    const targetCalories =
      goalRecord?.calorieTarget || goalRecord?.dailyCalorieGoal || baseline.dailyCalorieGoal;
    const targetProtein =
      goalRecord?.proteinTarget ||
      goalRecord?.proteinGoal ||
      userRecord?.customDailyProteinGoal ||
      userRecord?.proteinGoalGrams ||
      baseline.proteinGoal;
    const targetCarbs =
      goalRecord?.carbsTarget || goalRecord?.carbohydrateGoal || baseline.carbohydrateGoal;
    const targetFat =
      goalRecord?.fatsTarget || goalRecord?.fatGoal || baseline.fatGoal;
    const targetWater =
      goalRecord?.waterGoalMl || baseline.waterGoalMl;

    // 2. Fetch food logs for targetDate
    const logs = await withDbRetry(() =>
      prisma.foodLog.findMany({
        where: {
          userId,
          dateKey: targetDate,
        },
        orderBy: { loggedAt: "asc" },
      })
    );

    let consumedCalories = 0;
    let consumedProtein = 0;
    let consumedCarbs = 0;
    let consumedFat = 0;

    const meals: Record<MealType, any[]> = {
      [MealType.BREAKFAST]: [],
      [MealType.LUNCH]: [],
      [MealType.SNACKS]: [],
      [MealType.DINNER]: [],
    };

    const formattedLogs = logs.map((log) => {
      const cals = Math.round(log.calories * 10) / 10;
      const prot = Math.round(log.protein * 10) / 10;
      const carbs = Math.round(log.carbohydrates * 10) / 10;
      const fat = Math.round(log.fat * 10) / 10;

      consumedCalories += cals;
      consumedProtein += prot;
      consumedCarbs += carbs;
      consumedFat += fat;

      const item = {
        id: log.id,
        foodName: log.foodNameSnapshot,
        title: log.foodNameSnapshot,
        variantName: log.variantNameSnapshot,
        mealType: log.mealType,
        slot: log.mealType,
        quantity: log.quantity,
        unit: log.unit,
        grams: log.gramsCalculated,
        calories: cals,
        protein: prot,
        carbs,
        fat,
        loggedAt: log.loggedAt.toISOString(),
        dateKey: log.dateKey,
        isAutoLogged: Boolean(log.orderItemId),
        foodItemId: log.foodItemId,
        foodVariantId: log.foodVariantId,
        productId: log.productId,
      };

      if (meals[log.mealType]) {
        meals[log.mealType].push(item);
      } else {
        meals[MealType.LUNCH].push(item);
      }

      return item;
    });

    consumedCalories = Math.round(consumedCalories * 10) / 10;
    consumedProtein = Math.round(consumedProtein * 10) / 10;
    consumedCarbs = Math.round(consumedCarbs * 10) / 10;
    consumedFat = Math.round(consumedFat * 10) / 10;

    // Active calories (burned calories) from DailyHealthMetric
    const activeCalories = todayMetric?.activeCalories
      ? Math.round(todayMetric.activeCalories * 10) / 10
      : 0;

    // Calculate remaining calories: Math.max(0, calorieTarget - consumedCalories + (todayMetric?.activeCalories || 0))
    const remainingCalories = Math.max(
      0,
      Math.round((targetCalories - consumedCalories + (todayMetric?.activeCalories || 0)) * 10) / 10
    );
    const remainingProtein = Math.max(0, Math.round((targetProtein - consumedProtein) * 10) / 10);
    const remainingCarbs = Math.max(0, Math.round((targetCarbs - consumedCarbs) * 10) / 10);
    const remainingFat = Math.max(0, Math.round((targetFat - consumedFat) * 10) / 10);

    // 3. Fetch water intake for targetDate
    const waterRecord = await withDbRetry(() =>
      prisma.waterLog.findUnique({
        where: {
          userId_dateKey: {
            userId,
            dateKey: targetDate,
          },
        },
      })
    );

    const waterMl = waterRecord?.amountMl || 0;

    // 4. Calculate 7-day trend array ending on targetDate
    const baseDate = new Date(`${targetDate}T12:00:00Z`);
    const dateRangeKeys: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setUTCDate(d.getUTCDate() - i);
      dateRangeKeys.push(d.toISOString().split("T")[0]);
    }

    const pastLogs = await withDbRetry(() =>
      prisma.foodLog.findMany({
        where: {
          userId,
          dateKey: { in: dateRangeKeys },
        },
      })
    );

    const trends = dateRangeKeys.map((isoKey) => {
      const logsForDay = pastLogs.filter((l) => l.dateKey === isoKey);
      const dayDate = new Date(`${isoKey}T12:00:00Z`);
      const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

      const dayCalories = logsForDay.reduce((acc, l) => acc + l.calories, 0);
      const dayProtein = logsForDay.reduce((acc, l) => acc + l.protein, 0);
      const dayCarbs = logsForDay.reduce((acc, l) => acc + l.carbohydrates, 0);
      const dayFat = logsForDay.reduce((acc, l) => acc + l.fat, 0);

      return {
        day: dayName,
        dateStr: isoKey,
        calories: Math.round(dayCalories),
        protein: Math.round(dayProtein * 10) / 10,
        carbs: Math.round(dayCarbs * 10) / 10,
        fat: Math.round(dayFat * 10) / 10,
        isToday: isoKey === targetDate,
      };
    });

    return NextResponse.json({
      success: true,
      date: targetDate,
      targets: {
        calories: targetCalories,
        calorieTarget: targetCalories,
        dailyCalorieGoal: targetCalories,
        protein: targetProtein,
        proteinTarget: targetProtein,
        proteinGrams: targetProtein,
        proteinGoal: targetProtein,
        carbs: targetCarbs,
        carbsTarget: targetCarbs,
        carbsGrams: targetCarbs,
        carbohydrateGoal: targetCarbs,
        fat: targetFat,
        fatsTarget: targetFat,
        fatGrams: targetFat,
        fatGoal: targetFat,
        waterMl: targetWater,
        waterGoalMl: targetWater,
      },
      goals: goalRecord,
      nutritionGoal: goalRecord,
      consumed: {
        calories: consumedCalories,
        protein: consumedProtein,
        carbs: consumedCarbs,
        fat: consumedFat,
      },
      activeCalories,
      burnedCalories: activeCalories,
      todayActiveCalories: activeCalories,
      todayMetric: todayMetric
        ? {
            date: todayMetric.dateKey,
            steps: todayMetric.steps,
            activeCalories: todayMetric.activeCalories,
            restingCalories: todayMetric.restingCalories,
            totalCalories: todayMetric.totalCalories,
            avgHeartRate: todayMetric.avgHeartRate,
            distanceMeters: todayMetric.distanceMeters ?? 0,
            syncedAt: todayMetric.syncedAt,
            source: todayMetric.source,
          }
        : null,
      healthMetric: todayMetric
        ? {
            steps: todayMetric.steps,
            activeCalories: todayMetric.activeCalories,
            heartRate: todayMetric.avgHeartRate,
            avgHeartRate: todayMetric.avgHeartRate,
            distanceMeters: todayMetric.distanceMeters ?? 0,
            syncedAt: todayMetric.syncedAt,
          }
        : null,
      remaining: {
        calories: remainingCalories,
        protein: remainingProtein,
        carbs: remainingCarbs,
        fat: remainingFat,
      },
      water: {
        amountMl: waterMl,
        goalMl: targetWater,
      },
      waterLog: waterRecord,
      foodLogs: formattedLogs,
      meals,
      trends,
    });
  } catch (error: any) {
    console.error("[Mobile Nutrition Summary Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch nutrition summary" },
      { status: 500 }
    );
  }
}
