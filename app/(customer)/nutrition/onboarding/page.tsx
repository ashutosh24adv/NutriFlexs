import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/services/nutrition-onboarding.service";
import { NutritionOnboardingClient } from "@/components/nutrition/nutrition-onboarding-client";

export const metadata: Metadata = {
  title: "Personalized Nutrition Onboarding | NutriFlexs",
  description: "Answer a few questions to personalize your daily calorie and macronutrient targets.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    retake?: string;
    step?: string;
  };
}

export default async function NutritionOnboardingPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  // Unauthenticated guests must sign in first to personalize their nutrition account
  if (!userId) {
    redirect("/login?callbackUrl=" + encodeURIComponent("/nutrition/onboarding"));
  }

  const onboarding = await getUserOnboardingStatus(userId);
  const isRetake = searchParams?.retake === "true";

  // If already completed and not explicitly retaking, redirect to the nutrition dashboard
  if (onboarding?.hasCompleted && !isRetake) {
    redirect("/nutrition");
  }

  const initialStep = searchParams?.step
    ? parseInt(searchParams.step, 10)
    : (isRetake ? 1 : (onboarding?.currentStep || 1));

  return (
    <NutritionOnboardingClient
      initialStep={initialStep}
      initialData={onboarding?.savedData || null}
      isRetake={isRetake}
    />
  );
}

