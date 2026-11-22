import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({
      success: true,
      isVegetarian: false,
      primaryNutritionGoal: null,
      hasCompletedNutritionOnboarding: false,
    });
  }

  const userEmail = session.user.email.toLowerCase().trim();
  const user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        isVegetarian: true,
        primaryNutritionGoal: true,
        hasCompletedNutritionOnboarding: true,
      },
    })
  );

  return NextResponse.json({
    success: true,
    isVegetarian: Boolean(user?.isVegetarian),
    primaryNutritionGoal: user?.primaryNutritionGoal || null,
    hasCompletedNutritionOnboarding: Boolean(user?.hasCompletedNutritionOnboarding),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Authentication required to update dietary preferences." },
      { status: 401 }
    );
  }

  try {
    const userEmail = session.user.email.toLowerCase().trim();
    const body = await req.json();
    const updateData: any = {};

    if (typeof body.isVegetarian === "boolean") {
      updateData.isVegetarian = body.isVegetarian;
    }
    if (typeof body.primaryNutritionGoal === "string") {
      updateData.primaryNutritionGoal = body.primaryNutritionGoal;
    }

    const updatedUser = await withDbRetry(() =>
      prisma.user.update({
        where: { email: userEmail },
        data: updateData,
        select: {
          id: true,
          email: true,
          isVegetarian: true,
          primaryNutritionGoal: true,
          hasCompletedNutritionOnboarding: true,
        },
      })
    );

    return NextResponse.json({
      success: true,
      isVegetarian: updatedUser.isVegetarian,
      primaryNutritionGoal: updatedUser.primaryNutritionGoal,
      hasCompletedNutritionOnboarding: updatedUser.hasCompletedNutritionOnboarding,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update dietary preference." },
      { status: 500 }
    );
  }
}
