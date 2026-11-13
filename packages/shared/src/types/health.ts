/**
 * Health Integrations Domain Types (Apple Health, Health Connect, Samsung Health)
 */

export type HealthPlatform = "APPLE_HEALTH" | "HEALTH_CONNECT" | "SAMSUNG_HEALTH";

export type HealthDataType =
  | "STEPS"
  | "ACTIVE_ENERGY"
  | "DISTANCE"
  | "HEART_RATE"
  | "WORKOUT"
  | "WEIGHT";

export interface HealthConnectionState {
  id: string;
  userId: string;
  platform: HealthPlatform;
  grantedDataTypes: HealthDataType[];
  isConnected: boolean;
  lastSyncAt?: string | Date | null;
}

export interface HealthDailySummaryDomain {
  id?: string;
  userId: string;
  dateKey: string; // YYYY-MM-DD
  steps: number;
  activeCaloriesBurned: number;
  restingHeartRate?: number | null;
  avgHeartRate?: number | null;
  distanceMeters?: number | null;
  source: HealthPlatform;
  syncedAt: string | Date;
}

export interface HealthSampleDomain {
  id?: string;
  userId: string;
  type: HealthDataType;
  startTime: string | Date;
  endTime: string | Date;
  value: number;
  unit: string;
  sourceApp?: string | null;
  externalId?: string | null;
}

export interface WaterLogDomain {
  id: string;
  userId: string;
  amountMl: number;
  dateKey: string;
  loggedAt: string | Date;
}

export interface WeightLogDomain {
  id: string;
  userId: string;
  weightKg: number;
  dateKey: string;
  note?: string | null;
  loggedAt: string | Date;
}
