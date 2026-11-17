import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma, withDbRetry } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { AUTH_SECRET } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

/**
 * Calculates baseline calorie & macro targets using Mifflin-St Jeor equation.
 */
function calculateBaselineGoals(params: {
  weightKg?: number | null;
  heightCm?: number | null;
  sex?: string | null;
  dateOfBirth?: Date | null;
  workoutFrequency?: string | null;
  primaryGoal?: string | null;
}) {
  const weight = params.weightKg && params.weightKg > 0 ? params.weightKg : 70;
  const height = params.heightCm && params.heightCm > 0 ? params.heightCm : 175;

  let age = 25;
  if (params.dateOfBirth) {
    const diffMs = Date.now() - new Date(params.dateOfBirth).getTime();
    const computedAge = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
    if (computedAge >= 14 && computedAge <= 100) {
      age = computedAge;
    }
  }

  const isFemale = (params.sex || "").toLowerCase().includes("female");
  // Mifflin-St Jeor BMR
  const bmr = 10 * weight + 6.25 * height - 5 * age + (isFemale ? -161 : 5);

  // Activity multiplier based on workout frequency
  const freq = (params.workoutFrequency || "").toLowerCase();
  let activityMultiplier = 1.4; // default moderate
  if (freq.includes("7+") || freq.includes("every day") || freq.includes("daily")) {
    activityMultiplier = 1.725;
  } else if (freq.includes("4-6") || freq.includes("5")) {
    activityMultiplier = 1.55;
  } else if (freq.includes("0-4") || freq.includes("1-3") || freq.includes("sedentary")) {
    activityMultiplier = 1.35;
  }

  let tdee = bmr * activityMultiplier;

  // Goal adjustment
  const goal = (params.primaryGoal || "").toLowerCase();
  if (goal.includes("lose") || goal.includes("fat loss")) {
    tdee -= 400; // Calorie deficit
  } else if (goal.includes("build") || goal.includes("muscle") || goal.includes("hypertrophy")) {
    tdee += 300; // Surplus
  }

  const dailyCalorieGoal = Math.max(1200, Math.min(4500, Math.round(tdee / 50) * 50));

  // Protein calculation: 1.6 - 2.0g per kg of bodyweight
  let proteinPerKg = 1.6;
  if (goal.includes("muscle") || freq.includes("4-6") || freq.includes("7+")) {
    proteinPerKg = 2.0;
  } else if (goal.includes("lose")) {
    proteinPerKg = 1.8;
  }
  const proteinGoal = Math.max(60, Math.min(260, Math.round(weight * proteinPerKg)));

  // Fat calculation: ~25% of calories / 9
  const fatGoal = Math.max(40, Math.min(120, Math.round((dailyCalorieGoal * 0.25) / 9)));

  // Remaining calories to carbohydrates / 4
  const carbCalories = dailyCalorieGoal - proteinGoal * 4 - fatGoal * 9;
  const carbohydrateGoal = Math.max(100, Math.min(600, Math.round(carbCalories / 4)));

  return {
    dailyCalorieGoal,
    proteinGoal,
    carbohydrateGoal,
    fatGoal,
    waterGoalMl: 3000,
  };
}

