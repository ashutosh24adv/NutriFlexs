import { prisma, withDbRetry } from "@/lib/prisma";
import {
  OnboardingData,
  normalizeGoal,
  normalizeWorkoutFrequency,
} from "@/lib/onboarding-engine";

export type { OnboardingData };

export interface CalculatedNutritionTargets {
  bmi: number | null;
  bmiCategory: string | null;
  bmr: number | null;
  tdee: number | null;
  dailyCalories: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  hasCompleteMetrics: boolean;
  missingMetrics: string[];
  estimationBasis: string;
  isSafeGoal: boolean;
  feasibilityAssessment: {
    isRealistic: boolean;
    weeklyChangeKg: number;
    recommendedTimelineWeeks: number;
    safetyNote: string;
  };
}

/**
 * Derives age from a birth date string (YYYY-MM-DD). Returns null if missing/invalid.
 */
export function calculateAge(birthDateStr?: string | null): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(13, Math.min(age, 100));
}

/**
 * Calculates evidence-based nutrition targets using Mifflin-St Jeor formula.
 * Uses actual user responses; never fabricates falsely precise targets when key metrics are missing.
 */
export function calculateNutritionTargets(data: OnboardingData): CalculatedNutritionTargets {
  const missingMetrics: string[] = [];
  const rawWeight = data.weightKg && data.weightKg > 0 ? data.weightKg : null;
  const rawHeight = !data.heightSkipped && data.heightCm && data.heightCm > 0 ? data.heightCm : null;
  const rawAge = !data.birthDateSkipped ? calculateAge(data.birthDate) : null;
  const gender = data.gender || data.sex || "prefer_not_to_say";

  if (!rawWeight) missingMetrics.push("current weight");
  if (!rawHeight) missingMetrics.push("height");
  if (!rawAge) missingMetrics.push("age");

  const hasCompleteMetrics = Boolean(rawWeight && rawHeight && rawAge);
  const goal = normalizeGoal(data.primaryGoal);
  const freq = normalizeWorkoutFrequency(data.workoutFrequency);

  // 1. BMI calculation: only when both height & weight are provided
  let bmi: number | null = null;
  let bmiCategory: string | null = null;
  if (rawHeight && rawWeight) {
    const heightM = rawHeight / 100;
    bmi = Number((rawWeight / (heightM * heightM)).toFixed(1));
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 24.9) bmiCategory = "Normal Weight";
    else if (bmi < 29.9) bmiCategory = "Overweight";
    else bmiCategory = "Obese";
  }

  // 2. Feasibility & Safety Assessment (only when weight & targetWeight are provided)
  let targetDeltaKg = 0;
  if (goal === "lose_weight" && rawWeight && data.desiredGoalTarget?.targetWeightKg) {
    targetDeltaKg = Math.max(0, rawWeight - data.desiredGoalTarget.targetWeightKg);
  } else if (
    goal === "gain_weight_build_muscle" &&
    rawWeight &&
    data.desiredGoalTarget?.targetWeightKg
  ) {
    targetDeltaKg = Math.max(0, data.desiredGoalTarget.targetWeightKg - rawWeight);
  }

  const timelineWeeks =
    data.desiredTimelineWeeks && data.desiredTimelineWeeks > 0
      ? data.desiredTimelineWeeks
      : targetDeltaKg > 0
      ? Math.max(8, Math.round(targetDeltaKg / 0.5))
      : 12;

  const weeklyChangeKg =
    targetDeltaKg > 0 && timelineWeeks > 0
      ? Number((targetDeltaKg / timelineWeeks).toFixed(2))
      : 0;

  const isSafeGoal = weeklyChangeKg <= 1.0;
  const recommendedTimelineWeeks =
    targetDeltaKg > 0 ? Math.max(4, Math.ceil(targetDeltaKg / 0.5)) : 12;

  let safetyNote =
    "Your selected timeline aligns with conservative, sustainable wellness guidelines.";
  if (!isSafeGoal && goal === "lose_weight") {
    safetyNote =
      "Losing more than ~1 kg per week can increase muscle loss and fatigue. Consider a longer timeline closer to 0.4–0.6 kg per week.";
  } else if (!isSafeGoal && goal === "gain_weight_build_muscle") {
    safetyNote =
      "Gaining more than ~1 kg per week often adds excess body fat alongside muscle. A steadier pace of 0.25–0.5 kg per week supports leaner gains.";
  }

  // 3. If user shared existing dietitian targets and hasn't overridden them
  if (
    data.shareExistingTargets === "yes" &&
    data.existingCalorieTarget &&
    data.existingCalorieTarget >= 800
  ) {
    const dailyCalories = Math.round(data.existingCalorieTarget);
    const proteinGrams = data.existingProteinTarget
      ? Math.round(data.existingProteinTarget)
      : rawWeight
      ? Math.max(70, Math.min(Math.round(rawWeight * 1.8), 250))
      : 120;
    const fatGrams = Math.round((dailyCalories * 0.28) / 9);
    const carbsGrams = Math.max(
      50,
      Math.round((dailyCalories - proteinGrams * 4 - fatGrams * 9) / 4)
    );

    return {
      bmi,
      bmiCategory,
      bmr: null,
      tdee: null,
      dailyCalories: data.customCalorieTarget || dailyCalories,
      proteinGrams: data.customProteinTarget || proteinGrams,
      carbsGrams: data.customCarbsTarget || carbsGrams,
      fatGrams: data.customFatTarget || fatGrams,
      hasCompleteMetrics,
      missingMetrics,
      estimationBasis:
        "Based on the existing nutrition targets you shared from your nutrition professional.",
      isSafeGoal,
      feasibilityAssessment: {
        isRealistic: isSafeGoal,
        weeklyChangeKg,
        recommendedTimelineWeeks,
        safetyNote,
      },
    };
  }

  // 4. If key physical metrics are missing, do not fabricate BMR/TDEE
  if (!rawWeight || !rawHeight || !rawAge) {
    // Allow custom manual edits if user entered them on the summary screen
    const hasManualOverrides = Boolean(
      data.customCalorieTarget || data.customProteinTarget
    );
    return {
      bmi,
      bmiCategory,
      bmr: null,
      tdee: null,
      dailyCalories: data.customCalorieTarget || null,
      proteinGrams: data.customProteinTarget || null,
      carbsGrams: data.customCarbsTarget || null,
      fatGrams: data.customFatTarget || null,
      hasCompleteMetrics: false,
      missingMetrics,
      estimationBasis: hasManualOverrides
        ? "Using your custom edited targets (some body metrics were skipped)."
        : `Cannot compute a reliable calorie estimate without ${missingMetrics.join(", ")}. You can enter custom targets below or fill in the missing details.`,
      isSafeGoal,
      feasibilityAssessment: {
        isRealistic: isSafeGoal,
        weeklyChangeKg,
        recommendedTimelineWeeks,
        safetyNote,
      },
    };
  }

  // 5. Basal Metabolic Rate (Mifflin-St Jeor) using actual responses
  let bmr: number;
  if (gender === "male") {
    bmr = 10 * rawWeight + 6.25 * rawHeight - 5 * rawAge + 5;
  } else if (gender === "female") {
    bmr = 10 * rawWeight + 6.25 * rawHeight - 5 * rawAge - 161;
  } else {
    bmr = 10 * rawWeight + 6.25 * rawHeight - 5 * rawAge - 78;
  }
  bmr = Math.round(bmr);

  // 6. Activity multiplier combining workout sessions, intensity, duration & daily activity
  let activityMultiplier = 1.25;
  if (freq === "0_sessions") {
    activityMultiplier = 1.2;
  } else if (freq === "1_2_sessions") {
    activityMultiplier = 1.35;
  } else if (freq === "3_4_sessions") {
    activityMultiplier = 1.45;
  } else if (freq === "5_6_sessions") {
    activityMultiplier = 1.55;
  } else if (freq === "7_plus_sessions") {
    activityMultiplier = 1.7;
  }

  // Adjust for daily non-exercise activity level (Improve Fitness branch)
  if (data.activityLevel === "sedentary") activityMultiplier = Math.min(activityMultiplier, 1.3);
  else if (data.activityLevel === "moderately_active") activityMultiplier += 0.05;
  else if (data.activityLevel === "very_active") activityMultiplier += 0.12;

  // Adjust for workout intensity / duration
  if (data.workoutIntensity === "very_high_athlete") activityMultiplier += 0.08;
  else if (data.workoutIntensity === "high") activityMultiplier += 0.04;
  if (data.workoutDuration === "60_plus") activityMultiplier += 0.04;

  activityMultiplier = Math.min(1.9, activityMultiplier);
  const tdee = Math.round(bmr * activityMultiplier);

  // 7. Daily Calorie Target based on Goal & Preferred Pace
  let dailyCalories = tdee;
  const pace = data.preferredPace || "moderate";

  let deficit = 0;
  if (pace === "slow") deficit = 250;
  else if (pace === "moderate") deficit = 400;
  else if (pace === "fast") deficit = 500; // Conservative cap

  if (goal === "lose_weight") {
    dailyCalories = tdee - deficit;
    const minCalories = gender === "female" ? 1200 : 1450;
    dailyCalories = Math.max(minCalories, dailyCalories);
  } else if (goal === "gain_weight_build_muscle") {
    const surplus =
      data.muscleFocus === "strength" || data.muscleFocus === "overall_weight_gain"
        ? 350
        : 250;
    dailyCalories = tdee + surplus;
  } else if (goal === "improve_fitness") {
    dailyCalories =
      data.fitnessObjective === "body_recomposition"
        ? Math.round(tdee - 150)
        : tdee;
  } else {
    // maintain
    dailyCalories =
      data.maintainFocus === "improve_body_composition"
        ? Math.round(tdee - 100)
        : tdee;
  }
  dailyCalories = Math.round(dailyCalories);

  // 8. Protein Target (g)
  let proteinMultiplier = 1.6;
  if (goal === "gain_weight_build_muscle" || goal === "improve_fitness") {
    proteinMultiplier = 1.9;
  } else if (goal === "lose_weight") {
    proteinMultiplier = 1.85;
  } else if (data.maintainFocus === "improve_body_composition") {
    proteinMultiplier = 1.8;
  }
  let proteinGrams = Math.round(rawWeight * proteinMultiplier);
  proteinGrams = Math.max(60, Math.min(proteinGrams, 250));

  // 9. Fat Target (28% of calories) & Carbs Target (remaining)
  const finalCalories = data.customCalorieTarget || dailyCalories;
  const finalProtein = data.customProteinTarget || proteinGrams;
  const fatGrams = data.customFatTarget || Math.round((finalCalories * 0.28) / 9);
  const carbsGrams =
    data.customCarbsTarget ||
    Math.max(50, Math.round((finalCalories - finalProtein * 4 - fatGrams * 9) / 4));

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    dailyCalories: finalCalories,
    proteinGrams: finalProtein,
    carbsGrams,
    fatGrams,
    hasCompleteMetrics: true,
    missingMetrics: [],
    estimationBasis:
      "Estimated using Mifflin-St Jeor equation combined with your goal, workout sessions, and activity responses.",
    isSafeGoal,
    feasibilityAssessment: {
      isRealistic: isSafeGoal,
      weeklyChangeKg,
      recommendedTimelineWeeks,
      safetyNote,
    },
  };
}

