import { prisma } from "@/lib/prisma";
import { MealType } from "@prisma/client";
import {
  AddFoodLogInput,
  UpdateFoodLogInput,
  CreateCustomFoodInput,
  UpdateNutritionGoalInput,
} from "@/lib/validations/nutrition.schema";

export interface MacroTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface MealDiarySection {
  mealType: MealType;
  label: string;
  items: Array<{
    id: string;
    foodItemId?: string | null;
    productId?: string | null;
    orderItemId?: string | null;
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    loggedAt: string;
    isAutoLoggedFromOrder: boolean;
  }>;
  totals: MacroTotals;
}

export interface DailyNutritionSummary {
  dateKey: string;
  totals: MacroTotals;
  goals: {
    dailyCalorieGoal: number | null;
    proteinGoal: number | null;
    carbohydrateGoal: number | null;
    fatGoal: number | null;
    remainingCalories: number | null;
    calorieProgressPercent: number;
    remainingProtein: number | null;
    proteinProgressPercent: number;
    remainingCarbs: number | null;
    carbsProgressPercent: number;
    remainingFat: number | null;
    fatProgressPercent: number;
  };
  meals: Record<MealType, MealDiarySection>;
}

/**
 * Calculates calories and macronutrients based on grams or serving units.
 */
export function calculateItemNutrition(
  item: {
    caloriesPer100g: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    defaultServingSize: number;
    defaultServingUnit: string;
    servingWeightGrams?: number | null;
  },
  quantity: number,
  unit: string
) {
  const normUnit = unit.toLowerCase().trim();
  const defUnit = (item.defaultServingUnit || "g").toLowerCase().trim();
  const servingWeight = item.servingWeightGrams && item.servingWeightGrams > 0 ? item.servingWeightGrams : 100;

  let grams = 0;

  if (normUnit === "g" || normUnit === "gram" || normUnit === "grams") {
    grams = quantity;
  } else if (normUnit === "ml" || normUnit === "millilitre" || normUnit === "millilitres" || normUnit === "ml.") {
    grams = quantity;
  } else if (normUnit === defUnit || normUnit === `${defUnit}s`) {
    grams = quantity * servingWeight;
  } else if (normUnit === "serving" || normUnit === "servings") {
    grams = quantity * servingWeight;
  } else if (normUnit === "bowl" || normUnit === "bowls") {
    grams = quantity * (defUnit.includes("bowl") ? servingWeight : 150);
  } else if (normUnit === "cup" || normUnit === "cups") {
    grams = quantity * (defUnit.includes("cup") ? servingWeight : 200);
  } else if (normUnit === "glass" || normUnit === "glasses") {
    grams = quantity * (defUnit.includes("glass") ? servingWeight : 250);
  } else if (normUnit === "plate" || normUnit === "plates") {
    grams = quantity * (defUnit.includes("plate") ? servingWeight : 200);
  } else if (normUnit === "piece" || normUnit === "pieces" || normUnit === "slice" || normUnit === "slices") {
    grams = quantity * (defUnit.includes("piece") || defUnit.includes("slice") ? servingWeight : 50);
  } else if (normUnit === "tbsp" || normUnit === "tablespoon" || normUnit === "tablespoons") {
    grams = quantity * (defUnit.includes("tbsp") ? servingWeight : 15);
  } else if (normUnit === "tsp" || normUnit === "teaspoon" || normUnit === "teaspoons") {
    grams = quantity * 5;
  } else if (normUnit === "scoop" || normUnit === "scoops") {
    grams = quantity * (defUnit.includes("scoop") ? servingWeight : 32);
  } else {
    grams = quantity * servingWeight;
  }

  const factor = grams / 100;
  return {
    grams: Math.round(grams * 10) / 10,
    calories: Math.round(item.caloriesPer100g * factor * 10) / 10,
    protein: Math.round(item.protein * factor * 10) / 10,
    carbohydrates: Math.round(item.carbohydrates * factor * 10) / 10,
    fat: Math.round(item.fat * factor * 10) / 10,
  };
}

/**
 * Returns today's date in YYYY-MM-DD format for a given timezone.
 */
