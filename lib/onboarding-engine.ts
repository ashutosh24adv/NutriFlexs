export type QuestionId =
  | "gender"
  | "birth_date"
  | "height"
  | "primary_goal"
  | "current_weight"
  | "target_weight"
  | "weight_loss_pace"
  | "muscle_focus"
  | "maintain_focus"
  | "fitness_objective"
  | "activity_level"
  | "goal_timeline"
  | "goal_realism"
  | "weight_challenges"
  | "nutrition_challenges"
  | "lifestyle_challenges"
  | "workout_frequency"
  | "planning_to_start_exercise"
  | "starter_activity_type"
  | "workout_type"
  | "workout_duration"
  | "workout_intensity"
  | "rest_recovery_days"
  | "gym_access"
  | "diet_preference"
  | "protein_sources"
  | "has_allergies"
  | "allergy_details"
  | "dietitian_consultation"
  | "following_diet_plan"
  | "share_existing_targets"
  | "want_personalized_guidance"
  | "desired_outcomes"
  | "summary_targets"
  | "reminders_preference"
  | "rollover_preference"
  | "completion_ready";

export interface OnboardingData {
  // Stable node tracking for resuming
  currentNodeId?: QuestionId | null;

  // Baseline demographics
  gender?: "male" | "female" | "prefer_not_to_say" | null;
  sex?: "male" | "female" | "prefer_not_to_say" | null;
  birthDate?: string | null;
  birthDateSkipped?: boolean;
  heightCm?: number | null;
  heightUnit?: "cm" | "ft";
  heightSkipped?: boolean;

  // Goal selection
  primaryGoal?:
    | "lose_weight"
    | "gain_weight_build_muscle"
    | "maintain"
    | "improve_fitness"
    | "build_muscle"
    | "healthier_habits"
    | null;

  // Weight & Target fields
  weightKg?: number | null;
  weightUnit?: "kg" | "lbs";
  desiredGoalTarget?: {
    targetWeightKg?: number | null;
    muscleTarget?: string | null;
    habitsTarget?: string | null;
    fitnessTarget?: string | null;
  } | null;
  preferredPace?: "slow" | "moderate" | "fast" | null;
  desiredTimelineWeeks?: number | null;

  // Goal-specific fields
  muscleFocus?: "muscle_building" | "overall_weight_gain" | "strength" | null;
  maintainFocus?: "maintain_weight" | "improve_body_composition" | null;
  fitnessObjective?:
    | "body_recomposition"
    | "endurance_stamina"
    | "athletic_performance"
    | "general_energy"
    | null;
  activityLevel?:
    | "sedentary"
    | "lightly_active"
    | "moderately_active"
    | "very_active"
    | null;
  gymAccess?:
    | "commercial_gym"
    | "home_gym"
    | "bodyweight_minimal"
    | "both"
    | null;

  // Challenges (goal-branched)
  challenges?: string[];
  challengesOther?: string | null;

  // Conditional Workout fields
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
  planningToStartExercise?: "yes_soon" | "maybe_later" | "not_right_now" | null;
  starterActivityType?:
    | "walking_cardio"
    | "home_workouts"
    | "gym_strength"
    | "yoga_mobility"
    | "sports"
    | null;
  workoutType?: "strength_training" | "cardio" | "sports" | "combination" | null;
  workoutDuration?: "under_30" | "30_45" | "45_60" | "60_plus" | null;
  workoutIntensity?: "moderate" | "high" | "very_high_athlete" | null;
  restRecoveryDays?: "yes_regularly" | "occasionally" | "no_rarely" | null;

  // Conditional Dietary fields
  dietPreference?:
    | "vegetarian"
    | "vegan"
    | "eggetarian"
    | "non_vegetarian"
    | "no_specific"
    | "other"
    | null;
  proteinSources?: string[];
  hasAllergies?: "yes" | "no" | null;
  allergyDetails?: string[];
  allergyOtherText?: string | null;

  // Conditional Lifestyle / Dietitian fields
  dietitianConsultation?: "yes" | "no" | "currently" | "prefer_not_to_say" | null;
  followingDietPlan?: "yes" | "no" | null;
  shareExistingTargets?: "yes" | "no" | null;
  existingCalorieTarget?: number | null;
  existingProteinTarget?: number | null;
  wantPersonalizedGuidance?: "yes" | "not_now" | null;

