import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/nutrition/goals
 * Fetches the current athlete's nutrition goals and baseline settings.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    let [goal, user] = await withDbRetry(() =>
      Promise.all([
        prisma.nutritionGoal.findUnique({
          where: { userId },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            sex: true,
            dateOfBirth: true,
            heightCm: true,
            weightKg: true,
            workoutFrequency: true,
            primaryGoal: true,
            desiredTargetWeightKg: true,
            goalDays: true,
            goalPace: true,
            dietPreference: true,
            barriers: true,
            accomplishments: true,
            dietitianConsulted: true,
            calorieRollover: true,
            notificationsEnabled: true,
            passBalance: true,
            proteinGoalGrams: true,
            customDailyProteinGoal: true,
          },
        }),
      ])
    );

    if (!goal && user) {
      const weight = user.weightKg && user.weightKg > 0 ? user.weightKg : 70;
      const height = user.heightCm && user.heightCm > 0 ? user.heightCm : 175;
      const isFemale = (user.sex || "").toLowerCase().includes("female");
      let age = 25;
      if (user.dateOfBirth) {
        const diffMs = Date.now() - new Date(user.dateOfBirth).getTime();
        const computedAge = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
        if (computedAge >= 14 && computedAge <= 100) age = computedAge;
      }
      const bmr = 10 * weight + 6.25 * height - 5 * age + (isFemale ? -161 : 5);
      const freq = (user.workoutFrequency || "").toLowerCase();
      let activityMult = 1.4;
      if (freq.includes("7+") || freq.includes("daily")) activityMult = 1.725;
      else if (freq.includes("4-6") || freq.includes("5")) activityMult = 1.55;
      else if (freq.includes("0-4") || freq.includes("1-3")) activityMult = 1.35;
      let tdee = bmr * activityMult;
      const pGoal = (user.primaryGoal || "").toLowerCase();
      if (pGoal.includes("lose")) tdee -= 400;
      else if (pGoal.includes("build") || pGoal.includes("muscle")) tdee += 300;
      const dailyCalorieGoal = Math.max(1200, Math.min(4500, Math.round(tdee / 50) * 50));
      const proteinGoal =
        user.customDailyProteinGoal ||
        user.proteinGoalGrams ||
        Math.max(60, Math.min(260, Math.round(weight * 1.8)));
      const fatGoal = Math.max(40, Math.min(120, Math.round((dailyCalorieGoal * 0.25) / 9)));
      const carbCalories = dailyCalorieGoal - proteinGoal * 4 - fatGoal * 9;
      const carbohydrateGoal = Math.max(100, Math.min(600, Math.round(carbCalories / 4)));

      try {
        goal = await withDbRetry(() =>
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
              sex: user.sex,
              dateOfBirth: user.dateOfBirth,
              heightCm: user.heightCm,
              weightKg: user.weightKg,
              workoutFrequency: user.workoutFrequency,
              primaryGoal: user.primaryGoal,
            },
          })
        );
      } catch {
        goal = await withDbRetry(() =>
          prisma.nutritionGoal.findUnique({ where: { userId } })
        );
      }
    }

    const targets = {
      calories: goal?.calorieTarget ?? goal?.dailyCalorieGoal ?? 2000,
      calorieTarget: goal?.calorieTarget ?? goal?.dailyCalorieGoal ?? 2000,
      dailyCalorieGoal: goal?.dailyCalorieGoal ?? goal?.calorieTarget ?? 2000,
      protein: goal?.proteinTarget ?? goal?.proteinGoal ?? user?.customDailyProteinGoal ?? user?.proteinGoalGrams ?? 120,
      proteinTarget: goal?.proteinTarget ?? goal?.proteinGoal ?? user?.customDailyProteinGoal ?? user?.proteinGoalGrams ?? 120,
      proteinGrams: goal?.proteinTarget ?? goal?.proteinGoal ?? user?.customDailyProteinGoal ?? user?.proteinGoalGrams ?? 120,
      carbs: goal?.carbsTarget ?? goal?.carbohydrateGoal ?? 250,
      carbsTarget: goal?.carbsTarget ?? goal?.carbohydrateGoal ?? 250,
      carbsGrams: goal?.carbsTarget ?? goal?.carbohydrateGoal ?? 250,
      fat: goal?.fatsTarget ?? goal?.fatGoal ?? 65,
      fatsTarget: goal?.fatsTarget ?? goal?.fatGoal ?? 65,
      fatGrams: goal?.fatsTarget ?? goal?.fatGoal ?? 65,
      waterMl: goal?.waterGoalMl ?? 3000,
      waterGoalMl: goal?.waterGoalMl ?? 3000,
    };

    return NextResponse.json({
      success: true,
      goals: goal,
      nutritionGoal: goal,
      data: goal,
      targets,
      user,
    });
  } catch (error: any) {
    console.error("[Mobile Goals GET Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch nutrition goals" },
      { status: 500 }
    );
  }
}

