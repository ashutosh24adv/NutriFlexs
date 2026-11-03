import { MealType } from "@prisma/client";
import { DailyNutritionSummary, MacroTotals, MealDiarySection } from "@/services/nutrition.service";

export interface GuestNutritionGoal {
  dailyCalorieGoal: number | null;
  proteinGoal: number | null;
  carbohydrateGoal: number | null;
  fatGoal: number | null;
}

export interface GuestFoodLogItem {
  id: string;
  foodItemId?: string | null;
  productId?: string | null;
  orderItemId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  mealType: MealType;
  dateKey: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  loggedAt: string;
  isAutoLoggedFromOrder: boolean;
  // Base nutrition reference for proportional scaling on edits
  baseCalories?: number;
  baseProtein?: number;
  baseCarbs?: number;
  baseFat?: number;
}

export interface GuestCustomFood {
  id: string;
  name: string;
  category: string;
  description: string;
  caloriesPer100g: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  defaultServingSize: number;
  defaultServingUnit: string;
  servingWeightGrams: number;
  isCustom: true;
  createdAt: string;
}

const STORAGE_KEYS = {
  GOALS: "nutriflexs_guest_nutrition_goals",
  LOGS: "nutriflexs_guest_food_logs",
  CUSTOM_FOODS: "nutriflexs_guest_custom_foods",
  FAVORITES: "nutriflexs_guest_favorites",
  SAVED_MEALS: "nutriflexs_guest_saved_meals",
  MIGRATION_DISMISSED: "nutriflexs_guest_migration_dismissed",
};

function isClient(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeGetItem<T>(key: string, defaultValue: T): T {
  if (!isClient()) return defaultValue;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error(`Failed to read ${key} from localStorage`, e);
    return defaultValue;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write ${key} to localStorage`, e);
  }
}

// -------------------------------------------------------------
// GOALS
// -------------------------------------------------------------

export function getGuestGoals(): GuestNutritionGoal {
  return safeGetItem<GuestNutritionGoal>(STORAGE_KEYS.GOALS, {
    dailyCalorieGoal: null,
    proteinGoal: null,
    carbohydrateGoal: null,
    fatGoal: null,
  });
}

export function saveGuestGoals(goals: GuestNutritionGoal): void {
  safeSetItem(STORAGE_KEYS.GOALS, goals);
}

// -------------------------------------------------------------
// LOGS
// -------------------------------------------------------------

export function getAllGuestLogs(): GuestFoodLogItem[] {
  return safeGetItem<GuestFoodLogItem[]>(STORAGE_KEYS.LOGS, []);
}

export function getGuestLogsForDate(dateKey: string): GuestFoodLogItem[] {
  const all = getAllGuestLogs();
  return all.filter((l) => l.dateKey === dateKey);
}

export function addGuestLog(
  input: Omit<GuestFoodLogItem, "id" | "loggedAt" | "isAutoLoggedFromOrder">
): GuestFoodLogItem {
  const all = getAllGuestLogs();
  const newLog: GuestFoodLogItem = {
    ...input,
    id: `guest_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loggedAt: new Date().toISOString(),
    isAutoLoggedFromOrder: false,
    baseCalories: input.quantity > 0 ? input.calories / input.quantity : input.calories,
    baseProtein: input.quantity > 0 ? input.protein / input.quantity : input.protein,
    baseCarbs: input.quantity > 0 ? input.carbohydrates / input.quantity : input.carbohydrates,
    baseFat: input.quantity > 0 ? input.fat / input.quantity : input.fat,
  };

  all.push(newLog);
  safeSetItem(STORAGE_KEYS.LOGS, all);
  return newLog;
}

