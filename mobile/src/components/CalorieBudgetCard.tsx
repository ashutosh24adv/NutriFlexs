import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';

export interface CalorieBudgetCardProps {
  consumedCalories?: number;
  consumed?: number;
  activeBurned?: number;
  burnCalories?: number;
  targetCalories?: number;
  target?: number;
  remaining?: number;
  streakDays?: number;
  onPress?: () => void;
}

/**
 * CalorieBudgetCard - Hero circular progress ring for NutriFlex Health mode.
 * Specification:
 * - Solid #1D4D3E forest green stroke on #E5E7EB track using react-native-svg (strokeLinecap="round").
 * - Center readout: Bold kcal left.
 * - Flanked on left by consumed calories and on right by target calories.
 * - Flat colors, off-white canvas and clean white card with 1px border.
 */
export const CalorieBudgetCard: React.FC<CalorieBudgetCardProps> = ({
  consumedCalories,
  consumed,
  activeBurned,
  burnCalories,
  targetCalories,
  target,
  remaining: remainingProp,
  streakDays = 0,
  onPress,
}) => {
  const finalConsumed = consumedCalories ?? consumed ?? 0;
  const finalActiveBurned = activeBurned ?? burnCalories ?? 0;
  const finalTarget = targetCalories ?? target ?? 2000;
  const finalRemaining =
    remainingProp !== undefined
      ? remainingProp
      : Math.max(0, finalTarget - finalConsumed + finalActiveBurned);

  // SVG Ring dimensions
  const size = 156;
  const strokeWidth = 14;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Fraction consumed (0 to 1)
  const progress = finalTarget > 0 ? Math.min(Math.max(finalConsumed / finalTarget, 0), 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={styles.card}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithDot}>
          <View style={styles.activeDot} />
          <Text style={styles.cardTitle}>Daily Calorie Budget</Text>
        </View>
        <View style={styles.headerRightGroup}>
          {streakDays > 0 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakText}>🔥 {streakDays}d streak</Text>
            </View>
          )}
          <View style={styles.onTrackPill}>
            <Text style={styles.onTrackText}>
              {finalConsumed === 0
                ? 'Ready to Log'
                : finalConsumed <= finalTarget + finalActiveBurned
                ? 'On Track'
                : 'Over Budget'}
            </Text>
          </View>
        </View>
      </View>

      {/* Hero Circular Ring Flanked by Consumed and Target */}
      <View style={styles.heroRow}>
        {/* Left Flank: Consumed */}
        <View style={styles.flankCol}>
          <Text style={styles.flankValue}>{finalConsumed.toLocaleString()}</Text>
          <Text style={styles.flankLabel}>consumed</Text>
          <View style={styles.flankSubPill}>
            <Text style={styles.flankSubText}>Food</Text>
          </View>
        </View>

        {/* Center Circular Progress Ring */}
        <View style={styles.ringContainer}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            {/* Background Track (#E5E7EB) */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#E5E7EB"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress Arc (#1D4D3E Forest Green) */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#1D4D3E"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>

          {/* Center Readout */}
          <View style={styles.centerReadout}>
            <Text style={styles.centerNumber}>{finalRemaining.toLocaleString()}</Text>
            <Text style={styles.centerLabel}>kcal left</Text>
          </View>
        </View>

        {/* Right Flank: Target */}
        <View style={styles.flankCol}>
          <Text style={styles.flankValue}>{finalTarget.toLocaleString()}</Text>
          <Text style={styles.flankLabel}>target</Text>
          <View style={styles.flankSubPill}>
            <Text style={styles.flankSubText}>Budget</Text>
          </View>
        </View>
      </View>

      {/* Bottom Formula Breakdown */}
      <View style={styles.footerFormula}>
        <Text style={styles.formulaEquation}>
          <Text style={styles.formulaBold}>{finalTarget.toLocaleString()}</Text> base -{' '}
          <Text style={styles.formulaBold}>{finalConsumed.toLocaleString()}</Text> food +{' '}
          <Text style={styles.formulaBold}>{finalActiveBurned.toLocaleString()}</Text> active ={' '}
          <Text style={styles.formulaHighlight}>{finalRemaining.toLocaleString()} kcal left</Text>
        </Text>
      </View>
    </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: radii.round,
    backgroundColor: '#1D4D3E',
  },
  cardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#111111',
    letterSpacing: -0.2,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakPill: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  streakText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#EA580C',
  },
  onTrackPill: {
    backgroundColor: '#E8F1ED',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  onTrackText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  flankCol: {
    flex: 1,
    alignItems: 'center',
  },
  flankValue: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: '#111111',
    letterSpacing: -0.3,
  },
  flankLabel: {
    fontSize: typography.sizes.xs,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  flankSubPill: {
    marginTop: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  flankSubText: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: typography.weights.semiBold,
  },
  ringContainer: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerReadout: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNumber: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: '#111111',
    letterSpacing: -0.5,
  },
  centerLabel: {
    fontSize: 12,
    fontWeight: typography.weights.semiBold,
    color: '#6B7280',
    marginTop: 1,
  },
  footerFormula: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  formulaEquation: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  formulaBold: {
    fontWeight: typography.weights.semiBold,
    color: '#374151',
  },
  formulaHighlight: {
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
});