export type NutritionOnboardingStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

/**
 * Derives reliable onboarding status from User database fields.
 */
export function deriveOnboardingStatus(user: {
  hasCompletedNutritionOnboarding: boolean;
  nutritionOnboardingStep?: number | null;
  nutritionOnboardingData?: any;
}): NutritionOnboardingStatus {
  if (user.hasCompletedNutritionOnboarding) {
    return "COMPLETED";
  }
  const step = user.nutritionOnboardingStep ?? 1;
  const hasData =
    user.nutritionOnboardingData &&
    typeof user.nutritionOnboardingData === "object" &&
    Object.keys(user.nutritionOnboardingData).length > 0;

  if (step > 1 || hasData) {
    return "IN_PROGRESS";
  }
  return "NOT_STARTED";
}

/**
 * Validates onboarding answers before saving.
 */
export function validateOnboardingData(data: OnboardingData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (data.weightKg !== undefined && data.weightKg !== null) {
    if (typeof data.weightKg !== "number" || isNaN(data.weightKg) || data.weightKg < 25 || data.weightKg > 350) {
      errors.push("Weight must be between 25 kg and 350 kg");
    }
  }
  if (data.heightCm !== undefined && data.heightCm !== null) {
    if (typeof data.heightCm !== "number" || isNaN(data.heightCm) || data.heightCm < 60 || data.heightCm > 260) {
      errors.push("Height must be between 60 cm and 260 cm");
    }
  }
  if (data.desiredTimelineWeeks !== undefined && data.desiredTimelineWeeks !== null) {
    if (typeof data.desiredTimelineWeeks !== "number" || isNaN(data.desiredTimelineWeeks) || data.desiredTimelineWeeks < 1) {
      errors.push("Desired timeline must be at least 1 week");
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Retrieves the customer's onboarding status and saved partial progress.
 */
export async function getUserOnboardingStatus(userId: string) {
  const user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        hasCompletedNutritionOnboarding: true,
        nutritionOnboardingCompletedAt: true,
        nutritionOnboardingStep: true,
        nutritionOnboardingData: true,
        weightKg: true,
        heightCm: true,
        birthDate: true,
        gender: true,
        isVegetarian: true,
        calorieRolloverEnabled: true,
        notificationsEnabled: true,
        proteinGoalGrams: true,
        customDailyProteinGoal: true,
        nutritionGoal: {
          select: {
            dailyCalorieGoal: true,
            proteinGoal: true,
            carbohydrateGoal: true,
            fatGoal: true,
          },
        },
      },
    })
  );

  if (!user) return null;

  const status = deriveOnboardingStatus(user);

  return {
    status,
    hasCompleted: user.hasCompletedNutritionOnboarding === true,
    completedAt: user.nutritionOnboardingCompletedAt,
    currentStep: user.nutritionOnboardingStep || 1,
    savedData: (user.nutritionOnboardingData as OnboardingData) || null,
    profile: {
      name: user.name,
      email: user.email,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
      birthDate: user.birthDate,
      gender: user.gender,
      isVegetarian: user.isVegetarian,
      calorieRolloverEnabled: user.calorieRolloverEnabled,
      notificationsEnabled: user.notificationsEnabled,
      goals: user.nutritionGoal,
    },
  };
}

