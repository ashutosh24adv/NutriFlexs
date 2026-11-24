import { z } from "zod";

export const MealTypeEnum = z.enum(["BREAKFAST", "LUNCH", "SNACKS", "DINNER"]);

export const addFoodLogSchema = z.object({
  foodItemId: z.string().uuid().optional().nullable(),
  foodVariantId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  foodName: z.string().min(1, "Food name is required").max(120),
  variantName: z.string().max(120).optional().nullable(),
  mealType: MealTypeEnum,
  quantity: z.number().positive("Quantity must be greater than 0").max(10000),
  unit: z.string().min(1).max(30),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  // Optional client nutrition hints - server will recalculate if foodItemId/productId present
  calories: z.number().min(0).max(20000).optional(),
  protein: z.number().min(0).max(2000).optional(),
  carbohydrates: z.number().min(0).max(2000).optional(),
  fat: z.number().min(0).max(2000).optional(),
  totalSugar: z.number().min(0).max(1000).optional().nullable(),
  addedSugar: z.number().min(0).max(1000).optional().nullable(),
});

export const updateFoodLogSchema = z.object({
  foodVariantId: z.string().uuid().optional().nullable(),
  variantName: z.string().max(120).optional().nullable(),
  quantity: z.number().positive("Quantity must be greater than 0").max(10000).optional(),
  unit: z.string().min(1).max(30).optional(),
  mealType: MealTypeEnum.optional(),
  calories: z.number().min(0).max(20000).optional(),
  protein: z.number().min(0).max(2000).optional(),
  carbohydrates: z.number().min(0).max(2000).optional(),
  fat: z.number().min(0).max(2000).optional(),
  totalSugar: z.number().min(0).max(1000).optional().nullable(),
  addedSugar: z.number().min(0).max(1000).optional().nullable(),
});

export const createCustomFoodSchema = z.object({
  name: z.string().min(2, "Food name must be at least 2 characters").max(100),
  category: z.string().min(1).max(50).default("Custom foods"),
  description: z.string().max(255).optional().nullable(),
  caloriesPer100g: z.number().min(0, "Calories cannot be negative").max(1500),
  protein: z.number().min(0, "Protein cannot be negative").max(100),
  carbohydrates: z.number().min(0, "Carbohydrates cannot be negative").max(100),
  fat: z.number().min(0, "Fat cannot be negative").max(100),
  totalSugar: z.number().min(0).max(100).optional().nullable(),
  addedSugar: z.number().min(0).max(100).optional().nullable(),
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
  waterGoalMl: z
    .number()
    .int()
    .min(500, "Water goal must be at least 500 ml")
    .max(15000, "Water goal cannot exceed 15,000 ml")
    .nullable()
    .optional(),
  sugarTarget: z
    .number()
    .min(0, "Sugar target cannot be negative")
    .max(500, "Sugar target cannot exceed 500g")
    .nullable()
    .optional(),
  addedSugarTarget: z
    .number()
    .min(0, "Added sugar target cannot be negative")
    .max(500, "Added sugar target cannot exceed 500g")
    .nullable()
    .optional(),
});

export const logWaterSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  amountMl: z
    .number()
    .int()
    .min(1, "Water amount must be at least 1 ml")
    .max(10000, "Single water entry cannot exceed 10,000 ml"),
});

export const updateWaterGoalSchema = z.object({
  waterGoalMl: z
    .number()
    .int()
    .min(500, "Water goal must be at least 500 ml")
    .max(15000, "Water goal cannot exceed 15,000 ml"),
});

export const updateSugarGoalSchema = z.object({
  sugarTarget: z
    .number()
    .min(0, "Sugar target cannot be negative")
    .max(500, "Sugar target cannot exceed 500g"),
  addedSugarTarget: z
    .number()
    .min(0, "Added sugar target cannot be negative")
    .max(500, "Added sugar target cannot exceed 500g")
    .optional(),
});

export type LogWaterInput = z.infer<typeof logWaterSchema>;
export type UpdateWaterGoalInput = z.infer<typeof updateWaterGoalSchema>;
export type UpdateSugarGoalInput = z.infer<typeof updateSugarGoalSchema>;

export type AddFoodLogInput = z.infer<typeof addFoodLogSchema>;
export type UpdateFoodLogInput = z.infer<typeof updateFoodLogSchema>;
export type CreateCustomFoodInput = z.infer<typeof createCustomFoodSchema>;
export type UpdateNutritionGoalInput = z.infer<typeof updateNutritionGoalSchema>;

