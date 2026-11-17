import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';

export type AppMode = 'order' | 'track';

interface FolderTabsProps {
  activeTab: AppMode;
  onTabChange: (tab: AppMode) => void;
  orderSubtext?: string;
  trackSubtext?: string;
}

/**
 * Swiggy-style folder tabs embedded at the bottom of the solid brand header band (#1D4D3E).
 * Clicking either tab immediately and visually highlights the active pill and triggers mode switch.
 * The active tab is crisp off-white (#F7F8F6) and flows into the canvas page below.
 */
export const FolderTabs: React.FC<FolderTabsProps> = ({
  activeTab,
  onTabChange,
  orderSubtext = 'Ready in 5 min',
  trackSubtext,
}) => {
  return (
    <View style={styles.container}>
      {/* Order Food Folder Tab */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onTabChange('order')}
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
        onPress={() => onTabChange('track')}
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
          {trackSubtext || 'Daily calories'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1D4D3E', // Forest Green header band
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.touchTargetMin,
  },
  tabActive: {
    backgroundColor: colors.canvas, // Off-white #F7F8F6 flows into page
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  titleActive: {
    color: '#1D4D3E', // Forest green text for active tab
  },
  titleInactive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  tabSubtext: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  subtextActive: {
    color: colors.text.secondary,
  },
  subtextInactive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
