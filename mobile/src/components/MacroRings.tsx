import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';

export interface MacroTarget {
  current?: number;
  target?: number;
}

export interface MacroRingsProps {
  carbs?: MacroTarget;
  protein?: MacroTarget;
  fat?: MacroTarget;
}

interface MacroColumnConfig {
  key: string;
  name: string;
  shortName: string;
  current: number;
  target: number;
  color: string;
  softBg: string;
}

/**
 * MacroRings - 3-column macro progress strips for NutriFlex Health mode.
 * Specification:
 * - Protein (default target: 120g, #1D4D3E Forest Green)
 * - Carbohydrates (default target: 250g, #F59E0B Amber)
 * - Fat (default target: 65g, #EA580C Coral)
 * - Zero mock data: defaults to 0g logged with 0% progress bars.
 * - Flat rounded progress pills on #E5E7EB track.
 * - Clean white card with 1px border #EBECE8.
 */
export const MacroRings: React.FC<MacroRingsProps> = ({
  carbs,
  protein,
  fat,
}) => {
  const resolvedProtein = {
    current: protein?.current ?? 0,
    target: protein?.target ?? 120,
  };
  const resolvedCarbs = {
    current: carbs?.current ?? 0,
    target: carbs?.target ?? 250,
  };
  const resolvedFat = {
    current: fat?.current ?? 0,
    target: fat?.target ?? 65,
  };

  const macros: MacroColumnConfig[] = [
    {
      key: 'protein',
      name: 'Protein',
      shortName: 'Protein',
      current: resolvedProtein.current,
      target: resolvedProtein.target,
      color: '#1D4D3E', // Forest Green
      softBg: '#E8F1ED',
    },
    {
      key: 'carbs',
      name: 'Carbohydrates',
      shortName: 'Carbs',
      current: resolvedCarbs.current,
      target: resolvedCarbs.target,
      color: '#F59E0B', // Amber
      softBg: '#FEF3C7',
    },
    {
      key: 'fat',
      name: 'Fat',
      shortName: 'Fat',
      current: resolvedFat.current,
      target: resolvedFat.target,
      color: '#EA580C', // Coral
      softBg: '#FFEDD5',
    },
  ];

  // Mini circular ring parameters
  const ringSize = 44;
  const strokeWidth = 4.5;
  const center = ringSize / 2;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.sectionTitle}>Macro Targets</Text>
        <Text style={styles.sectionSubtitle}>Daily Breakdown</Text>
      </View>

      <View style={styles.columnsRow}>
        {macros.map((macro) => {
          const percent =
            macro.target > 0
              ? Math.min(100, Math.round((macro.current / macro.target) * 100))
              : 0;
          const remaining = Math.max(0, macro.target - macro.current);
          const fraction =
            macro.target > 0
              ? Math.min(Math.max(macro.current / macro.target, 0), 1)
              : 0;
          const strokeDashoffset = circumference * (1 - fraction);

          return (
            <View key={macro.key} style={styles.column}>
              {/* Mini Arc / Circular Ring */}
              <View style={styles.miniRingWrapper}>
                <Svg
                  width={ringSize}
                  height={ringSize}
                  style={{ transform: [{ rotate: '-90deg' }] }}
                >
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#E5E7EB"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={macro.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="none"
                  />
                </Svg>
                <View style={styles.miniRingCenter}>
                  <Text style={[styles.miniPercentText, { color: macro.color }]}>
                    {percent}%
                  </Text>
                </View>
              </View>

              {/* Macro Name */}
              <Text style={styles.macroName} numberOfLines={1}>
                {macro.shortName}
              </Text>

              {/* Values: current / target */}
              <Text style={styles.macroValue}>
                <Text style={[styles.macroCurrent, { color: macro.color }]}>
                  {macro.current}
                </Text>
                <Text style={styles.macroDivider}>/</Text>
                <Text style={styles.macroTarget}>{macro.target}g</Text>
              </Text>

              {/* Flat Rounded Progress Pill Strip */}
              <View style={styles.pillTrack}>
                <View
                  style={[
                    styles.pillFill,
                    {
                      width: `${percent}%`,
                      backgroundColor: macro.color,
                    },
                  ]}
                />
              </View>

              {/* Remaining pill indicator */}
              <View style={[styles.leftBadge, { backgroundColor: macro.softBg }]}>
                <Text style={[styles.leftText, { color: macro.color }]}>
                  {macro.current === 0
                    ? `${macro.target}g left`
                    : remaining > 0
                    ? `${remaining}g left`
                    : 'Target hit'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBECE8',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#111111',
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: typography.weights.medium,
  },
  columnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F7F8F6',
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  miniRingWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  miniRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPercentText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  macroName: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#111111',
    marginBottom: 2,
  },
  macroValue: {
    fontSize: 12,
    marginBottom: 8,
  },
  macroCurrent: {
    fontWeight: typography.weights.bold,
  },
  macroDivider: {
    color: '#9CA3AF',
    marginHorizontal: 1,
  },
  macroTarget: {
    color: '#6B7280',
    fontWeight: typography.weights.medium,
  },
  pillTrack: {
    width: '84%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginBottom: 8,
  },
  pillFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  leftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  leftText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
});
