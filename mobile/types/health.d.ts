// Type declarations for native health integrations: Apple HealthKit & Android Health Connect

declare module 'react-native-health' {
  export interface HealthValue {
    value: number;
    startDate: string;
    endDate: string;
  }

  export interface HealthKitPermissions {
    permissions: {
      read: string[];
      write: string[];
    };
  }

  export interface HealthInputOptions {
    startDate?: string;
    endDate?: string;
    date?: string;
    limit?: number;
    ascending?: boolean;
    type?: string;
    includeManuallyAdded?: boolean;
  }

  export interface HealthKit {
    Constants: {
      Permissions: {
        StepCount: string;
        DistanceWalkingRunning: string;
        ActiveEnergyBurned: string;
        BasalEnergyBurned: string;
        HeartRate: string;
        Workout: string;
        Water: string;
        EnergyConsumed: string;
      };
    };
    initHealthKit(
      permissions: HealthKitPermissions,
      callback: (error: string | null, result: boolean) => void
    ): void;
    getStepCount(
      options: HealthInputOptions,
      callback: (err: string | null, results: HealthValue) => void
    ): void;
    getActiveEnergyBurned(
      options: HealthInputOptions,
      callback: (err: string | null, results: HealthValue[]) => void
    ): void;
    getBasalEnergyBurned(
      options: HealthInputOptions,
      callback: (err: string | null, results: HealthValue[]) => void
    ): void;
    getHeartRateSamples(
      options: HealthInputOptions,
      callback: (err: string | null, results: HealthValue[]) => void
    ): void;
    getSamples(
      options: HealthInputOptions,
      callback: (err: string | null, results: any[]) => void
    ): void;
    saveFood?(
      options: any,
      callback: (err: string | null, result: boolean) => void
    ): void;
    saveWater?(
      options: any,
      callback: (err: string | null, result: boolean) => void
    ): void;
  }

  const AppleHealthKit: HealthKit;
  export default AppleHealthKit;
}

declare module 'react-native-health-connect' {
  export enum SdkAvailabilityStatus {
    SDK_UNAVAILABLE = 1,
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 2,
    SDK_AVAILABLE = 3,
  }

  export interface Permission {
    accessType: 'read' | 'write';
    recordType: string;
  }

  export interface TimeRangeFilter {
    operator: 'between' | 'after' | 'before';
    startTime: string;
    endTime?: string;
  }

  export interface RecordMetadata {
    id?: string;
    dataOrigin?: string;
    lastModifiedTime?: string;
    clientRecordId?: string;
    clientRecordVersion?: number;
    device?: any;
  }

  export interface StepsRecord {
    count: number;
    startTime: string;
    endTime: string;
    metadata?: RecordMetadata;
  }

  export interface ActiveCaloriesBurnedRecord {
    energy: {
      inKilocalories: number;
      inCalories?: number;
      inJoules?: number;
      inKilojoules?: number;
    };
    startTime: string;
    endTime: string;
    metadata?: RecordMetadata;
  }

  export interface TotalCaloriesBurnedRecord {
    energy: {
      inKilocalories: number;
      inCalories?: number;
      inJoules?: number;
      inKilojoules?: number;
    };
    startTime: string;
    endTime: string;
    metadata?: RecordMetadata;
  }

  export interface HeartRateSample {
    beatsPerMinute: number;
    time: string;
  }

  export interface HeartRateRecord {
    samples: HeartRateSample[];
    startTime: string;
    endTime: string;
    metadata?: RecordMetadata;
  }

  export interface ExerciseSessionRecord {
    exerciseType: number | string;
    title?: string;
    notes?: string;
    startTime: string;
    endTime: string;
    metadata?: RecordMetadata;
  }

  export interface HydrationRecord {
    volume: {
      inLiters: number;
      inMilliliters?: number;
    };
    startTime: string;
    endTime: string;
    metadata?: RecordMetadata;
  }

  export function initialize(): Promise<boolean>;
  export function getSdkStatus(providerPackageNames?: string[]): Promise<number>;
  export function requestPermission(permissions: Permission[]): Promise<Permission[]>;
  export function getGrantedPermissions(): Promise<Permission[]>;
  export function revokeAllPermissions(): Promise<void>;
  export function openHealthConnectSettings(): Promise<void>;
  export function openHealthConnectDataManagement(): Promise<void>;
  export function aggregateRecord(options: {
    recordType: string;
    timeRangeFilter: TimeRangeFilter;
    dataOriginFilter?: string[];
  }): Promise<any>;
  export function readRecords(
    recordType: string,
    options: {
      timeRangeFilter: TimeRangeFilter;
      dataOriginFilter?: string[];
      pageSize?: number;
      pageToken?: string;
      ascendingOrder?: boolean;
    }
  ): Promise<{ records: any[]; pageToken?: string }>;
}
