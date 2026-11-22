import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getActiveDietPlanForCustomer,
  getAllDietPlansForCustomer,
  saveDietPlan,
} from "@/services/dietitian.service";
import { MealType } from "@prisma/client";
import { z } from "zod";

const mealSchema = z.object({
  mealType: z.nativeEnum(MealType),
  foodName: z.string().min(1, "Food name is required"),
  foodItemId: z.string().optional(),
  productId: z.string().optional(),
  servingSize: z.string().default("1 serving"),
  quantity: z.number().default(1),
  unit: z.string().default("serving"),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbohydrates: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  dietitianTip: z.string().optional(),
});

const dietPlanSchema = z.object({
  consultationId: z.string().optional(),
  customerId: z.string().min(1, "Customer ID is required"),
  title: z.string().min(3, "Plan title is required"),
  dailyCalorieTarget: z.number().positive(),
  proteinTargetGrams: z.number().positive(),
  carbsTargetGrams: z.number().positive(),
  fatsTargetGrams: z.number().positive(),
  notes: z.string().optional(),
  foodsToLimit: z.string().optional(),
  weeklyReviewNotes: z.string().optional(),
  meals: z.array(mealSchema).min(1, "At least one meal must be included in the diet plan"),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to view diet plans." },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const targetCustomerId = searchParams.get("customerId") || userId;

  try {
    const activePlan = await getActiveDietPlanForCustomer(targetCustomerId);
    const allPlans = await getAllDietPlansForCustomer(targetCustomerId);

    return NextResponse.json({
      success: true,
      activePlan,
      allPlans,
    });
  } catch (error: any) {
    console.error("[API /api/diet-plans GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load diet plans." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 }
    );
  }

  const userRole = (session.user as any).role;
  if (userRole !== "DIETITIAN" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "Forbidden: Only registered Dietitians or Admins can author personalized diet plans." },
      { status: 403 }
    );
  }

  const dietitianUserId = (session.user as any).id;

  try {
    const json = await req.json();
    const parsed = dietPlanSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors.map((e) => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const plan = await saveDietPlan({
      dietitianUserId,
      ...parsed.data,
    });

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error: any) {
    console.error("[API /api/diet-plans POST] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create diet plan." },
      { status: 400 }
    );
  }
}
