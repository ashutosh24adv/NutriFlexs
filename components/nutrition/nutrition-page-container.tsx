"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { NutritionDashboard } from "@/components/nutrition/nutrition-dashboard";
import { NutritionOnboarding } from "@/components/nutrition/nutrition-onboarding";
import { Loader2 } from "lucide-react";
import { OnboardingData } from "@/services/nutrition-onboarding.service";

export function NutritionPageContainer() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const retakeParam = searchParams.get("retake") === "true" || searchParams.get("onboarding") === "true";
  const stepParam = parseInt(searchParams.get("step") || "0", 10);

  const [loading, setLoading] = useState(true);
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [savedData, setSavedData] = useState<OnboardingData | null>(null);
  const [forceOnboarding, setForceOnboarding] = useState(retakeParam);

  useEffect(() => {
    async function checkOnboardingStatus() {
      if (status === "loading") return;

      if (status === "unauthenticated") {
        // Guests directly see the tracker in guest mode
        setHasCompleted(true);
        setLoading(false);
        return;
      }

      if (status === "authenticated") {
        try {
          const res = await fetch("/api/nutrition/onboarding", {
            cache: "no-store",
          });
          const data = await res.json();

          if (data.success) {
            setHasCompleted(Boolean(data.hasCompleted));
            setCurrentStep(data.currentStep || 1);
            setSavedData(data.savedData || null);
          } else {
            // Default to completed if error to avoid blocking the user
            setHasCompleted(true);
          }
        } catch (err) {
          console.error("Failed to check onboarding status:", err);
          setHasCompleted(true);
        } finally {
          setLoading(false);
        }
      }
    }

    checkOnboardingStatus();
  }, [status]);

  // Loading state with branded pulse
  if (loading || status === "loading") {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-nutri-green/10 flex items-center justify-center text-nutri-green animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-extrabold text-sm text-nutri-charcoal font-heading">Loading NutriFlexs Nutrition...</p>
          <p className="text-xs text-nutri-muted">Preparing your personalized dashboard</p>
        </div>
      </div>
    );
  }

  // If user has not completed onboarding, OR explicitly requested to retake/preview it
  const shouldShowOnboarding =
    (status === "authenticated" && (!hasCompleted || forceOnboarding)) ||
    forceOnboarding;

  if (shouldShowOnboarding) {
    return (
      <NutritionOnboarding
        initialStep={stepParam > 0 ? stepParam : (forceOnboarding ? 1 : currentStep)}
        initialData={savedData}
        onComplete={() => {
          setHasCompleted(true);
          setForceOnboarding(false);
        }}
        onExit={() => {
          setForceOnboarding(false);
          // If they hadn't completed before, allow viewing dashboard with default estimates
          setHasCompleted(true);
        }}
      />
    );
  }

  // Otherwise, render the full Nutrition Tracker Dashboard
  return (
    <NutritionDashboard
      onRetakeOnboarding={() => setForceOnboarding(true)}
    />
  );
}