export function getLocalDateKey(timeZone = "Asia/Kolkata", date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Determines appropriate meal category based on hour of day in target timezone.
 */
export function getMealTypeFromDate(date = new Date(), timeZone = "Asia/Kolkata"): MealType {
  const hourFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(hourFormatter.format(date), 10);

  if (hour >= 4 && hour < 11) return MealType.BREAKFAST;
  if (hour >= 11 && hour < 16) return MealType.LUNCH;
  if (hour >= 16 && hour < 19) return MealType.SNACKS;
  return MealType.DINNER;
}

/**
 * Fetches food library categories.
 */
export async function getFoodCategories() {
  const distinctCategories = await prisma.foodItem.findMany({
    where: { isActive: true, isCustom: false },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return distinctCategories.map((c) => c.category);
}

/**
 * Searches food library and user's custom foods, plus NutriFlexs menu products.
 */
export async function searchFoodLibrary(params: {
  query?: string;
  category?: string;
  userId?: string;
  limit?: number;
  page?: number;
  includeNutriFlexsProducts?: boolean;
}) {
  const { query = "", category, userId, limit = 20, page = 1, includeNutriFlexsProducts = true } = params;
  const skip = (page - 1) * limit;
  const trimmed = query.trim();

  // 1. FoodItem condition (global foods OR user custom foods)
  const whereFoodItem: any = {
    isActive: true,
    OR: [
      { isCustom: false },
      ...(userId ? [{ isCustom: true, createdById: userId }] : []),
    ],
  };

  if (category && category !== "All" && category !== "NutriFlexs Menu") {
    whereFoodItem.category = category;
  }

  if (trimmed) {
    whereFoodItem.name = { contains: trimmed, mode: "insensitive" };
  }

  const [foods, totalFoods] = await Promise.all([
    prisma.foodItem.findMany({
      where: whereFoodItem,
      orderBy: [{ isCustom: "desc" }, { name: "asc" }],
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        caloriesPer100g: true,
        protein: true,
        carbohydrates: true,
        fat: true,
        defaultServingSize: true,
        defaultServingUnit: true,
        servingWeightGrams: true,
        isCustom: true,
      },
    }),
    prisma.foodItem.count({ where: whereFoodItem }),
  ]);

  // 2. If searching "NutriFlexs Menu" or if general query matches NutriFlexs products, include them
  let nutriflexsProducts: any[] = [];
  if (includeNutriFlexsProducts && (!category || category === "All" || category === "NutriFlexs Menu")) {
    const whereProduct: any = { isAvailable: true };
    if (trimmed) {
      whereProduct.name = { contains: trimmed, mode: "insensitive" };
    }

    const prods = await prisma.product.findMany({
      where: whereProduct,
      take: 10,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        calories: true,
        protein: true,
        carbs: true,
        fats: true,
        imageUrl: true,
        isVeg: true,
      },
    });

    nutriflexsProducts = prods.map((p) => ({
      id: p.id,
      productId: p.id,
      name: `NutriFlexs: ${p.name}`,
      description: `${p.isVeg ? "🟢 Vegetarian" : "🔴 Non-Veg"} · ₹${p.price}`,
      category: "NutriFlexs Menu",
      caloriesPer100g: p.calories, // 1 serving
      protein: p.protein,
      carbohydrates: p.carbs,
      fat: p.fats,
      defaultServingSize: 1,
      defaultServingUnit: "serving",
      servingWeightGrams: 100,
      isNutriFlexsProduct: true,
      isCustom: false,
    }));
  }

  return {
    foods,
    nutriflexsProducts,
    total: totalFoods + nutriflexsProducts.length,
    page,
    limit,
  };
}

/**
 * Creates user-specific custom food.
 */
export async function createCustomFood(userId: string, input: CreateCustomFoodInput) {
  return await prisma.foodItem.create({
    data: {
      name: input.name.trim(),
      category: input.category || "Custom foods",
      description: input.description?.trim() || "User created custom food",
      caloriesPer100g: input.caloriesPer100g,
      protein: input.protein,
      carbohydrates: input.carbohydrates,
      fat: input.fat,
      defaultServingSize: input.defaultServingSize || 1,
      defaultServingUnit: input.defaultServingUnit || "serving",
      servingWeightGrams: input.servingWeightGrams || 100,
      isCustom: true,
      createdById: userId,
      isActive: true,
    },
  });
}

/**
 * Gets daily nutrition diary & goals for a given dateKey (YYYY-MM-DD).
 */
export async function getDailyNutritionDiary(userId: string, dateKey: string): Promise<DailyNutritionSummary> {
  const [logs, goalRecord] = await Promise.all([
    prisma.foodLog.findMany({
      where: {
        userId,
        dateKey,
      },
      orderBy: { loggedAt: "asc" },
      include: {
        product: { select: { imageUrl: true, isVeg: true } },
      },
    }),
    prisma.nutritionGoal.findUnique({
      where: { userId },
    }),
  ]);

  const meals: Record<MealType, MealDiarySection> = {
    [MealType.BREAKFAST]: { mealType: MealType.BREAKFAST, label: "Breakfast", items: [], totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 } },
    [MealType.LUNCH]: { mealType: MealType.LUNCH, label: "Lunch", items: [], totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 } },
    [MealType.SNACKS]: { mealType: MealType.SNACKS, label: "Evening Snacks", items: [], totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 } },
    [MealType.DINNER]: { mealType: MealType.DINNER, label: "Dinner", items: [], totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 } },
  };

  const dailyTotals: MacroTotals = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
  };

  for (const log of logs) {
    const meal = meals[log.mealType] || meals[MealType.LUNCH];
    const roundedCals = Math.round(log.calories * 10) / 10;
    const roundedProt = Math.round(log.protein * 10) / 10;
    const roundedCarb = Math.round(log.carbohydrates * 10) / 10;
    const roundedFat = Math.round(log.fat * 10) / 10;

    meal.items.push({
      id: log.id,
      foodItemId: log.foodItemId,
      productId: log.productId,
      orderItemId: log.orderItemId,
      name: log.foodNameSnapshot,
      quantity: log.quantity,
      unit: log.unit,
      calories: roundedCals,
      protein: roundedProt,
      carbohydrates: roundedCarb,
      fat: roundedFat,
      loggedAt: log.loggedAt.toISOString(),
      isAutoLoggedFromOrder: Boolean(log.orderItemId),
    });

    meal.totals.calories = Math.round((meal.totals.calories + roundedCals) * 10) / 10;
    meal.totals.protein = Math.round((meal.totals.protein + roundedProt) * 10) / 10;
    meal.totals.carbohydrates = Math.round((meal.totals.carbohydrates + roundedCarb) * 10) / 10;
    meal.totals.fat = Math.round((meal.totals.fat + roundedFat) * 10) / 10;

    dailyTotals.calories = Math.round((dailyTotals.calories + roundedCals) * 10) / 10;
    dailyTotals.protein = Math.round((dailyTotals.protein + roundedProt) * 10) / 10;
    dailyTotals.carbohydrates = Math.round((dailyTotals.carbohydrates + roundedCarb) * 10) / 10;
    dailyTotals.fat = Math.round((dailyTotals.fat + roundedFat) * 10) / 10;
  }

  // Calculate goal targets and progress
  const calGoal = goalRecord?.dailyCalorieGoal || null;
  const protGoal = goalRecord?.proteinGoal || null;
  const carbGoal = goalRecord?.carbohydrateGoal || null;
  const fatGoal = goalRecord?.fatGoal || null;

  return {
    dateKey,
    totals: dailyTotals,
    goals: {
      dailyCalorieGoal: calGoal,
      proteinGoal: protGoal,
      carbohydrateGoal: carbGoal,
      fatGoal: fatGoal,
      remainingCalories: calGoal !== null ? Math.round((calGoal - dailyTotals.calories) * 10) / 10 : null,
      calorieProgressPercent: calGoal ? Math.min(100, Math.round((dailyTotals.calories / calGoal) * 100)) : 0,
      remainingProtein: protGoal !== null ? Math.round((protGoal - dailyTotals.protein) * 10) / 10 : null,
      proteinProgressPercent: protGoal ? Math.min(100, Math.round((dailyTotals.protein / protGoal) * 100)) : 0,
      remainingCarbs: carbGoal !== null ? Math.round((carbGoal - dailyTotals.carbohydrates) * 10) / 10 : null,
      carbsProgressPercent: carbGoal ? Math.min(100, Math.round((dailyTotals.carbohydrates / carbGoal) * 100)) : 0,
      remainingFat: fatGoal !== null ? Math.round((fatGoal - dailyTotals.fat) * 10) / 10 : null,
      fatProgressPercent: fatGoal ? Math.min(100, Math.round((dailyTotals.fat / fatGoal) * 100)) : 0,
    },
    meals,
  };
}

