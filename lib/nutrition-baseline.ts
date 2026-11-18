/**
 * NutriFlexs Baseline Nutrition & Macro Calculator
 * Implements Mifflin-St Jeor BMR equation with activity multiplier and goal adjustments.
 * Used across authentication, profile onboarding, and nutrition summary to guarantee
 * that athlete targets in Neon Postgres are strictly personalized and never overwritten
 * with arbitrary default values.
 */

export interface BaselineInput {
  weightKg?: number | null;
  heightCm?: number | null;
  sex?: string | null;
  dateOfBirth?: Date | string | null;
  workoutFrequency?: string | null;
  primaryGoal?: string | null;
  customDailyProteinGoal?: number | null;
  proteinGoalGrams?: number | null;
}

export interface NutritionBaseline {
  dailyCalorieGoal: number;
  proteinGoal: number;
  carbohydrateGoal: number;
  fatGoal: number;
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
  waterGoalMl: number;
}

export function calculateBaselineGoals(params: BaselineInput): NutritionBaseline {
  const weight = params.weightKg && params.weightKg > 0 ? params.weightKg : 70;
  const height = params.heightCm && params.heightCm > 0 ? params.heightCm : 175;

  let age = 25;
  if (params.dateOfBirth) {
    const dob = typeof params.dateOfBirth === "string" ? new Date(params.dateOfBirth) : params.dateOfBirth;
    if (!isNaN(dob.getTime())) {
      const diffMs = Date.now() - dob.getTime();
      const computedAge = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
      if (computedAge >= 14 && computedAge <= 100) {
        age = computedAge;
      }
    }
  }

  const isFemale = (params.sex || "").toLowerCase().includes("female");
  // Mifflin-St Jeor BMR
  const bmr = 10 * weight + 6.25 * height - 5 * age + (isFemale ? -161 : 5);

  // Activity multiplier based on workout frequency
  const freq = (params.workoutFrequency || "").toLowerCase();
  let activityMultiplier = 1.4; // default moderate
  if (
    freq.includes("7+") ||
    freq.includes("every day") ||
    freq.includes("daily") ||
    freq.includes("athlete") ||
    freq.includes("6-7")
  ) {
    activityMultiplier = 1.725;
  } else if (freq.includes("4-6") || freq.includes("5") || freq.includes("active")) {
    activityMultiplier = 1.55;
  } else if (
    freq.includes("0-4") ||
    freq.includes("1-3") ||
    freq.includes("sedentary") ||
    freq.includes("light")
  ) {
    activityMultiplier = 1.35;
  }

  let tdee = bmr * activityMultiplier;

  // Fitness goal adjustment
  const goal = (params.primaryGoal || "").toLowerCase();
  if (
    goal.includes("lose") ||
    goal.includes("fat loss") ||
    goal.includes("cut") ||
    goal.includes("weight loss")
  ) {
    tdee -= 400; // Calorie deficit
  } else if (
    goal.includes("build") ||
    goal.includes("muscle") ||
    goal.includes("hypertrophy") ||
    goal.includes("mass") ||
    goal.includes("gain")
  ) {
    tdee += 300; // Calorie surplus
  }

  const dailyCalorieGoal = Math.max(1200, Math.min(4500, Math.round(tdee / 50) * 50));

  // Protein calculation: 1.6 - 2.0g per kg of bodyweight, or user preference if set
  let proteinGoal: number;
  if (params.customDailyProteinGoal && params.customDailyProteinGoal > 0) {
    proteinGoal = params.customDailyProteinGoal;
  } else if (params.proteinGoalGrams && params.proteinGoalGrams > 0) {
    proteinGoal = params.proteinGoalGrams;
  } else {
    let proteinPerKg = 1.6;
    if (
      goal.includes("muscle") ||
      goal.includes("build") ||
      freq.includes("4-6") ||
      freq.includes("7+")
    ) {
      proteinPerKg = 2.0;
    } else if (goal.includes("lose") || goal.includes("fat loss")) {
      proteinPerKg = 1.8;
    }
    proteinGoal = Math.max(60, Math.min(260, Math.round(weight * proteinPerKg)));
  }

  // Fat calculation: ~25% of calories / 9
  const fatGoal = Math.max(40, Math.min(120, Math.round((dailyCalorieGoal * 0.25) / 9)));

  // Remaining calories allocated to carbohydrates / 4
  const carbCalories = dailyCalorieGoal - proteinGoal * 4 - fatGoal * 9;
  const carbohydrateGoal = Math.max(100, Math.min(600, Math.round(carbCalories / 4)));

  return {
    dailyCalorieGoal,
    proteinGoal,
    carbohydrateGoal,
    fatGoal,
    calorieTarget: dailyCalorieGoal,
    proteinTarget: proteinGoal,
    carbsTarget: carbohydrateGoal,
    fatsTarget: fatGoal,
    waterGoalMl: 3000,
  };
}
