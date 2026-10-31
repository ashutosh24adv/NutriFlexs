import { Metadata } from "next";
import { NutritionDashboard } from "@/components/nutrition/nutrition-dashboard";

export const metadata: Metadata = {
  title: "My Nutrition & Food Diary | NutriFlexs",
  description: "Track your daily calories, protein, carbs, and fats from NutriFlexs meals, homemade food, and custom dishes.",
};

export default function NutritionPage() {
  return <NutritionDashboard />;
}

