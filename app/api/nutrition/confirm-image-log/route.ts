import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addFoodLog, getDailyNutritionDiary } from "@/services/nutrition.service";
import { safeErrorResponse } from "@/lib/api-security";
import { MealType } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const confirmLogSchema = z.object({
  mealType: z.enum(["BREAKFAST", "LUNCH", "SNACKS", "DINNER"]),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z
    .array(
      z.object({
        foodItemId: z.string().nullable().optional(),
        foodVariantId: z.string().nullable().optional(),
        productId: z.string().nullable().optional(),
        name: z.string().trim().min(1).max(150),
        quantity: z.number().positive().max(100),
        unit: z.string().trim().min(1).max(50),
        grams: z.number().nonnegative().max(5000).nullable().optional(),
        calories: z.number().nonnegative().max(10000),
        protein: z.number().nonnegative().max(1000),
        carbohydrates: z.number().nonnegative().max(1000),
        fat: z.number().nonnegative().max(1000),
      })
    )
    .min(1, "At least one food item must be confirmed"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = confirmLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid confirmation payload. Please verify all food items and quantities.",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { mealType, dateKey, items } = parsed.data;

    // Check user session
    const session = await getServerSession(authOptions);

    // Guest workflow: Return verified snapshots for client-side localStorage persistence
    if (!session?.user?.email) {
      return NextResponse.json({
        success: true,
        isGuest: true,
        message: `Verified ${items.length} items for your guest food diary.`,
        loggedItemsCount: items.length,
        items,
      });
    }

    // Authenticated workflow: Persist to database under user's profile
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Customer profile not found." },
        { status: 404 }
      );
    }

    const loggedRecords = [];

    for (const item of items) {
      const log = await addFoodLog(user.id, {
        dateKey,
        mealType: mealType as MealType,
        foodName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        foodItemId: item.foodItemId || undefined,
        foodVariantId: item.foodVariantId || undefined,
        productId: item.productId || undefined,
        calories: item.calories,
        protein: item.protein,
        carbohydrates: item.carbohydrates,
        fat: item.fat,
      });
      loggedRecords.push(log);
    }

    // Retrieve fresh updated daily diary summary
    const updatedSummary = await getDailyNutritionDiary(user.id, dateKey);

    return NextResponse.json({
      success: true,
      isGuest: false,
      message: `Successfully logged ${items.length} items to your ${mealType === "BREAKFAST" ? "Breakfast" : mealType === "LUNCH" ? "Lunch" : mealType === "SNACKS" ? "Evening Snacks" : "Dinner"} diary.`,
      loggedItemsCount: items.length,
      loggedRecords,
      dailySummary: updatedSummary,
    });
  } catch (error: any) {
    console.error("[confirm-image-log] Failed to persist meal items:", error);
    return safeErrorResponse(error, "Failed to add items to food diary", 500);
  }
}

