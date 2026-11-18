import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma, withDbRetry } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { AUTH_SECRET } from "@/lib/mobile-auth";
import { calculateBaselineGoals } from "@/lib/nutrition-baseline";

export const dynamic = "force-dynamic";

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

    // Determine email and phone with strict normalization (.trim().toLowerCase())
    const isEmail = rawEmailOrPhone.includes("@") || (typeof body.email === "string" && body.email.includes("@"));
    const email = (
      isEmail
        ? (body.email || rawEmailOrPhone).trim().toLowerCase()
        : `${rawEmailOrPhone.replace(/[^0-9]/g, "") || Date.now()}@nutriflex.fit`
    ).trim().toLowerCase();
    const phone = !rawEmailOrPhone.includes("@") ? rawEmailOrPhone.trim() : (body.phone || "").trim();

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

    // Check for explicit custom targets passed during registration
    const targetObj = body.targets || body.goals || body.nutritionGoal || body;
    const calorieTarget =
      parseInt(String(targetObj.calorieTarget || targetObj.dailyCalorieGoal || targetObj.calories || ""), 10) ||
      baseline.dailyCalorieGoal;
    const proteinTarget =
      parseFloat(String(targetObj.proteinTarget || targetObj.proteinGoal || targetObj.proteinGrams || targetObj.protein || "")) ||
      baseline.proteinGoal;
    const carbsTarget =
      parseFloat(String(targetObj.carbsTarget || targetObj.carbohydrateGoal || targetObj.carbsGrams || targetObj.carbs || "")) ||
      baseline.carbohydrateGoal;
    const fatsTarget =
      parseFloat(String(targetObj.fatsTarget || targetObj.fatGoal || targetObj.fatGrams || targetObj.fat || "")) ||
      baseline.fatGoal;
    const waterGoalMl =
      parseInt(String(targetObj.waterGoalMl || targetObj.waterMl || targetObj.water || ""), 10) ||
      baseline.waterGoalMl;

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
              proteinGoalGrams: Math.round(proteinTarget),
            },
          });

          const newGoal = await tx.nutritionGoal.create({
            data: {
              userId: newUser.id,
              dailyCalorieGoal: calorieTarget,
              proteinGoal: proteinTarget,
              carbohydrateGoal: carbsTarget,
              fatGoal: fatsTarget,
              calorieTarget,
              proteinTarget,
              carbsTarget,
              fatsTarget,
              waterGoalMl,
              onboardingCompleted: true,
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

    const targets = {
      calories: nutritionGoal.calorieTarget || nutritionGoal.dailyCalorieGoal || calorieTarget,
      calorieTarget: nutritionGoal.calorieTarget || nutritionGoal.dailyCalorieGoal || calorieTarget,
      dailyCalorieGoal: nutritionGoal.dailyCalorieGoal || nutritionGoal.calorieTarget || calorieTarget,
      protein: nutritionGoal.proteinTarget || nutritionGoal.proteinGoal || proteinTarget,
      proteinTarget: nutritionGoal.proteinTarget || nutritionGoal.proteinGoal || proteinTarget,
      proteinGrams: nutritionGoal.proteinTarget || nutritionGoal.proteinGoal || proteinTarget,
      proteinGoal: nutritionGoal.proteinGoal || nutritionGoal.proteinTarget || proteinTarget,
      carbs: nutritionGoal.carbsTarget || nutritionGoal.carbohydrateGoal || carbsTarget,
      carbsTarget: nutritionGoal.carbsTarget || nutritionGoal.carbohydrateGoal || carbsTarget,
      carbsGrams: nutritionGoal.carbsTarget || nutritionGoal.carbohydrateGoal || carbsTarget,
      carbohydrateGoal: nutritionGoal.carbohydrateGoal || nutritionGoal.carbsTarget || carbsTarget,
      fat: nutritionGoal.fatsTarget || nutritionGoal.fatGoal || fatsTarget,
      fatsTarget: nutritionGoal.fatsTarget || nutritionGoal.fatGoal || fatsTarget,
      fatGrams: nutritionGoal.fatsTarget || nutritionGoal.fatGoal || fatsTarget,
      fatGoal: nutritionGoal.fatGoal || nutritionGoal.fatsTarget || fatsTarget,
      waterMl: nutritionGoal.waterGoalMl || waterGoalMl,
      waterGoalMl: nutritionGoal.waterGoalMl || waterGoalMl,
    };

    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      membershipTier: "PRO",
      homeKiosk: "Cult.fit HSR Layout, Bengaluru",
      passBalance: 0,
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
      targets,
      goals: nutritionGoal,
      nutritionGoal,
    };

    return NextResponse.json({
      success: true,
      token,
      jwt: token,
      user: formattedUser,
      nutritionGoal,
      goals: nutritionGoal,
    });
  } catch (error: any) {
    console.error("[Mobile Auth Register Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to register account" },
      { status: 500 }
    );
  }
}
