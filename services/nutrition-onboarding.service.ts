import { prisma, withDbRetry } from "@/lib/prisma";

export interface OnboardingData {
  gender?: "male" | "female" | "prefer_not_to_say" | null;
  sex?: "male" | "female" | "prefer_not_to_say" | null;
  birthDate?: string | null;
  heightCm?: number | null;
  heightUnit?: "cm" | "ft";
  weightKg?: number | null;
  weightUnit?: "kg" | "lbs";
  workoutFrequency?:
    | "0_sessions"
    | "1_2_sessions"
    | "3_4_sessions"
    | "5_6_sessions"
    | "7_plus_sessions"
    | "0_4_days"
    | "4_6_days"
    | "7_plus_days"
    | "none"
    | null;
  dietitianConsultation?: "yes" | "no" | "currently" | "prefer_not_to_say" | null;
  primaryGoal?:
    | "lose_weight"
    | "maintain"
    | "improve_fitness"
    | "build_muscle"
    | "gain_weight_build_muscle"
    | "healthier_habits"
    | null;
  desiredGoalTarget?: {
    targetWeightKg?: number | null;
    muscleTarget?: string | null;
    habitsTarget?: string | null;
    fitnessTarget?: string | null;
  } | null;
  desiredTimelineWeeks?: number | null;
  preferredPace?: "slow" | "moderate" | "fast" | null;
  challenges?: string[];
  challengesOther?: string | null;
  dietPreference?: "vegetarian" | "vegan" | "eggetarian" | "non_vegetarian" | "no_specific" | "other" | null;
  desiredOutcomes?: string[];
  calorieRolloverEnabled?: boolean;
  notificationsEnabled?: boolean;
}

export interface CalculatedNutritionTargets {
  bmi: number | null;
  bmiCategory: string | null;
  bmr: number;
  tdee: number;
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  isSafeGoal: boolean;
  feasibilityAssessment: {
    isRealistic: boolean;
    weeklyChangeKg: number;
    recommendedTimelineWeeks: number;
    safetyNote: string;
  };
}

/**
 * Derives age from a birth date string (YYYY-MM-DD).
 */
export function calculateAge(birthDateStr?: string | null): number {
  if (!birthDateStr) return 26; // Safe standard adult baseline
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 26;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(16, Math.min(age, 90));
}

/**
 * Calculates evidence-based nutrition targets using Mifflin-St Jeor formula.
 */
