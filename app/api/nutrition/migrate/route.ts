import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { migrateGuestNutritionData } from "@/services/nutrition.service";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-security";
import { z } from "zod";

const guestMigrationSchema = z.object({
  customFoods: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        category: z.string().trim().max(50).optional().nullable(),
        description: z.string().trim().max(250).optional().nullable(),
        caloriesPer100g: z.number().min(0).max(10000),
        protein: z.number().min(0).max(1000),
        carbohydrates: z.number().min(0).max(1000),
        fat: z.number().min(0).max(1000),
        defaultServingSize: z.number().min(0.1).max(1000).optional(),
        defaultServingUnit: z.string().trim().max(30).optional(),
        servingWeightGrams: z.number().min(1).max(5000).optional(),
      })
    )
    .max(50, "Maximum 50 custom foods can be migrated at once")
    .optional(),
  logs: z
    .array(
      z.object({
        foodName: z.string().trim().min(1).max(150),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
        mealType: z.enum(["BREAKFAST", "LUNCH", "SNACKS", "DINNER"]),
        quantity: z.number().min(0.1).max(5000),
        unit: z.string().trim().max(50),
        calories: z.number().min(0).max(50000),
        protein: z.number().min(0).max(5000),
        carbohydrates: z.number().min(0).max(5000),
        fat: z.number().min(0).max(5000),
        gramsCalculated: z.number().min(0).max(20000).optional(),
      })
    )
    .max(200, "Maximum 200 logs can be migrated at once")
    .optional(),
});

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  // Rate limit: Max 5 migration attempts per IP per 10 minutes
  const rateLimit = checkRateLimit({
    key: `nutrition_migrate:${clientIp}`,
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Too many migration attempts. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
        },
      }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to migrate guest nutrition data" },
        { status: 401 }
      );
    }

    const rawBody = await req.json();
    const parsed = guestMigrationSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid migration payload" },
        { status: 400 }
      );
    }

    const result = await migrateGuestNutritionData(userId, parsed.data as any);

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to migrate guest nutrition data", 500);
  }
}