export function updateGuestLog(
  id: string,
  updates: {
    quantity?: number;
    unit?: string;
    mealType?: MealType;
  }
): GuestFoodLogItem | null {
  const all = getAllGuestLogs();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return null;

  const current = all[idx];
  const newQty = updates.quantity !== undefined ? Math.max(0.1, updates.quantity) : current.quantity;
  const newUnit = updates.unit || current.unit;
  const newMealType = updates.mealType || current.mealType;

  // Scale calories proportionally
  const baseCals = current.baseCalories ?? (current.quantity > 0 ? current.calories / current.quantity : current.calories);
  const baseProt = current.baseProtein ?? (current.quantity > 0 ? current.protein / current.quantity : current.protein);
  const baseCarbs = current.baseCarbs ?? (current.quantity > 0 ? current.carbohydrates / current.quantity : current.carbohydrates);
  const baseFat = current.baseFat ?? (current.quantity > 0 ? current.fat / current.quantity : current.fat);

  const updatedLog: GuestFoodLogItem = {
    ...current,
    quantity: newQty,
    unit: newUnit,
    mealType: newMealType,
    calories: Math.round(baseCals * newQty * 10) / 10,
    protein: Math.round(baseProt * newQty * 10) / 10,
    carbohydrates: Math.round(baseCarbs * newQty * 10) / 10,
    fat: Math.round(baseFat * newQty * 10) / 10,
    baseCalories: baseCals,
    baseProtein: baseProt,
    baseCarbs: baseCarbs,
    baseFat: baseFat,
  };

  all[idx] = updatedLog;
  safeSetItem(STORAGE_KEYS.LOGS, all);
  return updatedLog;
}

export function deleteGuestLog(id: string): boolean {
  const all = getAllGuestLogs();
  const filtered = all.filter((l) => l.id !== id);
  if (filtered.length === all.length) return false;
  safeSetItem(STORAGE_KEYS.LOGS, filtered);
  return true;
}

// -------------------------------------------------------------
// CUSTOM FOODS
// -------------------------------------------------------------

export function getGuestCustomFoods(): GuestCustomFood[] {
  return safeGetItem<GuestCustomFood[]>(STORAGE_KEYS.CUSTOM_FOODS, []);
}

