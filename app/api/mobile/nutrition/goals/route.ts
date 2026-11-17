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
    const userId = authUser.id;

    const [goal, user] = await withDbRetry(() =>
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
          },
        }),
      ])
    );

    return NextResponse.json({
      success: true,
      goals: goal,
      nutritionGoal: goal,
      data: goal,
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
    const userId = authUser.id;

    const body = await req.json();

    // Prepare calorie targets
    const dailyCalorieGoal =
      body.dailyCalorieGoal !== undefined
        ? parseInt(String(body.dailyCalorieGoal), 10)
        : body.calorieTarget !== undefined
        ? parseInt(String(body.calorieTarget), 10)
        : body.calories !== undefined
        ? parseInt(String(body.calories), 10)
        : undefined;

    // Prepare protein targets
    const proteinGoal =
      body.proteinGoal !== undefined
        ? parseFloat(String(body.proteinGoal))
        : body.proteinTarget !== undefined
        ? parseFloat(String(body.proteinTarget))
        : body.protein !== undefined
        ? parseFloat(String(body.protein))
        : undefined;

    // Prepare carbohydrate targets
    const carbohydrateGoal =
      body.carbohydrateGoal !== undefined
        ? parseFloat(String(body.carbohydrateGoal))
        : body.carbsTarget !== undefined
        ? parseFloat(String(body.carbsTarget))
        : body.carbs !== undefined
        ? parseFloat(String(body.carbs))
        : undefined;

    // Prepare fat targets
    const fatGoal =
      body.fatGoal !== undefined
        ? parseFloat(String(body.fatGoal))
        : body.fatsTarget !== undefined
        ? parseFloat(String(body.fatsTarget))
        : body.fat !== undefined
        ? parseFloat(String(body.fat))
        : undefined;

    // Water target in ml
    const waterGoalMl =
      body.waterGoalMl !== undefined
        ? parseInt(String(body.waterGoalMl), 10)
        : body.water !== undefined
        ? parseInt(String(body.water), 10)
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

    return NextResponse.json({
      success: true,
      message: "Nutrition goals updated successfully",
      goals: updatedGoal,
      nutritionGoal: updatedGoal,
      data: updatedGoal,
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