  // Editable custom overrides on Summary screen
  customCalorieTarget?: number | null;
  customProteinTarget?: number | null;
  customCarbsTarget?: number | null;
  customFatTarget?: number | null;

  // Outcomes & Preferences
  desiredOutcomes?: string[];
  calorieRolloverEnabled?: boolean;
  notificationsEnabled?: boolean;
}

/**
 * Normalizes legacy goal values to the 4 canonical goals.
 */
export function normalizeGoal(
  goal?: OnboardingData["primaryGoal"]
): "lose_weight" | "gain_weight_build_muscle" | "maintain" | "improve_fitness" | null {
  if (!goal) return null;
  if (goal === "build_muscle" || goal === "gain_weight_build_muscle") {
    return "gain_weight_build_muscle";
  }
  if (goal === "healthier_habits" || goal === "maintain") {
    return "maintain";
  }
  if (goal === "lose_weight") return "lose_weight";
  if (goal === "improve_fitness") return "improve_fitness";
  return null;
}

/**
 * Normalizes legacy workout frequency values to canonical session counts.
 */
export function normalizeWorkoutFrequency(
  freq?: OnboardingData["workoutFrequency"]
): "0_sessions" | "1_2_sessions" | "3_4_sessions" | "5_6_sessions" | "7_plus_sessions" | null {
  if (!freq) return null;
  if (freq === "none" || freq === "0_sessions") return "0_sessions";
  if (freq === "1_2_sessions") return "1_2_sessions";
  if (freq === "3_4_sessions" || freq === "0_4_days") return "3_4_sessions";
  if (freq === "5_6_sessions" || freq === "4_6_days") return "5_6_sessions";
  if (freq === "7_plus_sessions" || freq === "7_plus_days") return "7_plus_sessions";
  return null;
}

/**
 * Pure deterministic engine: computes the active sequence of QuestionIds
 * based on the user's current answers.
 * Irrelevant questions are never included.
 */
export function getActiveFlow(data: OnboardingData): QuestionId[] {
  const flow: QuestionId[] = ["gender", "birth_date", "height", "primary_goal"];
  const goal = normalizeGoal(data.primaryGoal);

  // 1. Goal-specific initial questions
  if (goal === "lose_weight") {
    flow.push(
      "current_weight",
      "target_weight",
      "weight_loss_pace",
      "goal_timeline",
      "goal_realism",
      "weight_challenges"
    );
  } else if (goal === "gain_weight_build_muscle") {
    flow.push(
      "current_weight",
      "target_weight",
      "muscle_focus",
      "goal_timeline",
      "goal_realism"
    );
  } else if (goal === "maintain") {
    flow.push("current_weight", "maintain_focus");
  } else if (goal === "improve_fitness") {
    flow.push("fitness_objective", "current_weight", "activity_level");
  }

  // 2. Conditional Workout Questions
  flow.push("workout_frequency");
  const freq = normalizeWorkoutFrequency(data.workoutFrequency);

  if (freq === "0_sessions") {
    flow.push("planning_to_start_exercise");
    if (
      data.planningToStartExercise === "yes_soon" ||
      data.planningToStartExercise === "maybe_later"
    ) {
      flow.push("starter_activity_type");
    }
  } else if (freq === "1_2_sessions" || freq === "3_4_sessions") {
    flow.push("workout_type", "workout_duration");
  } else if (freq === "5_6_sessions" || freq === "7_plus_sessions") {
    flow.push("workout_intensity", "rest_recovery_days", "workout_type");
  }

  // Gym access is specifically asked in the Gain Weight & Build Muscle branch
  if (goal === "gain_weight_build_muscle") {
    flow.push("gym_access");
  }

  // Goal-specific challenges for Maintain and Improve Fitness
  if (goal === "maintain") {
    flow.push("nutrition_challenges");
  } else if (goal === "improve_fitness") {
    flow.push("lifestyle_challenges");
  }

  // 3. Conditional Dietary Questions
  flow.push("diet_preference");
  if (
    data.dietPreference === "vegetarian" ||
    data.dietPreference === "vegan" ||
    data.dietPreference === "eggetarian" ||
    data.dietPreference === "non_vegetarian"
  ) {
    flow.push("protein_sources");
  }

  flow.push("has_allergies");
  if (data.hasAllergies === "yes") {
    flow.push("allergy_details");
  }

  // 4. Conditional Lifestyle / Dietitian Questions
  flow.push("dietitian_consultation");
  if (data.dietitianConsultation === "yes" || data.dietitianConsultation === "currently") {
    flow.push("following_diet_plan", "share_existing_targets");
  } else if (data.dietitianConsultation === "no") {
    flow.push("want_personalized_guidance");
  }

  // 5. Outcomes & Finalization Screens
  flow.push(
    "desired_outcomes",
    "summary_targets",
    "reminders_preference",
    "rollover_preference",
    "completion_ready"
  );

  return flow;
}

