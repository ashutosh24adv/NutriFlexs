import React, { useState, useEffect, useRef } from 'react';
import * as ReactNative from 'react-native';
const { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } = ReactNative;
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';
import { KioskPickerModal } from './KioskPickerModal';
import { useAuthStore, authActions, computeAvatarInitials } from '../store/authStore';
import { useDiaryStore } from '../store/diaryStore';
import { useHealthSync } from '../services/useHealthSync';
import { API_BASE_URL } from '../config/api';
import { getLocalDateString } from '../utils/date';

export type AppMode = 'order' | 'track';

export interface DualModeHeaderProps {
  activeTab?: AppMode;
  onTabChange?: (tab: AppMode) => void;
  kioskLocation?: string;
  onSelectKiosk?: (kioskName: string) => void;
  onAvatarPress?: () => void;
  orderSubtext?: string;
  trackSubtext?: string;
}

/**
 * DualModeHeader
 * Unified top header for NutriFlexs in #1D4D3E (Forest Green) and #F7F8F6 (Off-white) theme:
 * 1. Top row: Compact Pickup Kiosk selector on top-left, user avatar initials on top-right.
 * 2. Segmented pill switcher below: "Order Food" (Ready in 5 min) and "Track Health" ({remainingCalories} kcal left).
 * 3. Dynamically binds remainingCalories to real budget (calorieTarget - consumed + burned) from useAuthStore.
 */
