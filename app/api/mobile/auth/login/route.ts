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
        : (user.name || "NM").substring(0, 2).toUpperCase();

    const targets = {
      calories:
        user.nutritionGoal?.calorieTarget ||
        user.nutritionGoal?.dailyCalorieGoal ||
        2000,
      proteinGrams:
        user.nutritionGoal?.proteinTarget ||
        user.nutritionGoal?.proteinGoal ||
        user.proteinGoalGrams ||
        120,
      carbsGrams:
        user.nutritionGoal?.carbsTarget ||
        user.nutritionGoal?.carbohydrateGoal ||
        250,
      fatGrams:
        user.nutritionGoal?.fatsTarget ||
        user.nutritionGoal?.fatGoal ||
        65,
      waterMl: user.nutritionGoal?.waterGoalMl || 3000,
    };

    return NextResponse.json({
      success: true,
      token,
      jwt: token,
      nutritionGoal: user.nutritionGoal,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "+91 98765 43210",
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
        targets,
        goals: user.nutritionGoal,
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
