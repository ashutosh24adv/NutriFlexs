import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';
import { shadows } from '../theme/shadows';

interface MacroTarget {
  current: number;
  target: number;
}

interface MacroSummaryCardProps {
  calorieGoal: number;
  foodCalories: number;
  exerciseCalories: number;
  protein: MacroTarget;
  carbs: MacroTarget;
  fat: MacroTarget;
}

/**
 * Calm, data-first calorie & macro summary card.
 * Formula: Left = Goal - Food + Exercise
 */
export const MacroSummaryCard: React.FC<MacroSummaryCardProps> = ({
  calorieGoal,
  foodCalories,
  exerciseCalories,
  protein,
  carbs,
  fat,
}) => {
  const caloriesLeft = Math.max(0, calorieGoal - foodCalories + exerciseCalories);
  const caloriePercent = Math.min(100, Math.round((foodCalories / (calorieGoal + exerciseCalories || 1)) * 100));

  const renderMacroBar = (
    label: string,
    current: number,
    target: number,
    color: string
  ) => {
    const percent = Math.min(100, Math.round((current / (target || 1)) * 100));

    return (
      <View key={label} style={styles.macroCol}>
        <View style={styles.macroHeader}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={[styles.macroValue, { color }]}>
            {current}/{target}g
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percent}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* Top Calorie Budget Computation Row */}
      <View style={styles.calorieRow}>
        <View style={styles.calorieLeftBlock}>
          <Text style={styles.caloriesLeftNumber}>{caloriesLeft}</Text>
          <Text style={styles.caloriesLeftLabel}>kcal remaining</Text>
        </View>

        <View style={styles.calorieFormula}>
          <View style={styles.formulaItem}>
            <Text style={styles.formulaValue}>{calorieGoal}</Text>
            <Text style={styles.formulaLabel}>Goal</Text>
          </View>
          <Text style={styles.formulaOperator}>-</Text>
          <View style={styles.formulaItem}>
            <Text style={styles.formulaValue}>{foodCalories}</Text>
            <Text style={styles.formulaLabel}>Food</Text>
          </View>
          <Text style={styles.formulaOperator}>+</Text>
          <View style={styles.formulaItem}>
            <Text style={styles.formulaValue}>{exerciseCalories}</Text>
            <Text style={styles.formulaLabel}>Exercise</Text>
          </View>
        </View>
      </View>

      {/* Calorie Progress Bar */}
      <View style={styles.overallTrack}>
        <View
          style={[
            styles.overallFill,
            { width: `${caloriePercent}%`, backgroundColor: colors.macros.calories },
          ]}
        />
      </View>

      {/* Earth-tone Macro Breakdown Bars */}
      <View style={styles.macrosRow}>
        {renderMacroBar(
          'Protein',
          protein.current,
          protein.target,
          colors.macros.protein
        )}
        {renderMacroBar(
          'Carbs',
          carbs.current,
          carbs.target,
          colors.macros.carbs
        )}
        {renderMacroBar('Fat', fat.current, fat.target, colors.macros.fat)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  calorieLeftBlock: {
    alignItems: 'flex-start',
  },
  caloriesLeftNumber: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: colors.brandGreenDark,
    lineHeight: typography.lineHeights.title,
  },
  caloriesLeftLabel: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  calorieFormula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  formulaItem: {
    alignItems: 'center',
  },
  formulaValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semiBold,
    color: colors.text.primary,
  },
  formulaLabel: {
    fontSize: typography.sizes.xs - 2,
    color: colors.text.muted,
  },
  formulaOperator: {
    fontSize: typography.sizes.sm,
    color: colors.text.muted,
  },
  overallTrack: {
    height: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  overallFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  macroCol: {
    flex: 1,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  macroLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  macroValue: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
