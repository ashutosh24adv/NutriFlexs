"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { NutriFlexsLogo } from "@/components/ui/logo";
import {
  Flame,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Scale,
  Sparkles,
  Dumbbell,
  Apple,
  TrendingUp,
  Activity,
  Heart,
  Calendar,
  AlertCircle,
  Bell,
  Clock,
  Utensils,
  Shield,
  Info,
  Loader2,
  Smile,
  Edit3,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  QuestionId,
  OnboardingData,
  getActiveFlow,
  pruneIrrelevantAnswers,
  validateQuestionNode,
  getQuestionCountBeforeSummary,
  normalizeGoal,
} from "@/lib/onboarding-engine";
import {
  CalculatedNutritionTargets,
  calculateNutritionTargets,
  calculateAge,
} from "@/services/nutrition-onboarding.service";

interface NutritionOnboardingProps {
  initialStep?: number;
  initialData?: OnboardingData | null;
  onComplete?: () => void;
  onExit?: () => void;
}

const PROTEIN_OPTIONS_BY_DIET: Record<string, string[]> = {
  vegetarian: [
    "Paneer",
    "Tofu",
    "Dal & Legumes",
    "Soya Chunks",
    "Curd / Greek Yogurt",
    "Whey / Plant Protein Powder",
    "Nuts & Seeds",
  ],
  vegan: [
    "Tofu & Tempeh",
    "Lentils & Chickpeas",
    "Soya Chunks",
    "Seitan",
    "Pea / Soy Protein Powder",
    "Quinoa, Nuts & Seeds",
  ],
  eggetarian: [
    "Whole Eggs",
    "Egg Whites",
    "Paneer",
    "Milk & Curd",
    "Dal & Legumes",
    "Whey Protein",
  ],
  non_vegetarian: [
    "Chicken Breast",
    "Fish & Seafood",
    "Eggs",
    "Paneer / Dairy",
    "Dal & Legumes",
    "Whey Protein",
  ],
};

const ALLERGY_OPTIONS = [
  "Lactose / Dairy",
  "Gluten / Wheat",
  "Peanuts / Tree Nuts",
  "Soy",
  "Eggs",
  "Shellfish / Seafood",
];

