import { z } from "zod";

export const MealTypeEnum = z.enum([
  "BREAKFAST",
  "LUNCH",
  "SNACKS",
  "DINNER",
  "POST_WORKOUT",
]);

export const addFoodLogSchema = z.object({
  foodItemId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  foodName: z.string().min(1, "Food name is required").max(120),
  mealType: MealTypeEnum,
  quantity: z.number().positive("Quantity must be greater than 0").max(10000),
  unit: z.string().min(1).max(30),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  // Optional client nutrition hints - server will recalculate if foodItemId/productId present
  calories: z.number().min(0).max(20000).optional(),
  protein: z.number().min(0).max(2000).optional(),
  carbohydrates: z.number().min(0).max(2000).optional(),
  fat: z.number().min(0).max(2000).optional(),
});

export const updateFoodLogSchema = z.object({
  quantity: z.number().positive("Quantity must be greater than 0").max(10000).optional(),
  unit: z.string().min(1).max(30).optional(),
  mealType: MealTypeEnum.optional(),
  calories: z.number().min(0).max(20000).optional(),
  protein: z.number().min(0).max(2000).optional(),
  carbohydrates: z.number().min(0).max(2000).optional(),
  fat: z.number().min(0).max(2000).optional(),
});

export const createCustomFoodSchema = z.object({
  name: z.string().min(2, "Food name must be at least 2 characters").max(100),
  category: z.string().min(1).max(50).default("Custom foods"),
  description: z.string().max(255).optional().nullable(),
  caloriesPer100g: z.number().min(0, "Calories cannot be negative").max(1500),
  protein: z.number().min(0, "Protein cannot be negative").max(100),
  carbohydrates: z.number().min(0, "Carbohydrates cannot be negative").max(100),
  fat: z.number().min(0, "Fat cannot be negative").max(100),
  defaultServingSize: z.number().positive().default(1),
  defaultServingUnit: z.string().min(1).max(30).default("serving"),
  servingWeightGrams: z.number().positive().max(5000).default(100),
});

export const updateNutritionGoalSchema = z.object({
  dailyCalorieGoal: z
    .number()
    .int()
    .min(500, "Calorie goal must be at least 500 kcal")
    .max(10000, "Calorie goal cannot exceed 10,000 kcal")
    .nullable()
    .optional(),
  proteinGoal: z
    .number()
    .min(0, "Protein goal cannot be negative")
    .max(600, "Protein goal cannot exceed 600g")
    .nullable()
    .optional(),
  carbohydrateGoal: z
    .number()
    .min(0, "Carbohydrate goal cannot be negative")
    .max(1500, "Carbohydrate goal cannot exceed 1500g")
    .nullable()
    .optional(),
  fatGoal: z
    .number()
    .min(0, "Fat goal cannot be negative")
    .max(500, "Fat goal cannot exceed 500g")
    .nullable()
    .optional(),
});

export const logWaterSchema = z.object({
  amountMl: z.number().int().min(50, "Minimum 50ml").max(5000, "Maximum 5000ml per entry"),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
});

export const logWeightSchema = z.object({
  weightKg: z.number().min(20, "Weight must be at least 20kg").max(350, "Weight cannot exceed 350kg"),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  note: z.string().max(200).optional().nullable(),
});

export const onboardingGoalCalculationSchema = z.object({
  weightKg: z.number().min(20).max(350),
  heightCm: z.number().min(50).max(280),
  ageYears: z.number().int().min(10).max(120),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  activityLevel: z.enum([
    "SEDENTARY",
    "LIGHTLY_ACTIVE",
    "MODERATELY_ACTIVE",
    "VERY_ACTIVE",
    "EXTRA_ACTIVE",
  ]),
  goal: z.enum(["FAT_LOSS", "MAINTAIN", "MUSCLE_BUILD"]),
});

export type AddFoodLogInput = z.infer<typeof addFoodLogSchema>;
export type UpdateFoodLogInput = z.infer<typeof updateFoodLogSchema>;
export type CreateCustomFoodInput = z.infer<typeof createCustomFoodSchema>;
export type UpdateNutritionGoalInput = z.infer<typeof updateNutritionGoalSchema>;
export type LogWaterInput = z.infer<typeof logWaterSchema>;
export type LogWeightInput = z.infer<typeof logWeightSchema>;
export type OnboardingGoalCalculationInput = z.infer<typeof onboardingGoalCalculationSchema>;
