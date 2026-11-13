import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type MacroKey } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';

interface MacroBadgeProps {
  type: MacroKey;
  value: number;
  label?: string;
  unit?: string;
}

const macroLabels: Record<MacroKey, string> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  calories: 'Calories',
};

const defaultUnits: Record<MacroKey, string> = {
  protein: 'g',
  carbs: 'g',
  fat: 'g',
  calories: 'kcal',
};

/**
 * Pill component displaying an earth-tone nutrient value.
 */
export const MacroBadge: React.FC<MacroBadgeProps> = ({
  type,
  value,
  label,
  unit,
}) => {
  const color = colors.macros[type];
  const displayLabel = label ?? macroLabels[type];
  const displayUnit = unit ?? defaultUnits[type];

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.labelText}>{displayLabel}</Text>
      <Text style={[styles.valueText, { color }]}>
        {value}
        <Text style={styles.unitText}> {displayUnit}</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.round,
    marginRight: spacing.xs,
  },
  labelText: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginRight: spacing.xs,
    fontWeight: typography.weights.medium,
  },
  valueText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  unitText: {
    fontSize: typography.sizes.xs - 2,
    fontWeight: typography.weights.regular,
  },
});