/**
 * Saves partial onboarding progress so users can resume without losing answers.
 */
export async function saveOnboardingProgress(
  userId: string,
  step: number,
  partialData: Partial<OnboardingData>
) {
  const existingUser = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { nutritionOnboardingData: true },
    })
  );

  const mergedData = {
    ...((existingUser?.nutritionOnboardingData as object) || {}),
    ...partialData,
  };

  const userUpdateData: any = {
    nutritionOnboardingStep: Math.max(1, Math.min(step, 40)),
    nutritionOnboardingData: mergedData,
  };

  if (partialData.gender || partialData.sex) {
    userUpdateData.gender = partialData.gender || partialData.sex;
  }
  if (partialData.weightKg && partialData.weightKg > 0) {
    userUpdateData.weightKg = partialData.weightKg;
  }
  if (partialData.heightCm && partialData.heightCm > 0) {
    userUpdateData.heightCm = partialData.heightCm;
  }
  if (partialData.dietPreference) {
    userUpdateData.isVegetarian =
      partialData.dietPreference === "vegetarian" || partialData.dietPreference === "vegan";
  }

  const updatedUser = await withDbRetry(() =>
    prisma.user.update({
      where: { id: userId },
      data: userUpdateData,
      select: {
        id: true,
        nutritionOnboardingStep: true,
        hasCompletedNutritionOnboarding: true,
      },
    })
  );

  return updatedUser;
}

