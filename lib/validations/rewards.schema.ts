import { z } from "zod";
import { RewardActivityType } from "@prisma/client";

export const redeemRewardSchema = z.object({
  rewardId: z.string().uuid("Invalid reward ID"),
});

export const adminUpdateRuleSchema = z.object({
  activityType: z.nativeEnum(RewardActivityType),
  points: z.number().int().min(0).max(1000).optional(),
  enabled: z.boolean().optional(),
  rupeesPerPoint: z.number().int().min(1).max(1000).optional(),
});

export const adminCatalogueItemSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(240),
  pointsRequired: z.number().int().min(10).max(100000),
  discountAmount: z.number().int().min(1).max(10000),
  minimumOrderValue: z.number().int().min(0).max(50000),
  enabled: z.boolean().default(true),
  expiryDays: z.number().int().min(1).max(365).default(30),
});

export const adminAdjustPointsSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  pointsDelta: z
    .number()
    .int()
    .refine((v) => v !== 0 && Math.abs(v) <= 50000, {
      message: "Point adjustment must be non-zero and within ±50,000 FP",
    }),
  reason: z
    .string()
    .trim()
    .min(5, "A clear audit reason (min 5 chars) is required")
    .max(300),
});