/**
 * Adds a food log entry with server-side macro calculation.
 */
export async function addFoodLog(userId: string, input: AddFoodLogInput) {
  let calculatedCalories = 0;
  let calculatedProtein = 0;
  let calculatedCarbs = 0;
  let calculatedFat = 0;
  let foodName = input.foodName.trim();
  let possibleDuplicate = false;

  if (input.productId) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) throw new Error("Product not found");

    foodName = product.name;
    calculatedCalories = Math.round(product.calories * input.quantity * 10) / 10;
    calculatedProtein = Math.round(product.protein * input.quantity * 10) / 10;
    calculatedCarbs = Math.round(product.carbs * input.quantity * 10) / 10;
    calculatedFat = Math.round(product.fats * input.quantity * 10) / 10;

    // Check if an order item for this product was already logged for this user on this dateKey
    const existingOrderLog = await prisma.foodLog.findFirst({
      where: {
        userId,
        dateKey: input.dateKey,
        productId: product.id,
        orderItemId: { not: null },
      },
    });
    if (existingOrderLog) {
      possibleDuplicate = true;
    }
  } else if (input.foodItemId) {
    const foodItem = await prisma.foodItem.findFirst({
      where: {
        id: input.foodItemId,
        isActive: true,
        OR: [{ isCustom: false }, { isCustom: true, createdById: userId }],
      },
    });
    if (!foodItem) throw new Error("Food item not found");

    foodName = foodItem.name;
    const computed = calculateItemNutrition(foodItem, input.quantity, input.unit);
    calculatedCalories = computed.calories;
    calculatedProtein = computed.protein;
    calculatedCarbs = computed.carbohydrates;
    calculatedFat = computed.fat;
  } else {
    // Custom ad-hoc entry
    calculatedCalories = input.calories !== undefined ? input.calories : 0;
    calculatedProtein = input.protein !== undefined ? input.protein : 0;
    calculatedCarbs = input.carbohydrates !== undefined ? input.carbohydrates : 0;
    calculatedFat = input.fat !== undefined ? input.fat : 0;
  }

  const log = await prisma.foodLog.create({
    data: {
      userId,
      foodItemId: input.foodItemId || null,
      productId: input.productId || null,
      foodNameSnapshot: foodName,
      mealType: input.mealType,
      quantity: input.quantity,
      unit: input.unit,
      calories: calculatedCalories,
      protein: calculatedProtein,
      carbohydrates: calculatedCarbs,
      fat: calculatedFat,
      dateKey: input.dateKey,
      loggedAt: new Date(),
    },
  });

  return {
    log,
    possibleDuplicate,
  };
}

