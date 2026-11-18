import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { calculateBaselineGoals } from "@/lib/nutrition-baseline";

export const dynamic = "force-dynamic";

/**
 * GET /api/mobile/auth/me
 * Returns current authenticated athlete from JWT, goals, passBalance, and baseline stats.
 * Returns 401 if no valid authentication is provided.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await withDbRetry(() =>
      prisma.user.findUnique({
        where: { id: authUser.id },
        include: {
          nutritionGoal: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const nameParts = (user.name || "Nutri Member").trim().split(" ");
    const avatarInitials =
      nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : (user.name || user.email || "NF").substring(0, 2).toUpperCase();

    let goal = user.nutritionGoal;
    const baseline = calculateBaselineGoals({
      weightKg: user.weightKg,
      heightCm: user.heightCm,
      sex: user.sex,
      dateOfBirth: user.dateOfBirth,
      workoutFrequency: user.workoutFrequency,
      primaryGoal: user.primaryGoal,
      customDailyProteinGoal: user.customDailyProteinGoal,
      proteinGoalGrams: user.proteinGoalGrams,
    });

    if (!goal) {
      // Calculate and persist baseline nutrition goals in Neon Postgres if not yet saved
      try {
        goal = await withDbRetry(() =>
          prisma.nutritionGoal.create({
            data: {
              userId: user.id,
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
              desiredTargetWeightKg: user.desiredTargetWeightKg,
              goalDays: user.goalDays,
              goalPace: user.goalPace,
              dietPreference: user.dietPreference,
              barriers: user.barriers,
              accomplishments: user.accomplishments,
              dietitianConsulted: user.dietitianConsulted,
              calorieRollover: user.calorieRollover,
              notificationsEnabled: user.notificationsEnabled,
            },
          })
        );
      } catch {
        goal = await withDbRetry(() =>
          prisma.nutritionGoal.findUnique({ where: { userId: user.id } })
        );
      }
    }

    const targetCalories =
      goal?.calorieTarget || goal?.dailyCalorieGoal || baseline.dailyCalorieGoal;
    const targetProtein =
      goal?.proteinTarget ||
      goal?.proteinGoal ||
      user.customDailyProteinGoal ||
      user.proteinGoalGrams ||
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
      nutritionGoal: goal,
      goals: goal,
      user: {
        id: user.id,
        name: user.name || "Nutri Member",
        phone: user.phone || null,
        email: user.email,
        membershipTier: "PRO",
        homeKiosk: "Cult.fit HSR Layout, Bengaluru",
        passBalance: typeof user.passBalance === "number" ? user.passBalance : 0,
        memberCode: `NF-${user.id.substring(0, 6).toUpperCase()}`,
        avatarInitials,
        sex: user.sex || null,
        dateOfBirth: user.dateOfBirth || null,
        heightCm: user.heightCm || null,
        weightKg: user.weightKg || null,
        workoutFrequency: user.workoutFrequency || null,
        primaryGoal: user.primaryGoal || null,
        desiredTargetWeightKg: user.desiredTargetWeightKg || null,
        goalDays: user.goalDays || null,
        goalPace: user.goalPace || null,
        dietPreference: user.dietPreference || null,
        barriers: user.barriers || [],
        accomplishments: user.accomplishments || [],
        dietitianConsulted: user.dietitianConsulted || null,
        calorieRollover: Boolean(user.calorieRollover),
        notificationsEnabled:
          user.notificationsEnabled !== undefined
            ? Boolean(user.notificationsEnabled)
            : true,
        expoPushToken: user.expoPushToken || null,
        targets,
        goals: goal,
        nutritionGoal: goal,
      },
    });
  } catch (err: any) {
    console.error("[Auth Me GET Error]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
