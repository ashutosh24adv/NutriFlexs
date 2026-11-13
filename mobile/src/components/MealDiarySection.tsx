import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';

export type DiarySlot = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';

export interface MealMacro {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealHistoryItem {
  id: string;
  category: DiarySlot | 'Post-Workout' | string;
  categoryLabel?: string;
  time?: string;
  title: string;
  calories: number;
  macros: MealMacro;
  autoLoggedFromOrder?: boolean;
}

export interface MealDateGroup {
  date: string;
  totalCalories: number;
  meals: MealHistoryItem[];
}

export interface MealDiarySectionProps {
  meals?: MealHistoryItem[];
  groups?: MealDateGroup[];
  onPressMeal?: (meal: MealHistoryItem) => void;
  onAddMeal?: (slot: DiarySlot | string) => void;
  onLogMeal?: (slot?: DiarySlot | string) => void;
}

interface SlotDefinition {
  key: DiarySlot;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  timeHint: string;
}

const MEAL_SLOTS: SlotDefinition[] = [
  { key: 'Breakfast', title: 'Breakfast', icon: 'cafe-outline', timeHint: '7:00 – 10:30 AM' },
  { key: 'Lunch', title: 'Lunch', icon: 'restaurant-outline', timeHint: '12:30 – 3:30 PM' },
  { key: 'Snacks', title: 'Snacks', icon: 'nutrition-outline', timeHint: '4:00 – 6:30 PM' },
  { key: 'Dinner', title: 'Dinner', icon: 'moon-outline', timeHint: '7:30 – 10:30 PM' },
];

const matchesSlot = (category: string, slot: DiarySlot): boolean => {
  const cat = (category || '').toLowerCase();
  if (slot === 'Breakfast') return cat.includes('breakfast');
  if (slot === 'Lunch') return cat.includes('lunch');
  if (slot === 'Dinner') return cat.includes('dinner');
  if (slot === 'Snacks') return cat.includes('snack') || cat.includes('workout') || cat.includes('shake');
  return false;
};

/**
 * MealDiarySection - 100% Real Meal Diary with clean empty states per slot.
 * Zero dummy/mock meals.
 */
export const MealDiarySection: React.FC<MealDiarySectionProps> = ({
  meals,
  groups,
  onPressMeal,
  onAddMeal,
  onLogMeal,
}) => {
  // Combine meals from either direct prop or groups prop (defaulting to empty array)
  const allMeals: MealHistoryItem[] =
    meals ?? (groups && groups.length > 0 ? groups.flatMap((g) => g.meals) : []);

  const handleAddPress = (slot: DiarySlot) => {
    if (onAddMeal) {
      onAddMeal(slot);
    } else if (onLogMeal) {
      onLogMeal(slot);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.mainTitle}>Meal History</Text>
          <Text style={styles.subtitle}>Daily food log & kiosk orders</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleAddPress('Lunch')}
          style={styles.headerAddBtn}
        >
          <Ionicons name="add" size={16} color="#1D4D3E" />
          <Text style={styles.headerAddBtnText}>Log Meal</Text>
        </TouchableOpacity>
      </View>

      {MEAL_SLOTS.map((slot) => {
        const slotMeals = allMeals.filter((m) => matchesSlot(m.category, slot.key));
        const slotCalories = slotMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const hasMeals = slotMeals.length > 0;

        return (
          <View key={slot.key} style={styles.slotContainer}>
            {/* Slot Header */}
            <View style={styles.slotHeaderRow}>
              <View style={styles.slotHeaderLeft}>
                <View style={styles.slotIconCircle}>
                  <Ionicons name={slot.icon} size={15} color="#1D4D3E" />
                </View>
                <Text style={styles.slotTitle}>{slot.title}</Text>
                <Text style={styles.slotTimeHint}>{slot.timeHint}</Text>
              </View>

              <View style={styles.slotHeaderRight}>
                {hasMeals ? (
                  <View style={styles.slotCaloriesBadge}>
                    <Text style={styles.slotCaloriesText}>{slotCalories} kcal</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAddPress(slot.key)}
                  style={styles.addSlotBtn}
                >
                  <Ionicons name="add" size={13} color="#1D4D3E" />
                  <Text style={styles.addSlotBtnText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Slot Content: Real Meals or Clean Empty State */}
            {hasMeals ? (
              slotMeals.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  activeOpacity={0.8}
                  onPress={() => onPressMeal?.(meal)}
                  style={styles.mealCard}
                >
                  <View style={styles.mealTopRow}>
                    <Text style={styles.mealTitle} numberOfLines={2}>
                      {meal.title}
                    </Text>
                    <View style={styles.calorieBadge}>
                      <Text style={styles.calorieText}>{meal.calories} kcal</Text>
                    </View>
                  </View>

                  <View style={styles.mealBottomRow}>
                    <View style={styles.macroBadgesContainer}>
                      <View style={[styles.compactBadge, styles.proteinBadge]}>
                        <Text style={styles.badgeLetterP}>P</Text>
                        <Text style={styles.badgeValueP}>{meal.macros?.protein ?? 0}g</Text>
                      </View>
                      <View style={[styles.compactBadge, styles.carbsBadge]}>
                        <Text style={styles.badgeLetterC}>C</Text>
                        <Text style={styles.badgeValueC}>{meal.macros?.carbs ?? 0}g</Text>
                      </View>
                      <View style={[styles.compactBadge, styles.fatBadge]}>
                        <Text style={styles.badgeLetterF}>F</Text>
                        <Text style={styles.badgeValueF}>{meal.macros?.fat ?? 0}g</Text>
                      </View>
                    </View>

                    {meal.autoLoggedFromOrder && (
                      <View style={styles.autoLogPill}>
                        <Ionicons
                          name="sparkles"
                          size={11}
                          color="#1D4D3E"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.autoLogText}>Kiosk Order</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptySlotCard}>
                <Text style={styles.emptySlotText}>
                  No meals logged yet — order from a kiosk or tap + Log Meal
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAddPress(slot.key)}
                  style={styles.emptySlotAddBtn}
                >
                  <Ionicons name="add" size={14} color="#1D4D3E" style={{ marginRight: 2 }} />
                  <Text style={styles.emptySlotAddText}>+ Add</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mainTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: '#111111',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: typography.weights.medium,
    marginTop: 1,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#C6DED4',
  },
  headerAddBtnText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
    marginLeft: 3,
  },
  slotContainer: {
    marginBottom: spacing.md,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  slotHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotIconCircle: {
    width: 26,
    height: 26,
    borderRadius: radii.round,
    backgroundColor: '#E8F1ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTitle: {
    fontSize: 13,
    fontWeight: typography.weights.bold,
    color: '#111111',
  },
  slotTimeHint: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: typography.weights.medium,
  },
  slotHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotCaloriesBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  slotCaloriesText: {
    fontSize: 11,
    fontWeight: typography.weights.semiBold,
    color: '#374151',
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8F6',
    borderWidth: 1,
    borderColor: '#EBECE8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  addSlotBtnText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
  emptySlotCard: {
    backgroundColor: '#FAFAF8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  emptySlotText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  emptySlotAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1D4D3E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  emptySlotAddText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  mealTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: '#111111',
    marginRight: 8,
  },
  calorieBadge: {
    backgroundColor: '#F7F8F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  calorieText: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: '#111111',
  },
  mealBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  proteinBadge: {
    backgroundColor: '#E8F1ED',
    borderColor: '#C6DED4',
  },
  badgeLetterP: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
    marginRight: 3,
  },
  badgeValueP: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
  carbsBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  badgeLetterC: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#B45309',
    marginRight: 3,
  },
  badgeValueC: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#B45309',
  },
  fatBadge: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FED7AA',
  },
  badgeLetterF: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#EA580C',
    marginRight: 3,
  },
  badgeValueF: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#EA580C',
  },
  autoLogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#C6DED4',
  },
  autoLogText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
});