export const DualModeHeader: React.FC<DualModeHeaderProps> = ({
  activeTab: propActiveTab,
  onTabChange,
  kioskLocation: propKioskLocation,
  onSelectKiosk: propOnSelectKiosk,
  onAvatarPress: propOnAvatarPress,
  orderSubtext = 'Ready in 5 min',
  trackSubtext: customTrackSubtext,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const authStore = useAuthStore();
  const { user, isAuthenticated, nutritionGoal } = authStore;
  const isAuthed = Boolean(isAuthenticated && user && !user.isGuest);
  const initials = user?.name
    ? computeAvatarInitials(user.name)
    : (user?.avatarInitials || authStore.avatarInitials || '?');

  // Remote summary state for consumed calories & target from GET /api/mobile/nutrition/summary
  const [remoteConsumed, setRemoteConsumed] = useState<number | null>(null);
  const [remoteTarget, setRemoteTarget] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSummary() {
      try {
        const token = authStore.token;
        if (!token) return;
        const base = (process.env.EXPO_PUBLIC_API_URL || API_BASE_URL || 'https://nutri-flexs.vercel.app').replace(/\/+$/, '');
        const todayDateStr = getLocalDateString();
        const res = await fetch(`${base}/api/mobile/nutrition/summary?date=${todayDateStr}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          const summary = data.summary || data;
          if (summary?.consumed?.calories !== undefined) {
            setRemoteConsumed(Math.round(summary.consumed.calories));
          }
          const tgt =
            summary?.targets?.calorieTarget ||
            summary?.targets?.calories ||
            summary?.targets?.dailyCalorieGoal;
          if (tgt) {
            setRemoteTarget(Math.round(tgt));
          }
        }
      } catch (err) {
        // Fallback cleanly to store
      }
    }
    loadSummary();
    return () => {
      isMounted = false;
    };
  }, [authStore.token]);

  // Kiosk Location state & modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedKiosk, setSelectedKiosk] = useState(
    propKioskLocation || user?.homeKiosk || 'Cult.fit HSR Layout'
  );

  useEffect(() => {
    if (propKioskLocation) {
      setSelectedKiosk(propKioskLocation);
    } else if (user?.homeKiosk) {
      setSelectedKiosk(user.homeKiosk);
    }
  }, [propKioskLocation, user?.homeKiosk]);

  const handleKioskPress = () => {
    setModalVisible(true);
  };

  const handleSelectKiosk = (name: string) => {
    setSelectedKiosk(name);
    if (propOnSelectKiosk) {
      propOnSelectKiosk(name);
    }
    setModalVisible(false);
  };

  const handleAvatarPress = () => {
    if (propOnAvatarPress) {
      propOnAvatarPress();
    } else {
      const mode = activeTab === 'track' ? 'track' : 'order';
      router.push(`/(${mode})/profile` as any);
    }
  };

  // Dynamic real calorie budget calculation strictly bound to useAuthStore and GET /api/mobile/nutrition/summary
  const authGoal = nutritionGoal || (authStore as any)?.nutritionGoal || (user as any)?.nutritionGoal || (user as any)?.goals;
  const calorieTarget =
    authGoal?.calorieTarget ||
    authGoal?.dailyCalorieGoal ||
    authGoal?.calories ||
    remoteTarget ||
    (user as any)?.targets?.calorieTarget ||
    (user as any)?.targets?.calories ||
    (user as any)?.dailyCalorieGoal ||
    (user as any)?.calorieTarget ||
    authStore.calorieTarget ||
    2000;

  const { todayCalories } = useDiaryStore();
  const { telemetry } = useHealthSync();

  const consumed = remoteConsumed !== null ? remoteConsumed : (todayCalories || 0);
  const burned =
    telemetry?.activeCaloriesBurned ??
    telemetry?.activeBurned ??
    telemetry?.activeCalories ??
    0;

  const remainingCalories = Math.max(0, calorieTarget - consumed + burned);
  const liveTrackSubtext =
    customTrackSubtext ?? `${remainingCalories.toLocaleString()} kcal left`;

  const activeTab: AppMode =
    propActiveTab ?? (pathname?.includes('track') ? 'track' : 'order');

  const [containerWidth, setContainerWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(activeTab === 'order' ? 0 : 1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (Animated as any).spring(slideAnim, {
      toValue: activeTab === 'order' ? 0 : 1,
      useNativeDriver: true,
      tension: 140,
      friction: 14,
    }).start();
  }, [activeTab, slideAnim]);

  const handleTabChange = (tab: AppMode) => {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const vibration = (ReactNative as any).Vibration;
        if (vibration && typeof vibration.vibrate === 'function') {
          vibration.vibrate(20);
        }
      }
    } catch {}

    Animated.sequence([
      Animated.timing(pressScale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(pressScale, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start();

    (Animated as any).spring(slideAnim, {
      toValue: tab === 'order' ? 0 : 1,
      useNativeDriver: true,
      tension: 150,
      friction: 14,
    }).start();

    try {
      authActions.setLastMode(tab);
    } catch {}
    if (onTabChange) {
      onTabChange(tab);
    } else {
      if (tab === 'order') {
        router.replace('/(order)');
      } else {
        router.replace('/(track)');
      }
    }
  };

  const pillWidth = containerWidth > 0 ? (containerWidth - 8) / 2 : 0;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, containerWidth > 0 ? containerWidth / 2 : 160],
  });

  return (
    <>
      <View style={styles.container}>
        {/* Top Row: Compact Pickup Kiosk selector pill on the left + circular avatar initials on the right */}
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleKioskPress}
            style={styles.kioskPill}
          >
            <Text style={styles.kioskPinIcon}>📍</Text>
            <Text style={styles.kioskPillText} numberOfLines={1}>
              Pickup at {selectedKiosk}
            </Text>
            <Text style={styles.kioskDropdownArrow}> ▾</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAvatarPress}
            style={styles.avatarButton}
          >
            <View style={styles.avatar}>
              {initials && initials !== '?' ? (
                <Text style={styles.avatarText}>{initials}</Text>
              ) : (
                <Ionicons name="person" size={16} color="rgba(255, 255, 255, 0.9)" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Animated Segmented Capsule Switcher Below: Order Food | Track Health */}
        <Animated.View
          style={[styles.segmentedRow, { transform: [{ scale: pressScale }] }]}
          onLayout={(e: any) => setContainerWidth(e?.nativeEvent?.layout?.width || 0)}
        >
          {pillWidth > 0 && (
            <Animated.View
              style={[
                styles.slidingIndicator,
                {
                  width: pillWidth,
                  transform: [{ translateX }],
                },
              ]}
            />
          )}

          {/* Order Food Pill */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleTabChange('order')}
            style={styles.tabPill}
          >
            <View style={styles.tabTitleRow}>
              <Ionicons
                name="fast-food-outline"
                size={13}
                color={activeTab === 'order' ? '#1D4D3E' : '#FFFFFF'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabTitle,
                  activeTab === 'order' ? styles.titleActive : styles.titleInactive,
                ]}
              >
                Order Food
              </Text>
            </View>
            <Text
              style={[
                styles.tabSubtext,
                activeTab === 'order' ? styles.subtextActive : styles.subtextInactive,
              ]}
            >
              {orderSubtext}
            </Text>
          </TouchableOpacity>

          {/* Track Health Pill */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleTabChange('track')}
            style={styles.tabPill}
          >
            <View style={styles.tabTitleRow}>
              <Ionicons
                name="fitness-outline"
                size={13}
                color={activeTab === 'track' ? '#1D4D3E' : '#FFFFFF'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.tabTitle,
                  activeTab === 'track' ? styles.titleActive : styles.titleInactive,
                ]}
              >
                Track Health
              </Text>
            </View>
            <Text
              style={[
                styles.tabSubtext,
                activeTab === 'track' ? styles.subtextActive : styles.subtextInactive,
              ]}
            >
              {liveTrackSubtext}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Interactive Kiosk Selection Modal */}
      <KioskPickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedKiosk={selectedKiosk}
        onSelectKiosk={handleSelectKiosk}
      />
    </>
  );
};

export default DualModeHeader;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1D4D3E', // Forest Green brand header
    paddingTop: spacing.xs,
  },
  topRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kioskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    maxWidth: '78%',
  },
  kioskPinIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  kioskPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  kioskDropdownArrow: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  avatarButton: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  segmentedRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs + 2,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
    borderRadius: 24,
    padding: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  slidingIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: '#F7F8F6', // Crisp off-white brand background
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    minHeight: 46,
  },
  tabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  titleActive: {
    color: '#1D4D3E', // Forest green text for active tab
  },
  titleInactive: {
    color: '#FFFFFF',
  },
  tabSubtext: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  subtextActive: {
    color: '#059669', // Emerald accent for active subtext
  },
  subtextInactive: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
});

