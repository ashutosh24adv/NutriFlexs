import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';

export interface DailyMacroData {
  day: string;
  dateStr?: string;
  protein: number; // grams
  carbs: number;   // grams
  fat: number;     // grams
  calories: number;
  isToday?: boolean;
}

export interface StackedBarChartProps {
  data?: DailyMacroData[];
  selectedDay?: string;
  onSelectDay?: (day: string) => void;
  title?: string;
}

const DEFAULT_WEEK_DATA: DailyMacroData[] = [
  { day: 'Mon', protein: 0, carbs: 0, fat: 0, calories: 0, isToday: false },
  { day: 'Tue', protein: 0, carbs: 0, fat: 0, calories: 0, isToday: false },
  { day: 'Wed', protein: 0, carbs: 0, fat: 0, calories: 0, isToday: false },
  { day: 'Thu', protein: 0, carbs: 0, fat: 0, calories: 0, isToday: false },
  { day: 'Fri', protein: 0, carbs: 0, fat: 0, calories: 0, isToday: false },
  { day: 'Sat', protein: 0, carbs: 0, fat: 0, calories: 0, isToday: false },
  { day: 'Sun', protein: 0, carbs: 0, fat: 0, calories: 0, isToday: false },
];

/**
 * StackedBarChart - 7-day Mon-Sun stacked capsule pill bar chart.
 * Specification:
 * - 7 days (Mon-Sun) stacked capsule pills
 * - #1D4D3E (Forest Green - Protein)
 * - #F59E0B (Amber - Carbs)
 * - #EA580C (Coral - Fat)
 * - Track: #E5E7EB
 * - Clean white card with 1px solid #EBECE8 border. Flat colors, no gradients.
 */
export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data = DEFAULT_WEEK_DATA,
  selectedDay = 'Thu',
  onSelectDay,
  title = '7-Day Macro Distribution',
}) => {
  // Max total macro grams for normalized scaling
  const maxTotalGrams = Math.max(
    ...data.map((d) => d.protein + d.carbs + d.fat),
    450
  );

  const activeDays = data.filter((d) => d.calories > 0);
  const avgCalories =
    activeDays.length > 0
      ? Math.round(activeDays.reduce((acc, d) => acc + d.calories, 0) / activeDays.length)
      : 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Stacked macro intake (Mon – Sun)</Text>
        </View>
        <View style={styles.avgPill}>
          <Text style={styles.avgText}>
            {avgCalories > 0 ? `Avg ${avgCalories.toLocaleString()} kcal` : '0 kcal logged'}
          </Text>
        </View>
      </View>

      {/* 7-Day Chart Area */}
      <View style={styles.chartArea}>
        {data.map((item) => {
          const isSelected = item.day === selectedDay || item.isToday;
          const totalGrams = item.protein + item.carbs + item.fat;
          const barHeightRatio = totalGrams > 0 ? totalGrams / maxTotalGrams : 0;

          // Height percentages relative to capsule fill (guarded against division by zero)
          const proteinPct = totalGrams > 0 ? Math.round((item.protein / totalGrams) * 100) : 0;
          const carbsPct = totalGrams > 0 ? Math.round((item.carbs / totalGrams) * 100) : 0;
          const fatPct = totalGrams > 0 ? Math.round((item.fat / totalGrams) * 100) : 0;

          return (
            <TouchableOpacity
              key={item.day}
              activeOpacity={0.7}
              onPress={() => onSelectDay?.(item.day)}
              style={styles.dayCol}
            >
              {/* Daily Calorie Label */}
              <Text style={[styles.calLabel, isSelected && styles.calLabelActive]}>
                {item.calories}
              </Text>

              {/* Stacked Capsule Pill Bar */}
              <View style={[styles.capsuleTrack, isSelected && styles.capsuleTrackSelected]}>
                {/* Fat (Coral #EA580C) at top */}
                <View
                  style={[
                    styles.segment,
                    { height: `${fatPct * barHeightRatio}%`, backgroundColor: '#EA580C' },
                  ]}
                />
                {/* Carbs (Amber #F59E0B) in middle */}
                <View
                  style={[
                    styles.segment,
                    { height: `${carbsPct * barHeightRatio}%`, backgroundColor: '#F59E0B' },
                  ]}
                />
                {/* Protein (Forest Green #1D4D3E) at bottom */}
                <View
                  style={[
                    styles.segment,
                    { height: `${proteinPct * barHeightRatio}%`, backgroundColor: '#1D4D3E' },
                  ]}
                />
              </View>

              {/* Day Label */}
              <View style={[styles.dayPill, item.isToday && styles.todayPill]}>
                <Text
                  style={[
                    styles.dayText,
                    item.isToday && styles.todayText,
                    isSelected && !item.isToday && styles.selectedDayText,
                  ]}
                >
                  {item.day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend Row */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#1D4D3E' }]} />
          <Text style={styles.legendLabel}>Protein</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendLabel}>Carbohydrates</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EA580C' }]} />
          <Text style={styles.legendLabel}>Fat</Text>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#111111',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  avgPill: {
    backgroundColor: '#F7F8F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  avgText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 170,
    paddingVertical: spacing.xs,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  calLabel: {
    fontSize: 9,
    fontWeight: typography.weights.medium,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  calLabelActive: {
    fontWeight: typography.weights.bold,
    color: '#111111',
  },
  capsuleTrack: {
    width: 24,
    height: 124,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  capsuleTrackSelected: {
    borderColor: '#1D4D3E',
    borderWidth: 1.5,
  },
  segment: {
    width: '100%',
  },
  dayPill: {
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  todayPill: {
    backgroundColor: '#1D4D3E',
  },
  dayText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: '#6B7280',
  },
  todayText: {
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  selectedDayText: {
    fontWeight: typography.weights.bold,
    color: '#111111',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radii.round,
  },
  legendLabel: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: typography.weights.medium,
  },
});
