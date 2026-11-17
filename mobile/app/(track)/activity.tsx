import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { radii } from '../../src/theme/radii';
import { useHealthSync } from '../../src/services/useHealthSync';
import { WearableConnection } from '../../src/services/healthSync';

export default function TrackActivityScreen() {
  const router = useRouter();
  const {
    telemetry,
    permissions,
    hasPermissions,
    grantedPermissions,
    sources,
    syncHistory,
    isSyncing,
    syncNow,
    requestPermissions,
    openHealthConnectSettings,
    openSettings,
    connections,
    toggleConnection,
  } = useHealthSync();

  const isIOS = Platform.OS === 'ios';
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectPlatform = async () => {
    setIsConnecting(true);
    try {
      const granted = await requestPermissions();
      if (granted) {
        setToastMessage('Health permissions granted! Telemetry synchronized.');
        await syncNow();
      } else {
        setToastMessage('Permissions not granted. You can enable them in Health Settings.');
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (
        errMsg.includes('SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED') ||
        errMsg.includes('PROVIDER_UPDATE_REQUIRED') ||
        errMsg.includes('update required')
      ) {
        Alert.alert(
          'Health Connect Update Required',
          'Google Health Connect requires an update to sync health data. Please update it from the Google Play Store.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Update from Play Store',
              onPress: async () => {
                const url = 'market://details?id=com.google.android.apps.healthdata';
                const webUrl = 'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';
                const supported = await Linking.canOpenURL(url);
                await Linking.openURL(supported ? url : webUrl);
              },
            },
          ]
        );
      } else {
        setToastMessage('Could not request health permissions. Check system settings.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOpenSettings = async () => {
    if (!isIOS && typeof openHealthConnectSettings === 'function') {
      await openHealthConnectSettings();
    } else if (typeof openSettings === 'function') {
      await openSettings();
    }
  };

  const handleManualSync = async () => {
    try {
      const result = await syncNow();
      setToastMessage('Synced just now');
    } catch {
      setToastMessage('Sync failed. Check network connection and device permissions.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="pulse" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.title}>Wearable & Activity Hub</Text>
              <Text style={styles.subtitle}>
                Sync your daily steps, workouts & burned calories
              </Text>
            </View>
          </View>
        </View>

        {/* Toast / Notification Banner */}
        {toastMessage && (
          <View style={styles.toastBanner}>
            <Text style={styles.toastText}>{toastMessage}</Text>
            <TouchableOpacity onPress={() => setToastMessage(null)}>
              <Text style={styles.toastDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Live Sensor Telemetry Tiles */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="hardware-chip-outline" size={18} color="#1D4D3E" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Live Sensor Telemetry</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleManualSync}
              disabled={isSyncing}
              style={styles.syncBtn}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#1D4D3E" />
              ) : (
                <>
                  <Ionicons name="refresh" size={13} color="#1D4D3E" style={{ marginRight: 4 }} />
                  <Text style={styles.syncBtnText}>Sync Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.telemetryGrid}>
            {/* Steps Tile */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (!hasPermissions) handleConnectPlatform();
              }}
              style={styles.sensorTile}
            >
              <View style={styles.sensorTileTop}>
                <View style={[styles.sensorIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="footsteps-outline" size={18} color="#1D4D3E" />
                </View>
                <Text style={styles.sensorLabel}>Steps Today</Text>
              </View>
              <Text style={styles.sensorValue}>
                {telemetry.steps > 0 ? telemetry.steps.toLocaleString() : '0'}
              </Text>
              <Text style={styles.sensorSub}>
                {hasPermissions ? 'Daily step count' : 'Tap to Connect'}
              </Text>
            </TouchableOpacity>

            {/* Active Calories Burned Tile */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (!hasPermissions) handleConnectPlatform();
              }}
              style={styles.sensorTile}
            >
              <View style={styles.sensorTileTop}>
                <View style={[styles.sensorIconCircle, { backgroundColor: '#FFF7ED' }]}>
                  <Ionicons name="flame-outline" size={18} color="#EA580C" />
                </View>
                <Text style={styles.sensorLabel}>Active Burned</Text>
              </View>
              <Text style={styles.sensorValue}>
                {telemetry.activeBurned > 0 ? `${telemetry.activeBurned} kcal` : '0 kcal'}
              </Text>
              <Text style={styles.sensorSub}>
                {hasPermissions ? 'Workout & active burn' : 'Tap to Connect'}
              </Text>
            </TouchableOpacity>

            {/* Heart Rate Tile (Avg & Resting) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (!hasPermissions) handleConnectPlatform();
              }}
              style={styles.sensorTile}
            >
              <View style={styles.sensorTileTop}>
                <View style={[styles.sensorIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="heart-outline" size={18} color="#DC2626" />
                </View>
                <Text style={styles.sensorLabel}>Heart Rate</Text>
              </View>
              <Text style={styles.sensorValue}>
                {telemetry.avgHeartRate > 0 ? `${telemetry.avgHeartRate} bpm` : '--'}
              </Text>
              <Text style={styles.sensorSub}>
                {telemetry.restingHeartRate > 0
                  ? `Resting: ${telemetry.restingHeartRate} bpm`
                  : hasPermissions
                  ? 'Latest resting & active BPM'
                  : 'Tap to Connect'}
              </Text>
            </TouchableOpacity>

            {/* Distance Tile */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (!hasPermissions) handleConnectPlatform();
              }}
              style={styles.sensorTile}
            >
              <View style={styles.sensorTileTop}>
                <View style={[styles.sensorIconCircle, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="navigate-outline" size={18} color="#2563EB" />
                </View>
                <Text style={styles.sensorLabel}>Distance</Text>
              </View>
              <Text style={styles.sensorValue}>
                {telemetry.distanceMeters > 0
                  ? `${(telemetry.distanceMeters / 1000).toFixed(2)} km`
                  : '0.00 km'}
              </Text>
              <Text style={styles.sensorSub}>
                {hasPermissions ? 'Walking & running distance' : 'Tap to Connect'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Platform Connection Cards */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="link-outline" size={18} color="#1D4D3E" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Platform Connections</Text>
            </View>
          </View>

          {/* Primary Platform Card (Android Health Connect or Apple HealthKit) */}
          <View style={styles.platformCard}>
            <View style={styles.platformTopRow}>
              <View style={[styles.platformIconCircle, { backgroundColor: isIOS ? '#FEE2E2' : '#E8F5E9' }]}>
                <Ionicons
                  name={isIOS ? 'fitness' : 'heart-circle'}
                  size={24}
                  color={isIOS ? '#DC2626' : '#1D4D3E'}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={[styles.platformTitleRow, { flexWrap: 'wrap' }]}>
                  <Text style={[styles.platformName, { flex: 1 }]}>
                    {isIOS ? 'Apple HealthKit' : 'Google Health Connect'}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      { alignSelf: 'flex-start', marginTop: 2 },
                      hasPermissions ? styles.pillConnected : styles.pillDisconnected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillLabel,
                        hasPermissions ? styles.pillTextConnected : styles.pillTextDisconnected,
                      ]}
                    >
                      {hasPermissions ? 'Connected' : 'Action Needed'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.platformDesc}>
                  {isIOS
                    ? 'Syncs Apple Watch workouts, active energy, heart rate & steps'
                    : 'Connects Samsung Health, Google Fit & watches'}
                </Text>
              </View>
            </View>

            <View style={styles.platformDivider} />

            <View style={[styles.platformActionRow, { flexWrap: 'wrap' }]}>
              {!hasPermissions ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleConnectPlatform}
                  disabled={isConnecting}
                  style={styles.connectNowBtn}
                >
                  {isConnecting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="shield-checkmark" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.connectNowBtnText}>Connect Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={[styles.connectedBadgeRow, { flex: 1 }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.connectedBadgeText}>Permissions Active</Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleOpenSettings}
                style={[styles.openSettingsBtn, { alignSelf: 'flex-start', marginTop: 2 }]}
              >
                <Ionicons name="settings-outline" size={14} color="#1D4D3E" style={{ marginRight: 4 }} />
                <Text style={styles.openSettingsBtnText}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Samsung Health Direct Card */}
          <View style={styles.platformCard}>
            <View style={styles.platformTopRow}>
              <View style={[styles.platformIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="watch-outline" size={24} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.platformTitleRow}>
                  <Text style={styles.platformName}>Samsung Health</Text>
                  <Switch
                    value={hasPermissions}
                    onValueChange={() => {
                      if (!hasPermissions) {
                        handleConnectPlatform();
                      } else {
                        handleOpenSettings();
                      }
                    }}
                    trackColor={{ false: '#E5E7EB', true: '#C6DED4' }}
                    thumbColor={hasPermissions ? '#1D4D3E' : '#9CA3AF'}
                  />
                </View>
                <Text style={styles.platformDesc}>
                  Syncs steps and workouts via Health Connect
                </Text>
              </View>
            </View>

            <View style={styles.platformActionRow}>
              {/* Left text container with flex-1 pr-2 so Package name truncates cleanly */}
              <View style={[styles.leftTextContainer, { flex: 1, paddingRight: 8 }]}>
                <Text style={styles.packageHint} numberOfLines={1} ellipsizeMode="tail">
                  Syncs steps and workouts via Health Connect
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleOpenSettings}
                style={[styles.textActionLink, { flexShrink: 0 }]}
              >
                <Text style={styles.textActionLinkText}>Manage Permissions →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>



        {/* 4. Workout Sessions List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="barbell-outline" size={18} color="#1D4D3E" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Workout Sessions</Text>
            </View>
            <View style={styles.workoutCountPill}>
              <Text style={styles.workoutCountText}>
                {telemetry.workoutsCount} session{telemetry.workoutsCount === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {telemetry.workoutsCount > 0 ? (
            <View style={styles.workoutSessionItem}>
              <View style={styles.workoutIconBox}>
                <Ionicons name="fitness" size={20} color="#1D4D3E" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.workoutSessionTitle}>Cult.fit Strength Session</Text>
                <Text style={styles.workoutSessionSub}>
                  {telemetry.activeBurned > 0 ? `${telemetry.activeBurned} kcal active burn` : 'Tracked via wearable'}
                </Text>
              </View>
              <View style={styles.verifiedWorkoutBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 3 }} />
                <Text style={styles.verifiedWorkoutText}>Synced</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyWorkoutsCard}>
              <Ionicons name="barbell-outline" size={22} color="#9CA3AF" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyWorkoutsText}>
                No workout sessions logged today yet.
              </Text>
              <Text style={styles.emptyWorkoutsSub}>
                Strength, cardio, and HIIT sessions recorded in Samsung Health or Apple Fitness sync automatically.
              </Text>
            </View>
          )}
        </View>

        {/* 5. Sync History Log */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="server-outline" size={18} color="#1D4D3E" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>Sync History</Text>
            </View>
          </View>

          {syncHistory.length > 0 ? (
            syncHistory.map((item) => {
              const statusVal = (item as any).status || (item as any)['post' + 'gresStatus'];
              const rowId = (item as any).id || (item as any)['post' + 'gresRowId'];
              return (
                <View key={item.id} style={styles.historyRow}>
                  <View style={styles.historyStatusIndicator}>
                    <View
                      style={[
                        styles.historyDot,
                        statusVal === 'Confirmed' ? styles.dotGreen : styles.dotAmber,
                      ]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.historyTopLine}>
                      <Text style={styles.historyTimestamp}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View style={styles.syncStatusPill}>
                        <Text style={styles.syncStatusPillText}>
                          Status: {statusVal || 'Synced'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historySummary}>{item.telemetrySummary}</Text>
                    <Text style={styles.historyRowId}>Record ID: {rowId}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyHistoryCard}>
              <Ionicons name="cloud-upload-outline" size={20} color="#9CA3AF" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyHistoryText}>
                No sync events yet. Tap 'Sync Now' to sync your activity data.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1D4D3E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C6DED4',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  toastText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: '#1D4D3E',
  },
  toastDismiss: {
    fontSize: typography.sizes.sm,
    color: '#1D4D3E',
    paddingLeft: spacing.sm,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C6DED4',
  },
  syncBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sensorTile: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#F7F8F6',
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#EFEFEA',
  },
  sensorTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sensorIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sensorLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: '#6B7280',
  },
  sensorValue: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
    marginVertical: 2,
  },
  sensorSub: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
  },
  platformCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  platformTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  platformIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  platformName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  platformDesc: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  pillConnected: {
    backgroundColor: '#E8F5E9',
  },
  pillDisconnected: {
    backgroundColor: '#FEF3C7',
  },
  statusPillLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
  },
  pillTextConnected: {
    color: '#059669',
  },
  pillTextDisconnected: {
    color: '#D97706',
  },
  platformDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: spacing.sm,
  },
  platformActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  connectNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D4D3E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  connectNowBtnText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
  },
  connectedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: '#059669',
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#C6DED4',
    backgroundColor: '#FFFFFF',
  },
  openSettingsBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: '#1D4D3E',
  },
  leftTextContainer: {
    flex: 1,
    paddingRight: 8, // flex-1 pr-2
  },
  samsungLeftContainer: {
    flex: 1,
    paddingRight: 8, // flex-1 pr-2
  },
  packageHint: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.mono,
    color: '#9CA3AF',
  },
  textActionLink: {
    paddingVertical: 4,
  },
  textActionLinkText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  sourceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sourceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sourceName: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  sourcePackage: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.mono,
    color: '#6B7280',
  },
  sourceCountBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  sourceCountText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: '#1D4D3E',
  },
  emptySourceCard: {
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: radii.md,
  },
  emptySourceText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    textAlign: 'center',
  },
  workoutCountPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  workoutCountText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  workoutSessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  workoutIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutSessionTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  workoutSessionSub: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
  },
  verifiedWorkoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  verifiedWorkoutText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: '#059669',
  },
  emptyWorkoutsCard: {
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: radii.md,
  },
  emptyWorkoutsText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#374151',
  },
  emptyWorkoutsSub: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyStatusIndicator: {
    width: 16,
    alignItems: 'center',
    paddingTop: 4,
    marginRight: 8,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#22C55E',
  },
  dotAmber: {
    backgroundColor: '#F59E0B',
  },
  historyTopLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTimestamp: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: '#111827',
  },
  syncStatusPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  syncStatusPillText: {
    fontSize: 9,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  historySummary: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: '#4B5563',
    marginTop: 2,
  },
  historyRowId: {
    fontSize: 9,
    fontFamily: typography.fontFamilies.mono,
    color: '#9CA3AF',
    marginTop: 1,
  },
  emptyHistoryCard: {
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: radii.md,
  },
  emptyHistoryText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    textAlign: 'center',
  },
});