/**
 * Updates a food log entry with server-side recalculation.
 */
export async function updateFoodLog(userId: string, logId: string, input: UpdateFoodLogInput) {
  const existing = await prisma.foodLog.findFirst({
    where: { id: logId, userId },
    include: { foodItem: true, product: true },
  });

  if (!existing) {
    throw new Error("Food log entry not found or unauthorized.");
  }

  const quantity = input.quantity !== undefined ? input.quantity : existing.quantity;
  const unit = input.unit !== undefined ? input.unit : existing.unit;
  const mealType = input.mealType !== undefined ? input.mealType : existing.mealType;

  let calories = existing.calories;
  let protein = existing.protein;
  let carbohydrates = existing.carbohydrates;
  let fat = existing.fat;

  if (existing.productId && existing.product) {
    calories = Math.round(existing.product.calories * quantity * 10) / 10;
    protein = Math.round(existing.product.protein * quantity * 10) / 10;
    carbohydrates = Math.round(existing.product.carbs * quantity * 10) / 10;
    fat = Math.round(existing.product.fats * quantity * 10) / 10;
  } else if (existing.foodItemId && existing.foodItem) {
    const computed = calculateItemNutrition(existing.foodItem, quantity, unit);
    calories = computed.calories;
    protein = computed.protein;
    carbohydrates = computed.carbohydrates;
    fat = computed.fat;
  } else {
    // If ad-hoc, scale proportionally with quantity ratio if user didn't override
    if (input.calories !== undefined) {
      calories = input.calories;
      protein = input.protein || 0;
      carbohydrates = input.carbohydrates || 0;
      fat = input.fat || 0;
    } else if (existing.quantity > 0) {
      const ratio = quantity / existing.quantity;
      calories = Math.round(existing.calories * ratio * 10) / 10;
      protein = Math.round(existing.protein * ratio * 10) / 10;
      carbohydrates = Math.round(existing.carbohydrates * ratio * 10) / 10;
      fat = Math.round(existing.fat * ratio * 10) / 10;
    }
  }

  return await prisma.foodLog.update({
    where: { id: logId },
    data: {
      quantity,
      unit,
      mealType,
      calories,
      protein,
      carbohydrates,
      fat,
    },
  });
}

