import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { radii } from '../../src/theme/radii';

export default function ReorderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past Favorites & Quick Reorder</Text>
      <Text style={styles.subtitle}>One-tap reorder your gym recovery fuel</Text>

      <View style={styles.card}>
        <View style={styles.orderInfo}>
          <Text style={styles.itemName}>High Protein Peanut Butter Banana Shake</Text>
          <Text style={styles.kioskText}>Ordered yesterday at Cult.fit HSR Layout</Text>
          <Text style={styles.macroText}>32g protein • 420 kcal</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.reorderButton}>
          <Text style={styles.reorderButtonText}>Reorder ₹199</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderInfo: {
    marginBottom: spacing.md,
  },
  itemName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  kioskText: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  macroText: {
    fontSize: typography.sizes.xs,
    color: colors.macros.protein,
    fontWeight: typography.weights.semiBold,
    marginTop: 4,
  },
  reorderButton: {
    backgroundColor: colors.brandGreen,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.touchTargetMin,
  },
  reorderButtonText: {
    color: colors.text.inverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});