/**
 * POST /api/mobile/auth/register
 * Validates { name, emailOrPhone, password, sex, dateOfBirth, heightCm, weightKg, workoutFrequency, dietPreference, primaryGoal }.
 * Hashes password with bcryptjs (with scrypt fallback), creates User (passBalance: 0) + initial NutritionGoal
 * in a fast Prisma transaction (<500ms), signs JWT, and returns { token, user, nutritionGoal }.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Extract & validate required fields
    const name = (body.name || "").trim();
    const rawEmailOrPhone = (body.emailOrPhone || body.email || body.phone || "").trim();
    const password = body.password || "";
    const sex = (body.sex || "").trim();

    const rawDob = body.dateOfBirth || body.dob || body.birthDate;
    let dateOfBirth: Date | null = null;
    if (rawDob) {
      const parsed = new Date(rawDob);
      if (!isNaN(parsed.getTime())) {
        dateOfBirth = parsed;
      }
    }

    const heightCm =
      body.heightCm !== undefined && body.heightCm !== null
        ? parseFloat(String(body.heightCm))
        : null;

    const weightKg =
      body.weightKg !== undefined && body.weightKg !== null
        ? parseFloat(String(body.weightKg))
        : null;

    const workoutFrequency = (body.workoutFrequency || "").trim();
    const dietPreference = (body.dietPreference || "").trim();
    const primaryGoal = (body.primaryGoal || "").trim();

    // Field-by-field validations
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Full name is required" },
        { status: 400 }
      );
    }

    if (!rawEmailOrPhone) {
      return NextResponse.json(
        { success: false, error: "Email or phone number is required" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    if (!sex) {
      return NextResponse.json(
        { success: false, error: "Biological sex is required" },
        { status: 400 }
      );
    }

    if (!dateOfBirth) {
      return NextResponse.json(
        { success: false, error: "Valid date of birth is required" },
        { status: 400 }
      );
    }

    if (!heightCm || isNaN(heightCm) || heightCm <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid height in cm is required" },
        { status: 400 }
      );
    }

    if (!weightKg || isNaN(weightKg) || weightKg <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid weight in kg is required" },
        { status: 400 }
      );
    }

    if (!workoutFrequency) {
      return NextResponse.json(
        { success: false, error: "Workout frequency is required" },
        { status: 400 }
      );
    }

    if (!dietPreference) {
      return NextResponse.json(
        { success: false, error: "Diet preference is required" },
        { status: 400 }
      );
    }

    if (!primaryGoal) {
      return NextResponse.json(
        { success: false, error: "Primary fitness goal is required" },
        { status: 400 }
      );
    }

    // Determine email and phone
    const isEmail = rawEmailOrPhone.includes("@");
    const email = isEmail
      ? rawEmailOrPhone.toLowerCase()
      : `${rawEmailOrPhone.replace(/[^0-9]/g, "") || Date.now()}@nutriflex.fit`;
    const phone = !isEmail ? rawEmailOrPhone : (body.phone || "").trim();

    // Check for existing user
    const existing = await withDbRetry(() =>
      prisma.user.findFirst({
        where: {
          OR: [
            { email },
            ...(phone ? [{ phone }] : []),
          ],
        },
      })
    );

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email or phone already exists" },
        { status: 409 }
      );
    }

    // Optional auxiliary goal fields
    const desiredTargetWeightKg = body.desiredTargetWeightKg
      ? parseFloat(String(body.desiredTargetWeightKg))
      : null;
    const goalDays = body.goalDays ? parseInt(String(body.goalDays), 10) : null;
    const goalPace = body.goalPace || null;
    const barriers = Array.isArray(body.barriers) ? body.barriers : [];
    const accomplishments = Array.isArray(body.accomplishments) ? body.accomplishments : [];
    const dietitianConsulted = body.dietitianConsulted || null;
    const calorieRollover = Boolean(body.calorieRollover);
    const notificationsEnabled = body.notificationsEnabled !== undefined ? Boolean(body.notificationsEnabled) : true;

    // Calculate baseline nutrition targets
    const baseline = calculateBaselineGoals({
      weightKg,
      heightCm,
      sex,
      dateOfBirth,
      workoutFrequency,
      primaryGoal,
    });

    // Hash password with bcryptjs (with scrypt fallback)
    let hashedPassword: string;
    try {
      // @ts-ignore
      const bcrypt = require("bcryptjs");
      hashedPassword = bcrypt.hashSync(password, 10);
    } catch {
      hashedPassword = hashPassword(password);
    }

    // Fast Prisma transaction (<500ms): create User (passBalance: 0) + initial NutritionGoal
    const [user, nutritionGoal] = await withDbRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name,
              email,
              phone: phone || null,
              passwordHash: hashedPassword,
              role: "CUSTOMER",
              passBalance: 0,
              sex,
              gender: sex,
              dateOfBirth,
              birthDate: dateOfBirth,
              heightCm,
              weightKg,
              workoutFrequency,
              activityLevel: workoutFrequency,
              primaryGoal,
              primaryNutritionGoal: primaryGoal,
              desiredTargetWeightKg,
              goalDays,
              goalPace,
              dietPreference,
              barriers,
              accomplishments,
              dietitianConsulted,
              calorieRollover,
              calorieRolloverEnabled: calorieRollover,
              notificationsEnabled,
              hasCompletedNutritionOnboarding: true,
              nutritionOnboardingCompletedAt: new Date(),
              proteinGoalGrams: baseline.proteinGoal,
            },
          });

          const newGoal = await tx.nutritionGoal.create({
            data: {
              userId: newUser.id,
              dailyCalorieGoal: baseline.dailyCalorieGoal,
              proteinGoal: baseline.proteinGoal,
              carbohydrateGoal: baseline.carbohydrateGoal,
              fatGoal: baseline.fatGoal,
              calorieTarget: baseline.dailyCalorieGoal,
              proteinTarget: baseline.proteinGoal,
              carbsTarget: baseline.carbohydrateGoal,
              fatsTarget: baseline.fatGoal,
              waterGoalMl: baseline.waterGoalMl,
              onboardingCompleted: false,
              sex,
              dateOfBirth,
              heightCm,
              weightKg,
              workoutFrequency,
              primaryGoal,
              desiredTargetWeightKg,
              goalDays,
              goalPace,
              dietPreference,
              barriers,
              accomplishments,
              dietitianConsulted,
              calorieRollover,
              notificationsEnabled,
            },
          });

          return [newUser, newGoal];
        },
        {
          timeout: 5000,
          maxWait: 2000,
        }
      )
    );

    // Sign JWT token
    const token = await encode({
      token: {
        id: user.id,
        sub: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      secret: AUTH_SECRET,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    const nameParts = (user.name || "Nutri Member").trim().split(" ");
    const avatarInitials =
      nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
        : (user.name || user.email || "NF").substring(0, 2).toUpperCase();

    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      membershipTier: "PRO",
      homeKiosk: "Cult.fit HSR Layout, Bengaluru",
      passBalance: user.passBalance ?? 0,
      memberCode: `NF-${user.id.substring(0, 6).toUpperCase()}`,
      avatarInitials,
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
      targets: {
        calories: nutritionGoal.calorieTarget || nutritionGoal.dailyCalorieGoal || baseline.dailyCalorieGoal,
        proteinGrams: nutritionGoal.proteinTarget || nutritionGoal.proteinGoal || baseline.proteinGoal,
        carbsGrams: nutritionGoal.carbsTarget || nutritionGoal.carbohydrateGoal || baseline.carbohydrateGoal,
        fatGrams: nutritionGoal.fatsTarget || nutritionGoal.fatGoal || baseline.fatGoal,
        waterMl: nutritionGoal.waterGoalMl || baseline.waterGoalMl,
      },
      goals: nutritionGoal,
    };

    return NextResponse.json({
      success: true,
      token,
      jwt: token,
      user: formattedUser,
      nutritionGoal,
    });
  } catch (error: any) {
    console.error("[Mobile Auth Register Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to register account" },
      { status: 500 }
    );
  }
}
