import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { MealType } from "@prisma/client";

export const dynamic = "force-dynamic";

function normalizeMealType(input?: string): MealType {
  const norm = (input || "").toUpperCase().trim();
  if (norm.includes("BREAKFAST")) return MealType.BREAKFAST;
  if (norm.includes("LUNCH")) return MealType.LUNCH;
  if (norm.includes("SNACK")) return MealType.SNACKS;
  if (norm.includes("DINNER")) return MealType.DINNER;
  return MealType.LUNCH;
}

function getTodayDateKey(timeZone = "Asia/Kolkata"): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * POST /api/mobile/nutrition/food-log
 * Creates a new food log entry in Neon PostgreSQL linked to the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);
    const userId = authUser.id;

    const body = await req.json();

    const foodName = (body.foodName || body.title || body.name || "").trim();
    if (!foodName) {
      return NextResponse.json(
        { success: false, error: "Food name or title is required" },
        { status: 400 }
      );
    }

    const mealType = normalizeMealType(body.mealType || body.category || body.slot);
    const quantity = typeof body.quantity === "number" && body.quantity > 0 ? body.quantity : 1;
    const unit = (body.unit || "serving").trim();
    const dateKey = (body.dateKey || body.dateStr || body.date || getTodayDateKey()).trim();

    const calories = Math.max(0, typeof body.calories === "number" ? body.calories : 0);
    const protein = Math.max(0, typeof body.protein === "number" ? body.protein : 0);
    const carbohydrates = Math.max(
      0,
      typeof body.carbohydrates === "number"
        ? body.carbohydrates
        : typeof body.carbs === "number"
        ? body.carbs
        : 0
    );
    const fat = Math.max(0, typeof body.fat === "number" ? body.fat : 0);

    const gramsCalculated =
      typeof body.gramsCalculated === "number"
        ? body.gramsCalculated
        : typeof body.grams === "number"
        ? body.grams
        : null;

    const foodItemId = body.foodItemId || null;
    const foodVariantId = body.foodVariantId || null;
    const productId = body.productId || null;
    const variantNameSnapshot = body.variantName || body.variantNameSnapshot || null;

    const newLog = await withDbRetry(() =>
      prisma.foodLog.create({
        data: {
          userId,
          foodNameSnapshot: foodName,
          variantNameSnapshot,
          mealType,
          quantity,
          unit,
          gramsCalculated,
          calories,
          protein,
          carbohydrates,
          fat,
          dateKey,
          loggedAt: body.loggedAt ? new Date(body.loggedAt) : new Date(),
          foodItemId,
          foodVariantId,
          productId,
        },
      })
    );

    return NextResponse.json({
      success: true,
      log: {
        id: newLog.id,
        foodName: newLog.foodNameSnapshot,
        title: newLog.foodNameSnapshot,
        variantName: newLog.variantNameSnapshot,
        mealType: newLog.mealType,
        slot: newLog.mealType,
        quantity: newLog.quantity,
        unit: newLog.unit,
        grams: newLog.gramsCalculated,
        calories: newLog.calories,
        protein: newLog.protein,
        carbs: newLog.carbohydrates,
        fat: newLog.fat,
        loggedAt: newLog.loggedAt.toISOString(),
        dateKey: newLog.dateKey,
      },
    });
  } catch (error: any) {
    console.error("[Mobile Food Log POST Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create food log entry" },
      { status: 500 }
    );
  }
}