/**
 * Clears answers to questions that are no longer in the active flow,
 * while preserving all answers that remain relevant.
 */
export function pruneIrrelevantAnswers(
  data: OnboardingData,
  activeFlow: QuestionId[]
): OnboardingData {
  const activeSet = new Set<QuestionId>(activeFlow);
  const next: OnboardingData = { ...data };

  if (!activeSet.has("target_weight") && next.desiredGoalTarget) {
    next.desiredGoalTarget = { ...next.desiredGoalTarget, targetWeightKg: null };
  }
  if (!activeSet.has("weight_loss_pace")) {
    next.preferredPace = null;
  }
  if (!activeSet.has("goal_timeline")) {
    next.desiredTimelineWeeks = null;
  }
  if (!activeSet.has("muscle_focus")) {
    next.muscleFocus = null;
  }
  if (!activeSet.has("maintain_focus")) {
    next.maintainFocus = null;
  }
  if (!activeSet.has("fitness_objective")) {
    next.fitnessObjective = null;
  }
  if (!activeSet.has("activity_level")) {
    next.activityLevel = null;
  }
  if (!activeSet.has("gym_access")) {
    next.gymAccess = null;
  }
  if (
    !activeSet.has("weight_challenges") &&
    !activeSet.has("nutrition_challenges") &&
    !activeSet.has("lifestyle_challenges")
  ) {
    next.challenges = [];
    next.challengesOther = null;
  }

  // Workout branch cleanup
  if (!activeSet.has("planning_to_start_exercise")) {
    next.planningToStartExercise = null;
  }
  if (!activeSet.has("starter_activity_type")) {
    next.starterActivityType = null;
  }
  if (!activeSet.has("workout_type")) {
    next.workoutType = null;
  }
  if (!activeSet.has("workout_duration")) {
    next.workoutDuration = null;
  }
  if (!activeSet.has("workout_intensity")) {
    next.workoutIntensity = null;
  }
  if (!activeSet.has("rest_recovery_days")) {
    next.restRecoveryDays = null;
  }

  // Dietary branch cleanup
  if (!activeSet.has("protein_sources")) {
    next.proteinSources = [];
  }
  if (!activeSet.has("allergy_details")) {
    next.allergyDetails = [];
    next.allergyOtherText = null;
  }

  // Dietitian branch cleanup
  if (!activeSet.has("following_diet_plan")) {
    next.followingDietPlan = null;
  }
  if (!activeSet.has("share_existing_targets")) {
    next.shareExistingTargets = null;
    next.existingCalorieTarget = null;
    next.existingProteinTarget = null;
  }
  if (!activeSet.has("want_personalized_guidance")) {
    next.wantPersonalizedGuidance = null;
  }

  return next;
}

/**
 * Validates only the current active question node.
 * Returns null if valid, or a clear user-facing error message.
 */
