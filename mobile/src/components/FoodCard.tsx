import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';
import { shadows } from '../theme/shadows';

export interface FoodItemProps {
  id: string;
  name: string;
  isVeg: boolean;
  rating: number;
  prepTimeMinutes: number;
  proteinGrams: number;
  calories: number;
  price: number;
  quantity?: number;
  onAdd?: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onPress?: () => void;
}

/**
 * NutriFlexs Food Card matching the brief:
 * Veg/non-veg dot, rating, prep time, protein chip, kcal, price, and ADD button / stepper.
 */
export const FoodCard: React.FC<FoodItemProps> = ({
  name,
  isVeg,
  rating,
  prepTimeMinutes,
  proteinGrams,
  calories,
  price,
  quantity = 0,
  onAdd,
  onIncrement,
  onDecrement,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.card}
    >
      {/* Top Banner / Indicator */}
      <View style={styles.topRow}>
        {/* Veg / Non-veg Indicator */}
        <View
          style={[
            styles.dietaryIndicator,
            { borderColor: isVeg ? colors.veg : colors.nonVeg },
          ]}
        >
          <View
            style={[
              styles.dietaryDot,
              { backgroundColor: isVeg ? colors.veg : colors.nonVeg },
            ]}
          />
        </View>

        {/* Rating Chip */}
        <View style={styles.ratingChip}>
          <Text style={styles.ratingText}>★ {rating.toFixed(1)}</Text>
        </View>
      </View>

      {/* Item Title */}
      <Text style={styles.title} numberOfLines={2}>
        {name}
      </Text>

      {/* Prep Time */}
      <Text style={styles.prepTimeText}>⏱ {prepTimeMinutes} mins</Text>

      {/* Macro Chips */}
      <View style={styles.chipRow}>
        <View style={styles.proteinChip}>
          <Text style={styles.proteinChipText}>{proteinGrams}g protein</Text>
        </View>
        <Text style={styles.caloriesText}>{calories} kcal</Text>
      </View>

      {/* Footer: Price & ADD Button */}
      <View style={styles.footerRow}>
        <Text style={styles.priceText}>₹{price}</Text>

        {quantity === 0 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onAdd}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>ADD</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onDecrement}
              style={styles.stepperButton}
            >
              <Text style={styles.stepperActionText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperCountText}>{quantity}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onIncrement}
              style={styles.stepperButton}
            >
              <Text style={styles.stepperActionText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dietaryIndicator: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietaryDot: {
    width: 6,
    height: 6,
    borderRadius: radii.round,
  },
  ratingChip: {
    backgroundColor: colors.brandGreenSoft,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  ratingText: {
    fontSize: typography.sizes.xs - 1,
    fontWeight: typography.weights.bold,
    color: colors.brandGreenDark,
  },
  title: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 2,
    minHeight: 38,
  },
  prepTimeText: {
    fontSize: typography.sizes.xs - 1,
    color: colors.text.muted,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  proteinChip: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.xs,
    borderWidth: 0.5,
    borderColor: colors.macros.protein,
  },
  proteinChipText: {
    fontSize: typography.sizes.xs - 2,
    fontWeight: typography.weights.bold,
    color: colors.macros.protein,
  },
  caloriesText: {
    fontSize: typography.sizes.xs - 2,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: spacing.xs,
  },
  priceText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.brandGreen,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    minWidth: 64,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.brandGreen,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandGreen,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 32,
  },
  stepperButton: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  stepperActionText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  stepperCountText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    paddingHorizontal: spacing.xs,
  },
});
