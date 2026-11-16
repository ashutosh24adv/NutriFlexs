import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserOnboardingStatus } from "@/services/nutrition-onboarding.service";
import { NutritionDashboard } from "@/components/nutrition/nutrition-dashboard";

export const metadata: Metadata = {
  title: "My Nutrition & Food Diary | NutriFlexs",
  description: "Track your daily calories, protein, carbs, and fats from NutriFlexs meals, homemade food, and custom dishes.",
};

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  // 1. Server-side authentication guard: Unauthenticated visitors MUST be redirected to login
  if (!session || !userId) {
    redirect("/login?callbackUrl=" + encodeURIComponent("/nutrition"));
  }

  // 2. Server-side onboarding completion check in Neon PostgreSQL
  const onboarding = await getUserOnboardingStatus(userId);
  if (!onboarding || !onboarding.hasCompleted) {
    redirect("/nutrition/onboarding");
  }

  // Authenticated customers who have completed onboarding see their tracker
  return <NutritionDashboard />;
}