export function validateQuestionNode(
  questionId: QuestionId,
  data: OnboardingData
): string | null {
  switch (questionId) {
    case "gender":
      if (!data.gender && !data.sex) {
        return "Please select an option or choose 'Prefer not to say'.";
      }
      return null;

    case "birth_date":
      if (data.birthDateSkipped) return null;
      if (!data.birthDate) {
        return "Please enter your birth date or choose 'Prefer not to say'.";
      }
      {
        const b = new Date(data.birthDate);
        if (isNaN(b.getTime())) {
          return "Please enter a valid date of birth.";
        }
        const now = new Date();
        const age = now.getFullYear() - b.getFullYear();
        if (age < 13 || age > 100) {
          return "Please enter a valid birth date (age 13–100).";
        }
      }
      return null;

    case "height":
      if (data.heightSkipped) return null;
      if (!data.heightCm || data.heightCm < 90 || data.heightCm > 250) {
        return "Please enter a valid height (90–250 cm) or choose 'Prefer not to say'.";
      }
      return null;

    case "primary_goal":
      if (!data.primaryGoal) {
        return "Please select your primary goal to personalize your plan.";
      }
      return null;

    case "current_weight":
      if (!data.weightKg || data.weightKg < 25 || data.weightKg > 350) {
        return "Please enter your current weight between 25 kg and 350 kg.";
      }
      return null;

    case "target_weight": {
      const targetW = data.desiredGoalTarget?.targetWeightKg;
      if (!targetW || targetW < 25 || targetW > 350) {
        return "Please enter a valid target weight between 25 kg and 350 kg.";
      }
      const goal = normalizeGoal(data.primaryGoal);
      if (goal === "lose_weight" && data.weightKg && targetW >= data.weightKg) {
        return "For weight loss, target weight should be lower than your current weight.";
      }
      if (
        goal === "gain_weight_build_muscle" &&
        data.weightKg &&
        targetW < data.weightKg
      ) {
        return "For weight gain, target weight should be equal to or higher than your current weight.";
      }
      return null;
    }

    case "weight_loss_pace":
      if (!data.preferredPace) {
        return "Please select your preferred pace.";
      }
      return null;

    case "muscle_focus":
      if (!data.muscleFocus) {
        return "Please choose your primary muscle/strength focus.";
      }
      return null;

    case "maintain_focus":
      if (!data.maintainFocus) {
        return "Please choose whether you want to maintain weight or improve body composition.";
      }
      return null;

    case "fitness_objective":
      if (!data.fitnessObjective) {
        return "Please select your primary fitness objective.";
      }
      return null;

    case "activity_level":
      if (!data.activityLevel) {
        return "Please select your daily activity level.";
      }
      return null;

    case "goal_timeline":
      if (!data.desiredTimelineWeeks || data.desiredTimelineWeeks < 1) {
        return "Please select or enter a timeline of at least 1 week.";
      }
      return null;

    case "workout_frequency":
      if (!data.workoutFrequency) {
        return "Please select how many workout sessions you complete per week.";
      }
      return null;

    case "planning_to_start_exercise":
      if (!data.planningToStartExercise) {
        return "Please let us know if you plan to start exercising.";
      }
      return null;

    case "starter_activity_type":
      if (!data.starterActivityType) {
        return "Please choose an activity you would like to begin with.";
      }
      return null;

    case "workout_type":
      if (!data.workoutType) {
        return "Please select the type of workouts you usually perform.";
      }
      return null;

    case "workout_duration":
      if (!data.workoutDuration) {
        return "Please select your average workout duration.";
      }
      return null;

    case "workout_intensity":
      if (!data.workoutIntensity) {
        return "Please select your typical workout intensity.";
      }
      return null;

    case "rest_recovery_days":
      if (!data.restRecoveryDays) {
        return "Please let us know whether you include rest or recovery days.";
      }
      return null;

    case "gym_access":
      if (!data.gymAccess) {
        return "Please select your workout environment.";
      }
      return null;

    case "diet_preference":
      if (!data.dietPreference) {
        return "Please select your dietary preference.";
      }
      return null;

    case "protein_sources":
      if (!data.proteinSources || data.proteinSources.length === 0) {
        return "Please select at least one preferred protein source.";
      }
      return null;

    case "has_allergies":
      if (!data.hasAllergies) {
        return "Please indicate whether you have any food allergies or dietary restrictions.";
      }
      return null;

    case "allergy_details":
      if (
        (!data.allergyDetails || data.allergyDetails.length === 0) &&
        !data.allergyOtherText?.trim()
      ) {
        return "Please select or describe your food allergies or restrictions.";
      }
      return null;

    case "dietitian_consultation":
      if (!data.dietitianConsultation) {
        return "Please select an option or choose 'Prefer not to say'.";
      }
      return null;

    case "following_diet_plan":
      if (!data.followingDietPlan) {
        return "Please let us know if you are currently following a diet plan.";
      }
      return null;

    case "share_existing_targets":
      if (!data.shareExistingTargets) {
        return "Please choose whether you'd like to share existing targets.";
      }
      return null;

    case "want_personalized_guidance":
      if (!data.wantPersonalizedGuidance) {
        return "Please let us know if you would like personalised nutrition guidance.";
      }
      return null;

    default:
      return null;
  }
}

/**
 * Returns the number of question nodes (before the summary screen) for progress bar calculation.
 */
export function getQuestionCountBeforeSummary(activeFlow: QuestionId[]): number {
  const summaryIdx = activeFlow.indexOf("summary_targets");
  return summaryIdx > 0 ? summaryIdx : activeFlow.length;
}
