import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { calculateBaselineGoals } from "@/lib/nutrition-baseline";

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

    const baseline = calculateBaselineGoals({
      weightKg: user?.weightKg,
      heightCm: user?.heightCm,
      sex: user?.sex,
      dateOfBirth: user?.dateOfBirth,
      workoutFrequency: user?.workoutFrequency,
      primaryGoal: user?.primaryGoal,
      customDailyProteinGoal: user?.customDailyProteinGoal,
      proteinGoalGrams: user?.proteinGoalGrams,
    });

    if (!goal && user) {
      try {
        goal = await withDbRetry(() =>
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

    const targetCalories =
      goal?.calorieTarget || goal?.dailyCalorieGoal || baseline.dailyCalorieGoal;
    const targetProtein =
      goal?.proteinTarget ||
      goal?.proteinGoal ||
      user?.customDailyProteinGoal ||
      user?.proteinGoalGrams ||
      baseline.proteinGoal;
    const targetCarbs =
      goal?.carbsTarget || goal?.carbohydrateGoal || baseline.carbohydrateGoal;
    const targetFat =
      goal?.fatsTarget || goal?.fatGoal || baseline.fatGoal;
    const targetWater =
      goal?.waterGoalMl || baseline.waterGoalMl;

    const targets = {
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

    // Fetch existing user to calculate baseline in case no NutritionGoal exists yet
    const existingUser = await withDbRetry(() =>
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
          proteinGoalGrams: true,
          customDailyProteinGoal: true,
        },
      })
    );

    const baseline = calculateBaselineGoals({
      weightKg: weightKg ?? existingUser?.weightKg,
      heightCm: heightCm ?? existingUser?.heightCm,
      sex: sex ?? existingUser?.sex,
      dateOfBirth: dateOfBirth ?? existingUser?.dateOfBirth,
      workoutFrequency: workoutFrequency ?? existingUser?.workoutFrequency,
      primaryGoal: primaryGoal ?? existingUser?.primaryGoal,
      customDailyProteinGoal: existingUser?.customDailyProteinGoal,
      proteinGoalGrams: existingUser?.proteinGoalGrams,
    });

    // Build update object for NutritionGoal
    const goalData: any = {};
    const shouldRecalculate =
      Boolean(body.recalculateGoals) ||
      ((weightKg !== undefined || heightCm !== undefined || sex !== undefined || workoutFrequency !== undefined || primaryGoal !== undefined) &&
        dailyCalorieGoal === undefined);

    if (shouldRecalculate) {
      goalData.dailyCalorieGoal = baseline.dailyCalorieGoal;
      goalData.calorieTarget = baseline.dailyCalorieGoal;
      goalData.proteinGoal = baseline.proteinGoal;
      goalData.proteinTarget = baseline.proteinGoal;
      goalData.carbohydrateGoal = baseline.carbohydrateGoal;
      goalData.carbsTarget = baseline.carbohydrateGoal;
      goalData.fatGoal = baseline.fatGoal;
      goalData.fatsTarget = baseline.fatGoal;
      goalData.waterGoalMl = baseline.waterGoalMl;
    } else {
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
    }
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
          dailyCalorieGoal: dailyCalorieGoal ?? baseline.dailyCalorieGoal,
          proteinGoal: proteinGoal ?? baseline.proteinGoal,
          carbohydrateGoal: carbohydrateGoal ?? baseline.carbohydrateGoal,
          fatGoal: fatGoal ?? baseline.fatGoal,
          calorieTarget: dailyCalorieGoal ?? baseline.dailyCalorieGoal,
          proteinTarget: proteinGoal ?? baseline.proteinGoal,
          carbsTarget: carbohydrateGoal ?? baseline.carbohydrateGoal,
          fatsTarget: fatGoal ?? baseline.fatGoal,
          waterGoalMl: waterGoalMl ?? baseline.waterGoalMl,
          onboardingCompleted: onboardingCompleted ?? true,
          sex: sex ?? existingUser?.sex ?? null,
          dateOfBirth: dateOfBirth ?? existingUser?.dateOfBirth ?? null,
          heightCm: heightCm ?? existingUser?.heightCm ?? null,
          weightKg: weightKg ?? existingUser?.weightKg ?? null,
          workoutFrequency: workoutFrequency ?? existingUser?.workoutFrequency ?? null,
          primaryGoal: primaryGoal ?? existingUser?.primaryGoal ?? null,
          desiredTargetWeightKg: desiredTargetWeightKg ?? existingUser?.desiredTargetWeightKg ?? null,
          goalDays: goalDays ?? existingUser?.goalDays ?? null,
          goalPace: goalPace ?? existingUser?.goalPace ?? null,
          dietPreference: dietPreference ?? existingUser?.dietPreference ?? null,
          barriers: barriers ?? existingUser?.barriers ?? [],
          accomplishments: accomplishments ?? existingUser?.accomplishments ?? [],
          dietitianConsulted: dietitianConsulted ?? existingUser?.dietitianConsulted ?? null,
          calorieRollover: calorieRollover ?? existingUser?.calorieRollover ?? false,
          notificationsEnabled: notificationsEnabled ?? existingUser?.notificationsEnabled ?? true,
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

    const targetCalories =
      updatedGoal.calorieTarget || updatedGoal.dailyCalorieGoal || baseline.dailyCalorieGoal;
    const targetProtein =
      updatedGoal.proteinTarget ||
      updatedGoal.proteinGoal ||
      (updatedUser as any)?.customDailyProteinGoal ||
      (updatedUser as any)?.proteinGoalGrams ||
      baseline.proteinGoal;
    const targetCarbs =
      updatedGoal.carbsTarget || updatedGoal.carbohydrateGoal || baseline.carbohydrateGoal;
    const targetFat =
      updatedGoal.fatsTarget || updatedGoal.fatGoal || baseline.fatGoal;
    const targetWater =
      updatedGoal.waterGoalMl || baseline.waterGoalMl;

    const targets = {
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
