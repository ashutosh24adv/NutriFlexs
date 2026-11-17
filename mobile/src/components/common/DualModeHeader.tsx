import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useHealthSync } from '../../services/useHealthSync';
import { useDiaryStore } from '../../store/diaryStore';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { radii } from '../../theme/radii';

export type AppMode = 'order' | 'track';

export interface DualModeHeaderProps {
  activeTab?: AppMode;
  onTabChange?: (tab: AppMode) => void;
  orderSubtext?: string;
  trackSubtext?: string;
}

/**
 * DualModeHeader
 * Swiggy/Cult-style dual-mode top header tabs embedded in the solid brand header band (#1D4D3E).
 * Allows instant 1-tap switching between "Order Food" and "Track Health".
 * Dynamically binds the "Track Health" pill sub-label to the live remainingCalories from the health & diary stores.
 */
export const DualModeHeader: React.FC<DualModeHeaderProps> = ({
  activeTab: propActiveTab,
  onTabChange,
  orderSubtext = 'Ready in 5 min',
  trackSubtext: customTrackSubtext,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Dynamic live remaining calories from health sync & diary store
  const { telemetry, targets, calculateRemainingCalories } = useHealthSync();
  const { todayCalories } = useDiaryStore();

  const calorieGoal = targets?.calories || 2000;
  const foodCalories = todayCalories || 0;
  const burnCalories = telemetry?.activeBurned ?? telemetry?.activeCalories ?? 0;
  const remainingCalories = calculateRemainingCalories
    ? calculateRemainingCalories(foodCalories).remaining
    : Math.max(0, calorieGoal - foodCalories + burnCalories);

  const liveTrackSubtext = customTrackSubtext ?? `${remainingCalories.toLocaleString()} kcal left`;

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
    <View style={styles.container}>
      {/* Order Food Folder Tab */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleTabChange('order')}
        style={[
          styles.tab,
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

      {/* Track Health Folder Tab */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleTabChange('track')}
        style={[
          styles.tab,
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
  );
};

export default DualModeHeader;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1D4D3E', // Solid brand dark forest green band
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#F7F8F6', // Off-white canvas matching the page body
  },
  tabInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  titleActive: {
    color: '#1D4D3E',
  },
  titleInactive: {
    color: '#FFFFFF',
  },
  tabSubtext: {
    fontSize: 11,
    fontWeight: '600',
  },
  subtextActive: {
    color: '#059669',
  },
  subtextInactive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
