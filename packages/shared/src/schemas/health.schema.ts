import { z } from "zod";

export const HealthPlatformEnum = z.enum([
  "APPLE_HEALTH",
  "HEALTH_CONNECT",
  "SAMSUNG_HEALTH",
]);

export const HealthDataTypeEnum = z.enum([
  "STEPS",
  "ACTIVE_ENERGY",
  "DISTANCE",
  "HEART_RATE",
  "WORKOUT",
  "WEIGHT",
]);

export const connectHealthSchema = z.object({
  platform: HealthPlatformEnum,
  grantedDataTypes: z.array(HealthDataTypeEnum).min(1, "At least one permission must be granted"),
});

export type ConnectHealthInput = z.infer<typeof connectHealthSchema>;

export const syncHealthDailySummarySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  steps: z.number().int().min(0).max(200000),
  activeCaloriesBurned: z.number().min(0).max(20000),
  restingHeartRate: z.number().int().min(30).max(250).optional().nullable(),
  avgHeartRate: z.number().int().min(30).max(250).optional().nullable(),
  distanceMeters: z.number().min(0).max(500000).optional().nullable(),
  source: HealthPlatformEnum,
});

export type SyncHealthDailySummaryInput = z.infer<typeof syncHealthDailySummarySchema>;

export const syncHealthSampleItemSchema = z.object({
  type: HealthDataTypeEnum,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  value: z.number(),
  unit: z.string().min(1).max(20),
  sourceApp: z.string().max(100).optional().nullable(),
  externalId: z.string().max(255).optional().nullable(),
});

export const syncHealthBatchSchema = z.object({
  platform: HealthPlatformEnum,
  summaries: z.array(syncHealthDailySummarySchema).optional().default([]),
  samples: z.array(syncHealthSampleItemSchema).optional().default([]),
});

export type SyncHealthBatchInput = z.infer<typeof syncHealthBatchSchema>;

export const disconnectHealthSchema = z.object({
  platform: HealthPlatformEnum,
  deleteSyncedData: z.boolean().default(false),
});

export type DisconnectHealthInput = z.infer<typeof disconnectHealthSchema>;
