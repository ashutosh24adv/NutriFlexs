import { prisma } from "@/lib/prisma";

export type BmiCategory = "UNDERWEIGHT" | "NORMAL" | "OVERWEIGHT" | "OBESITY";

export interface BmiResult {
  bmi: number;
  category: BmiCategory;
  categoryLabel: string;
}

export function calculateBmi(heightCm: number, weightKg: number): BmiResult {
  const rawBmi = (weightKg * 10000) / (heightCm * heightCm);
  const bmi = Math.round(rawBmi * 10) / 10;

  let category: BmiCategory;
  let categoryLabel: string;

  if (bmi < 18.5) {
    category = "UNDERWEIGHT";
    categoryLabel = "Underweight";
  } else if (bmi < 25.0) {
    category = "NORMAL";
    categoryLabel = "Normal";
  } else if (bmi < 30.0) {
    category = "OVERWEIGHT";
    categoryLabel = "Overweight";
  } else {
    category = "OBESITY";
    categoryLabel = "Obesity";
  }

  return { bmi, category, categoryLabel };
}

export async function getRecommendations(heightCm: number, weightKg: number) {
  // Validate human boundaries
  if (
    typeof heightCm !== "number" ||
    isNaN(heightCm) ||
    heightCm < 80 ||
    heightCm > 260 ||
    typeof weightKg !== "number" ||
    isNaN(weightKg) ||
    weightKg < 20 ||
    weightKg > 350
  ) {
    throw new Error("Please enter a valid height and weight.");
  }

  const { bmi, category, categoryLabel } = calculateBmi(heightCm, weightKg);

  // Query actual available products from Neon PostgreSQL
  const products = await prisma.product.findMany({
    where: { isAvailable: true },
    include: {
      category: true,
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  // Rank products based on BMI category
  const ranked = [...products].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    switch (category) {
      case "UNDERWEIGHT":
        // Prioritize higher-calorie + protein-rich dense fuel
        scoreA = a.calories * 1.0 + a.protein * 12;
        scoreB = b.calories * 1.0 + b.protein * 12;
        break;

      case "NORMAL":
        // Balanced options: balanced calories + good protein
        scoreA = a.protein * 10 + (a.calories >= 140 && a.calories <= 450 ? 80 : 0);
        scoreB = b.protein * 10 + (b.calories >= 140 && b.calories <= 450 ? 80 : 0);
        break;

      case "OVERWEIGHT":
        // Prioritize: high-protein, relatively lower-calorie, lighter options
        scoreA =
          ((a.protein * 100) / Math.max(a.calories, 1)) * 10 +
          (a.calories <= 320 ? 50 : 0) -
          (a.calories > 350 ? 40 : 0);
        scoreB =
          ((b.protein * 100) / Math.max(b.calories, 1)) * 10 +
          (b.calories <= 320 ? 50 : 0) -
          (b.calories > 350 ? 40 : 0);
        break;

      case "OBESITY":
        // Lower calorie, high protein density & light refreshing options
        scoreA =
          ((a.protein * 100) / Math.max(a.calories, 1)) * 12 +
          (a.calories <= 220 ? 80 : 0) -
          (a.calories > 300 ? 100 : 0);
        scoreB =
          ((b.protein * 100) / Math.max(b.calories, 1)) * 12 +
          (b.calories <= 220 ? 80 : 0) -
          (b.calories > 300 ? 100 : 0);
        break;
    }

    return scoreB - scoreA;
  });

  // Return top 3-4 products
  const topProducts = ranked.slice(0, 4);

  return {
    bmi,
    category,
    categoryLabel,
    products: topProducts,
  };
}