/**
 * Completes the onboarding journey: calculates targets, upserts NutritionGoal,
 * updates User profile, and permanently marks onboarding completed.
 */
export async function completeOnboarding(userId: string, finalData: OnboardingData) {
  const validation = validateOnboardingData(finalData);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  const targets = calculateNutritionTargets(finalData);

  const isVegetarian =
    finalData.dietPreference === "vegetarian" ||
    finalData.dietPreference === "vegan" ||
    finalData.dietPreference === "eggetarian";

  return await withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      // 1. Update User profile with demographic & preference fields
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          hasCompletedNutritionOnboarding: true,
          nutritionOnboardingCompletedAt: new Date(),
          nutritionOnboardingStep: 19,
          nutritionOnboardingData: finalData as any,
          weightKg: finalData.weightKg || undefined,
          heightCm: finalData.heightCm || undefined,
          birthDate: finalData.birthDate ? new Date(finalData.birthDate) : undefined,
          gender: finalData.gender || finalData.sex || undefined,
          isVegetarian,
          calorieRolloverEnabled: Boolean(finalData.calorieRolloverEnabled),
          notificationsEnabled: Boolean(finalData.notificationsEnabled),
          proteinGoalGrams: targets.proteinGrams ?? undefined,
          customDailyProteinGoal: targets.proteinGrams ?? undefined,
          primaryNutritionGoal:
            finalData.primaryGoal === "gain_weight_build_muscle"
              ? "build_muscle"
              : finalData.primaryGoal || "maintain",
        },
      });

      // 2. Upsert customer's NutritionGoal record
      const updatedGoal = await tx.nutritionGoal.upsert({
        where: { userId },
        create: {
          userId,
          dailyCalorieGoal: targets.dailyCalories,
          proteinGoal: targets.proteinGrams,
          carbohydrateGoal: targets.carbsGrams,
          fatGoal: targets.fatGrams,
        },
        update: {
          dailyCalorieGoal: targets.dailyCalories,
          proteinGoal: targets.proteinGrams,
          carbohydrateGoal: targets.carbsGrams,
          fatGoal: targets.fatGrams,
        },
      });

      return {
        user: updatedUser,
        goal: updatedGoal,
        targets,
      };
    })
  );
}