/**
 * Deletes a food log entry.
 */
export async function deleteFoodLog(userId: string, logId: string) {
  const existing = await prisma.foodLog.findFirst({
    where: { id: logId, userId },
  });

  if (!existing) {
    throw new Error("Food log entry not found or unauthorized.");
  }

  return await prisma.foodLog.delete({
    where: { id: logId },
  });
}

/**
 * Gets or updates customer's nutrition goals.
 */
export async function getNutritionGoals(userId: string) {
  return await prisma.nutritionGoal.findUnique({
    where: { userId },
  });
}

export async function upsertNutritionGoals(userId: string, input: UpdateNutritionGoalInput) {
  return await prisma.nutritionGoal.upsert({
    where: { userId },
    create: {
      userId,
      dailyCalorieGoal: input.dailyCalorieGoal !== undefined ? input.dailyCalorieGoal : null,
      proteinGoal: input.proteinGoal !== undefined ? input.proteinGoal : null,
      carbohydrateGoal: input.carbohydrateGoal !== undefined ? input.carbohydrateGoal : null,
      fatGoal: input.fatGoal !== undefined ? input.fatGoal : null,
    },
    update: {
      ...(input.dailyCalorieGoal !== undefined && { dailyCalorieGoal: input.dailyCalorieGoal }),
      ...(input.proteinGoal !== undefined && { proteinGoal: input.proteinGoal }),
      ...(input.carbohydrateGoal !== undefined && { carbohydrateGoal: input.carbohydrateGoal }),
      ...(input.fatGoal !== undefined && { fatGoal: input.fatGoal }),
    },
  });
}

/**
 * Automatically syncs completed NutriFlexs order items into the customer's food diary.
 * Idempotent: checks orderItemId so duplicates are never inserted.
 */
export async function syncCompletedOrderToNutritionDiary(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!order || order.status !== "COMPLETED") {
    return { synced: 0, skipped: 0 };
  }

  const completionDate = order.updatedAt || order.createdAt || new Date();
  const dateKey = getLocalDateKey("Asia/Kolkata", completionDate);
  const mealType = getMealTypeFromDate(completionDate, "Asia/Kolkata");

  let synced = 0;
  let skipped = 0;

  for (const item of order.items) {
    if (!item.product) continue;

    // Check if an entry already exists for this orderItemId
    const existing = await prisma.foodLog.findFirst({
      where: { orderItemId: item.id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const totalCals = Math.round(item.product.calories * item.quantity * 10) / 10;
    const totalProt = Math.round(item.product.protein * item.quantity * 10) / 10;
    const totalCarb = Math.round(item.product.carbs * item.quantity * 10) / 10;
    const totalFat = Math.round(item.product.fats * item.quantity * 10) / 10;

    await prisma.foodLog.create({
      data: {
        userId: order.userId,
        orderItemId: item.id,
        productId: item.productId,
        foodNameSnapshot: `NutriFlexs: ${item.product.name}`,
        mealType,
        quantity: item.quantity,
        unit: "serving",
        calories: totalCals,
        protein: totalProt,
        carbohydrates: totalCarb,
        fat: totalFat,
        dateKey,
        loggedAt: completionDate,
      },
    });

    synced++;
  }

  return { synced, skipped };
}