export function NutritionOnboarding({
  initialData = null,
  onComplete,
  onExit,
}: NutritionOnboardingProps) {
  const router = useRouter();

  // Initialize formData strictly from saved initialData (no fake silent defaults!)
  const [formData, setFormData] = useState<OnboardingData>(() => ({
    currentNodeId: initialData?.currentNodeId || null,
    gender: initialData?.gender || initialData?.sex || null,
    sex: initialData?.gender || initialData?.sex || null,
    birthDate: initialData?.birthDate || null,
    birthDateSkipped: initialData?.birthDateSkipped || false,
    heightCm: initialData?.heightCm || null,
    heightUnit: initialData?.heightUnit || "cm",
    heightSkipped: initialData?.heightSkipped || false,
    primaryGoal: initialData?.primaryGoal || null,
    weightKg: initialData?.weightKg || null,
    weightUnit: initialData?.weightUnit || "kg",
    desiredGoalTarget: initialData?.desiredGoalTarget || { targetWeightKg: null },
    preferredPace: initialData?.preferredPace || null,
    desiredTimelineWeeks: initialData?.desiredTimelineWeeks || null,
    muscleFocus: initialData?.muscleFocus || null,
    maintainFocus: initialData?.maintainFocus || null,
    fitnessObjective: initialData?.fitnessObjective || null,
    activityLevel: initialData?.activityLevel || null,
    gymAccess: initialData?.gymAccess || null,
    challenges: initialData?.challenges || [],
    challengesOther: initialData?.challengesOther || "",
    workoutFrequency: initialData?.workoutFrequency || null,
    planningToStartExercise: initialData?.planningToStartExercise || null,
    starterActivityType: initialData?.starterActivityType || null,
    workoutType: initialData?.workoutType || null,
    workoutDuration: initialData?.workoutDuration || null,
    workoutIntensity: initialData?.workoutIntensity || null,
    restRecoveryDays: initialData?.restRecoveryDays || null,
    dietPreference: initialData?.dietPreference || null,
    proteinSources: initialData?.proteinSources || [],
    hasAllergies: initialData?.hasAllergies || null,
    allergyDetails: initialData?.allergyDetails || [],
    allergyOtherText: initialData?.allergyOtherText || "",
    dietitianConsultation: initialData?.dietitianConsultation || null,
    followingDietPlan: initialData?.followingDietPlan || null,
    shareExistingTargets: initialData?.shareExistingTargets || null,
    existingCalorieTarget: initialData?.existingCalorieTarget || null,
    existingProteinTarget: initialData?.existingProteinTarget || null,
    wantPersonalizedGuidance: initialData?.wantPersonalizedGuidance || null,
    customCalorieTarget: initialData?.customCalorieTarget || null,
    customProteinTarget: initialData?.customProteinTarget || null,
    customCarbsTarget: initialData?.customCarbsTarget || null,
    customFatTarget: initialData?.customFatTarget || null,
    desiredOutcomes: initialData?.desiredOutcomes || [],
    calorieRolloverEnabled: initialData?.calorieRolloverEnabled || false,
    notificationsEnabled: initialData?.notificationsEnabled || false,
  }));

  // Compute active conditional flow dynamically from current answers
  const activeFlow = useMemo(() => getActiveFlow(formData), [formData]);

  // Determine initial node ID safely from saved progress
  const [currentNodeId, setCurrentNodeId] = useState<QuestionId>(() => {
    const initialFlow = getActiveFlow(formData);
    if (initialData?.currentNodeId && initialFlow.includes(initialData.currentNodeId)) {
      return initialData.currentNodeId;
    }
    return initialFlow[0];
  });

  // Ensure currentNodeId stays valid if activeFlow shrinks due to changing earlier answer
  const currentIndex = activeFlow.indexOf(currentNodeId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const activeNodeId = activeFlow[safeIndex];

  // Dual-unit UI states (no forced fake values)
  const [feet, setFeet] = useState<string>(() => {
    if (!initialData?.heightCm) return "";
    return String(Math.floor(initialData.heightCm / 2.54 / 12));
  });
  const [inches, setInches] = useState<string>(() => {
    if (!initialData?.heightCm) return "";
    return String(Math.round((initialData.heightCm / 2.54) % 12));
  });
  const [weightLbs, setWeightLbs] = useState<string>(() => {
    if (!initialData?.weightKg) return "";
    return String(Math.round(initialData.weightKg * 2.20462));
  });
  const [targetWeightLbs, setTargetWeightLbs] = useState<string>(() => {
    if (!initialData?.desiredGoalTarget?.targetWeightKg) return "";
    return String(Math.round(initialData.desiredGoalTarget.targetWeightKg * 2.20462));
  });

  // Editable targets state on Summary screen
  const [editingTargets, setEditingTargets] = useState(false);

  // Navigation & submission locks
  const [isNavigating, setIsNavigating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const calculatedTargets: CalculatedNutritionTargets = useMemo(
    () => calculateNutritionTargets(formData),
    [formData]
  );

  // Helper to update formData, recalculate active flow, and prune irrelevant answers
  const updateAnswers = (patch: Partial<OnboardingData>) => {
    setStepError(null);
    setFormData((prev) => {
      const merged: OnboardingData = { ...prev, ...patch };
      const nextFlow = getActiveFlow(merged);
      return pruneIrrelevantAnswers(merged, nextFlow);
    });
  };

  // Persist partial progress to PostgreSQL
  const persistProgress = async (
    nextNodeId: QuestionId,
    nextIdx: number,
    dataToSave: OnboardingData
  ) => {
    try {
      await fetch("/api/nutrition/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: nextIdx + 1,
          data: { ...dataToSave, currentNodeId: nextNodeId },
        }),
      });
    } catch (err) {
      console.warn("Failed to persist onboarding progress:", err);
    }
  };

  const handleNext = async () => {
    if (isNavigating || completing) return;
    const error = validateQuestionNode(activeNodeId, formData);
    if (error) {
      setStepError(error);
      return;
    }

    setStepError(null);
    const nextIdx = safeIndex + 1;
    if (nextIdx >= activeFlow.length) return;

    const nextNodeId = activeFlow[nextIdx];
    setIsNavigating(true);
    setCurrentNodeId(nextNodeId);
    await persistProgress(nextNodeId, nextIdx, formData);
    setIsNavigating(false);
  };

  const handleBack = () => {
    if (safeIndex <= 0 || isNavigating || completing) return;
    setStepError(null);
    const prevNodeId = activeFlow[safeIndex - 1];
    setCurrentNodeId(prevNodeId);
    persistProgress(prevNodeId, safeIndex - 1, formData);
  };

  const handleFinalize = async () => {
    if (isSubmittingRef.current || completing) return;
    isSubmittingRef.current = true;
    setCompleting(true);
    setFinalizeError(null);

    try {
      const payload: OnboardingData = {
        ...formData,
        currentNodeId: "completion_ready",
      };
      const res = await fetch("/api/nutrition/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save your nutrition plan.");
      }

      if (onComplete) {
        onComplete();
      } else {
        router.refresh();
        router.replace("/nutrition");
      }
    } catch (err: any) {
      console.error("Onboarding completion error:", err);
      setFinalizeError(err.message || "Network error saving your plan. Please retry.");
      setCompleting(false);
      isSubmittingRef.current = false;
    }
  };

  // Progress Bar calculation reflecting active conditional flow
  const totalQuestionsBeforeSummary = getQuestionCountBeforeSummary(activeFlow);
  const progressPercent = Math.min(
    100,
    Math.round(((safeIndex + 1) / activeFlow.length) * 100)
  );
  const isPostSummary = safeIndex >= totalQuestionsBeforeSummary;

  const toggleArrayItem = (
    field: "challenges" | "proteinSources" | "allergyDetails" | "desiredOutcomes",
    item: string
  ) => {
    const current = (formData[field] as string[]) || [];
    const exists = current.includes(item);
    const updated = exists ? current.filter((x) => x !== item) : [...current, item];
    updateAnswers({ [field]: updated });
  };

  // Option Card helper
  const OptionButton = ({
    selected,
    onClick,
    title,
    subtitle,
    icon: Icon,
  }: {
    selected: boolean;
    onClick: () => void;
    title: string;
    subtitle?: string;
    icon?: any;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3",
        selected
          ? "border-[#2F7D16] bg-[#EAF4E3] shadow-xs"
          : "border-[#E5E7E2] bg-white hover:border-[#2F7D16]/40 hover:bg-[#F7FAF4]"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              selected ? "bg-[#2F7D16] text-white" : "bg-[#F3F7EE] text-[#2F7D16]"
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="font-heading font-bold text-sm text-nutri-charcoal">{title}</div>
          {subtitle && (
            <div className="text-xs text-nutri-secondary mt-0.5 leading-snug">{subtitle}</div>
          )}
        </div>
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
          selected ? "border-[#2F7D16] bg-[#2F7D16] text-white" : "border-neutral-300"
        )}
      >
        {selected && <Check className="w-3 h-3 stroke-[3]" />}
      </div>
    </button>
  );

  const normalizedGoal = normalizeGoal(formData.primaryGoal);

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-[#E5E7E2] shadow-lg overflow-hidden">
      {/* Top Header & Dynamic Progress */}
      <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-[#E5E7E2] bg-[#F7FAF4] shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <NutriFlexsLogo size="sm" />
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[11px] font-bold border-[#2F7D16]/25 bg-[#EAF4E3] text-[#2F7D16]"
            >
              {isPostSummary
                ? "Finalizing Plan"
                : `Step ${safeIndex + 1} of ${activeFlow.length}`}
            </Badge>
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="text-xs font-semibold text-nutri-secondary hover:text-nutri-charcoal px-2 py-1 rounded-lg hover:bg-white transition-colors cursor-pointer"
              >
                Save &amp; Exit
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-white rounded-full overflow-hidden border border-[#E5E7E2]">
          <div
            className="h-full bg-[#2F7D16] rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Focused Single-Question Body */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col justify-center">
        <div className="max-w-xl mx-auto w-full space-y-5">
          {stepError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{stepError}</span>
            </div>
          )}

          {/* 1. GENDER */}
          {activeNodeId === "gender" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What is your gender?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Used only to select the appropriate metabolic baseline formula.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.gender === "male"}
                  onClick={() => updateAnswers({ gender: "male", sex: "male" })}
                  title="Male"
                />
                <OptionButton
                  selected={formData.gender === "female"}
                  onClick={() => updateAnswers({ gender: "female", sex: "female" })}
                  title="Female"
                />
                <OptionButton
                  selected={formData.gender === "prefer_not_to_say"}
                  onClick={() =>
                    updateAnswers({
                      gender: "prefer_not_to_say",
                      sex: "prefer_not_to_say",
                    })
                  }
                  title="Prefer not to say"
                  subtitle="Uses a balanced gender-neutral metabolic estimate"
                />
              </div>
            </div>
          )}

          {/* 2. BIRTH DATE */}
          {activeNodeId === "birth_date" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  When were you born?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Resting energy expenditure changes gradually with age.
                </p>
              </div>
              <div className="space-y-3">
                <input
                  type="date"
                  value={formData.birthDate || ""}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) =>
                    updateAnswers({ birthDate: e.target.value, birthDateSkipped: false })
                  }
                  className="w-full p-3.5 text-sm font-bold rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                />
                {formData.birthDate && calculateAge(formData.birthDate) && (
                  <p className="text-xs font-bold text-[#2F7D16]">
                    Age: {calculateAge(formData.birthDate)} years
                  </p>
                )}
                <button
                  type="button"
                  onClick={() =>
                    updateAnswers({
                      birthDate: null,
                      birthDateSkipped: !formData.birthDateSkipped,
                    })
                  }
                  className={cn(
                    "w-full p-3 rounded-2xl border text-xs font-bold transition-colors cursor-pointer",
                    formData.birthDateSkipped
                      ? "bg-[#EAF4E3] border-[#2F7D16] text-[#2F7D16]"
                      : "bg-white border-[#E5E7E2] text-nutri-secondary hover:bg-[#F7FAF4]"
                  )}
                >
                  Prefer not to say
                </button>
              </div>
            </div>
          )}

          {/* 3. HEIGHT */}
          {activeNodeId === "height" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                    How tall are you?
                  </h1>
                  <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                    Helps calculate your resting metabolic rate and BMI context.
                  </p>
                </div>
                <div className="flex rounded-xl bg-[#F3F7EE] p-1 border border-[#E5E7E2]">
                  {(["cm", "ft"] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => updateAnswers({ heightUnit: unit })}
                      className={cn(
                        "px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer",
                        formData.heightUnit === unit
                          ? "bg-[#2F7D16] text-white"
                          : "text-nutri-secondary"
                      )}
                    >
                      {unit === "cm" ? "cm" : "ft/in"}
                    </button>
                  ))}
                </div>
              </div>

              {formData.heightUnit === "cm" ? (
                <div className="relative">
                  <input
                    type="number"
                    min={90}
                    max={250}
                    placeholder="e.g. 172"
                    value={formData.heightCm || ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      updateAnswers({ heightCm: val, heightSkipped: false });
                    }}
                    className="w-full p-3.5 pr-12 text-base font-bold rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                    cm
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      min={3}
                      max={8}
                      placeholder="Feet (e.g. 5)"
                      value={feet}
                      onChange={(e) => {
                        setFeet(e.target.value);
                        const ft = parseFloat(e.target.value) || 0;
                        const inc = parseFloat(inches) || 0;
                        const cm = Math.round((ft * 12 + inc) * 2.54);
                        updateAnswers({ heightCm: cm > 0 ? cm : null, heightSkipped: false });
                      }}
                      className="w-full p-3.5 pr-10 text-base font-bold rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                      ft
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={11}
                      placeholder="Inches (e.g. 8)"
                      value={inches}
                      onChange={(e) => {
                        setInches(e.target.value);
                        const ft = parseFloat(feet) || 0;
                        const inc = parseFloat(e.target.value) || 0;
                        const cm = Math.round((ft * 12 + inc) * 2.54);
                        updateAnswers({ heightCm: cm > 0 ? cm : null, heightSkipped: false });
                      }}
                      className="w-full p-3.5 pr-10 text-base font-bold rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                      in
                    </span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  updateAnswers({
                    heightCm: null,
                    heightSkipped: !formData.heightSkipped,
                  })
                }
                className={cn(
                  "w-full p-3 rounded-2xl border text-xs font-bold transition-colors cursor-pointer",
                  formData.heightSkipped
                    ? "bg-[#EAF4E3] border-[#2F7D16] text-[#2F7D16]"
                    : "bg-white border-[#E5E7E2] text-nutri-secondary hover:bg-[#F7FAF4]"
                )}
              >
                Prefer not to say
              </button>
            </div>
          )}

          {/* 4. PRIMARY GOAL */}
          {activeNodeId === "primary_goal" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What is your main fitness &amp; nutrition goal?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  We will tailor the remaining questions specifically to your choice.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={normalizedGoal === "lose_weight"}
                  onClick={() => updateAnswers({ primaryGoal: "lose_weight" })}
                  icon={Flame}
                  title="Lose Weight"
                  subtitle="Sustainable fat loss with lean muscle preservation"
                />
                <OptionButton
                  selected={normalizedGoal === "gain_weight_build_muscle"}
                  onClick={() =>
                    updateAnswers({ primaryGoal: "gain_weight_build_muscle" })
                  }
                  icon={Dumbbell}
                  title="Gain Weight & Build Muscle"
                  subtitle="Lean hypertrophy, strength, and controlled caloric surplus"
                />
                <OptionButton
                  selected={normalizedGoal === "maintain"}
                  onClick={() => updateAnswers({ primaryGoal: "maintain" })}
                  icon={Scale}
                  title="Maintain Weight"
                  subtitle="Stay consistent, fuel daily life, and balance nutrition"
                />
                <OptionButton
                  selected={normalizedGoal === "improve_fitness"}
                  onClick={() => updateAnswers({ primaryGoal: "improve_fitness" })}
                  icon={TrendingUp}
                  title="Improve Fitness & Body Composition"
                  subtitle="Boost stamina, recomposition, and athletic energy"
                />
              </div>
            </div>
          )}

          {/* 5. CURRENT WEIGHT */}
          {activeNodeId === "current_weight" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                    What is your current weight?
                  </h1>
                  <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                    Used to estimate your daily energy and protein requirements.
                  </p>
                </div>
                <div className="flex rounded-xl bg-[#F3F7EE] p-1 border border-[#E5E7E2]">
                  {(["kg", "lbs"] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => updateAnswers({ weightUnit: unit })}
                      className={cn(
                        "px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer",
                        formData.weightUnit === unit
                          ? "bg-[#2F7D16] text-white"
                          : "text-nutri-secondary"
                      )}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>

              {formData.weightUnit === "kg" ? (
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min={25}
                    max={350}
                    placeholder="e.g. 70"
                    value={formData.weightKg || ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      updateAnswers({ weightKg: val });
                      if (val) setWeightLbs(String(Math.round(val * 2.20462)));
                    }}
                    className="w-full p-3.5 pr-12 text-base font-bold rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                    kg
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min={55}
                    max={770}
                    placeholder="e.g. 154"
                    value={weightLbs}
                    onChange={(e) => {
                      setWeightLbs(e.target.value);
                      const lbs = parseFloat(e.target.value);
                      updateAnswers({
                        weightKg: lbs > 0 ? Number((lbs / 2.20462).toFixed(1)) : null,
                      });
                    }}
                    className="w-full p-3.5 pr-12 text-base font-bold rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                    lbs
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 6. TARGET WEIGHT */}
          {activeNodeId === "target_weight" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What is your desired target weight?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  {formData.weightKg
                    ? `Current weight: ${formData.weightKg} kg.`
                    : "Enter a realistic weight you feel healthy and strong at."}
                </p>
              </div>
              {formData.weightUnit === "kg" ? (
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min={25}
                    max={350}
                    placeholder={
                      normalizedGoal === "lose_weight" ? "e.g. 64" : "e.g. 76"
                    }
                    value={formData.desiredGoalTarget?.targetWeightKg || ""}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      updateAnswers({
                        desiredGoalTarget: {
                          ...formData.desiredGoalTarget,
                          targetWeightKg: val,
                        },
                      });
                      if (val) setTargetWeightLbs(String(Math.round(val * 2.20462)));
                    }}
                    className="w-full p-3.5 pr-12 text-base font-bold rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                    kg
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min={55}
                    max={770}
                    placeholder="Target weight in lbs"
                    value={targetWeightLbs}
                    onChange={(e) => {
                      setTargetWeightLbs(e.target.value);
                      const lbs = parseFloat(e.target.value);
                      updateAnswers({
                        desiredGoalTarget: {
                          ...formData.desiredGoalTarget,
                          targetWeightKg:
                            lbs > 0 ? Number((lbs / 2.20462).toFixed(1)) : null,
                        },
                      });
                    }}
                    className="w-full p-3.5 pr-12 text-base font-bold rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                    lbs
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 7. WEIGHT LOSS PACE */}
          {activeNodeId === "weight_loss_pace" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What is your preferred weight-loss pace?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Steady, conservative deficits protect muscle mass and prevent burnout.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.preferredPace === "slow"}
                  onClick={() => updateAnswers({ preferredPace: "slow" })}
                  title="Slow & Sustainable (~0.25–0.4 kg / week)"
                  subtitle="Mild calorie deficit, minimal hunger, easy to maintain"
                />
                <OptionButton
                  selected={formData.preferredPace === "moderate"}
                  onClick={() => updateAnswers({ preferredPace: "moderate" })}
                  title="Moderate & Balanced (~0.5 kg / week)"
                  subtitle="Evidence-based standard pace for steady fat loss"
                />
                <OptionButton
                  selected={formData.preferredPace === "fast"}
                  onClick={() => updateAnswers({ preferredPace: "fast" })}
                  title="Focused Safe Pace (~0.7 kg / week)"
                  subtitle="Structured deficit capped at safe physiological limits"
                />
              </div>
            </div>
          )}

          {/* 8. MUSCLE FOCUS (Gain Weight & Build Muscle) */}
          {activeNodeId === "muscle_focus" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What is your primary focus?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Determines how we balance your caloric surplus and protein target.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.muscleFocus === "muscle_building"}
                  onClick={() => updateAnswers({ muscleFocus: "muscle_building" })}
                  icon={Dumbbell}
                  title="Lean Muscle Building"
                  subtitle="Maximize hypertrophy with minimal fat gain"
                />
                <OptionButton
                  selected={formData.muscleFocus === "overall_weight_gain"}
                  onClick={() => updateAnswers({ muscleFocus: "overall_weight_gain" })}
                  icon={TrendingUp}
                  title="Overall Healthy Weight Gain"
                  subtitle="Increase body weight steadily with nutrient-dense meals"
                />
                <OptionButton
                  selected={formData.muscleFocus === "strength"}
                  onClick={() => updateAnswers({ muscleFocus: "strength" })}
                  icon={Flame}
                  title="Strength & Power"
                  subtitle="Fuel progressive overload and heavy compound lifts"
                />
              </div>
            </div>
          )}

          {/* 9. MAINTAIN FOCUS */}
          {activeNodeId === "maintain_focus" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What matters most while maintaining?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Helps us fine-tune your protein and daily calorie balance.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.maintainFocus === "maintain_weight"}
                  onClick={() => updateAnswers({ maintainFocus: "maintain_weight" })}
                  icon={Scale}
                  title="Maintain Current Weight"
                  subtitle="Keep energy balanced and stay consistent day-to-day"
                />
                <OptionButton
                  selected={formData.maintainFocus === "improve_body_composition"}
                  onClick={() =>
                    updateAnswers({ maintainFocus: "improve_body_composition" })
                  }
                  icon={Sparkles}
                  title="Improve Body Composition"
                  subtitle="Gradually tone up and build lean mass around the same weight"
                />
              </div>
            </div>
          )}

          {/* 10. FITNESS OBJECTIVE (Improve Fitness branch) */}
          {activeNodeId === "fitness_objective" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What is your primary fitness objective?
                </h1>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.fitnessObjective === "body_recomposition"}
                  onClick={() =>
                    updateAnswers({ fitnessObjective: "body_recomposition" })
                  }
                  title="Body Recomposition"
                  subtitle="Reduce body fat while improving lean muscle tone"
                />
                <OptionButton
                  selected={formData.fitnessObjective === "endurance_stamina"}
                  onClick={() =>
                    updateAnswers({ fitnessObjective: "endurance_stamina" })
                  }
                  title="Endurance & Stamina"
                  subtitle="Improve cardiovascular capacity and sustained energy"
                />
                <OptionButton
                  selected={formData.fitnessObjective === "athletic_performance"}
                  onClick={() =>
                    updateAnswers({ fitnessObjective: "athletic_performance" })
                  }
                  title="Athletic Performance"
                  subtitle="Fuel sports, agility, and higher training output"
                />
                <OptionButton
                  selected={formData.fitnessObjective === "general_energy"}
                  onClick={() => updateAnswers({ fitnessObjective: "general_energy" })}
                  title="General Energy & Wellness"
                  subtitle="Feel stronger, healthier, and more consistent daily"
                />
              </div>
            </div>
          )}

          {/* 11. ACTIVITY LEVEL (Improve Fitness branch) */}
          {activeNodeId === "activity_level" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  How active is your typical day outside of workouts?
                </h1>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.activityLevel === "sedentary"}
                  onClick={() => updateAnswers({ activityLevel: "sedentary" })}
                  title="Mostly Seated / Desk Job"
                  subtitle="Under 5,000 daily steps"
                />
                <OptionButton
                  selected={formData.activityLevel === "lightly_active"}
                  onClick={() => updateAnswers({ activityLevel: "lightly_active" })}
                  title="Lightly Active"
                  subtitle="5,000–7,500 daily steps, some standing or walking"
                />
                <OptionButton
                  selected={formData.activityLevel === "moderately_active"}
                  onClick={() => updateAnswers({ activityLevel: "moderately_active" })}
                  title="Moderately Active"
                  subtitle="7,500–10,000+ steps or active job"
                />
                <OptionButton
                  selected={formData.activityLevel === "very_active"}
                  onClick={() => updateAnswers({ activityLevel: "very_active" })}
                  title="Very Active"
                  subtitle="On your feet most of the day or physical labor"
                />
              </div>
            </div>
          )}

          {/* 12. GOAL TIMELINE */}
          {activeNodeId === "goal_timeline" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  How quickly would you like to achieve your goal?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  We will evaluate your timeline against conservative wellness guidance.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[4, 8, 12, 24].map((weeks) => (
                  <button
                    key={weeks}
                    type="button"
                    onClick={() => updateAnswers({ desiredTimelineWeeks: weeks })}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer",
                      formData.desiredTimelineWeeks === weeks
                        ? "border-[#2F7D16] bg-[#EAF4E3]"
                        : "border-[#E5E7E2] bg-white hover:bg-[#F7FAF4]"
                    )}
                  >
                    <div className="font-heading font-extrabold text-sm text-nutri-charcoal">
                      {weeks} Weeks
                    </div>
                    <div className="text-[11px] text-nutri-secondary">
                      ~{Math.round(weeks / 4)} {weeks === 4 ? "month" : "months"}
                    </div>
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={104}
                  placeholder="Or enter custom weeks (e.g. 16)"
                  value={formData.desiredTimelineWeeks || ""}
                  onChange={(e) =>
                    updateAnswers({
                      desiredTimelineWeeks: e.target.value
                        ? parseInt(e.target.value, 10)
                        : null,
                    })
                  }
                  className="w-full p-3.5 pr-16 text-sm font-bold rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                  weeks
                </span>
              </div>
            </div>
          )}

          {/* 13. GOAL REALISM CHECK */}
          {activeNodeId === "goal_realism" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Let&apos;s review your target &amp; timeline
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Conservative assessment based on your current weight and target.
                </p>
              </div>

              <div
                className={cn(
                  "p-4 rounded-2xl border-2 space-y-3",
                  calculatedTargets.feasibilityAssessment.isRealistic
                    ? "bg-[#EAF4E3] border-[#2F7D16]/40"
                    : "bg-amber-50 border-amber-300"
                )}
              >
                <div className="flex items-start gap-2.5">
                  {calculatedTargets.feasibilityAssessment.isRealistic ? (
                    <CheckCircle2 className="w-5 h-5 text-[#2F7D16] shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <h3 className="font-heading font-bold text-sm text-nutri-charcoal">
                      {calculatedTargets.feasibilityAssessment.isRealistic
                        ? "Realistic & Sustainable Pace"
                        : "Aggressive Timeline Detected"}
                    </h3>
                    <p className="text-xs text-nutri-secondary leading-relaxed">
                      Estimated average change:{" "}
                      <strong>
                        {calculatedTargets.feasibilityAssessment.weeklyChangeKg} kg/week
                      </strong>{" "}
                      over <strong>{formData.desiredTimelineWeeks || 12} weeks</strong>.
                    </p>
                    <p className="text-xs text-nutri-charcoal leading-relaxed pt-1">
                      {calculatedTargets.feasibilityAssessment.safetyNote}
                    </p>
                  </div>
                </div>

                {!calculatedTargets.feasibilityAssessment.isRealistic && (
                  <div className="pt-2 border-t border-amber-200 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        updateAnswers({
                          desiredTimelineWeeks:
                            calculatedTargets.feasibilityAssessment
                              .recommendedTimelineWeeks,
                        })
                      }
                      className="bg-[#2F7D16] hover:bg-[#24630F] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Use Recommended Timeline (
                      {calculatedTargets.feasibilityAssessment.recommendedTimelineWeeks}{" "}
                      weeks)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentNodeId("target_weight")}
                      className="text-xs font-bold rounded-xl border-amber-400 text-amber-900 bg-white cursor-pointer"
                    >
                      Revise Target Weight
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-nutri-muted">
                Note: Individual progress varies with metabolism, adherence, sleep, and training. NutriFlexs provides safe calorie estimates, not guaranteed weight outcomes.
              </p>
            </div>
          )}

          {/* 14. CHALLENGES (Goal-Branched) */}
          {(activeNodeId === "weight_challenges" ||
            activeNodeId === "nutrition_challenges" ||
            activeNodeId === "lifestyle_challenges") && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  {activeNodeId === "weight_challenges"
                    ? "What makes weight management difficult for you?"
                    : activeNodeId === "nutrition_challenges"
                    ? "What are your main nutrition challenges?"
                    : "What are your main lifestyle challenges?"}
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Select all that apply (optional).
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(activeNodeId === "weight_challenges"
                  ? [
                      "Late-night cravings or snacking",
                      "Estimating Indian home-cooked portions",
                      "Busy schedule / eating out often",
                      "Staying consistent on weekends",
                      "Feeling hungry in a calorie deficit",
                    ]
                  : activeNodeId === "nutrition_challenges"
                  ? [
                      "Hitting daily protein targets",
                      "Balancing carbs, fats, and sugar",
                      "Meal planning for busy weekdays",
                      "Tracking homemade meals accurately",
                    ]
                  : [
                      "Low energy or afternoon fatigue",
                      "Irregular meal timings",
                      "Balancing work, sleep & workouts",
                      "Eating enough protein around training",
                    ]
                ).map((item) => {
                  const selected = (formData.challenges || []).includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("challenges", item)}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2",
                        selected
                          ? "border-[#2F7D16] bg-[#EAF4E3] text-[#2F7D16]"
                          : "border-[#E5E7E2] bg-white text-nutri-charcoal hover:bg-[#F7FAF4]"
                      )}
                    >
                      <span>{item}</span>
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 15. WORKOUT FREQUENCY */}
          {activeNodeId === "workout_frequency" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  How many workout sessions do you complete per week?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Count total structured sessions per week (even if you do two sessions in a day).
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { id: "0_sessions", label: "0 sessions", sub: "Currently not exercising" },
                  { id: "1_2_sessions", label: "1–2 sessions", sub: "Light weekly activity" },
                  { id: "3_4_sessions", label: "3–4 sessions", sub: "Consistent weekly routine" },
                  { id: "5_6_sessions", label: "5–6 sessions", sub: "High weekly training volume" },
                  { id: "7_plus_sessions", label: "7+ sessions", sub: "Daily or two-a-day training" },
                ].map((opt) => (
                  <OptionButton
                    key={opt.id}
                    selected={formData.workoutFrequency === opt.id}
                    onClick={() => updateAnswers({ workoutFrequency: opt.id as any })}
                    title={opt.label}
                    subtitle={opt.sub}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 16a. ZERO SESSIONS FOLLOW-UP: PLANNING TO START? */}
          {activeNodeId === "planning_to_start_exercise" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Are you planning to start exercising?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  No pressure — nutrition alone already makes a huge difference.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.planningToStartExercise === "yes_soon"}
                  onClick={() => updateAnswers({ planningToStartExercise: "yes_soon" })}
                  title="Yes, I want to start soon"
                />
                <OptionButton
                  selected={formData.planningToStartExercise === "maybe_later"}
                  onClick={() => updateAnswers({ planningToStartExercise: "maybe_later" })}
                  title="Maybe in a few weeks"
                />
                <OptionButton
                  selected={formData.planningToStartExercise === "not_right_now"}
                  onClick={() =>
                    updateAnswers({ planningToStartExercise: "not_right_now" })
                  }
                  title="Not right now — focusing on diet first"
                />
              </div>
            </div>
          )}

          {/* 16b. STARTER ACTIVITY TYPE */}
          {activeNodeId === "starter_activity_type" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What type of activity would you like to begin with?
                </h1>
              </div>
              <div className="space-y-2">
                {[
                  { id: "walking_cardio", title: "Daily Walking or Light Cardio" },
                  { id: "home_workouts", title: "Beginner Home Workouts" },
                  { id: "gym_strength", title: "Gym & Strength Training" },
                  { id: "yoga_mobility", title: "Yoga & Mobility" },
                  { id: "sports", title: "Recreational Sports" },
                ].map((opt) => (
                  <OptionButton
                    key={opt.id}
                    selected={formData.starterActivityType === opt.id}
                    onClick={() => updateAnswers({ starterActivityType: opt.id as any })}
                    title={opt.title}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 16c. WORKOUT TYPE (1-4 or 5+ sessions) */}
          {activeNodeId === "workout_type" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What type of workouts do you primarily perform?
                </h1>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.workoutType === "strength_training"}
                  onClick={() => updateAnswers({ workoutType: "strength_training" })}
                  icon={Dumbbell}
                  title="Strength Training / Lifting"
                />
                <OptionButton
                  selected={formData.workoutType === "cardio"}
                  onClick={() => updateAnswers({ workoutType: "cardio" })}
                  icon={Activity}
                  title="Cardio / Running / Cycling"
                />
                <OptionButton
                  selected={formData.workoutType === "sports"}
                  onClick={() => updateAnswers({ workoutType: "sports" })}
                  icon={Flame}
                  title="Sports & Functional Conditioning"
                />
                <OptionButton
                  selected={formData.workoutType === "combination"}
                  onClick={() => updateAnswers({ workoutType: "combination" })}
                  icon={Sparkles}
                  title="Combination (Strength + Cardio)"
                />
              </div>
            </div>
          )}

          {/* 16d. WORKOUT DURATION (1-4 sessions) */}
          {activeNodeId === "workout_duration" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What is your average workout duration?
                </h1>
              </div>
              <div className="space-y-2.5">
                {[
                  { id: "under_30", title: "Under 30 minutes" },
                  { id: "30_45", title: "30–45 minutes" },
                  { id: "45_60", title: "45–60 minutes" },
                  { id: "60_plus", title: "60+ minutes" },
                ].map((opt) => (
                  <OptionButton
                    key={opt.id}
                    selected={formData.workoutDuration === opt.id}
                    onClick={() => updateAnswers({ workoutDuration: opt.id as any })}
                    title={opt.title}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 16e. WORKOUT INTENSITY (5+ sessions) */}
          {activeNodeId === "workout_intensity" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What is your typical workout intensity?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  High-volume training increases your energy and recovery requirements.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.workoutIntensity === "moderate"}
                  onClick={() => updateAnswers({ workoutIntensity: "moderate" })}
                  title="Moderate"
                  subtitle="Steady effort, able to hold brief conversation"
                />
                <OptionButton
                  selected={formData.workoutIntensity === "high"}
                  onClick={() => updateAnswers({ workoutIntensity: "high" })}
                  title="High Intensity"
                  subtitle="Challenging sets, progressive overload, or high heart rate"
                />
                <OptionButton
                  selected={formData.workoutIntensity === "very_high_athlete"}
                  onClick={() =>
                    updateAnswers({ workoutIntensity: "very_high_athlete" })
                  }
                  title="Very High / Competitive Training"
                  subtitle="Peak exertion, athlete-level volume"
                />
              </div>
            </div>
          )}

          {/* 16f. REST & RECOVERY DAYS (5+ sessions) */}
          {activeNodeId === "rest_recovery_days" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Do you include rest or recovery days?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Adequate recovery helps prevent fatigue and supports muscle repair.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.restRecoveryDays === "yes_regularly"}
                  onClick={() => updateAnswers({ restRecoveryDays: "yes_regularly" })}
                  title="Yes, at least 1–2 structured rest/active recovery days"
                />
                <OptionButton
                  selected={formData.restRecoveryDays === "occasionally"}
                  onClick={() => updateAnswers({ restRecoveryDays: "occasionally" })}
                  title="Occasionally, when I feel sore or tired"
                />
                <OptionButton
                  selected={formData.restRecoveryDays === "no_rarely"}
                  onClick={() => updateAnswers({ restRecoveryDays: "no_rarely" })}
                  title="Rarely — I train almost every day"
                />
              </div>
            </div>
          )}

          {/* 17. GYM ACCESS (Gain Weight & Build Muscle branch) */}
          {activeNodeId === "gym_access" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Where do you work out?
                </h1>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.gymAccess === "commercial_gym"}
                  onClick={() => updateAnswers({ gymAccess: "commercial_gym" })}
                  title="Commercial Gym"
                />
                <OptionButton
                  selected={formData.gymAccess === "home_gym"}
                  onClick={() => updateAnswers({ gymAccess: "home_gym" })}
                  title="Home Gym (Dumbbells / Barbells)"
                />
                <OptionButton
                  selected={formData.gymAccess === "bodyweight_minimal"}
                  onClick={() => updateAnswers({ gymAccess: "bodyweight_minimal" })}
                  title="Bodyweight / Minimal Equipment at Home"
                />
                <OptionButton
                  selected={formData.gymAccess === "both"}
                  onClick={() => updateAnswers({ gymAccess: "both" })}
                  title="Mix of Gym and Home"
                />
              </div>
            </div>
          )}

          {/* 18. DIET PREFERENCE */}
          {activeNodeId === "diet_preference" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Do you follow a specific diet?
                </h1>
              </div>
              <div className="space-y-2">
                {[
                  { id: "vegetarian", title: "Vegetarian", sub: "Plant foods + dairy, no meat/eggs" },
                  { id: "vegan", title: "Vegan", sub: "100% plant-based, no dairy or animal products" },
                  { id: "eggetarian", title: "Eggetarian", sub: "Vegetarian plus eggs" },
                  { id: "non_vegetarian", title: "Non-vegetarian", sub: "Includes chicken, fish, eggs, and meat" },
                  { id: "no_specific", title: "No specific diet", sub: "Flexible eating pattern" },
                ].map((opt) => (
                  <OptionButton
                    key={opt.id}
                    selected={formData.dietPreference === opt.id}
                    onClick={() => updateAnswers({ dietPreference: opt.id as any })}
                    title={opt.title}
                    subtitle={opt.sub}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 19. PROTEIN SOURCES (Conditional on Diet Preference) */}
          {activeNodeId === "protein_sources" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  {formData.dietPreference === "vegan"
                    ? "What are your preferred plant-based protein sources?"
                    : formData.dietPreference === "eggetarian"
                    ? "What are your preferred egg & dairy protein sources?"
                    : "What are your preferred protein sources?"}
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Select the options you enjoy regularly.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  PROTEIN_OPTIONS_BY_DIET[formData.dietPreference || "vegetarian"] ||
                  PROTEIN_OPTIONS_BY_DIET.vegetarian
                ).map((source) => {
                  const selected = (formData.proteinSources || []).includes(source);
                  return (
                    <button
                      key={source}
                      type="button"
                      onClick={() => toggleArrayItem("proteinSources", source)}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2",
                        selected
                          ? "border-[#2F7D16] bg-[#EAF4E3] text-[#2F7D16]"
                          : "border-[#E5E7E2] bg-white text-nutri-charcoal hover:bg-[#F7FAF4]"
                      )}
                    >
                      <span>{source}</span>
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 20. FOOD ALLERGIES / RESTRICTIONS */}
          {activeNodeId === "has_allergies" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Do you have any food allergies or dietary restrictions?
                </h1>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.hasAllergies === "yes"}
                  onClick={() => updateAnswers({ hasAllergies: "yes" })}
                  title="Yes, I have allergies or restrictions"
                />
                <OptionButton
                  selected={formData.hasAllergies === "no"}
                  onClick={() => updateAnswers({ hasAllergies: "no" })}
                  title="No, I don't have food allergies"
                />
              </div>
            </div>
          )}

          {/* 21. ALLERGY DETAILS (If Yes) */}
          {activeNodeId === "allergy_details" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Which foods or ingredients do you avoid?
                </h1>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALLERGY_OPTIONS.map((item) => {
                  const selected = (formData.allergyDetails || []).includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("allergyDetails", item)}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2",
                        selected
                          ? "border-[#2F7D16] bg-[#EAF4E3] text-[#2F7D16]"
                          : "border-[#E5E7E2] bg-white text-nutri-charcoal hover:bg-[#F7FAF4]"
                      )}
                    >
                      <span>{item}</span>
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder="Any other allergy or restriction (optional)..."
                value={formData.allergyOtherText || ""}
                onChange={(e) => updateAnswers({ allergyOtherText: e.target.value })}
                className="w-full p-3 text-xs font-medium rounded-2xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
              />
            </div>
          )}

          {/* 22. DIETITIAN CONSULTATION */}
          {activeNodeId === "dietitian_consultation" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Have you consulted a registered dietitian or qualified nutrition professional?
                </h1>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.dietitianConsultation === "yes"}
                  onClick={() => updateAnswers({ dietitianConsultation: "yes" })}
                  title="Yes"
                />
                <OptionButton
                  selected={formData.dietitianConsultation === "no"}
                  onClick={() => updateAnswers({ dietitianConsultation: "no" })}
                  title="No"
                />
                <OptionButton
                  selected={formData.dietitianConsultation === "prefer_not_to_say"}
                  onClick={() =>
                    updateAnswers({ dietitianConsultation: "prefer_not_to_say" })
                  }
                  title="Prefer not to say"
                />
              </div>
            </div>
          )}

          {/* 23a. FOLLOWING DIET PLAN (If Dietitian = Yes) */}
          {activeNodeId === "following_diet_plan" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Are you currently following a diet plan?
                </h1>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.followingDietPlan === "yes"}
                  onClick={() => updateAnswers({ followingDietPlan: "yes" })}
                  title="Yes, I am currently following a plan"
                />
                <OptionButton
                  selected={formData.followingDietPlan === "no"}
                  onClick={() => updateAnswers({ followingDietPlan: "no" })}
                  title="No, not currently"
                />
              </div>
            </div>
          )}

          {/* 23b. SHARE EXISTING TARGETS (If Dietitian = Yes) */}
          {activeNodeId === "share_existing_targets" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Would you like to share your existing nutrition targets?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Optional — if shared, we will apply them directly instead of overriding with estimates.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.shareExistingTargets === "yes"}
                  onClick={() => updateAnswers({ shareExistingTargets: "yes" })}
                  title="Yes, enter my existing targets"
                />
                <OptionButton
                  selected={formData.shareExistingTargets === "no"}
                  onClick={() =>
                    updateAnswers({
                      shareExistingTargets: "no",
                      existingCalorieTarget: null,
                      existingProteinTarget: null,
                    })
                  }
                  title="No, calculate general wellness estimates for me"
                />
              </div>

              {formData.shareExistingTargets === "yes" && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-nutri-secondary block mb-1">
                      Daily Calories (kcal)
                    </label>
                    <input
                      type="number"
                      min={800}
                      max={6000}
                      placeholder="e.g. 2000"
                      value={formData.existingCalorieTarget || ""}
                      onChange={(e) =>
                        updateAnswers({
                          existingCalorieTarget: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        })
                      }
                      className="w-full p-2.5 text-sm font-bold rounded-xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-nutri-secondary block mb-1">
                      Protein Target (g)
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={350}
                      placeholder="e.g. 130"
                      value={formData.existingProteinTarget || ""}
                      onChange={(e) =>
                        updateAnswers({
                          existingProteinTarget: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        })
                      }
                      className="w-full p-2.5 text-sm font-bold rounded-xl border-2 border-[#E5E7E2] focus:border-[#2F7D16] focus:outline-none bg-[#F7FAF4]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 23c. WANT PERSONALIZED GUIDANCE (If Dietitian = No) */}
          {activeNodeId === "want_personalized_guidance" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Would you like personalised nutrition guidance?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  You can use our AI Coach or connect with NutriFlexs fitness &amp; nutrition mentors anytime.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.wantPersonalizedGuidance === "yes"}
                  onClick={() => updateAnswers({ wantPersonalizedGuidance: "yes" })}
                  title="Yes, guide me along the way"
                />
                <OptionButton
                  selected={formData.wantPersonalizedGuidance === "not_now"}
                  onClick={() => updateAnswers({ wantPersonalizedGuidance: "not_now" })}
                  title="Not right now — just set up my tracker"
                />
              </div>
            </div>
          )}

          {/* 24. DESIRED OUTCOMES */}
          {activeNodeId === "desired_outcomes" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  What would you like to accomplish with NutriFlexs?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Optional — select what matters most to you.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Understand my daily calorie intake",
                  "Hit my daily protein goals",
                  "Track Indian homemade meals",
                  "Track water & sugar intake",
                  "Stay consistent without strict dieting",
                  "Order macro-friendly meals easily",
                ].map((item) => {
                  const selected = (formData.desiredOutcomes || []).includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleArrayItem("desiredOutcomes", item)}
                      className={cn(
                        "p-3 rounded-2xl border-2 text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-2",
                        selected
                          ? "border-[#2F7D16] bg-[#EAF4E3] text-[#2F7D16]"
                          : "border-[#E5E7E2] bg-white text-nutri-charcoal hover:bg-[#F7FAF4]"
                      )}
                    >
                      <span>{item}</span>
                      {selected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 25. SUMMARY TARGETS (Editable + Clear Disclaimer) */}
          {activeNodeId === "summary_targets" && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                    Your Personalized Nutrition Estimates
                  </h1>
                  <p className="text-xs text-nutri-secondary mt-1">
                    {calculatedTargets.estimationBasis}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingTargets(!editingTargets)}
                  className="text-xs font-bold rounded-xl border-[#E5E7E2] shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  {editingTargets ? "Done" : "Edit Targets"}
                </Button>
              </div>

              {!calculatedTargets.hasCompleteMetrics && !editingTargets && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Because {calculatedTargets.missingMetrics.join(", ")} was skipped, we did not fabricate a BMR/TDEE estimate. Click <strong>Edit Targets</strong> to enter your preferred calorie &amp; macro goals, or skip setting targets for now.
                  </span>
                </div>
              )}

              {editingTargets ? (
                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#F7FAF4] border border-[#E5E7E2]">
                  <div>
                    <label className="text-[11px] font-bold text-nutri-secondary block mb-1">
                      Daily Calories (kcal)
                    </label>
                    <input
                      type="number"
                      min={800}
                      max={6000}
                      value={
                        formData.customCalorieTarget ??
                        calculatedTargets.dailyCalories ??
                        ""
                      }
                      onChange={(e) =>
                        updateAnswers({
                          customCalorieTarget: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        })
                      }
                      className="w-full p-2.5 text-sm font-bold rounded-xl border border-[#E5E7E2] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-nutri-secondary block mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={350}
                      value={
                        formData.customProteinTarget ??
                        calculatedTargets.proteinGrams ??
                        ""
                      }
                      onChange={(e) =>
                        updateAnswers({
                          customProteinTarget: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        })
                      }
                      className="w-full p-2.5 text-sm font-bold rounded-xl border border-[#E5E7E2] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-nutri-secondary block mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={800}
                      value={
                        formData.customCarbsTarget ??
                        calculatedTargets.carbsGrams ??
                        ""
                      }
                      onChange={(e) =>
                        updateAnswers({
                          customCarbsTarget: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        })
                      }
                      className="w-full p-2.5 text-sm font-bold rounded-xl border border-[#E5E7E2] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-nutri-secondary block mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={250}
                      value={
                        formData.customFatTarget ?? calculatedTargets.fatGrams ?? ""
                      }
                      onChange={(e) =>
                        updateAnswers({
                          customFatTarget: e.target.value
                            ? parseInt(e.target.value, 10)
                            : null,
                        })
                      }
                      className="w-full p-2.5 text-sm font-bold rounded-xl border border-[#E5E7E2] bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-[#EAF4E3] border border-[#2F7D16]/25 text-center">
                    <span className="text-[10px] font-bold uppercase text-[#2F7D16] block">
                      Calories
                    </span>
                    <span className="font-heading font-black text-xl text-nutri-charcoal">
                      {calculatedTargets.dailyCalories ?? "—"}
                    </span>
                    <span className="text-[10px] text-nutri-secondary block">kcal/day</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#F7FAF4] border border-[#E5E7E2] text-center">
                    <span className="text-[10px] font-bold uppercase text-nutri-secondary block">
                      Protein
                    </span>
                    <span className="font-heading font-black text-xl text-nutri-charcoal">
                      {calculatedTargets.proteinGrams ?? "—"}
                    </span>
                    <span className="text-[10px] text-nutri-secondary block">grams</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#F7FAF4] border border-[#E5E7E2] text-center">
                    <span className="text-[10px] font-bold uppercase text-nutri-secondary block">
                      Carbs
                    </span>
                    <span className="font-heading font-black text-xl text-nutri-charcoal">
                      {calculatedTargets.carbsGrams ?? "—"}
                    </span>
                    <span className="text-[10px] text-nutri-secondary block">grams</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#F7FAF4] border border-[#E5E7E2] text-center">
                    <span className="text-[10px] font-bold uppercase text-nutri-secondary block">
                      Fats
                    </span>
                    <span className="font-heading font-black text-xl text-nutri-charcoal">
                      {calculatedTargets.fatGrams ?? "—"}
                    </span>
                    <span className="text-[10px] text-nutri-secondary block">grams</span>
                  </div>
                </div>
              )}

              {calculatedTargets.bmi && (
                <div className="text-xs text-nutri-secondary flex items-center justify-between px-3 py-2 rounded-xl bg-[#F7FAF4] border border-[#E5E7E2]">
                  <span>Estimated BMI: <strong>{calculatedTargets.bmi}</strong> ({calculatedTargets.bmiCategory})</span>
                  {calculatedTargets.tdee && (
                    <span>Est. TDEE: <strong>{calculatedTargets.tdee} kcal</strong></span>
                  )}
                </div>
              )}

              <p className="text-[11px] text-nutri-muted leading-relaxed">
                Disclaimer: These targets are general wellness estimates, not medical prescriptions. Consult a healthcare provider or registered dietitian for clinical nutrition needs.
              </p>
            </div>
          )}

          {/* 26. REMINDERS */}
          {activeNodeId === "reminders_preference" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Stay on track with gentle reminders?
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Helpful nudges to log meals and hydration without stress.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.notificationsEnabled === true}
                  onClick={() => updateAnswers({ notificationsEnabled: true })}
                  icon={Bell}
                  title="Yes, enable tracking reminders"
                />
                <OptionButton
                  selected={formData.notificationsEnabled === false}
                  onClick={() => updateAnswers({ notificationsEnabled: false })}
                  title="No thanks, I'll log on my own"
                />
              </div>
            </div>
          )}

          {/* 27. ROLLOVER PREFERENCE */}
          {activeNodeId === "rollover_preference" && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Your Nutrition Goals, With Flexibility
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
                  Optional calorie rollover carries unused calories gently to the next day so social meals stay stress-free.
                </p>
              </div>
              <div className="space-y-2.5">
                <OptionButton
                  selected={formData.calorieRolloverEnabled === true}
                  onClick={() => updateAnswers({ calorieRolloverEnabled: true })}
                  icon={Sparkles}
                  title="Enable Calorie Rollover"
                />
                <OptionButton
                  selected={formData.calorieRolloverEnabled === false}
                  onClick={() => updateAnswers({ calorieRolloverEnabled: false })}
                  title="Keep Daily Targets Fixed"
                />
              </div>
            </div>
          )}

          {/* 28. COMPLETION READY */}
          {activeNodeId === "completion_ready" && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center mx-auto border border-[#2F7D16]/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                  Everything You Need for Healthier Living
                </h1>
                <p className="text-xs sm:text-sm text-nutri-secondary max-w-md mx-auto">
                  Your personalized food diary, macro targets, water &amp; sugar tracking, and AI Coach are ready.
                </p>
              </div>

              {finalizeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800">
                  {finalizeError}
                </div>
              )}

              <Button
                type="button"
                disabled={completing}
                onClick={handleFinalize}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-sm rounded-2xl shadow-md cursor-pointer"
              >
                {completing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving Your Plan...
                  </>
                ) : (
                  <>
                    Launch My Nutrition Tracker
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation Footer */}
      {activeNodeId !== "completion_ready" && (
        <div className="px-4 sm:px-6 py-3.5 border-t border-[#E5E7E2] bg-[#F7FAF4] flex items-center justify-between gap-3 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={safeIndex === 0 || isNavigating}
            onClick={handleBack}
            className="rounded-xl font-bold text-xs border-[#E5E7E2] text-nutri-charcoal disabled:opacity-40 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <Button
            type="button"
            disabled={isNavigating}
            onClick={handleNext}
            className="rounded-xl font-extrabold text-xs px-6 bg-[#2F7D16] hover:bg-[#24630F] text-white shadow-xs cursor-pointer"
          >
            {isNavigating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
