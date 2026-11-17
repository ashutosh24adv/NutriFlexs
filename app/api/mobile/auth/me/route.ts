import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";

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

    const goal = user.nutritionGoal;
    const targets = {
      calories: goal?.calorieTarget ?? goal?.dailyCalorieGoal ?? 0,
      proteinGrams: goal?.proteinTarget ?? goal?.proteinGoal ?? 0,
      carbsGrams: goal?.carbsTarget ?? goal?.carbohydrateGoal ?? 0,
      fatGrams: goal?.fatsTarget ?? goal?.fatGoal ?? 0,
      waterMl: goal?.waterGoalMl ?? 0,
    };

    return NextResponse.json({
      success: true,
      nutritionGoal: goal,
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
