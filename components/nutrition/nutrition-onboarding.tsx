"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
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
  ChevronRight,
  Shield,
  Layers,
  Info,
  Loader2,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  OnboardingData,
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

const TOTAL_QUESTION_STEPS = 14;

export function NutritionOnboarding({
  initialStep = 1,
  initialData = null,
  onComplete,
  onExit,
}: NutritionOnboardingProps) {
  const router = useRouter();

  // Current Step: 1-14 are questions, 15 is Summary, 16 is Hold, 17 is Notification, 18 is Rollover, 19 is Benefits
  const [currentStep, setCurrentStep] = useState<number>(initialStep || 1);
  const [savingProgress, setSavingProgress] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<OnboardingData>({
    gender: initialData?.gender || initialData?.sex || null,
    sex: initialData?.gender || initialData?.sex || null,
    birthDate: initialData?.birthDate || "1998-05-15",
    heightCm: initialData?.heightCm || 172,
    heightUnit: initialData?.heightUnit || "cm",
    weightKg: initialData?.weightKg || 68,
    weightUnit: initialData?.weightUnit || "kg",
    workoutFrequency: initialData?.workoutFrequency || "3_4_sessions",
    dietitianConsultation: initialData?.dietitianConsultation || "no",
    primaryGoal: initialData?.primaryGoal || "improve_fitness",
    desiredGoalTarget: initialData?.desiredGoalTarget || { targetWeightKg: 65, habitsTarget: "Hit daily protein goal consistently" },
    desiredTimelineWeeks: initialData?.desiredTimelineWeeks || 12,
    preferredPace: initialData?.preferredPace || "moderate",
    challenges: initialData?.challenges || ["Difficulty tracking calories"],
    challengesOther: initialData?.challengesOther || "",
    dietPreference: initialData?.dietPreference || "non_vegetarian",
    desiredOutcomes: initialData?.desiredOutcomes || [
      "Understand my daily calorie intake",
      "Eat more protein",
      "Track Indian homemade meals",
    ],
    calorieRolloverEnabled: initialData?.calorieRolloverEnabled || false,
    notificationsEnabled: initialData?.notificationsEnabled || false,
  });

  // Dual unit height temporary state for ft/in
  const [feet, setFeet] = useState(() => {
    const totalInches = (initialData?.heightCm || 172) / 2.54;
    return Math.floor(totalInches / 12);
  });
  const [inches, setInches] = useState(() => {
    const totalInches = (initialData?.heightCm || 172) / 2.54;
    return Math.round(totalInches % 12);
  });

  // Dual unit weight temporary state for lbs
  const [weightLbs, setWeightLbs] = useState(() => {
    return Math.round((initialData?.weightKg || 68) * 2.20462);
  });

  // Calculated estimates
  const [calculatedTargets, setCalculatedTargets] = useState<CalculatedNutritionTargets>(() =>
    calculateNutritionTargets(formData)
  );

  // Hold-to-continue interaction state
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef(false);

  // Keep targets synchronized with answers
  useEffect(() => {
    const updated = calculateNutritionTargets(formData);
    setCalculatedTargets(updated);
  }, [formData]);

  // Save partial progress to server
  const persistProgress = async (stepToSave: number, updatedData: OnboardingData) => {
    try {
      await fetch("/api/nutrition/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: stepToSave,
          data: updatedData,
        }),
      });
    } catch (err) {
      console.warn("Failed to persist onboarding progress:", err);
    }
  };

  const getStepValidationError = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!formData.gender && !formData.sex) {
          return "Please select your gender or choose 'Prefer not to say' to continue.";
        }
        return null;
      case 2:
        if (!formData.birthDate) {
          return "Please enter your date of birth.";
        }
        const age = calculateAge(formData.birthDate);
        if (age < 14 || age > 100) {
          return "Please enter a valid birth date (age between 14 and 100 years).";
        }
        return null;
      case 3:
        if (!formData.heightCm || isNaN(formData.heightCm) || formData.heightCm < 60 || formData.heightCm > 260) {
          return "Please enter a valid height between 60 cm and 260 cm.";
        }
        return null;
      case 4:
        if (!formData.weightKg || isNaN(formData.weightKg) || formData.weightKg < 25 || formData.weightKg > 350) {
          return "Please enter a valid weight between 25 kg and 350 kg.";
        }
        return null;
      case 5:
        if (!formData.workoutFrequency) {
          return "Please select your weekly workout frequency.";
        }
        return null;
      case 6:
        if (!formData.dietitianConsultation) {
          return "Please select an option or click Skip.";
        }
        return null;
      case 7:
        if (!formData.primaryGoal) {
          return "Please select your primary nutrition goal.";
        }
        return null;
      case 8:
        if (
          formData.primaryGoal === "lose_weight" ||
          formData.primaryGoal === "build_muscle" ||
          (formData.primaryGoal as string) === "gain_weight_build_muscle"
        ) {
          const tw = formData.desiredGoalTarget?.targetWeightKg;
          if (tw === undefined || tw === null || isNaN(tw) || tw < 25 || tw > 350) {
            return "Please enter a valid target weight between 25 kg and 350 kg.";
          }
          return null;
        }
        if (formData.primaryGoal === "improve_fitness" || formData.primaryGoal === "healthier_habits") {
          if (!formData.desiredGoalTarget?.habitsTarget && !formData.desiredGoalTarget?.fitnessTarget) {
            return "Please select your primary daily focus habit.";
          }
          return null;
        }
        return null;
      case 9:
        return null; // Feasibility review step
      case 10:
        if (!formData.desiredTimelineWeeks) {
          return "Please select your target timeline.";
        }
        return null;
      case 11:
        if (!formData.preferredPace) {
          return "Please select your preferred progression pace.";
        }
        return null;
      case 12:
        if ((!formData.challenges || formData.challenges.length === 0) && !formData.challengesOther) {
          return "Please select at least one challenge or click Skip.";
        }
        return null;
      case 13:
        if (!formData.dietPreference) {
          return "Please select your dietary preference.";
        }
        return null;
      case 14:
        if (!formData.desiredOutcomes || formData.desiredOutcomes.length === 0) {
          return "Please select at least one outcome you'd like to achieve.";
        }
        return null;
      default:
        return null;
    }
  };

  const isStepValid = (step: number): boolean => {
    return getStepValidationError(step) === null;
  };

  const handleNext = () => {
    if (isNavigatingRef.current) return;

    const error = getStepValidationError(currentStep);
    if (error) {
      setStepError(error);
      return;
    }

    setStepError(null);
    isNavigatingRef.current = true;
    setIsNavigating(true);

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    // Save in background
    persistProgress(nextStep, formData);

    setTimeout(() => {
      isNavigatingRef.current = false;
      setIsNavigating(false);
    }, 250);
  };

  const handleSkip = () => {
    if (isNavigatingRef.current) return;
    setStepError(null);
    isNavigatingRef.current = true;
    setIsNavigating(true);

    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);

    persistProgress(nextStep, formData);

    setTimeout(() => {
      isNavigatingRef.current = false;
      setIsNavigating(false);
    }, 250);
  };

  const handleBack = () => {
    if (isNavigatingRef.current) return;
    setStepError(null);

    if (currentStep > 1) {
      isNavigatingRef.current = true;
      setIsNavigating(true);

      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);

      persistProgress(prevStep, formData);

      setTimeout(() => {
        isNavigatingRef.current = false;
        setIsNavigating(false);
      }, 250);
    } else if (onExit) {
      onExit();
    }
  };

  const handleSaveAndExit = async () => {
    try {
      setSavingProgress(true);
      await fetch("/api/nutrition/onboarding/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: currentStep,
          data: formData,
        }),
      });
    } catch (err) {
      console.warn("Failed to persist onboarding on save & exit:", err);
    } finally {
      setSavingProgress(false);
      if (onExit) {
        onExit();
      } else {
        router.push("/nutrition");
      }
    }
  };

  const updateField = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setStepError(null);
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "gender") {
        (updated as any).sex = value;
      } else if (field === "sex") {
        (updated as any).gender = value;
      }
      return updated;
    });
  };

  const handlePrimaryGoalChange = (newGoal: any) => {
    setStepError(null);
    setFormData((prev) => {
      const currentWeight = prev.weightKg || 68;
      let newTarget = { ...(prev.desiredGoalTarget || {}) };

      if (newGoal === "lose_weight") {
        if (!newTarget.targetWeightKg || newTarget.targetWeightKg >= currentWeight) {
          newTarget.targetWeightKg = Math.max(25, Math.round(currentWeight - 4));
        }
      } else if (newGoal === "build_muscle" || newGoal === "gain_weight_build_muscle") {
        if (!newTarget.targetWeightKg || newTarget.targetWeightKg <= currentWeight) {
          newTarget.targetWeightKg = Math.min(350, Math.round(currentWeight + 3));
        }
        newTarget.muscleTarget = newTarget.muscleTarget || "Build lean muscle & increase strength";
      } else if (newGoal === "maintain") {
        newTarget.targetWeightKg = currentWeight;
      } else {
        newTarget.habitsTarget = newTarget.habitsTarget || "Hit daily protein goal consistently";
      }

      return {
        ...prev,
        primaryGoal: newGoal,
        desiredGoalTarget: newTarget,
      };
    });
  };

  // Unit converters
  const handleHeightUnitChange = (newUnit: "cm" | "ft") => {
    if (newUnit === formData.heightUnit) return;
    if (newUnit === "ft") {
      const totalInches = (formData.heightCm || 170) / 2.54;
      setFeet(Math.floor(totalInches / 12));
      setInches(Math.round(totalInches % 12));
    } else {
      const cm = Math.round((feet * 12 + inches) * 2.54);
      updateField("heightCm", cm);
    }
    updateField("heightUnit", newUnit);
  };

  const handleWeightUnitChange = (newUnit: "kg" | "lbs") => {
    if (newUnit === formData.weightUnit) return;
    if (newUnit === "lbs") {
      setWeightLbs(Math.round((formData.weightKg || 70) * 2.20462));
    } else {
      const kg = Math.round(weightLbs / 2.20462);
      updateField("weightKg", kg);
    }
    updateField("weightUnit", newUnit);
  };

  // Hold-to-continue handler
  const startHold = () => {
    setIsHolding(true);
    setHoldProgress(0);
    const start = Date.now();
    const duration = 1400; // 1.4 seconds smooth hold

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        setIsHolding(false);
        finalizeOnboarding();
      }
    }, 25);
  };

  const cancelHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  // Finalize onboarding on server
  const finalizeOnboarding = async () => {
    try {
      setCompleting(true);
      setFinalizeError(null);
      const res = await fetch("/api/nutrition/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save final nutrition targets");
      }

      // Proceed to post-onboarding introduction screens
      setCurrentStep(17); // Notifications step
    } catch (err: any) {
      console.error("Onboarding finalization error:", err);
      setFinalizeError(err.message || "Failed to save your nutrition profile. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  // Notification request
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          updateField("notificationsEnabled", true);
        }
      } catch (e) {
        console.warn("Notification permission error:", e);
      }
    }
    handleNext(); // Move to rollover step
  };

  const finishAllAndEnterTracker = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push("/nutrition");
    }
  };

  // Progress Bar percentage
  const progressPercent = Math.min(
    100,
    currentStep <= TOTAL_QUESTION_STEPS
      ? Math.round((currentStep / TOTAL_QUESTION_STEPS) * 100)
      : 100
  );

  return (
    <div className="h-full w-full bg-white rounded-2xl sm:rounded-3xl border border-nutri-border shadow-float flex flex-col justify-between overflow-hidden text-nutri-charcoal selection:bg-nutri-green/20">
      {/* 1. TOP BRAND HEADER & PROGRESS BAR (Compact: ~52px) */}
      <header className="shrink-0 bg-white border-b border-nutri-border z-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-12 sm:h-13 flex items-center justify-between">
          <div className="flex items-center">
            <NutriFlexsLogo size="sm" showTagline={true} />
          </div>

          <div className="flex items-center gap-2.5">
            {currentStep <= TOTAL_QUESTION_STEPS && (
              <span className="text-[11px] font-bold text-nutri-muted bg-nutri-bg px-2 py-0.5 rounded-md">
                Step {currentStep} of {TOTAL_QUESTION_STEPS}
              </span>
            )}

            <button
              type="button"
              disabled={savingProgress || isNavigating}
              onClick={handleSaveAndExit}
              className="text-xs font-bold text-nutri-secondary hover:text-nutri-charcoal px-2.5 py-1 rounded-lg hover:bg-nutri-bg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {savingProgress ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-nutri-green" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save &amp; Exit</span>
              )}
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        {currentStep <= TOTAL_QUESTION_STEPS && (
          <div className="w-full bg-nutri-border h-1.5 overflow-hidden">
            <div
              className="bg-nutri-green h-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </header>

      {/* 2. MAIN ONBOARDING QUESTION CONTENT (Scrolls only if viewport is tiny, otherwise fits fully) */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-3.5 sm:py-5 flex flex-col justify-center max-w-2xl w-full mx-auto">
        {/* =========================================================================
            STEP 1: GENDER (3 Options -> 3 Column Grid on sm+)
        ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 1 · GENDER
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                What is your gender?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Gender influences resting metabolic rate and baseline caloric expenditure formulas. You can skip this question if you prefer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                { value: "male", label: "Male", desc: "Standard male resting energy baseline", icon: "👨" },
                { value: "female", label: "Female", desc: "Standard female resting energy baseline", icon: "👩" },
                { value: "prefer_not_to_say", label: "Prefer not to say", desc: "Balanced gender-neutral energy baseline", icon: "✨" },
              ].map((opt) => {
                const isSelected = formData.gender === opt.value || formData.sex === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("gender", opt.value as any)}
                    className={cn(
                      "w-full p-3 sm:p-3.5 rounded-2xl border text-left transition-all flex sm:flex-col sm:justify-between items-center sm:items-start justify-between cursor-pointer gap-2",
                      isSelected
                        ? "bg-nutri-green-light border-nutri-green shadow-2xs ring-1 ring-nutri-green"
                        : "bg-white border-nutri-border hover:border-nutri-green/50 hover:bg-nutri-bg/50"
                    )}
                  >
                    <div className="flex items-center sm:justify-between w-full gap-2">
                      <span className="text-xl p-1.5 rounded-xl bg-nutri-bg shrink-0">{opt.icon}</span>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-auto sm:ml-0",
                          isSelected ? "border-nutri-green bg-nutri-green text-white" : "border-nutri-border"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-xs sm:text-sm text-nutri-charcoal">{opt.label}</h3>
                      <p className="text-[10px] sm:text-[11px] text-nutri-muted mt-0.5 line-clamp-2">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: DATE OF BIRTH
        ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 2 · METABOLIC AGE
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                When were you born?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Age affects basal energy consumption and daily protein synthesis requirements. We derive age securely on the server.
              </p>
            </div>

            <Card className="p-4 sm:p-5 rounded-2xl border border-nutri-border bg-white shadow-2xs space-y-3">
              <label htmlFor="birthdate-input" className="block text-[11px] font-bold text-nutri-charcoal uppercase tracking-wider">
                Select Your Date of Birth
              </label>
              <div className="relative">
                <input
                  id="birthdate-input"
                  type="date"
                  value={formData.birthDate || ""}
                  max={new Date().toISOString().split("T")[0]}
                  min="1930-01-01"
                  onChange={(e) => updateField("birthDate", e.target.value)}
                  className="w-full h-11 bg-nutri-bg border border-nutri-border focus:border-nutri-green focus:bg-white rounded-xl px-3.5 text-sm font-bold text-nutri-charcoal outline-hidden transition-all"
                />
              </div>

              {formData.birthDate && (
                <div className="p-2.5 bg-nutri-green-light border border-nutri-border-light rounded-xl text-xs font-medium text-nutri-charcoal flex items-center gap-2">
                  <Activity className="w-4 h-4 text-nutri-green shrink-0" />
                  <span>Calculated age: <strong>{calculateAge(formData.birthDate)} years old</strong></span>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* =========================================================================
            STEP 3: HEIGHT
        ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 3 · STATURE
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                How tall are you?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Your height is used alongside weight to evaluate body surface area and basal energy expenditure.
              </p>
            </div>

            <Card className="p-4 sm:p-5 rounded-2xl border border-nutri-border bg-white shadow-2xs space-y-3">
              {/* Unit Toggle */}
              <div className="flex justify-end">
                <div className="inline-flex bg-nutri-bg p-1 rounded-xl border border-nutri-border text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleHeightUnitChange("cm")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all cursor-pointer",
                      formData.heightUnit === "cm" ? "bg-white text-nutri-charcoal shadow-2xs" : "text-nutri-muted"
                    )}
                  >
                    Centimetres (cm)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHeightUnitChange("ft")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all cursor-pointer",
                      formData.heightUnit === "ft" ? "bg-white text-nutri-charcoal shadow-2xs" : "text-nutri-muted"
                    )}
                  >
                    Feet &amp; Inches (ft/in)
                  </button>
                </div>
              </div>

              {formData.heightUnit === "cm" ? (
                <div className="space-y-1.5">
                  <label htmlFor="height-cm" className="block text-[11px] font-bold text-nutri-charcoal uppercase tracking-wider">
                    Height in Centimetres
                  </label>
                  <div className="relative">
                    <input
                      id="height-cm"
                      type="number"
                      min="90"
                      max="250"
                      value={formData.heightCm || ""}
                      onChange={(e) => updateField("heightCm", Number(e.target.value))}
                      placeholder="172"
                      className="w-full h-11 bg-nutri-bg border border-nutri-border focus:border-nutri-green focus:bg-white rounded-xl px-3.5 text-base font-extrabold text-nutri-charcoal outline-hidden transition-all pr-12"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                      cm
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-nutri-charcoal uppercase tracking-wider">
                      Feet
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="8"
                      value={feet}
                      onChange={(e) => {
                        const newFt = Number(e.target.value);
                        setFeet(newFt);
                        updateField("heightCm", Math.round((newFt * 12 + inches) * 2.54));
                      }}
                      className="w-full h-11 bg-nutri-bg border border-nutri-border focus:border-nutri-green focus:bg-white rounded-xl px-3.5 text-base font-extrabold text-nutri-charcoal outline-hidden transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-nutri-charcoal uppercase tracking-wider">
                      Inches
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={inches}
                      onChange={(e) => {
                        const newIn = Number(e.target.value);
                        setInches(newIn);
                        updateField("heightCm", Math.round((feet * 12 + newIn) * 2.54));
                      }}
                      className="w-full h-11 bg-nutri-bg border border-nutri-border focus:border-nutri-green focus:bg-white rounded-xl px-3.5 text-base font-extrabold text-nutri-charcoal outline-hidden transition-all"
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* =========================================================================
            STEP 4: CURRENT WEIGHT
        ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 4 · BODY MASS
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                What&apos;s your current weight?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Body weight changes naturally week to week. You can adjust this anytime in your profile settings.
              </p>
            </div>

            <Card className="p-4 sm:p-5 rounded-2xl border border-nutri-border bg-white shadow-2xs space-y-3">
              <div className="flex justify-end">
                <div className="inline-flex bg-nutri-bg p-1 rounded-xl border border-nutri-border text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleWeightUnitChange("kg")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all cursor-pointer",
                      formData.weightUnit === "kg" ? "bg-white text-nutri-charcoal shadow-2xs" : "text-nutri-muted"
                    )}
                  >
                    Kilograms (kg)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWeightUnitChange("lbs")}
                    className={cn(
                      "px-3 py-1 rounded-lg transition-all cursor-pointer",
                      formData.weightUnit === "lbs" ? "bg-white text-nutri-charcoal shadow-2xs" : "text-nutri-muted"
                    )}
                  >
                    Pounds (lbs)
                  </button>
                </div>
              </div>

              {formData.weightUnit === "kg" ? (
                <div className="space-y-1.5">
                  <label htmlFor="weight-kg" className="block text-[11px] font-bold text-nutri-charcoal uppercase tracking-wider">
                    Weight in Kilograms
                  </label>
                  <div className="relative">
                    <input
                      id="weight-kg"
                      type="number"
                      step="0.1"
                      min="30"
                      max="300"
                      value={formData.weightKg || ""}
                      onChange={(e) => updateField("weightKg", Number(e.target.value))}
                      placeholder="68"
                      className="w-full h-11 bg-nutri-bg border border-nutri-border focus:border-nutri-green focus:bg-white rounded-xl px-3.5 text-base font-extrabold text-nutri-charcoal outline-hidden transition-all pr-12"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                      kg
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="weight-lbs" className="block text-[11px] font-bold text-nutri-charcoal uppercase tracking-wider">
                    Weight in Pounds
                  </label>
                  <div className="relative">
                    <input
                      id="weight-lbs"
                      type="number"
                      step="0.5"
                      min="60"
                      max="650"
                      value={weightLbs}
                      onChange={(e) => {
                        const lbs = Number(e.target.value);
                        setWeightLbs(lbs);
                        updateField("weightKg", Math.round(lbs / 2.20462));
                      }}
                      placeholder="150"
                      className="w-full h-11 bg-nutri-bg border border-nutri-border focus:border-nutri-green focus:bg-white rounded-xl px-3.5 text-base font-extrabold text-nutri-charcoal outline-hidden transition-all pr-12"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                      lbs
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* =========================================================================
            STEP 5: WORKOUT FREQUENCY (5 Options -> Session-based wording)
        ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 5 · ACTIVITY
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                How many times do you work out?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Choose the workout sessions per week that best match your routine. This scales your Total Daily Energy Expenditure (TDEE).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                {
                  value: "0_sessions",
                  legacyValue: "none",
                  label: "0 sessions per week",
                  desc: "Sedentary routine or starting fresh",
                  icon: "🛋️",
                },
                {
                  value: "1_2_sessions",
                  legacyValue: "1_2_sessions",
                  label: "1–2 sessions per week",
                  desc: "Light exercise or active walks",
                  icon: "🚶",
                },
                {
                  value: "3_4_sessions",
                  legacyValue: "0_4_days",
                  label: "3–4 sessions per week",
                  desc: "Consistent moderate training sessions",
                  icon: "🏃",
                },
                {
                  value: "5_6_sessions",
                  legacyValue: "4_6_days",
                  label: "5–6 sessions per week",
                  desc: "Regular gym workouts or sports training",
                  icon: "🏋️",
                },
                {
                  value: "7_plus_sessions",
                  legacyValue: "7_plus_days",
                  label: "7+ sessions per week",
                  desc: "High volume or multi-session weekly training",
                  icon: "⚡",
                },
              ].map((opt, idx) => {
                const isSelected =
                  formData.workoutFrequency === opt.value ||
                  formData.workoutFrequency === opt.legacyValue;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("workoutFrequency", opt.value as any)}
                    className={cn(
                      "w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer gap-2.5",
                      idx === 4 ? "sm:col-span-2" : "",
                      isSelected
                        ? "bg-nutri-green-light border-nutri-green shadow-2xs ring-1 ring-nutri-green"
                        : "bg-white border-nutri-border hover:border-nutri-green/50 hover:bg-nutri-bg/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl p-1.5 rounded-xl bg-nutri-bg shrink-0">{opt.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-xs sm:text-sm text-nutri-charcoal truncate">{opt.label}</h3>
                        <p className="text-[10px] sm:text-[11px] text-nutri-muted truncate mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                        isSelected ? "border-nutri-green bg-nutri-green text-white" : "border-nutri-border"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 6: REGISTERED DIETITIAN CONSULTATION (4 Options -> 2 Column Grid)
        ========================================================================= */}
        {currentStep === 6 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 6 · PROFESSIONAL GUIDANCE
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                Have you ever consulted a registered dietitian?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                This optional background question helps us tailor the depth of educational guidance we provide.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                { value: "yes", label: "Yes, in the past", desc: "Familiar with calorie counts & macros", icon: "📋" },
                { value: "no", label: "No, never", desc: "New to structured meal logging", icon: "🌱" },
                { value: "currently", label: "Currently consulting one", desc: "Following a professional protocol", icon: "🩺" },
                { value: "prefer_not_to_say", label: "Prefer not to say", desc: "Keep health history private", icon: "🔒" },
              ].map((opt) => {
                const isSelected = formData.dietitianConsultation === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("dietitianConsultation", opt.value as any)}
                    className={cn(
                      "w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer gap-2.5",
                      isSelected
                        ? "bg-nutri-green-light border-nutri-green shadow-2xs ring-1 ring-nutri-green"
                        : "bg-white border-nutri-border hover:border-nutri-green/50 hover:bg-nutri-bg/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl p-1.5 rounded-xl bg-nutri-bg shrink-0">{opt.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-xs sm:text-sm text-nutri-charcoal truncate">{opt.label}</h3>
                        <p className="text-[10px] sm:text-[11px] text-nutri-muted truncate mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                        isSelected ? "border-nutri-green bg-nutri-green text-white" : "border-nutri-border"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 7: PRIMARY GOAL (Target)
        ========================================================================= */}
        {currentStep === 7 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 7 · PRIMARY FOCUS
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                What is your target?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Select your main nutrition goal. NutriFlexs will calculate an appropriate daily energy and macro profile.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                {
                  value: "lose_weight",
                  label: "Lose Weight",
                  desc: "Safe fat loss while keeping muscle",
                  icon: "🔥",
                },
                {
                  value: "maintain",
                  label: "Maintain Current Weight",
                  desc: "Optimal daily balance without changes",
                  icon: "⚖️",
                },
                {
                  value: "improve_fitness",
                  label: "Improve Fitness & Body Composition",
                  desc: "Build endurance, tone, and feel energetic",
                  icon: "⚡",
                },
                {
                  value: "build_muscle",
                  label: "Gain Weight & Build Muscle",
                  desc: "Increase muscle mass with a controlled calorie surplus and adequate protein intake.",
                  icon: "💪",
                },
                {
                  value: "healthier_habits",
                  label: "Develop Healthy Habits",
                  desc: "Balance macros and track Indian home meals cleanly",
                  icon: "🥗",
                },
              ].map((opt, idx) => {
                const isSelected =
                  formData.primaryGoal === opt.value ||
                  (opt.value === "build_muscle" && (formData.primaryGoal as string) === "gain_weight_build_muscle");
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handlePrimaryGoalChange(opt.value as any)}
                    className={cn(
                      "w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer gap-2.5",
                      idx === 4 ? "sm:col-span-2" : "",
                      isSelected
                        ? "bg-nutri-green-light border-nutri-green shadow-2xs ring-1 ring-nutri-green"
                        : "bg-white border-nutri-border hover:border-nutri-green/50 hover:bg-nutri-bg/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl p-1.5 rounded-xl bg-nutri-bg shrink-0">{opt.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-xs sm:text-sm text-nutri-charcoal truncate">{opt.label}</h3>
                        <p className="text-[10px] sm:text-[11px] text-nutri-muted truncate mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                        isSelected ? "border-nutri-green bg-nutri-green text-white" : "border-nutri-border"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 8: DESIRED GOAL TARGET (Contextualized)
        ========================================================================= */}
        {currentStep === 8 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                {formData.primaryGoal === "lose_weight"
                  ? "STEP 8 · WEIGHT LOSS TARGET"
                  : formData.primaryGoal === "build_muscle" || (formData.primaryGoal as string) === "gain_weight_build_muscle"
                  ? "STEP 8 · MUSCLE BUILDING TARGET"
                  : formData.primaryGoal === "maintain"
                  ? "STEP 8 · WEIGHT MAINTENANCE"
                  : "STEP 8 · FOCUS HABIT"}
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                {formData.primaryGoal === "lose_weight"
                  ? "What is your target weight?"
                  : formData.primaryGoal === "build_muscle" || (formData.primaryGoal as string) === "gain_weight_build_muscle"
                  ? "What is your target weight for muscle gain?"
                  : formData.primaryGoal === "maintain"
                  ? "Confirm your maintenance target"
                  : "What habit milestone matters most?"}
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                {formData.primaryGoal === "build_muscle" || (formData.primaryGoal as string) === "gain_weight_build_muscle"
                  ? "Building lean muscle requires a controlled calorie surplus and sufficient protein. Set your target weight."
                  : formData.primaryGoal === "lose_weight"
                  ? "Specific milestones keep your daily tracking meaningful. We will calculate a safe, sustainable calorie deficit."
                  : formData.primaryGoal === "maintain"
                  ? "Keep your weight stable while improving energy, stamina, and workout recovery."
                  : "Specific milestones keep your daily tracking meaningful. You can adjust this anytime."}
              </p>
            </div>

            <Card className="p-4 sm:p-5 rounded-2xl border border-nutri-border bg-white shadow-2xs space-y-3">
              {formData.primaryGoal === "lose_weight" ||
              formData.primaryGoal === "build_muscle" ||
              (formData.primaryGoal as string) === "gain_weight_build_muscle" ? (
                <div className="space-y-2.5">
                  <label htmlFor="target-weight" className="block text-[11px] font-bold text-nutri-charcoal uppercase tracking-wider">
                    {formData.primaryGoal === "lose_weight" ? "Target Weight (kg)" : "Target Weight for Muscle Gain (kg)"}
                  </label>
                  <div className="relative">
                    <input
                      id="target-weight"
                      type="number"
                      step="any"
                      min="25"
                      max="350"
                      value={formData.desiredGoalTarget?.targetWeightKg ?? ""}
                      onChange={(e) => {
                        setStepError(null);
                        const val = e.target.value === "" ? null : Number(e.target.value);
                        updateField("desiredGoalTarget", {
                          ...formData.desiredGoalTarget,
                          targetWeightKg: val,
                        });
                      }}
                      placeholder={
                        formData.primaryGoal === "lose_weight"
                          ? `${Math.max(30, (formData.weightKg || 68) - 4)}`
                          : `${(formData.weightKg || 68) + 3}`
                      }
                      className="w-full h-11 bg-nutri-bg border border-nutri-border focus:border-nutri-green focus:bg-white rounded-xl px-3.5 text-base font-extrabold text-nutri-charcoal outline-hidden transition-all pr-12"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                      kg
                    </span>
                  </div>

                  {formData.weightKg && formData.desiredGoalTarget?.targetWeightKg && (
                    <div className="p-2.5 bg-nutri-green-light rounded-xl text-xs font-medium text-nutri-charcoal flex items-center justify-between border border-nutri-border-light">
                      <span>Current: <strong>{formData.weightKg} kg</strong></span>
                      <span>
                        Delta:{" "}
                        <strong>
                          {Math.abs(formData.weightKg - formData.desiredGoalTarget.targetWeightKg).toFixed(1)} kg
                        </strong>{" "}
                        {formData.desiredGoalTarget.targetWeightKg < formData.weightKg
                          ? "to lose"
                          : formData.desiredGoalTarget.targetWeightKg > formData.weightKg
                          ? "to gain"
                          : "maintenance"}
                      </span>
                    </div>
                  )}
                </div>
              ) : formData.primaryGoal === "maintain" ? (
                <div className="p-3.5 bg-nutri-bg rounded-xl border border-nutri-border space-y-1.5">
                  <p className="font-bold text-xs sm:text-sm text-nutri-charcoal">Steady Maintenance Strategy</p>
                  <p className="text-xs text-nutri-muted leading-relaxed">
                    We will calculate balanced daily calories to keep you right around <strong>{formData.weightKg || 68} kg</strong>, accounting for daily metabolic fluctuations.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-nutri-charcoal uppercase tracking-wider">
                    Primary Daily Focus
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      "Hit daily protein goal consistently",
                      "Log lunch & dinner Indian curries accurately",
                      "Avoid afternoon energy crashes & sugar spikes",
                      "Tone up and build functional strength",
                    ].map((habit) => (
                      <button
                        key={habit}
                        type="button"
                        onClick={() => {
                          setStepError(null);
                          updateField("desiredGoalTarget", {
                            ...formData.desiredGoalTarget,
                            habitsTarget: habit,
                          });
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer",
                          formData.desiredGoalTarget?.habitsTarget === habit
                            ? "bg-nutri-green-light border-nutri-green text-nutri-green"
                            : "bg-nutri-bg border-nutri-border text-nutri-charcoal hover:bg-white"
                        )}
                      >
                        {habit}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* =========================================================================
            STEP 9: GOAL FEASIBILITY (Compact 2-Column Review Grid)
        ========================================================================= */}
        {currentStep === 9 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 9 · TRANSPARENT FEASIBILITY
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                Let&apos;s check whether your goal is realistic.
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                We believe in honest, evidence-based nutrition. We never promise overnight transformations or dangerous deficits.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* BMI Card */}
              {calculatedTargets.bmi && (
                <Card className="p-3.5 sm:p-4 rounded-2xl border border-nutri-border bg-white shadow-2xs space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-nutri-muted uppercase tracking-wider">Body Mass Index</span>
                      <Badge variant="gold" className="text-[10px] font-extrabold py-0.5">
                        {calculatedTargets.bmiCategory}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-nutri-charcoal font-heading">
                        {calculatedTargets.bmi}
                      </span>
                      <span className="text-xs text-nutri-muted">kg/m²</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-nutri-muted leading-tight pt-1">
                    *BMI is an approximate weight-to-height ratio baseline.
                  </p>
                </Card>
              )}

              {/* Feasibility Assessment Card */}
              <Card
                className={cn(
                  "p-3.5 sm:p-4 rounded-2xl border shadow-2xs space-y-2 flex flex-col justify-between",
                  calculatedTargets.isSafeGoal
                    ? "bg-nutri-green-light/70 border-nutri-green/30 text-nutri-charcoal"
                    : "bg-amber-50 border-amber-300 text-amber-900"
                )}
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {calculatedTargets.isSafeGoal ? (
                      <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <h3 className="font-extrabold text-xs sm:text-sm">
                      {calculatedTargets.isSafeGoal ? "Sustainable Goal" : "Pace Adjustment Recommended"}
                    </h3>
                  </div>
                  <p className="text-[11px] leading-snug line-clamp-2">
                    {calculatedTargets.feasibilityAssessment.safetyNote}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-black/10 text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-black/60 block">Projected Pace</span>
                    <span className="font-extrabold">~{calculatedTargets.feasibilityAssessment.weeklyChangeKg} kg/wk</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-black/60 block">Recommended</span>
                    <span className="font-extrabold">{calculatedTargets.feasibilityAssessment.recommendedTimelineWeeks} Weeks</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 10: DESIRED TIMELINE (3 Options -> 3 Column Grid)
        ========================================================================= */}
        {currentStep === 10 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 10 · TIMEFRAME
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                When would you like to achieve your goal?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Setting a target duration anchors your consistency. Safe, steady progress yields lasting habits.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                { weeks: 8, label: "8 Weeks", sublabel: "Short-term momentum & habit building" },
                { weeks: 12, label: "12 Weeks (Recommended)", sublabel: "Optimal duration for body recomposition" },
                { weeks: 24, label: "24 Weeks", sublabel: "Long-term sustainable transformation" },
              ].map((opt) => {
                const isSelected = formData.desiredTimelineWeeks === opt.weeks;
                return (
                  <button
                    key={opt.weeks}
                    type="button"
                    onClick={() => updateField("desiredTimelineWeeks", opt.weeks)}
                    className={cn(
                      "w-full p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer gap-2",
                      isSelected
                        ? "bg-nutri-green-light border-nutri-green shadow-2xs ring-1 ring-nutri-green"
                        : "bg-white border-nutri-border hover:border-nutri-green/50 hover:bg-nutri-bg/50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <h3 className="font-extrabold text-xs sm:text-sm text-nutri-charcoal">{opt.label}</h3>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                          isSelected ? "border-nutri-green bg-nutri-green text-white" : "border-nutri-border"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-nutri-muted line-clamp-2">{opt.sublabel}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 11: PREFERRED PACE (3 Options -> 3 Column Grid)
        ========================================================================= */}
        {currentStep === 11 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 11 · PROGRESSION SPEED
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                How quickly would you like to progress?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Even with aggressive preferences, we enforce strict physiological safety floors to prevent nutritional deficiencies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {(formData.primaryGoal === "build_muscle" || (formData.primaryGoal as string) === "gain_weight_build_muscle"
                ? [
                    { value: "slow", label: "Slow & steady", desc: "Lean surplus (~200 kcal). Minimizes fat gain while building muscle." },
                    { value: "moderate", label: "Moderate (Recommended)", desc: "Optimal hypertrophy surplus (~350 kcal) with high protein." },
                    { value: "fast", label: "Fast & focused", desc: "High calorie surplus (~500 kcal) for aggressive muscle gain." },
                  ]
                : formData.primaryGoal === "maintain" || formData.primaryGoal === "improve_fitness" || formData.primaryGoal === "healthier_habits"
                ? [
                    { value: "slow", label: "Gentle rhythm", desc: "Small sustainable adjustments with zero disruption to your lifestyle." },
                    { value: "moderate", label: "Steady (Recommended)", desc: "Balanced daily energy targets with optimal recovery and tone." },
                    { value: "fast", label: "Active focus", desc: "Targeted macro tracking with consistent protein milestones." },
                  ]
                : [
                    { value: "slow", label: "Slow & steady", desc: "Gentle ~250 kcal adjustment. Minimal hunger, maximum consistency." },
                    { value: "moderate", label: "Moderate (Recommended)", desc: "Standard ~400 kcal deficit. Balanced and effective." },
                    { value: "fast", label: "Fast & focused", desc: "Safe ~550 kcal deficit with strict safe calorie floors." },
                  ]
              ).map((opt) => {
                const isSelected = formData.preferredPace === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("preferredPace", opt.value as any)}
                    className={cn(
                      "w-full p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer gap-2",
                      isSelected
                        ? "bg-nutri-green-light border-nutri-green shadow-2xs ring-1 ring-nutri-green"
                        : "bg-white border-nutri-border hover:border-nutri-green/50 hover:bg-nutri-bg/50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <h3 className="font-extrabold text-xs sm:text-sm text-nutri-charcoal">{opt.label}</h3>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                          isSelected ? "border-nutri-green bg-nutri-green text-white" : "border-nutri-border"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-nutri-muted line-clamp-2">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 12: CHALLENGES (8 Options -> 2 Column Grid)
        ========================================================================= */}
        {currentStep === 12 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 12 · OBSTACLES
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                What&apos;s stopping you from reaching your goal?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Select all that apply. Knowing your sticking points helps us simplify your daily diary workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                "Lack of consistency",
                "Lack of time",
                "Difficulty tracking calories",
                "Unhealthy food habits",
                "Difficulty maintaining a diet",
                "Lack of motivation",
                "Unclear nutrition information",
                "Other",
              ].map((item) => {
                const currentChallenges = formData.challenges || [];
                const isSelected = currentChallenges.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? currentChallenges.filter((c) => c !== item)
                        : [...currentChallenges, item];
                      updateField("challenges", updated);
                    }}
                    className={cn(
                      "p-2.5 sm:p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer gap-2",
                      isSelected
                        ? "bg-nutri-green-light border-nutri-green text-nutri-charcoal shadow-2xs ring-1 ring-nutri-green"
                        : "bg-white border-nutri-border text-nutri-secondary hover:bg-nutri-bg"
                    )}
                  >
                    <span className="truncate">{item}</span>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                        isSelected ? "bg-nutri-green border-nutri-green text-white" : "border-nutri-border"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {formData.challenges?.includes("Other") && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Tell us more about what you find challenging..."
                  value={formData.challengesOther || ""}
                  onChange={(e) => updateField("challengesOther", e.target.value)}
                  className="w-full h-10 bg-white border border-nutri-border rounded-xl px-3 text-xs text-nutri-charcoal focus:border-nutri-green outline-hidden"
                />
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STEP 13: DIET PREFERENCES (5 Options -> 2 Column Grid)
        ========================================================================= */}
        {currentStep === 13 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 13 · DIETARY PATTERN
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                Do you follow a specific diet?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                This filters recipe suggestions and configures Vegetarian Mode on the food ordering menu.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {[
                { value: "vegetarian", label: "Vegetarian", desc: "Plant-based with dairy & legumes", icon: "🌿" },
                { value: "eggetarian", label: "Eggetarian", desc: "Vegetarian diet + eggs & whites", icon: "🍳" },
                { value: "vegan", label: "Vegan", desc: "100% plant-based, zero dairy", icon: "🌱" },
                { value: "non_vegetarian", label: "Non-vegetarian", desc: "Chicken, fish, eggs, whole foods", icon: "🍗" },
                { value: "no_specific", label: "No specific diet", desc: "Flexible omnivore diet", icon: "🍽️" },
              ].map((opt, idx) => {
                const isSelected = formData.dietPreference === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateField("dietPreference", opt.value as any)}
                    className={cn(
                      "w-full p-2.5 sm:p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer gap-2.5",
                      idx === 4 ? "sm:col-span-2" : "",
                      isSelected
                        ? "bg-nutri-green-light border-nutri-green shadow-2xs ring-1 ring-nutri-green"
                        : "bg-white border-nutri-border hover:border-nutri-green/50 hover:bg-nutri-bg/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl p-1.5 rounded-xl bg-nutri-bg shrink-0">{opt.icon}</span>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-xs sm:text-sm text-nutri-charcoal truncate">{opt.label}</h3>
                        <p className="text-[10px] sm:text-[11px] text-nutri-muted truncate mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                        isSelected ? "border-nutri-green bg-nutri-green text-white" : "border-nutri-border"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 14: DESIRED OUTCOMES (10 Options -> 2 Column Grid)
        ========================================================================= */}
        {currentStep === 14 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1 sm:space-y-1.5">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 14 · DESIRED OUTCOMES
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                What would you like to accomplish with NutriFlexs?
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Select the key features that matter most for your dashboard layout.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                "Understand daily calorie intake",
                "Eat more protein",
                "Build muscle",
                "Lose weight safely",
                "Maintain my weight",
                "Eat healthier",
                "Improve my consistency",
                "Understand my food habits",
                "Track Indian homemade meals",
                "Discover healthier food options",
              ].map((outcome) => {
                const currentOutcomes = formData.desiredOutcomes || [];
                const isSelected = currentOutcomes.includes(outcome);
                return (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => {
                      const updated = isSelected
                        ? currentOutcomes.filter((o) => o !== outcome)
                        : [...currentOutcomes, outcome];
                      updateField("desiredOutcomes", updated);
                    }}
                    className={cn(
                      "p-2.5 sm:p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer gap-2",
                      isSelected
                        ? "bg-nutri-green-light border-nutri-green text-nutri-charcoal shadow-2xs ring-1 ring-nutri-green"
                        : "bg-white border-nutri-border text-nutri-secondary hover:bg-nutri-bg"
                    )}
                  >
                    <span className="truncate">{outcome}</span>
                    <div
                      className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                        isSelected ? "bg-nutri-green border-nutri-green text-white" : "border-nutri-border"
                      )}
                    >
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 15: THANK YOU & PLAN SUMMARY
        ========================================================================= */}
        {currentStep === 15 && (
          <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-300">
            <div className="text-center space-y-1 max-w-lg mx-auto">
              <div className="w-10 h-10 rounded-2xl bg-nutri-green-light text-nutri-green mx-auto flex items-center justify-center text-xl shadow-2xs">
                ✨
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                Thank You for Sharing!
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Your answers help us make your nutrition journey personal.
              </p>
            </div>

            <Card className="p-4 sm:p-5 rounded-2xl border border-nutri-border bg-white shadow-float space-y-3.5">
              <div className="flex items-center justify-between border-b border-nutri-border pb-2.5">
                <div>
                  <span className="text-[9px] font-bold text-nutri-green uppercase tracking-wider block">
                    Personalized Baseline
                  </span>
                  <h3 className="font-extrabold text-sm text-nutri-charcoal">Daily Nutrition Blueprint</h3>
                </div>
                <Badge variant="green" className="text-[10px] font-bold">
                  Science-Backed
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-nutri-bg rounded-xl text-center space-y-0.5">
                  <span className="text-[9px] font-bold text-nutri-muted uppercase">Daily Calories</span>
                  <p className="text-lg font-extrabold text-nutri-charcoal font-heading">
                    {calculatedTargets.dailyCalories}
                  </p>
                  <span className="text-[9px] text-nutri-secondary">kcal / day</span>
                </div>

                <div className="p-2.5 bg-nutri-green-light rounded-xl text-center space-y-0.5 border border-nutri-border-light">
                  <span className="text-[9px] font-bold text-nutri-green uppercase">Daily Protein</span>
                  <p className="text-lg font-extrabold text-nutri-green font-heading">
                    {calculatedTargets.proteinGrams}g
                  </p>
                  <span className="text-[9px] text-nutri-green font-semibold">~1.9g / kg</span>
                </div>

                <div className="p-2.5 bg-amber-50 rounded-xl text-center space-y-0.5 border border-amber-100">
                  <span className="text-[9px] font-bold text-amber-700 uppercase">Carbohydrates</span>
                  <p className="text-lg font-extrabold text-amber-900 font-heading">
                    {calculatedTargets.carbsGrams}g
                  </p>
                  <span className="text-[9px] text-amber-700">energy balance</span>
                </div>

                <div className="p-2.5 bg-indigo-50 rounded-xl text-center space-y-0.5 border border-indigo-100">
                  <span className="text-[9px] font-bold text-indigo-700 uppercase">Fats</span>
                  <p className="text-lg font-extrabold text-indigo-900 font-heading">
                    {calculatedTargets.fatGrams}g
                  </p>
                  <span className="text-[9px] text-indigo-700">hormone health</span>
                </div>
              </div>

              <div className="p-3 bg-nutri-bg rounded-xl border border-nutri-border text-[11px] text-nutri-muted leading-relaxed space-y-0.5">
                <p className="font-bold text-nutri-charcoal flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-nutri-green" /> How we estimated this
                </p>
                <p>
                  Calculated using Mifflin-St Jeor based on {formData.weightKg} kg, {formData.heightCm} cm, and your activity level. You can adjust targets anytime in settings.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(14)}
                  className="w-1/3 py-2.5 text-xs font-bold border-nutri-border text-nutri-secondary hover:text-nutri-charcoal cursor-pointer rounded-xl"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  size="md"
                  onClick={() => setCurrentStep(16)}
                  className="flex-1 bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Build My Nutrition Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* =========================================================================
            STEP 16: HOLD-TO-CONTINUE ANIMATION
        ========================================================================= */}
        {currentStep === 16 && (
          <div className="space-y-4 text-center max-w-sm mx-auto animate-in fade-in duration-300">
            <div className="space-y-1">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                STEP 16 · FINALIZING
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                Hold to personalize your experience
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Press and hold the circle below to sync your personalized goals.
              </p>
            </div>

            {/* Interactive Hold Circle */}
            <div className="py-3 flex flex-col items-center justify-center">
              <div
                role="button"
                tabIndex={0}
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                className={cn(
                  "relative w-28 h-28 rounded-full flex flex-col items-center justify-center select-none cursor-pointer transition-transform duration-150 active:scale-95",
                  isHolding ? "shadow-float" : "shadow-xs"
                )}
              >
                {/* SVG Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="text-nutri-border stroke-current"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="48"
                    className="text-nutri-green stroke-current transition-all duration-75"
                    strokeWidth="6"
                    strokeDasharray={301.6}
                    strokeDashoffset={301.6 - (301.6 * holdProgress) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="relative z-10 text-center space-y-0.5">
                  {completing ? (
                    <Loader2 className="w-6 h-6 text-nutri-green animate-spin mx-auto" />
                  ) : (
                    <Sparkles
                      className={cn(
                        "w-6 h-6 mx-auto transition-colors",
                        isHolding ? "text-nutri-green scale-110" : "text-nutri-muted"
                      )}
                    />
                  )}
                  <span className="text-[10px] font-extrabold text-nutri-charcoal uppercase tracking-wider block">
                    {isHolding ? `${Math.round(holdProgress)}%` : "Hold Here"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-nutri-muted mt-2">
                {isHolding ? "Saving your nutrition profile..." : "Touch & hold for 1.4 seconds"}
              </p>

              {/* Error message if finalization fails */}
              {finalizeError && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between gap-2 max-w-sm">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span className="text-left font-medium">{finalizeError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={finalizeOnboarding}
                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-[10px] shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Prominent Tap Alternative & Back Button */}
              <div className="pt-3 flex flex-col gap-2 w-full max-w-xs mx-auto">
                <Button
                  type="button"
                  disabled={completing}
                  onClick={finalizeOnboarding}
                  className="w-full bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs sm:text-sm py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {completing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue &amp; Save Plan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={completing}
                  onClick={() => setCurrentStep(15)}
                  className="w-full text-xs font-bold border-nutri-border text-nutri-secondary hover:text-nutri-charcoal py-2 rounded-xl cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Summary
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 17: NOTIFICATION PERMISSION
        ========================================================================= */}
        {currentStep === 17 && (
          <div className="space-y-3.5 text-center max-w-sm mx-auto animate-in fade-in duration-300">
            <div className="w-10 h-10 rounded-2xl bg-nutri-green-light text-nutri-green mx-auto flex items-center justify-center text-xl shadow-2xs">
              <Bell className="w-5 h-5 text-nutri-green" />
            </div>

            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                Stay on Track with Reminders
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Get helpful prompts for logging meals and celebrating daily protein milestones.
              </p>
            </div>

            <Card className="p-3.5 sm:p-4 rounded-2xl border border-nutri-border bg-white shadow-2xs space-y-2 text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
                <span className="text-xs text-nutri-charcoal font-medium">Gentle meal reminder post-workout</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
                <span className="text-xs text-nutri-charcoal font-medium">Daily protein streak milestone celebrations</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
                <span className="text-xs text-nutri-charcoal font-medium">Zero spam or marketing alerts</span>
              </div>
            </Card>

            <div className="space-y-2 pt-1">
              <Button
                size="md"
                onClick={requestNotificationPermission}
                className="w-full bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs sm:text-sm py-2.5 rounded-xl shadow-xs cursor-pointer"
              >
                Enable Notifications
              </Button>

              <div className="flex items-center justify-between pt-1 px-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(16)}
                  className="text-xs font-bold text-nutri-secondary hover:text-nutri-charcoal cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="text-xs font-bold text-nutri-muted hover:text-nutri-charcoal cursor-pointer"
                >
                  Maybe Later →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 18: CALORIE ROLLOVER INTRODUCTION
        ========================================================================= */}
        {currentStep === 18 && (
          <div className="space-y-3.5 max-w-lg mx-auto animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                FLEXIBILITY FEATURE
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                Your Nutrition Goals, With Flexibility
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                Life isn&apos;t identical every day. Roll over unused calories into a weekend buffer.
              </p>
            </div>

            <Card className="p-4 sm:p-5 rounded-2xl border border-nutri-border bg-white shadow-2xs space-y-3">
              <div className="p-3 bg-nutri-green-soft rounded-xl border border-nutri-border flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-nutri-green shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <h4 className="font-extrabold text-nutri-charcoal">How Calorie Rollover Works</h4>
                  <p className="text-nutri-secondary leading-relaxed">
                    If you eat slightly under your daily goal on weekdays, bank up to 200 unused calories per day into a weekend feast allowance.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-nutri-muted">
                <p className="font-bold text-nutri-charcoal">Important Safety Principles:</p>
                <div className="flex items-start gap-1.5">
                  <span className="text-nutri-green font-bold">•</span>
                  <span>Rollover is 100% optional and can be toggled anytime in settings.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-nutri-green font-bold">•</span>
                  <span>Never skip meals to hoard calories. Safe daily minimums are always enforced.</span>
                </div>
              </div>

              <div className="pt-2 border-t border-nutri-border flex items-center justify-between">
                <span className="text-xs font-bold text-nutri-charcoal">
                  Enable Calorie Rollover Buffer
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(formData.calorieRolloverEnabled)}
                  onChange={(e) => updateField("calorieRolloverEnabled", e.target.checked)}
                  className="w-4 h-4 text-nutri-green accent-nutri-green rounded-md cursor-pointer"
                />
              </div>
            </Card>

            <div className="pt-2 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(17)}
                className="w-1/3 py-2 text-xs font-bold border-nutri-border text-nutri-secondary hover:text-nutri-charcoal cursor-pointer rounded-xl"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
              </Button>
              <Button
                size="md"
                onClick={handleNext}
                className="flex-1 bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs sm:text-sm py-2.5 rounded-xl shadow-xs cursor-pointer"
              >
                Continue to Overview →
              </Button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 19: BENEFITS OF NUTRIFLEXS & LAUNCH
        ========================================================================= */}
        {currentStep === 19 && (
          <div className="space-y-3.5 max-w-lg mx-auto animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <Badge variant="green" className="text-[10px] font-bold px-2.5 py-0.5 tracking-wider">
                ONE UNIFIED PLATFORM
              </Badge>
              <h1 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                Everything You Need for Healthier Living
              </h1>
              <p className="text-xs text-nutri-secondary leading-normal">
                NutriFlexs connects gym-adjacent clean food with precision Indian calorie tracking.
              </p>
            </div>

            {/* Dual Mode Cards */}
            <div className="space-y-2.5">
              <Card className="p-3 sm:p-3.5 rounded-xl border border-nutri-border bg-white shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-nutri-green">
                  <Utensils className="w-3.5 h-3.5" />
                  <span className="font-extrabold text-[11px] uppercase tracking-wider">MODE 1 · ORDER FOOD</span>
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-nutri-charcoal">Fresh Food Kiosks at Partner Gyms</h3>
                <p className="text-[11px] text-nutri-muted leading-relaxed">
                  High-protein meals and organic cold presses ready in 5 minutes after your workout.
                </p>
              </Card>

              <Card className="p-3 sm:p-3.5 rounded-xl border border-nutri-border bg-white shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-nutri-green">
                  <Flame className="w-3.5 h-3.5" />
                  <span className="font-extrabold text-[11px] uppercase tracking-wider">MODE 2 · TRACK NUTRITION</span>
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-nutri-charcoal">Smart Indian Food Diary &amp; AI Scanning</h3>
                <p className="text-[11px] text-nutri-muted leading-relaxed">
                  Log home curries with gravy vs solid precision, scan plates with AI, and track calories effortlessly.
                </p>
              </Card>
            </div>

            <div className="text-center pt-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(18)}
                  className="w-1/3 py-3 text-xs font-bold border-nutri-border text-nutri-secondary hover:text-nutri-charcoal cursor-pointer rounded-xl"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
                </Button>
                <Button
                  size="md"
                  onClick={finishAllAndEnterTracker}
                  className="flex-1 bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs sm:text-sm py-3 rounded-xl shadow-float cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Enter NutriFlexs Tracker</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Validation Error Alert */}
        {stepError && (
          <div className="mt-3.5 p-3 bg-red-50 border border-red-200/90 rounded-xl text-red-800 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-bold">{stepError}</span>
          </div>
        )}
      </main>

      {/* 3. BOTTOM STICKY NAVIGATION BAR (Steps 1 to 14) (Compact: ~52px) */}
      {currentStep <= TOTAL_QUESTION_STEPS && (
        <footer className="shrink-0 bg-white border-t border-nutri-border py-2.5 sm:py-3 px-4 sm:px-6 z-20">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || isNavigating}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer",
                currentStep === 1 || isNavigating
                  ? "text-nutri-border cursor-not-allowed opacity-50"
                  : "text-nutri-secondary hover:text-nutri-charcoal hover:bg-nutri-bg"
              )}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2.5">
              {/* Optional Skip button for non-mandatory questions */}
              {(currentStep === 1 || currentStep === 6 || currentStep === 8 || currentStep === 12) && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isNavigating}
                  className="text-xs font-bold text-nutri-muted hover:text-nutri-charcoal px-2.5 py-1.5 cursor-pointer disabled:opacity-50"
                >
                  Skip
                </button>
              )}

              <Button
                size="sm"
                onClick={handleNext}
                disabled={isNavigating}
                className={cn(
                  "font-extrabold text-xs px-5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer",
                  "bg-nutri-green hover:bg-nutri-green-dark text-white",
                  isNavigating && "opacity-75 cursor-wait"
                )}
              >
                {isNavigating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
