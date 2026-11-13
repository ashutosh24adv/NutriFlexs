/**
 * Nutrition, Food Log, and Diary Domain Types
 */

export type MealType = "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER" | "POST_WORKOUT";

export interface MacroBreakdown {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface FoodItemDomain {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  caloriesPer100g: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  defaultServingSize: number;
  defaultServingUnit: string;
  servingWeightGrams?: number | null;
  isCustom: boolean;
  createdById?: string | null;
  isActive: boolean;
}

export interface FoodLogDomain {
  id: string;
  userId: string;
  foodItemId?: string | null;
  productId?: string | null;
  orderItemId?: string | null;
  foodNameSnapshot: string;
  mealType: MealType;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  dateKey: string;
  loggedAt: string | Date;
  isAutoLogged?: boolean;
}

export interface DailyDiarySummary {
  dateKey: string;
  goals: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    waterMl: number;
  };
  consumed: MacroBreakdown;
  burnedFromExercise: number;
  remainingCalories: number;
  waterConsumedMl: number;
  meals: Record<MealType, FoodLogDomain[]>;
}

export interface CoachInsight {
  id: string;
  type: "PROTEIN_DEFICIT" | "HYDRATION_DEFICIT" | "STREAK_MILESTONE" | "BALANCED_MACROS";
  title: string;
  message: string;
  severity: "INFO" | "SUGGESTION" | "WARNING" | "CELEBRATION";
  actionLink?: {
    type: "DEEP_LINK_ORDER" | "OPEN_WATER_LOG" | "VIEW_MENU";
    label: string;
    params?: Record<string, string>;
  };
}