/**
 * Handles upserting NutritionGoal and synchronizing User baseline settings.
 */
async function handleUpsertGoals(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    const body = await req.json();
    const targetObj = body.targets || body.goals || body.nutritionGoal || body;

    // Prepare calorie targets
    const rawCal =
      targetObj.dailyCalorieGoal ??
      targetObj.calorieTarget ??
      targetObj.calories ??
      body.dailyCalorieGoal ??
      body.calorieTarget ??
      body.calories;
    const dailyCalorieGoal =
      rawCal !== undefined && !isNaN(parseInt(String(rawCal), 10)) && parseInt(String(rawCal), 10) > 0
        ? parseInt(String(rawCal), 10)
        : undefined;

    // Prepare protein targets
    const rawProtein =
      targetObj.proteinGoal ??
      targetObj.proteinTarget ??
      targetObj.proteinGrams ??
      targetObj.protein ??
      body.proteinGoal ??
      body.proteinTarget ??
      body.proteinGrams ??
      body.protein;
    const proteinGoal =
      rawProtein !== undefined && !isNaN(parseFloat(String(rawProtein))) && parseFloat(String(rawProtein)) > 0
        ? parseFloat(String(rawProtein))
        : undefined;

    // Prepare carbohydrate targets
    const rawCarbs =
      targetObj.carbohydrateGoal ??
      targetObj.carbsTarget ??
      targetObj.carbsGrams ??
      targetObj.carbs ??
      body.carbohydrateGoal ??
      body.carbsTarget ??
      body.carbs;
    const carbohydrateGoal =
      rawCarbs !== undefined && !isNaN(parseFloat(String(rawCarbs))) && parseFloat(String(rawCarbs)) > 0
        ? parseFloat(String(rawCarbs))
        : undefined;

    // Prepare fat targets
    const rawFat =
      targetObj.fatGoal ??
      targetObj.fatsTarget ??
      targetObj.fatGrams ??
      targetObj.fat ??
      body.fatGoal ??
      body.fatsTarget ??
      body.fat;
    const fatGoal =
      rawFat !== undefined && !isNaN(parseFloat(String(rawFat))) && parseFloat(String(rawFat)) > 0
        ? parseFloat(String(rawFat))
        : undefined;

    // Water target in ml
    const rawWater =
      targetObj.waterGoalMl ??
      targetObj.waterMl ??
      targetObj.water ??
      body.waterGoalMl ??
      body.waterMl ??
      body.water;
    const waterGoalMl =
      rawWater !== undefined && !isNaN(parseInt(String(rawWater), 10)) && parseInt(String(rawWater), 10) > 0
        ? parseInt(String(rawWater), 10)
        : undefined;

    const onboardingCompleted =
      body.onboardingCompleted !== undefined
        ? Boolean(body.onboardingCompleted)
        : undefined;

    const sex = body.sex !== undefined ? String(body.sex).trim() : undefined;

    let dateOfBirth: Date | undefined | null = undefined;
    if (body.dateOfBirth !== undefined || body.dob !== undefined || body.birthDate !== undefined) {
      const rawDob = body.dateOfBirth ?? body.dob ?? body.birthDate;
      if (rawDob) {
        const parsed = new Date(rawDob);
        if (!isNaN(parsed.getTime())) {
          dateOfBirth = parsed;
        }
      } else {
        dateOfBirth = null;
      }
    }

    const heightCm =
      body.heightCm !== undefined && body.heightCm !== null
        ? parseFloat(String(body.heightCm))
        : undefined;

    const weightKg =
      body.weightKg !== undefined && body.weightKg !== null
        ? parseFloat(String(body.weightKg))
        : undefined;

    const workoutFrequency =
      body.workoutFrequency !== undefined ? String(body.workoutFrequency).trim() : undefined;

    const primaryGoal =
      body.primaryGoal !== undefined ? String(body.primaryGoal).trim() : undefined;

    const desiredTargetWeightKg =
      body.desiredTargetWeightKg !== undefined && body.desiredTargetWeightKg !== null
        ? parseFloat(String(body.desiredTargetWeightKg))
        : undefined;

    const goalDays =
      body.goalDays !== undefined && body.goalDays !== null
        ? parseInt(String(body.goalDays), 10)
        : undefined;

    const goalPace =
      body.goalPace !== undefined ? String(body.goalPace).trim() : undefined;

    const dietPreference =
      body.dietPreference !== undefined ? String(body.dietPreference).trim() : undefined;

    const barriers =
      body.barriers !== undefined
        ? Array.isArray(body.barriers)
          ? body.barriers
          : [String(body.barriers)]
        : undefined;

    const accomplishments =
      body.accomplishments !== undefined
        ? Array.isArray(body.accomplishments)
          ? body.accomplishments
          : [String(body.accomplishments)]
        : undefined;

    const dietitianConsulted =
      body.dietitianConsulted !== undefined ? String(body.dietitianConsulted).trim() : undefined;

    const calorieRollover =
      body.calorieRollover !== undefined
        ? Boolean(body.calorieRollover)
        : body.calorieRolloverEnabled !== undefined
        ? Boolean(body.calorieRolloverEnabled)
        : undefined;

    const notificationsEnabled =
      body.notificationsEnabled !== undefined ? Boolean(body.notificationsEnabled) : undefined;

    // Build update object for NutritionGoal
    const goalData: any = {};
    if (dailyCalorieGoal !== undefined) {
      goalData.dailyCalorieGoal = dailyCalorieGoal;
      goalData.calorieTarget = dailyCalorieGoal;
    }
    if (proteinGoal !== undefined) {
      goalData.proteinGoal = proteinGoal;
      goalData.proteinTarget = proteinGoal;
    }
    if (carbohydrateGoal !== undefined) {
      goalData.carbohydrateGoal = carbohydrateGoal;
      goalData.carbsTarget = carbohydrateGoal;
    }
    if (fatGoal !== undefined) {
      goalData.fatGoal = fatGoal;
      goalData.fatsTarget = fatGoal;
    }
    if (waterGoalMl !== undefined) goalData.waterGoalMl = waterGoalMl;
    if (onboardingCompleted !== undefined) goalData.onboardingCompleted = onboardingCompleted;
    if (sex !== undefined) goalData.sex = sex;
    if (dateOfBirth !== undefined) goalData.dateOfBirth = dateOfBirth;
    if (heightCm !== undefined) goalData.heightCm = heightCm;
    if (weightKg !== undefined) goalData.weightKg = weightKg;
    if (workoutFrequency !== undefined) goalData.workoutFrequency = workoutFrequency;
    if (primaryGoal !== undefined) goalData.primaryGoal = primaryGoal;
    if (desiredTargetWeightKg !== undefined) goalData.desiredTargetWeightKg = desiredTargetWeightKg;
    if (goalDays !== undefined) goalData.goalDays = goalDays;
    if (goalPace !== undefined) goalData.goalPace = goalPace;
    if (dietPreference !== undefined) goalData.dietPreference = dietPreference;
    if (barriers !== undefined) goalData.barriers = barriers;
    if (accomplishments !== undefined) goalData.accomplishments = accomplishments;
    if (dietitianConsulted !== undefined) goalData.dietitianConsulted = dietitianConsulted;
    if (calorieRollover !== undefined) goalData.calorieRollover = calorieRollover;
    if (notificationsEnabled !== undefined) goalData.notificationsEnabled = notificationsEnabled;

    // Upsert NutritionGoal in Neon Postgres
    const updatedGoal = await withDbRetry(() =>
      prisma.nutritionGoal.upsert({
        where: { userId },
        create: {
          userId,
          dailyCalorieGoal: dailyCalorieGoal ?? 2000,
          proteinGoal: proteinGoal ?? 120,
          carbohydrateGoal: carbohydrateGoal ?? 250,
          fatGoal: fatGoal ?? 65,
          calorieTarget: dailyCalorieGoal ?? 2000,
          proteinTarget: proteinGoal ?? 120,
          carbsTarget: carbohydrateGoal ?? 250,
          fatsTarget: fatGoal ?? 65,
          waterGoalMl: waterGoalMl ?? 3000,
          onboardingCompleted: onboardingCompleted ?? true,
          sex: sex ?? null,
          dateOfBirth: dateOfBirth ?? null,
          heightCm: heightCm ?? null,
          weightKg: weightKg ?? null,
          workoutFrequency: workoutFrequency ?? null,
          primaryGoal: primaryGoal ?? null,
          desiredTargetWeightKg: desiredTargetWeightKg ?? null,
          goalDays: goalDays ?? null,
          goalPace: goalPace ?? null,
          dietPreference: dietPreference ?? null,
          barriers: barriers ?? [],
          accomplishments: accomplishments ?? [],
          dietitianConsulted: dietitianConsulted ?? null,
          calorieRollover: calorieRollover ?? false,
          notificationsEnabled: notificationsEnabled ?? true,
        },
        update: goalData,
      })
    );

    // Keep User table in sync
    const userData: any = {};
    if (sex !== undefined) userData.sex = sex;
    if (dateOfBirth !== undefined) userData.dateOfBirth = dateOfBirth;
    if (heightCm !== undefined) userData.heightCm = heightCm;
    if (weightKg !== undefined) userData.weightKg = weightKg;
    if (workoutFrequency !== undefined) userData.workoutFrequency = workoutFrequency;
    if (primaryGoal !== undefined) {
      userData.primaryGoal = primaryGoal;
      userData.primaryNutritionGoal = primaryGoal;
    }
    if (desiredTargetWeightKg !== undefined) userData.desiredTargetWeightKg = desiredTargetWeightKg;
    if (goalDays !== undefined) userData.goalDays = goalDays;
    if (goalPace !== undefined) userData.goalPace = goalPace;
    if (dietPreference !== undefined) userData.dietPreference = dietPreference;
    if (barriers !== undefined) userData.barriers = barriers;
    if (accomplishments !== undefined) userData.accomplishments = accomplishments;
    if (dietitianConsulted !== undefined) userData.dietitianConsulted = dietitianConsulted;
    if (calorieRollover !== undefined) {
      userData.calorieRollover = calorieRollover;
      userData.calorieRolloverEnabled = calorieRollover;
    }
    if (notificationsEnabled !== undefined) userData.notificationsEnabled = notificationsEnabled;
    if (proteinGoal !== undefined && proteinGoal > 0) {
      const roundedProt = Math.round(proteinGoal);
      userData.customDailyProteinGoal = roundedProt;
      userData.proteinGoalGrams = roundedProt;
    }
    if (onboardingCompleted) {
      userData.hasCompletedNutritionOnboarding = true;
      userData.nutritionOnboardingCompletedAt = new Date();
    }

    let updatedUser = null;
    if (Object.keys(userData).length > 0) {
      updatedUser = await withDbRetry(() =>
        prisma.user.update({
          where: { id: userId },
          data: userData,
          select: {
            id: true,
            name: true,
            email: true,
            passBalance: true,
            sex: true,
            dateOfBirth: true,
            heightCm: true,
            weightKg: true,
            workoutFrequency: true,
            primaryGoal: true,
            desiredTargetWeightKg: true,
            goalDays: true,
            goalPace: true,
            dietPreference: true,
            barriers: true,
            accomplishments: true,
            dietitianConsulted: true,
            calorieRollover: true,
            notificationsEnabled: true,
          },
        })
      );
    }

    const targets = {
      calories: updatedGoal.calorieTarget ?? updatedGoal.dailyCalorieGoal ?? 2000,
      calorieTarget: updatedGoal.calorieTarget ?? updatedGoal.dailyCalorieGoal ?? 2000,
      dailyCalorieGoal: updatedGoal.dailyCalorieGoal ?? updatedGoal.calorieTarget ?? 2000,
      protein: updatedGoal.proteinTarget ?? updatedGoal.proteinGoal ?? 120,
      proteinTarget: updatedGoal.proteinTarget ?? updatedGoal.proteinGoal ?? 120,
      proteinGrams: updatedGoal.proteinTarget ?? updatedGoal.proteinGoal ?? 120,
      carbs: updatedGoal.carbsTarget ?? updatedGoal.carbohydrateGoal ?? 250,
      carbsTarget: updatedGoal.carbsTarget ?? updatedGoal.carbohydrateGoal ?? 250,
      carbsGrams: updatedGoal.carbsTarget ?? updatedGoal.carbohydrateGoal ?? 250,
      fat: updatedGoal.fatsTarget ?? updatedGoal.fatGoal ?? 65,
      fatsTarget: updatedGoal.fatsTarget ?? updatedGoal.fatGoal ?? 65,
      fatGrams: updatedGoal.fatsTarget ?? updatedGoal.fatGoal ?? 65,
      waterMl: updatedGoal.waterGoalMl ?? 3000,
      waterGoalMl: updatedGoal.waterGoalMl ?? 3000,
    };

    return NextResponse.json({
      success: true,
      message: "Nutrition goals updated successfully",
      goals: updatedGoal,
      nutritionGoal: updatedGoal,
      data: updatedGoal,
      targets,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error("[Mobile Goals PUT/POST Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update nutrition goals" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mobile/nutrition/goals
 * Updates NutritionGoal and User baseline stats.
 */
export async function PUT(req: NextRequest) {
  return handleUpsertGoals(req);
}

/**
 * POST /api/mobile/nutrition/goals
 * Upserts NutritionGoal and returns the saved record.
 */
export async function POST(req: NextRequest) {
  return handleUpsertGoals(req);
}
