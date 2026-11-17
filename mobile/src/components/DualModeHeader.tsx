import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';
import { KioskPickerModal } from './KioskPickerModal';
import { useAuthStore, computeAvatarInitials } from '../store/authStore';
import { useDiaryStore } from '../store/diaryStore';
import { useHealthSync } from '../services/useHealthSync';

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
  const { user, isAuthenticated } = authStore;
  const isAuthed = Boolean(isAuthenticated && user && !user.isGuest);
  const userName = isAuthed && user?.name?.trim() ? user.name.trim() : '';
  const initials = isAuthed ? computeAvatarInitials(userName) : '?';

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

  // Dynamic real calorie budget calculation
  const authGoal = (authStore as any)?.nutritionGoal || (user as any)?.nutritionGoal;
  const calorieTarget =
    authGoal?.calorieTarget ||
    authGoal?.dailyCalorieGoal ||
    authGoal?.calories ||
    (user as any)?.targets?.calorieTarget ||
    (user as any)?.targets?.calories ||
    (user as any)?.dailyCalorieGoal ||
    (user as any)?.calorieTarget ||
    2000;

  const { todayCalories } = useDiaryStore();
  const { telemetry } = useHealthSync();

  const consumed = todayCalories || 0;
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

  const handleTabChange = (tab: AppMode) => {
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

  return (
    <>
      <View style={styles.container}>
        {/* Top Row: Pickup Kiosk on Left + Avatar Initials on Right */}
        <View style={styles.topRow}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleKioskPress}
            style={styles.locationSelector}
          >
            <View style={styles.labelRow}>
              <Ionicons name="location-sharp" size={12} color="rgba(255, 255, 255, 0.85)" />
              <Text style={styles.locationLabel}>PICKUP KIOSK</Text>
            </View>
            <View style={styles.locationRow}>
              <Text style={styles.locationName} numberOfLines={1}>
                {selectedKiosk}
              </Text>
              <Text style={styles.dropdownArrow}> ▾</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAvatarPress}
            style={styles.avatarButton}
          >
            <View style={styles.avatar}>
              {isAuthed && initials !== '?' ? (
                <Text style={styles.avatarText}>{initials}</Text>
              ) : (
                <Ionicons name="lock-closed" size={15} color="rgba(255, 255, 255, 0.9)" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Segmented Pill Switcher Below: Order Food | Track Health */}
        <View style={styles.segmentedRow}>
          {/* Order Food Pill */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleTabChange('order')}
            style={[
              styles.tabPill,
              activeTab === 'order' ? styles.tabActive : styles.tabInactive,
            ]}
          >
            <Text
              style={[
                styles.tabTitle,
                activeTab === 'order' ? styles.titleActive : styles.titleInactive,
              ]}
            >
              Order Food
            </Text>
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
            style={[
              styles.tabPill,
              activeTab === 'track' ? styles.tabActive : styles.tabInactive,
            ]}
          >
            <Text
              style={[
                styles.tabTitle,
                activeTab === 'track' ? styles.titleActive : styles.titleInactive,
              ]}
            >
              Track Health
            </Text>
            <Text
              style={[
                styles.tabSubtext,
                activeTab === 'track' ? styles.subtextActive : styles.subtextInactive,
              ]}
            >
              {liveTrackSubtext}
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationSelector: {
    flex: 1,
    marginRight: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownArrow: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  segmentedRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: 8,
    paddingTop: spacing.xs,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  tabActive: {
    backgroundColor: '#F7F8F6', // Off-white canvas matching the screen body
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  titleActive: {
    color: '#1D4D3E', // Forest green text for active tab
  },
  titleInactive: {
    color: '#FFFFFF',
  },
  tabSubtext: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtextActive: {
    color: '#059669', // Emerald accent for active subtext
  },
  subtextInactive: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
});