export function addGuestCustomFood(
  food: Omit<GuestCustomFood, "id" | "isCustom" | "createdAt">
): GuestCustomFood {
  const all = getGuestCustomFoods();
  const newFood: GuestCustomFood = {
    ...food,
    id: `guest_food_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
  all.push(newFood);
  safeSetItem(STORAGE_KEYS.CUSTOM_FOODS, all);
  return newFood;
}

// -------------------------------------------------------------
// DAILY SUMMARY BUILDER
// -------------------------------------------------------------

export function getGuestDailyNutritionSummary(dateKey: string): DailyNutritionSummary {
  const logs = getGuestLogsForDate(dateKey);
  const goals = getGuestGoals();

  const meals: Record<MealType, MealDiarySection> = {
    [MealType.BREAKFAST]: {
      mealType: MealType.BREAKFAST,
      label: "Breakfast",
      items: [],
      totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    },
    [MealType.LUNCH]: {
      mealType: MealType.LUNCH,
      label: "Lunch",
      items: [],
      totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    },
    [MealType.SNACKS]: {
      mealType: MealType.SNACKS,
      label: "Evening Snacks",
      items: [],
      totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    },
    [MealType.DINNER]: {
      mealType: MealType.DINNER,
      label: "Dinner",
      items: [],
      totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
    },
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
    const roundedCarbs = Math.round(log.carbohydrates * 10) / 10;
    const roundedFat = Math.round(log.fat * 10) / 10;

    meal.items.push({
      id: log.id,
      foodItemId: log.foodItemId,
      productId: log.productId,
      orderItemId: log.orderItemId,
      name: log.name,
      quantity: log.quantity,
      unit: log.unit,
      calories: roundedCals,
      protein: roundedProt,
      carbohydrates: roundedCarbs,
      fat: roundedFat,
      loggedAt: log.loggedAt,
      isAutoLoggedFromOrder: log.isAutoLoggedFromOrder,
    });

    meal.totals.calories += roundedCals;
    meal.totals.protein += roundedProt;
    meal.totals.carbohydrates += roundedCarbs;
    meal.totals.fat += roundedFat;

    dailyTotals.calories += roundedCals;
    dailyTotals.protein += roundedProt;
    dailyTotals.carbohydrates += roundedCarbs;
    dailyTotals.fat += roundedFat;
  }

  // Round meal totals
  for (const m of Object.values(meals)) {
    m.totals.calories = Math.round(m.totals.calories * 10) / 10;
    m.totals.protein = Math.round(m.totals.protein * 10) / 10;
    m.totals.carbohydrates = Math.round(m.totals.carbohydrates * 10) / 10;
    m.totals.fat = Math.round(m.totals.fat * 10) / 10;
  }

  dailyTotals.calories = Math.round(dailyTotals.calories * 10) / 10;
  dailyTotals.protein = Math.round(dailyTotals.protein * 10) / 10;
  dailyTotals.carbohydrates = Math.round(dailyTotals.carbohydrates * 10) / 10;
  dailyTotals.fat = Math.round(dailyTotals.fat * 10) / 10;

  // Goals calculations
  const dailyCalorieGoal = goals.dailyCalorieGoal;
  const remainingCalories = dailyCalorieGoal ? Math.round((dailyCalorieGoal - dailyTotals.calories) * 10) / 10 : null;
  const calorieProgressPercent = dailyCalorieGoal && dailyCalorieGoal > 0
    ? Math.round((dailyTotals.calories / dailyCalorieGoal) * 100)
    : 0;

  const proteinGoal = goals.proteinGoal;
  const remainingProtein = proteinGoal ? Math.round((proteinGoal - dailyTotals.protein) * 10) / 10 : null;
  const proteinProgressPercent = proteinGoal && proteinGoal > 0
    ? Math.round((dailyTotals.protein / proteinGoal) * 100)
    : 0;

  const carbohydrateGoal = goals.carbohydrateGoal;
  const remainingCarbs = carbohydrateGoal ? Math.round((carbohydrateGoal - dailyTotals.carbohydrates) * 10) / 10 : null;
  const carbsProgressPercent = carbohydrateGoal && carbohydrateGoal > 0
    ? Math.round((dailyTotals.carbohydrates / carbohydrateGoal) * 100)
    : 0;

  const fatGoal = goals.fatGoal;
  const remainingFat = fatGoal ? Math.round((fatGoal - dailyTotals.fat) * 10) / 10 : null;
  const fatProgressPercent = fatGoal && fatGoal > 0
    ? Math.round((dailyTotals.fat / fatGoal) * 100)
    : 0;

  return {
    dateKey,
    totals: dailyTotals,
    goals: {
      dailyCalorieGoal,
      proteinGoal,
      carbohydrateGoal,
      fatGoal,
      remainingCalories,
      calorieProgressPercent,
      remainingProtein,
      proteinProgressPercent,
      remainingCarbs,
      carbsProgressPercent,
      remainingFat,
      fatProgressPercent,
    },
    meals,
  };
}

// -------------------------------------------------------------
// GUEST TO ACCOUNT MIGRATION HELPERS
// -------------------------------------------------------------

export function hasGuestDataToMigrate(): boolean {
  if (!isClient()) return false;
  if (isGuestMigrationDismissed()) return false;
  const logs = getAllGuestLogs();
  const goals = getGuestGoals();
  const customFoods = getGuestCustomFoods();

  const hasLogs = logs.length > 0;
  const hasGoals = Boolean(
    goals.dailyCalorieGoal || goals.proteinGoal || goals.carbohydrateGoal || goals.fatGoal
  );
  const hasCustom = customFoods.length > 0;

  return hasLogs || hasGoals || hasCustom;
}

export function getGuestDataForMigration() {
  return {
    goals: getGuestGoals(),
    logs: getAllGuestLogs(),
    customFoods: getGuestCustomFoods(),
    favorites: getGuestFavorites(),
    savedMeals: getGuestSavedMeals(),
  };
}

export function clearGuestData(): void {
  if (!isClient()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.LOGS);
    window.localStorage.removeItem(STORAGE_KEYS.GOALS);
    window.localStorage.removeItem(STORAGE_KEYS.CUSTOM_FOODS);
    window.localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    window.localStorage.removeItem(STORAGE_KEYS.SAVED_MEALS);
    window.localStorage.removeItem(STORAGE_KEYS.MIGRATION_DISMISSED);
  } catch (e) {
    console.error("Failed to clear guest nutrition data", e);
  }
}

export function dismissGuestMigration(): void {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.MIGRATION_DISMISSED, "true");
  } catch (e) {
    console.error("Failed to dismiss guest migration", e);
  }
}

export function isGuestMigrationDismissed(): boolean {
  if (!isClient()) return false;
  try {
    return window.localStorage.getItem(STORAGE_KEYS.MIGRATION_DISMISSED) === "true";
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------------
// PHASE 3: GUEST RECENT FOODS, FAVORITES, & SAVED MEALS
// -------------------------------------------------------------

export interface GuestFavoriteFood {
  id: string;
  foodItemId?: string | null;
  productId?: string | null;
  foodNameSnapshot: string;
  category?: string;
  caloriesPer100g: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  defaultServingSize: number;
  defaultServingUnit: string;
  servingWeightGrams?: number;
  createdAt: string;
}

export interface GuestSavedMealItem {
  id: string;
  foodName: string;
  foodItemId?: string | null;
  productId?: string | null;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  caloriesPer100g?: number;
  servingWeightGrams?: number;
}

export interface GuestSavedMeal {
  id: string;
  name: string;
  description?: string;
  items: GuestSavedMealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  createdAt: string;
  updatedAt: string;
}

export function getGuestRecentFoods(limit = 12) {
  const logs = getAllGuestLogs();
  const seen = new Set<string>();
  const recents: any[] = [];

  // Sort logs by loggedAt descending
  const sortedLogs = [...logs].sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());

  for (const log of sortedLogs) {
    const key = log.name.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      recents.push({
        id: log.id,
        name: log.name,
        lastQuantity: log.quantity,
        unit: log.unit,
        calories: log.calories,
        protein: log.protein,
        carbohydrates: log.carbohydrates,
        fat: log.fat,
        foodItemId: log.foodItemId,
        productId: log.productId,
        loggedAt: log.loggedAt,
      });
      if (recents.length >= limit) break;
    }
  }

  return recents;
}

export function getGuestFavorites(): GuestFavoriteFood[] {
  return safeGetItem<GuestFavoriteFood[]>(STORAGE_KEYS.FAVORITES, []);
}

export function isGuestFavorite(foodName: string, foodItemId?: string | null, productId?: string | null): boolean {
  const list = getGuestFavorites();
  const nameKey = foodName.trim().toLowerCase();
  return list.some(
    (f) =>
      (foodItemId && f.foodItemId === foodItemId) ||
      (productId && f.productId === productId) ||
      f.foodNameSnapshot.trim().toLowerCase() === nameKey
  );
}

export function toggleGuestFavorite(food: {
  name: string;
  foodItemId?: string | null;
  productId?: string | null;
  category?: string;
  caloriesPer100g?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  defaultServingSize?: number;
  defaultServingUnit?: string;
  servingWeightGrams?: number;
}): { isFavorite: boolean } {
  const list = getGuestFavorites();
  const nameKey = food.name.trim().toLowerCase();

  const idx = list.findIndex(
    (f) =>
      (food.foodItemId && f.foodItemId === food.foodItemId) ||
      (food.productId && f.productId === food.productId) ||
      f.foodNameSnapshot.trim().toLowerCase() === nameKey
  );

  if (idx >= 0) {
    list.splice(idx, 1);
    safeSetItem(STORAGE_KEYS.FAVORITES, list);
    return { isFavorite: false };
  }

  const newFav: GuestFavoriteFood = {
    id: `guest_fav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    foodItemId: food.foodItemId || null,
    productId: food.productId || null,
    foodNameSnapshot: food.name.trim(),
    category: food.category || "General",
    caloriesPer100g: food.caloriesPer100g || 0,
    protein: food.protein || 0,
    carbohydrates: food.carbohydrates || 0,
    fat: food.fat || 0,
    defaultServingSize: food.defaultServingSize || 1,
    defaultServingUnit: food.defaultServingUnit || "serving",
    servingWeightGrams: food.servingWeightGrams || 100,
    createdAt: new Date().toISOString(),
  };

  list.unshift(newFav);
  safeSetItem(STORAGE_KEYS.FAVORITES, list);
  return { isFavorite: true };
}

