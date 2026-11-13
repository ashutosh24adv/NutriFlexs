/**
 * NutriFlexs Nutrition, Macro, and Daily Goal Constants
 */

export const MACRO_ENERGY_FACTORS = {
  PROTEIN_KCAL_PER_GRAM: 4,
  CARBS_KCAL_PER_GRAM: 4,
  FAT_KCAL_PER_GRAM: 9,
} as const;

export const DEFAULT_NUTRITION_GOALS = {
  DAILY_CALORIES: 2000,
  PROTEIN_GRAMS: 120,
  CARBOHYDRATE_GRAMS: 250,
  FAT_GRAMS: 65,
  WATER_ML: 3000,
  MIN_CALORIES: 500,
  MAX_CALORIES: 10000,
  MAX_PROTEIN_GRAMS: 600,
  MAX_CARBS_GRAMS: 1500,
  MAX_FAT_GRAMS: 500,
} as const;

export const MEAL_TYPES = [
  "BREAKFAST",
  "LUNCH",
  "SNACKS",
  "DINNER",
  "POST_WORKOUT",
] as const;

export type MealTypeConstant = (typeof MEAL_TYPES)[number];

export const MEAL_TYPE_LABELS: Record<MealTypeConstant, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  SNACKS: "Snacks",
  DINNER: "Dinner",
  POST_WORKOUT: "Post-Workout",
};

export const ACTIVITY_LEVEL_MULTIPLIERS = {
  SEDENTARY: { label: "Sedentary (desk job, little exercise)", multiplier: 1.2 },
  LIGHTLY_ACTIVE: { label: "Lightly Active (light exercise 1-3 days/wk)", multiplier: 1.375 },
  MODERATELY_ACTIVE: { label: "Moderately Active (exercise 3-5 days/wk)", multiplier: 1.55 },
  VERY_ACTIVE: { label: "Very Active (hard exercise 6-7 days/wk)", multiplier: 1.725 },
  EXTRA_ACTIVE: { label: "Athlete / Intense (physical job or 2x/day)", multiplier: 1.9 },
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_LEVEL_MULTIPLIERS;

export const FITNESS_GOALS = {
  FAT_LOSS: {
    label: "Fat Loss & Cutting",
    calorieAdjustmentFactor: 0.8, // 20% deficit
    proteinPerKg: 2.0,
  },
  MAINTAIN: {
    label: "Maintenance & Energy",
    calorieAdjustmentFactor: 1.0,
    proteinPerKg: 1.6,
  },
  MUSCLE_BUILD: {
    label: "Muscle Gain & Bulking",
    calorieAdjustmentFactor: 1.1, // 10% surplus
    proteinPerKg: 2.2,
  },
} as const;

export type FitnessGoal = keyof typeof FITNESS_GOALS;

/**
 * Calculates BMR using the Mifflin-St Jeor Equation
 */
export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: "MALE" | "FEMALE" | "OTHER";
}): number {
  const { weightKg, heightCm, ageYears, gender } = params;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (gender === "MALE") {
    return Math.round(base + 5);
  } else if (gender === "FEMALE") {
    return Math.round(base - 161);
  }
  return Math.round(base - 78);
}

/**
 * Calculates daily TDEE (Total Daily Energy Expenditure) and macro targets
 */
export function calculateDailyTargets(params: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
}) {
  const bmr = calculateBMR(params);
  const activityMultiplier = ACTIVITY_LEVEL_MULTIPLIERS[params.activityLevel].multiplier;
  const tdee = Math.round(bmr * activityMultiplier);

  const goalConfig = FITNESS_GOALS[params.goal];
  const targetCalories = Math.round(tdee * goalConfig.calorieAdjustmentFactor);
  
  // Protein in grams based on bodyweight
  const targetProtein = Math.round(params.weightKg * goalConfig.proteinPerKg);
  const proteinCalories = targetProtein * MACRO_ENERGY_FACTORS.PROTEIN_KCAL_PER_GRAM;

  // Fat target: ~25% of daily calories
  const fatCalories = targetCalories * 0.25;
  const targetFat = Math.round(fatCalories / MACRO_ENERGY_FACTORS.FAT_KCAL_PER_GRAM);

  // Carbs fill the remaining calories
  const remainingCalories = Math.max(0, targetCalories - proteinCalories - fatCalories);
  const targetCarbs = Math.round(remainingCalories / MACRO_ENERGY_FACTORS.CARBS_KCAL_PER_GRAM);

  return {
    bmr,
    tdee,
    targetCalories,
    targetProtein,
    targetCarbs,
    targetFat,
  };
}
