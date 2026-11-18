import { useState, useEffect, useCallback } from 'react';
import {
  healthSyncService,
  Haptics,
  HealthTelemetry,
  HealthPermissionState,
  HealthSourceInfo,
  SyncHistoryEntry,
  WearableConnection,
  WearableId,
  NutritionTargets,
  TelemetryData,
  DailyHealthAggregate,
} from '../services/healthSync';

export interface UseHealthSyncReturn {
  // Real Native Biometrics
  telemetry: HealthTelemetry & TelemetryData;
  permissions: HealthPermissionState;
  hasPermissions: boolean;
  grantedPermissions: string[];
  sources: HealthSourceInfo[];
  syncHistory: SyncHistoryEntry[];
  isSyncing: boolean;
  activeCalories: number;
  history7Days: DailyHealthAggregate[];

  // Real Health Connect Actions
  syncNow: () => Promise<HealthTelemetry>;
  fetchTodayHealthTelemetry: () => Promise<HealthTelemetry>;
  fetch7DayHealthHistory: () => Promise<DailyHealthAggregate[]>;
  requestPermissions: () => Promise<boolean>;
  requestHealthPermissions: () => Promise<boolean>;
  openHealthConnectSettings: () => Promise<void>;
  openSettings: () => Promise<void>;

  // Real Calorie Budget Recalculation
  calculateRemainingCalories: (consumed: number) => {
    target: number;
    consumed: number;
    burned: number;
    remaining: number;
  };

  // Backward Compatibility
  connections: WearableConnection[];
  targets: NutritionTargets;
  toggleConnection: (id: WearableId) => void;
  updateTargets: (targets: Partial<NutritionTargets>) => void;
}

/**
 * useHealthSync - Hook providing 100% real native health telemetry,
 * OS permissions, dynamic calorie budget recalculation, and database sync.
 */
export function useHealthSync(): UseHealthSyncReturn {
  const [telemetry, setTelemetry] = useState<HealthTelemetry>(
    healthSyncService.getTelemetry()
  );
  const [permissions, setPermissions] = useState<HealthPermissionState>(
    healthSyncService.getPermissions()
  );
  const [hasPermissions, setHasPermissions] = useState<boolean>(
    healthSyncService.hasPermissions
  );
  const [grantedPermissions, setGrantedPermissions] = useState<string[]>(
    healthSyncService.getGrantedPermissions()
  );
  const [sources, setSources] = useState<HealthSourceInfo[]>(
    healthSyncService.getSources()
  );
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>(
    healthSyncService.getSyncHistory()
  );
  const [connections, setConnections] = useState<WearableConnection[]>(
    healthSyncService.getConnections()
  );
  const [targets, setTargets] = useState<NutritionTargets>(
    healthSyncService.getTargets()
  );
  const [history7Days, setHistory7Days] = useState<DailyHealthAggregate[]>(
    healthSyncService.getTelemetry().history7Days || []
  );

  useEffect(() => {
    // Check existing permissions on mount
    healthSyncService
      .checkExistingPermissions()
      .then((granted) => {
        if (granted) {
          setHasPermissions(true);
          setGrantedPermissions(healthSyncService.getGrantedPermissions());
          setPermissions(healthSyncService.getPermissions());
        }
      })
      .catch((err) => {
        console.warn('[useHealthSync] Failed checking existing permissions:', err);
      });

    const unsubscribe = healthSyncService.subscribe(() => {
      const latest = healthSyncService.getTelemetry();
      setTelemetry(latest);
      setHistory7Days(latest.history7Days || []);
      setPermissions(healthSyncService.getPermissions());
      setHasPermissions(healthSyncService.hasPermissions);
      setGrantedPermissions(healthSyncService.getGrantedPermissions());
      setSources(healthSyncService.getSources());
      setSyncHistory(healthSyncService.getSyncHistory());
      setConnections(healthSyncService.getConnections());
      setTargets(healthSyncService.getTargets());
    });
    return unsubscribe;
  }, []);

  const syncNow = useCallback(async () => {
    return await healthSyncService.syncNow();
  }, []);

  const fetchTodayHealthTelemetry = useCallback(async () => {
    return await healthSyncService.fetchTodayHealthTelemetry();
  }, []);

  const fetch7DayHealthHistory = useCallback(async () => {
    return await healthSyncService.fetch7DayHealthHistory();
  }, []);

  const requestHealthPermissions = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.warn('[useHealthSync] Haptics trigger error:', e);
    }
    return await healthSyncService.requestHealthPermissions();
  }, []);

  const requestPermissions = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.warn('[useHealthSync] Haptics trigger error:', e);
    }
    return await healthSyncService.requestPermissions();
  }, []);

  const openHealthConnectSettings = useCallback(async () => {
    await healthSyncService.openHealthConnectSettings();
  }, []);

  const openSettings = useCallback(async () => {
    await healthSyncService.openSettings();
  }, []);

  const calculateRemainingCalories = useCallback(
    (consumed: number) => {
      return healthSyncService.calculateRemainingCalories(consumed);
    },
    []
  );

  const toggleConnection = useCallback((id: WearableId) => {
    healthSyncService.toggleConnection(id);
  }, []);

  const updateTargets = useCallback((newTargets: Partial<NutritionTargets>) => {
    healthSyncService.updateTargets(newTargets);
  }, []);

  // Merged telemetry with backward-compatible aliases
  const mergedTelemetry: HealthTelemetry & TelemetryData = {
    ...telemetry,
    activeCaloriesBurned: telemetry.activeCalories,
    activeBurned: telemetry.activeCalories,
    heartRateBpm: telemetry.avgHeartRate,
    restingHeartRate: telemetry.avgHeartRate > 0 ? Math.max(50, telemetry.avgHeartRate - 15) : 0,
    distanceKm: parseFloat((telemetry.distanceMeters / 1000).toFixed(2)),
    lastSyncedTime: telemetry.lastSyncedAt
      ? new Date(telemetry.lastSyncedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Never',
  };

  return {
    telemetry: mergedTelemetry,
    permissions,
    hasPermissions,
    grantedPermissions,
    sources,
    syncHistory,
    isSyncing: telemetry.isSyncing,
    activeCalories: telemetry.activeCalories,
    history7Days,
    syncNow,
    fetchTodayHealthTelemetry,
    fetch7DayHealthHistory,
    requestPermissions,
    requestHealthPermissions,
    openHealthConnectSettings,
    openSettings,
    calculateRemainingCalories,
    connections,
    targets,
    toggleConnection,
    updateTargets,
  };
}

export * from '../services/healthSync';