export function removeGuestFavorite(id: string): void {
  const list = getGuestFavorites();
  const filtered = list.filter((f) => f.id !== id);
  safeSetItem(STORAGE_KEYS.FAVORITES, filtered);
}

export function getGuestSavedMeals(): GuestSavedMeal[] {
  return safeGetItem<GuestSavedMeal[]>(STORAGE_KEYS.SAVED_MEALS, []);
}

export function saveGuestMeal(meal: {
  id?: string;
  name: string;
  description?: string;
  items: Array<{
    foodName: string;
    foodItemId?: string | null;
    productId?: string | null;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    caloriesPer100g?: number;
    servingWeightGrams?: number;
  }>;
}): GuestSavedMeal {
  const list = getGuestSavedMeals();
  const now = new Date().toISOString();

  const totalCalories = Math.round(meal.items.reduce((acc, i) => acc + i.calories, 0) * 10) / 10;
  const totalProtein = Math.round(meal.items.reduce((acc, i) => acc + i.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(meal.items.reduce((acc, i) => acc + i.carbohydrates, 0) * 10) / 10;
  const totalFat = Math.round(meal.items.reduce((acc, i) => acc + i.fat, 0) * 10) / 10;

  if (meal.id) {
    const idx = list.findIndex((m) => m.id === meal.id);
    if (idx >= 0) {
      const updated: GuestSavedMeal = {
        ...list[idx],
        name: meal.name.trim(),
        description: meal.description?.trim(),
        items: meal.items.map((it) => ({
          id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ...it,
        })),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        updatedAt: now,
      };
      list[idx] = updated;
      safeSetItem(STORAGE_KEYS.SAVED_MEALS, list);
      return updated;
    }
  }

  const newMeal: GuestSavedMeal = {
    id: `guest_meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: meal.name.trim(),
    description: meal.description?.trim(),
    items: meal.items.map((it) => ({
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...it,
    })),
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    createdAt: now,
    updatedAt: now,
  };

  list.unshift(newMeal);
  safeSetItem(STORAGE_KEYS.SAVED_MEALS, list);
  return newMeal;
}

export function deleteGuestMeal(id: string): void {
  const list = getGuestSavedMeals();
  const filtered = list.filter((m) => m.id !== id);
  safeSetItem(STORAGE_KEYS.SAVED_MEALS, filtered);
}

export function logGuestSavedMeal(mealId: string, mealType: MealType, dateKey: string) {
  const list = getGuestSavedMeals();
  const meal = list.find((m) => m.id === mealId);
  if (!meal) {
    throw new Error("Saved meal not found");
  }

  for (const it of meal.items) {
    addGuestLog({
      name: it.foodName,
      mealType,
      quantity: it.quantity,
      unit: it.unit,
      dateKey,
      calories: it.calories,
      protein: it.protein,
      carbohydrates: it.carbohydrates,
      fat: it.fat,
      foodItemId: it.foodItemId || null,
      productId: it.productId || null,
    });
  }

  return {
    success: true,
    mealName: meal.name,
    loggedItemsCount: meal.items.length,
  };
}

