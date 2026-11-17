import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma, withDbRetry } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { AUTH_SECRET } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/mobile/auth/login
 * Authenticates athlete using email or phone and password.
 * Returns JWT token + user profile with goals and passBalance.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawIdentifier = (body.email || body.emailOrPhone || body.phone || "").trim();
    const password = body.password || "";

    if (!rawIdentifier) {
      return NextResponse.json(
        { success: false, error: "Email or phone number is required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    const email = rawIdentifier.toLowerCase();
    const phone = rawIdentifier;

    // Find user in Prisma
    const user = await withDbRetry(() =>
      prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { phone },
          ],
        },
        include: {
          nutritionGoal: true,
        },
      })
    );

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Invalid email/phone or password" },
        { status: 401 }
      );
    }

    let isValid = false;
    try {
      // @ts-ignore
      const bcrypt = require("bcryptjs");
      if (
        user.passwordHash &&
        (user.passwordHash.startsWith("$2a$") ||
          user.passwordHash.startsWith("$2b$") ||
          user.passwordHash.startsWith("$2y$"))
      ) {
        isValid = bcrypt.compareSync(password, user.passwordHash);
      }
    } catch {
      // ignore
    }
    if (!isValid) {
      isValid = verifyPassword(password, user.passwordHash);
    }

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email/phone or password" },
        { status: 401 }
      );
    }

    // Generate JWT token
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

    let goal = user.nutritionGoal;
    if (!goal) {
      // Calculate and persist baseline nutrition goals in Neon Postgres if not yet saved
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
        user.proteinGoalGrams && user.proteinGoalGrams > 0
          ? user.proteinGoalGrams
          : Math.max(60, Math.min(260, Math.round(weight * 1.8)));
      const fatGoal = Math.max(40, Math.min(120, Math.round((dailyCalorieGoal * 0.25) / 9)));
      const carbCalories = dailyCalorieGoal - proteinGoal * 4 - fatGoal * 9;
      const carbohydrateGoal = Math.max(100, Math.min(600, Math.round(carbCalories / 4)));

      try {
        goal = await withDbRetry(() =>
          prisma.nutritionGoal.create({
            data: {
              userId: user.id,
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
        // Fallback: fetch again in case created concurrently
        goal = await withDbRetry(() =>
          prisma.nutritionGoal.findUnique({ where: { userId: user.id } })
        );
      }
    }

    const targets = {
      calories: goal?.calorieTarget ?? goal?.dailyCalorieGoal ?? 2000,
      calorieTarget: goal?.calorieTarget ?? goal?.dailyCalorieGoal ?? 2000,
      dailyCalorieGoal: goal?.dailyCalorieGoal ?? goal?.calorieTarget ?? 2000,
      protein: goal?.proteinTarget ?? goal?.proteinGoal ?? user.proteinGoalGrams ?? 120,
      proteinTarget: goal?.proteinTarget ?? goal?.proteinGoal ?? user.proteinGoalGrams ?? 120,
      proteinGrams: goal?.proteinTarget ?? goal?.proteinGoal ?? user.proteinGoalGrams ?? 120,
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
      token,
      jwt: token,
      nutritionGoal: goal,
      goals: goal,
      user: {
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
        expoPushToken: user.expoPushToken || null,
        targets,
        goals: goal,
        nutritionGoal: goal,
      },
    });
  } catch (error: any) {
    console.error("[Mobile Auth Login Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to authenticate" },
      { status: 500 }
    );
  }
}
