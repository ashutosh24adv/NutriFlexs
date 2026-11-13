import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { radii } from '../../src/theme/radii';
import { CalorieBudgetCard } from '../../src/components/CalorieBudgetCard';
import { MacroRings } from '../../src/components/MacroRings';
import { MealDiarySection, MealHistoryItem } from '../../src/components/MealDiarySection';
import { MealLoggerModal, MealSlot } from '../../src/components/MealLoggerModal';
import { MealScannerModal } from '../../src/components/MealScannerModal';
import { WaterTracker } from '../../src/components/WaterTracker';
import { Ionicons } from '@expo/vector-icons';
import { useHealthSync } from '../../src/services/useHealthSync';
import { useDiaryStore } from '../../src/store/diaryStore';

type TimeframeOption = '1d' | '1w' | '1m' | '1y' | 'All Time';
const TIMEFRAME_OPTIONS: TimeframeOption[] = ['1d', '1w', '1m', '1y', 'All Time'];

export default function TrackTodayScreen() {
  const router = useRouter();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('1w');
  const [activeNotice, setActiveNotice] = useState<string | null>(null);
  const [loggerModalVisible, setLoggerModalVisible] = useState(false);
  const [loggerMode, setLoggerMode] = useState<'search' | 'quick-add' | 'water'>('search');
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [selectedSlotForLog, setSelectedSlotForLog] = useState<MealSlot | undefined>(undefined);

  // Real native biometric telemetry (active burned adjusts calorie budget)
  const {
    telemetry,
    targets,
  } = useHealthSync();

  // Real logged meals & macro tracking strictly from Zustand / backend
  const {
    todayMeals,
    todayCalories,
    todayProtein,
    todayCarbs,
    todayFat,
    waterMl,
    dateGroups,
    streakDays,
    calculateNutritionScore,
    addMeal,
    addWater,
    setWaterMl,
  } = useDiaryStore();

  const calorieGoal = targets.calories || 2000;
  const foodCalories = todayCalories; // strictly real food logged
  const burnCalories = telemetry.activeBurned || 0; // strictly real active calories burned
  // Remaining = Goal - Food Logged + Active Calories Burned
  const caloriesRemaining = Math.max(0, calorieGoal - foodCalories + burnCalories);

  const carbs = {
    current: todayCarbs,
    target: targets.carbsGrams || 250,
  };
  const protein = {
    current: todayProtein,
    target: targets.proteinGrams || 120,
  };
  const fat = {
    current: todayFat,
    target: targets.fatGrams || 65,
  };

  const nutritionScore = calculateNutritionScore(calorieGoal, protein.target);

  // 4 Primary Quick Action Buttons (conforming to Swiggy/Zomato fitness style)
  const quickActions = [
    {
      id: 'search',
      label: 'Search',
      icon: 'search-outline' as const,
      color: '#1D4D3E',
      onPress: () => {
        setLoggerMode('search');
        setSelectedSlotForLog(undefined);
        setLoggerModalVisible(true);
      },
    },
    {
      id: 'snap',
      label: 'Snap',
      icon: 'camera-outline' as const,
      color: '#1D4D3E',
      badge: 'AI',
      onPress: () => {
        setScannerModalVisible(true);
      },
    },
    {
      id: 'quick-add',
      label: 'Quick add',
      icon: 'flash-outline' as const,
      color: '#EA580C',
      onPress: () => {
        setLoggerMode('quick-add');
        setSelectedSlotForLog(undefined);
        setLoggerModalVisible(true);
      },
    },
    {
      id: 'water',
      label: 'Water',
      icon: 'water-outline' as const,
      color: '#0284C7',
      onPress: () => {
        addWater(250);
        setActiveNotice(`Hydration logged: +250ml (Total: ${((waterMl + 250) / 1000).toFixed(2)}L)`);
      },
    },
  ];

  const handleLogNewMeal = (slot?: MealSlot | string) => {
    if (slot && ['Breakfast', 'Lunch', 'Snacks', 'Dinner'].includes(slot as string)) {
      setSelectedSlotForLog(slot as MealSlot);
    } else {
      setSelectedSlotForLog(undefined);
    }
    setLoggerMode('search');
    setLoggerModalVisible(true);
  };

  const handleMealPress = (meal: MealHistoryItem) => {
    setActiveNotice(`Viewing: ${meal.title} (${meal.calories} kcal)`);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Streak & Nutrition Score Bar */}
        <View style={styles.topStatusRow}>
          {/* Streak Badge */}
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={14} color="#EA580C" style={{ marginRight: 4 }} />
            <Text style={styles.streakText}>
              {streakDays > 0 ? `${streakDays} Day Streak` : '0 Day Streak'}
            </Text>
          </View>

          {/* Nutrition Score Badge */}
          <View style={styles.scoreBadge}>
            <Ionicons name="ribbon" size={14} color="#1D4D3E" style={{ marginRight: 4 }} />
            <Text style={styles.scoreText}>
              {nutritionScore !== null
                ? `Nutrition Score: ${nutritionScore}/100`
                : 'Nutrition Score: --'}
            </Text>
          </View>
        </View>

        {/* Timeframe Filter Pills */}
        <View style={styles.timeframeRow}>
          {TIMEFRAME_OPTIONS.map((tf) => {
            const isActive = selectedTimeframe === tf;
            return (
              <TouchableOpacity
                key={tf}
                activeOpacity={0.7}
                onPress={() => setSelectedTimeframe(tf)}
                style={[
                  styles.timeframePill,
                  isActive && styles.timeframePillActive,
                ]}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    isActive && styles.timeframeTextActive,
                  ]}
                >
                  {tf}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hero Calorie Budget Circular Progress Ring */}
        {/* Remaining = Goal - Food Logged + Active Calories Burned */}
        <CalorieBudgetCard
          consumedCalories={foodCalories}
          targetCalories={calorieGoal}
          remaining={caloriesRemaining}
          activeBurned={burnCalories}
          streakDays={streakDays}
          onPress={() => router.push('/health-connections')}
        />

        {/* 3-Column Macro Progress Strips */}
        <MacroRings
          carbs={carbs}
          protein={protein}
          fat={fat}
        />

        {/* Full-width Solid Forest Green Pill CTA Button: + Log New Meal */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleLogNewMeal()}
            style={styles.logMealCtaButton}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.logMealCtaText}>Log New Meal</Text>
          </TouchableOpacity>
        </View>

        {/* Notice Banner */}
        {activeNotice && (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>{activeNotice}</Text>
            <TouchableOpacity onPress={() => setActiveNotice(null)}>
              <Text style={styles.noticeDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4 Crisp Quick Action Buttons: Search, Snap (AI), Quick Add, Water */}
        <View style={styles.quickLogRow}>
          {quickActions.map((act) => (
            <TouchableOpacity
              key={act.id}
              activeOpacity={0.7}
              onPress={act.onPress}
              style={styles.quickLogButton}
            >
              <View style={styles.quickLogIconContainer}>
                <Ionicons name={act.icon} size={20} color={act.color} />
                {act.badge && (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgePillText}>{act.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.quickLogLabel}>{act.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily Hydration Water Tracker */}
        <View style={styles.waterSection}>
          <WaterTracker
            currentMl={waterMl}
            goalMl={3000}
            onAddWater={(ml) => {
              addWater(ml);
              setActiveNotice(`Hydration logged: +${ml}ml (Total: ${((waterMl + ml) / 1000).toFixed(2)}L)`);
            }}
          />
        </View>

        {/* Structured Meal History Diary Section with Real Empty States */}
        <MealDiarySection
          meals={todayMeals}
          groups={dateGroups}
          onPressMeal={handleMealPress}
          onAddMeal={(slot) => handleLogNewMeal(slot)}
          onLogMeal={(slot) => handleLogNewMeal(slot)}
        />
      </ScrollView>

      {/* Interactive Meal & Water Logger Modal */}
      <MealLoggerModal
        visible={loggerModalVisible}
        onClose={() => setLoggerModalVisible(false)}
        initialMode={loggerMode}
        onMealLogged={(meal) => {
          addMeal({
            title: meal.name,
            category: (selectedSlotForLog || meal.slot) as MealHistoryItem['category'],
            calories: meal.calories,
            macros: {
              protein: meal.protein,
              carbs: meal.carbs,
              fat: meal.fat,
            },
          });
          setActiveNotice(`Logged: ${meal.name} (${meal.calories} kcal)`);
        }}
        onWaterLogged={(newTotalMl) => {
          setWaterMl(newTotalMl);
          setActiveNotice(`Water updated: ${(newTotalMl / 1000).toFixed(2)}L`);
        }}
        initialWaterMl={waterMl}
      />

      {/* AI Snap-to-Calorie Meal Scanner Modal */}
      <MealScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onMealLogged={(meal) => {
          setActiveNotice(`AI Logged: ${meal.title} (${meal.calories} kcal)`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Off-white canvas
  },
  scrollContent: {
    paddingBottom: 90,
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  streakText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#EA580C',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C6DED4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  scoreText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  timeframeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  timeframePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeframePillActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  timeframeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: '#6B7280',
  },
  timeframeTextActive: {
    color: '#FFFFFF',
    fontFamily: typography.fontFamilies.bold,
  },
  ctaContainer: {
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  logMealCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4D3E', // Solid Forest Green Pill
    paddingVertical: 14,
    borderRadius: radii.pill,
    shadowColor: '#1D4D3E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  logMealCtaText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  noticeText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: '#92400E',
  },
  noticeDismiss: {
    fontSize: typography.sizes.sm,
    color: '#92400E',
    paddingLeft: spacing.sm,
  },
  quickLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  quickLogButton: {
    alignItems: 'center',
    width: 68,
  },
  quickLogIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  badgePill: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#1D4D3E',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickLogLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: '#374151',
  },
  waterSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
