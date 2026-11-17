import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
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

    // 1. Fetch user's nutrition goals & baseline
    const [initialGoalRecord, userRecord] = await withDbRetry(() =>
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
      ])
    );

    let goalRecord = initialGoalRecord;
    if (!goalRecord && userRecord) {
      const weight = userRecord.weightKg && userRecord.weightKg > 0 ? userRecord.weightKg : 70;
      const height = userRecord.heightCm && userRecord.heightCm > 0 ? userRecord.heightCm : 175;
      const isFemale = (userRecord.sex || "").toLowerCase().includes("female");
      let age = 25;
      if (userRecord.dateOfBirth) {
        const diffMs = Date.now() - new Date(userRecord.dateOfBirth).getTime();
        const computedAge = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
        if (computedAge >= 14 && computedAge <= 100) age = computedAge;
      }
      const bmr = 10 * weight + 6.25 * height - 5 * age + (isFemale ? -161 : 5);
      const freq = (userRecord.workoutFrequency || "").toLowerCase();
      let activityMult = 1.4;
      if (freq.includes("7+") || freq.includes("daily")) activityMult = 1.725;
      else if (freq.includes("4-6") || freq.includes("5")) activityMult = 1.55;
      else if (freq.includes("0-4") || freq.includes("1-3")) activityMult = 1.35;
      let tdee = bmr * activityMult;
      const pGoal = (userRecord.primaryGoal || "").toLowerCase();
      if (pGoal.includes("lose")) tdee -= 400;
      else if (pGoal.includes("build") || pGoal.includes("muscle")) tdee += 300;
      const dailyCalorieGoal = Math.max(1200, Math.min(4500, Math.round(tdee / 50) * 50));
      const proteinGoal =
        userRecord.customDailyProteinGoal ||
        userRecord.proteinGoalGrams ||
        Math.max(60, Math.min(260, Math.round(weight * 1.8)));
      const fatGoal = Math.max(40, Math.min(120, Math.round((dailyCalorieGoal * 0.25) / 9)));
      const carbCalories = dailyCalorieGoal - proteinGoal * 4 - fatGoal * 9;
      const carbohydrateGoal = Math.max(100, Math.min(600, Math.round(carbCalories / 4)));

      try {
        goalRecord = await withDbRetry(() =>
          prisma.nutritionGoal.create({
            data: {
              userId,
              dailyCalorieGoal,
              proteinGoal,
              carbohydrateGoal,
              fatGoal,
              calorieTarget: dailyCalorieGoal,
              proteinTarget: proteinGoal,
              carbsTarget: carbohydrateGoal,
              fatsTarget: fatGoal,
              waterGoalMl: 3000,
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

    const targetCalories = goalRecord?.calorieTarget ?? goalRecord?.dailyCalorieGoal ?? 2000;
    const targetProtein =
      goalRecord?.proteinTarget ??
      goalRecord?.proteinGoal ??
      userRecord?.customDailyProteinGoal ??
      userRecord?.proteinGoalGrams ??
      120;
    const targetCarbs = goalRecord?.carbsTarget ?? goalRecord?.carbohydrateGoal ?? 250;
    const targetFat = goalRecord?.fatsTarget ?? goalRecord?.fatGoal ?? 65;
    const targetWater = goalRecord?.waterGoalMl ?? 3000;

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

    const remainingCalories = Math.max(0, Math.round((targetCalories - consumedCalories) * 10) / 10);
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
        protein: targetProtein,
        proteinTarget: targetProtein,
        proteinGrams: targetProtein,
        carbs: targetCarbs,
        carbsTarget: targetCarbs,
        carbsGrams: targetCarbs,
        fat: targetFat,
        fatsTarget: targetFat,
        fatGrams: targetFat,
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