export function calculateNutritionTargets(data: OnboardingData): CalculatedNutritionTargets {
  const weightKg = data.weightKg || 68;
  const heightCm = data.heightCm || 172;
  const age = calculateAge(data.birthDate);
  const gender = data.gender || data.sex || "prefer_not_to_say";

  // 1. BMI calculation: weight (kg) / [height (m)]^2
  let bmi: number | null = null;
  let bmiCategory: string | null = null;
  if (heightCm > 0 && weightKg > 0) {
    const heightM = heightCm / 100;
    bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 24.9) bmiCategory = "Normal Weight";
    else if (bmi < 29.9) bmiCategory = "Overweight";
    else bmiCategory = "Obese";
  }

  // 2. Basal Metabolic Rate (Mifflin-St Jeor)
  let bmr: number;
  if (gender === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (gender === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    // Gender-neutral balanced estimate
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
  }
  bmr = Math.round(bmr);

  // 3. Activity multiplier
  let activityMultiplier = 1.375; // default 1–2 sessions or 3–4 sessions baseline
  if (data.workoutFrequency === "0_sessions" || data.workoutFrequency === "none") {
    activityMultiplier = 1.2;
  } else if (data.workoutFrequency === "1_2_sessions") {
    activityMultiplier = 1.375;
  } else if (data.workoutFrequency === "3_4_sessions" || data.workoutFrequency === "0_4_days") {
    activityMultiplier = 1.45;
  } else if (data.workoutFrequency === "5_6_sessions" || data.workoutFrequency === "4_6_days") {
    activityMultiplier = 1.55;
  } else if (data.workoutFrequency === "7_plus_sessions" || data.workoutFrequency === "7_plus_days") {
    activityMultiplier = 1.725;
  }
  const tdee = Math.round(bmr * activityMultiplier);

  // 4. Daily Calorie Target based on Goal & Preferred Pace
  let dailyCalories = tdee;
  const pace = data.preferredPace || "moderate";

  let deficit = 0;
  if (pace === "slow") deficit = 250;
  else if (pace === "moderate") deficit = 400;
  else if (pace === "fast") deficit = 550; // Capped for safety

  const isMuscleGoal =
    data.primaryGoal === "build_muscle" ||
    data.primaryGoal === "gain_weight_build_muscle";

  if (data.primaryGoal === "lose_weight") {
    dailyCalories = tdee - deficit;
    // Enforce safe physiological floor
    const minCalories = gender === "female" ? 1200 : 1450;
    dailyCalories = Math.max(minCalories, dailyCalories);
  } else if (isMuscleGoal) {
    const surplus = pace === "slow" ? 200 : 350;
    dailyCalories = tdee + surplus;
  } else if (data.primaryGoal === "improve_fitness") {
    dailyCalories = Math.round(tdee - 150);
  } else {
    // maintain / healthier_habits
    dailyCalories = tdee;
  }
  dailyCalories = Math.round(dailyCalories);

  // 5. Protein Target (g)
  // Higher protein for fitness/muscle/weight loss (1.6 - 2.2 g/kg), baseline 1.5g/kg
  let proteinMultiplier = 1.8;
  if (isMuscleGoal || data.primaryGoal === "improve_fitness") {
    proteinMultiplier = 2.0;
  } else if (data.primaryGoal === "lose_weight") {
    proteinMultiplier = 1.9; // Preserves lean mass in deficit
  }
  let proteinGrams = Math.round(weightKg * proteinMultiplier);
  proteinGrams = Math.max(90, Math.min(proteinGrams, 250)); // Bounded safely

  // 6. Fat Target (25% to 30% of total calories, 9 kcal/g)
  const fatCalories = dailyCalories * 0.28;
  const fatGrams = Math.round(fatCalories / 9);

  // 7. Carbohydrates Target (Remaining calories / 4 kcal/g)
  const proteinCalories = proteinGrams * 4;
  const remainingCalories = dailyCalories - proteinCalories - (fatGrams * 9);
  const carbsGrams = Math.max(50, Math.round(remainingCalories / 4));

  // 8. Feasibility & Safety Assessment
  let targetDeltaKg = 0;
  if (data.primaryGoal === "lose_weight" && data.desiredGoalTarget?.targetWeightKg) {
    targetDeltaKg = Math.max(0, weightKg - data.desiredGoalTarget.targetWeightKg);
  } else if (isMuscleGoal && data.desiredGoalTarget?.targetWeightKg) {
    targetDeltaKg = Math.max(0, data.desiredGoalTarget.targetWeightKg - weightKg);
  }

  const timelineWeeks = data.desiredTimelineWeeks || Math.max(8, Math.round(targetDeltaKg / 0.5));
  const weeklyChangeKg = timelineWeeks > 0 ? Number((targetDeltaKg / timelineWeeks).toFixed(2)) : 0.5;

  const isSafeGoal = weeklyChangeKg <= 1.0; // Over 1kg/week is aggressive/potentially unsafe
  const recommendedTimelineWeeks = Math.max(4, Math.ceil(targetDeltaKg / 0.5)); // 0.5kg/week gold standard

  let safetyNote = "Your goal pace is within healthy, sustainable guidelines.";
  if (!isSafeGoal) {
    safetyNote =
      "A weight change exceeding 1kg per week can lead to muscle loss and rebound fatigue. We recommend a safe, steady pace of 0.4–0.6kg per week.";
  }

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
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
    nutritionOnboardingStep: Math.max(1, Math.min(step, 19)),
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
          proteinGoalGrams: targets.proteinGrams,
          customDailyProteinGoal: targets.proteinGrams,
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

