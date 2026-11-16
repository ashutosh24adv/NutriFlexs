"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { NutritionOnboarding } from "@/components/nutrition/nutrition-onboarding";
import { OnboardingData } from "@/services/nutrition-onboarding.service";

interface NutritionOnboardingClientProps {
  initialStep: number;
  initialData: OnboardingData | null;
  isRetake?: boolean;
}

export function NutritionOnboardingClient({
  initialStep,
  initialData,
  isRetake = false,
}: NutritionOnboardingClientProps) {
  const router = useRouter();

  return (
    <div className="h-full w-full flex items-center justify-center p-2 sm:p-4 md:p-6 bg-nutri-bg overflow-hidden">
      <div className="w-full max-w-3xl h-full max-h-[720px] sm:max-h-[750px] md:max-h-[780px] flex flex-col">
        <NutritionOnboarding
          initialStep={initialStep}
          initialData={initialData}
          onComplete={() => {
            router.refresh();
            router.replace("/nutrition");
          }}
          onExit={() => {
            router.push("/home");
          }}
        />
      </div>
    </div>
  );
}

