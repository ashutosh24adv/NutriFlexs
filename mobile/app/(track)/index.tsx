import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
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
import { useDiaryStore, diaryActions } from '../../src/store/diaryStore';
import { useAuthStore } from '../../src/store/authStore';
import { API_BASE_URL, LOCAL_USB_URL, LOCAL_LAN_URL } from '../../src/config/api';

type TimeframeOption = '1d' | '1w' | '1m' | '1y' | 'All Time';
const TIMEFRAME_OPTIONS: TimeframeOption[] = ['1d', '1w', '1m', '1y', 'All Time'];

async function getAuthToken(): Promise<string | null> {
  try {
    const SecureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
    if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
      const keys = ['token', 'auth_token', 'jwt_token'];
      for (const k of keys) {
        const val = await SecureStore.getItemAsync(k);
        if (val) return val;
      }
    }
  } catch {}
  return null;
}

export default function TrackTodayScreen() {
  const router = useRouter();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('1w');
  const [activeNotice, setActiveNotice] = useState<string | null>(null);
  const [loggerModalVisible, setLoggerModalVisible] = useState(false);
  const [loggerMode, setLoggerMode] = useState<'search' | 'quick-add' | 'water'>('search');
  const [scannerModalVisible, setScannerModalVisible] = useState(false);
  const [selectedSlotForLog, setSelectedSlotForLog] = useState<MealSlot | undefined>(undefined);

  const authStore = useAuthStore();
  const { user } = authStore;

  const authGoal = (authStore as any)?.nutritionGoal || (user as any)?.nutritionGoal;
  const authCalorieTarget =
    authGoal?.calorieTarget ||
    authGoal?.calories ||
    authGoal?.dailyCalorieGoal ||
    (user as any)?.calorieTarget ||
    (user as any)?.dailyCalorieGoal ||
    (authStore as any)?.calorieTarget;

  const authProteinTarget =
    authGoal?.proteinTarget ||
    authGoal?.protein ||
    authGoal?.proteinGrams ||
    (user as any)?.proteinTarget ||
    (user as any)?.proteinGoal ||
    (authStore as any)?.proteinTarget;

  const authCarbsTarget =
    authGoal?.carbsTarget ||
    authGoal?.carbs ||
    authGoal?.carbsGrams ||
    (user as any)?.carbsTarget ||
    (user as any)?.carbohydrateGoal ||
    (authStore as any)?.carbsTarget;

  const authFatTarget =
    authGoal?.fatsTarget ||
    authGoal?.fat ||
    authGoal?.fatGrams ||
    (user as any)?.fatsTarget ||
    (user as any)?.fatGoal ||
    (authStore as any)?.fatsTarget;

  const authWaterGoal =
    authGoal?.waterGoalMl ||
    authGoal?.water ||
    (user as any)?.waterGoalMl ||
    (authStore as any)?.waterGoalMl;

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

  const todayDateStr = new Date().toISOString().split('T')[0];

  // Real hydrated data from GET /api/mobile/nutrition/summary?date=YYYY-MM-DD
  const [remoteSummary, setRemoteSummary] = useState<{
    targets?: {
      calories?: number;
      proteinGrams?: number;
      carbsGrams?: number;
      fatGrams?: number;
      waterMl?: number;
    };
    consumed?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    };
    meals?: MealHistoryItem[];
    waterMl?: number;
    streakDays?: number;
  } | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const urls = [
        `${API_BASE_URL}/api/mobile/nutrition/summary?date=${todayDateStr}`,
        `${LOCAL_USB_URL}/api/mobile/nutrition/summary?date=${todayDateStr}`,
        `${LOCAL_LAN_URL}/api/mobile/nutrition/summary?date=${todayDateStr}`,
        `http://localhost:3000/api/mobile/nutrition/summary?date=${todayDateStr}`,
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url, { method: 'GET', headers });
          if (res.ok) {
            const data = await res.json();
            const summary = data.summary || data;

            // Normalize targets
            const rawTargets = summary.targets || {};
            const fetchedTargets = {
              calories: rawTargets.calories || rawTargets.calorieTarget || rawTargets.dailyCalorieGoal || authCalorieTarget || 2000,
              proteinGrams: rawTargets.proteinGrams || rawTargets.proteinTarget || rawTargets.proteinGoal || authProteinTarget || 120,
              carbsGrams: rawTargets.carbsGrams || rawTargets.carbsTarget || rawTargets.carbohydrateGoal || authCarbsTarget || 250,
              fatGrams: rawTargets.fatGrams || rawTargets.fatsTarget || rawTargets.fatGoal || authFatTarget || 65,
              waterMl: rawTargets.waterMl || rawTargets.waterGoalMl || rawTargets.waterGoal || authWaterGoal || 3000,
            };

            // Normalize meals/foodLogs
            const rawFoodLogs = summary.foodLogs || summary.meals || [];
            const mappedMeals: MealHistoryItem[] = rawFoodLogs.map((log: any) => {
              const mealTypeStr = (log.mealType || log.category || 'Lunch').toString();
              const category = mealTypeStr.charAt(0).toUpperCase() + mealTypeStr.slice(1).toLowerCase();
              return {
                id: log.id || `m_${Math.random()}`,
                title: log.foodNameSnapshot || log.name || log.title || 'Logged Meal',
                category: (['Breakfast', 'Lunch', 'Snacks', 'Dinner'].includes(category) ? category : 'Lunch') as any,
                calories: Math.round(log.calories || 0),
                macros: {
                  protein: Math.round(log.protein || 0),
                  carbs: Math.round(log.carbohydrates || log.carbs || 0),
                  fat: Math.round(log.fat || log.fats || 0),
                },
                autoLoggedFromOrder: Boolean(log.orderItemId || log.autoLoggedFromOrder),
              };
            });

            // Normalize water
            const waterVal =
              summary.water?.amountMl ??
              summary.water?.currentMl ??
              summary.waterLog?.amountMl ??
              summary.waterLog?.currentMl ??
              summary.waterMl;
            if (typeof waterVal === 'number' && waterVal >= 0) {
              setWaterMl(waterVal);
            }

            // Consumed macros
            const consumed = summary.consumed || {
              calories: mappedMeals.reduce((acc, m) => acc + m.calories, 0),
              protein: mappedMeals.reduce((acc, m) => acc + m.macros.protein, 0),
              carbs: mappedMeals.reduce((acc, m) => acc + m.macros.carbs, 0),
              fat: mappedMeals.reduce((acc, m) => acc + m.macros.fat, 0),
            };

            // Calculate consecutive logged days from backend summary/trends (0 for new users)
            let calculatedStreak = 0;
            if (Array.isArray(summary.trends) && summary.trends.length > 0) {
              const rev = [...summary.trends].reverse();
              for (let i = 0; i < rev.length; i++) {
                const day = rev[i];
                const dayHasLogs = (day.calories && day.calories > 0) || (i === 0 && mappedMeals.length > 0);
                if (dayHasLogs) {
                  calculatedStreak++;
                } else if (i === 0) {
                  // If today has no meal logged yet, allow streak to continue from yesterday
                  continue;
                } else {
                  break;
                }
              }
            } else if (mappedMeals.length > 0) {
              calculatedStreak = 1;
            }

            const apiStreakDays =
              typeof summary.streakDays === 'number'
                ? summary.streakDays
                : typeof summary.user?.streakDays === 'number'
                ? summary.user.streakDays
                : calculatedStreak;

            setRemoteSummary({
              targets: fetchedTargets,
              consumed,
              meals: mappedMeals,
              waterMl: typeof waterVal === 'number' ? waterVal : undefined,
              streakDays: apiStreakDays,
            });
            break;
          }
        } catch {
          // try next url
        }
      }
    } catch (e) {
      // offline fallback
    }
  }, [todayDateStr, setWaterMl, authCalorieTarget, authProteinTarget, authCarbsTarget, authFatTarget, authWaterGoal]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const calorieGoal =
    authCalorieTarget ||
    (remoteSummary?.targets?.calories && remoteSummary.targets.calories !== 2000 ? remoteSummary.targets.calories : null) ||
    remoteSummary?.targets?.calories ||
    (targets.calories && targets.calories !== 2000 ? targets.calories : null) ||
    2000;
  const activeMeals = remoteSummary?.meals !== undefined ? remoteSummary.meals : todayMeals;

  const foodCalories = remoteSummary?.consumed?.calories !== undefined
    ? remoteSummary.consumed.calories
    : activeMeals.reduce((acc, m) => acc + m.calories, 0);

  const burnCalories = telemetry.activeBurned || 0; // strictly real active calories burned
  // Remaining = Goal - Food Logged + Active Calories Burned
  const caloriesRemaining = Math.max(0, calorieGoal - foodCalories + burnCalories);

  const carbs = {
    current: remoteSummary?.consumed?.carbs !== undefined
      ? remoteSummary.consumed.carbs
      : activeMeals.reduce((acc, m) => acc + m.macros.carbs, 0),
    target: authCarbsTarget || (remoteSummary?.targets?.carbsGrams && remoteSummary.targets.carbsGrams !== 250 ? remoteSummary.targets.carbsGrams : null) || remoteSummary?.targets?.carbsGrams || targets.carbsGrams || 250,
  };
  const protein = {
    current: remoteSummary?.consumed?.protein !== undefined
      ? remoteSummary.consumed.protein
      : activeMeals.reduce((acc, m) => acc + m.macros.protein, 0),
    target: authProteinTarget || (remoteSummary?.targets?.proteinGrams && remoteSummary.targets.proteinGrams !== 120 ? remoteSummary.targets.proteinGrams : null) || remoteSummary?.targets?.proteinGrams || targets.proteinGrams || 120,
  };
  const fat = {
    current: remoteSummary?.consumed?.fat !== undefined
      ? remoteSummary.consumed.fat
      : activeMeals.reduce((acc, m) => acc + m.macros.fat, 0),
    target: authFatTarget || (remoteSummary?.targets?.fatGrams && remoteSummary.targets.fatGrams !== 65 ? remoteSummary.targets.fatGrams : null) || remoteSummary?.targets?.fatGrams || targets.fatGrams || 65,
  };
  const waterGoal = authWaterGoal || remoteSummary?.targets?.waterMl || targets.waterMl || 3000;

  // Compute streakDays dynamically (0 for new user, never hardcoded 5)
  const dynamicStreakDays = React.useMemo(() => {
    if (typeof remoteSummary?.streakDays === 'number') {
      return remoteSummary.streakDays;
    }
    if (activeMeals.length === 0 && todayMeals.length === 0 && dateGroups.length === 0) {
      return 0;
    }
    return streakDays || 0;
  }, [remoteSummary, activeMeals.length, todayMeals.length, dateGroups.length, streakDays]);

  const nutritionScore = calculateNutritionScore(calorieGoal, protein.target);

  // Wire water logging (+250ml, +500ml) to POST /api/mobile/nutrition/water
  const handleLogWater = async (amount: number) => {
    addWater(amount);
    const newTotal = waterMl + amount;
    setActiveNotice(`Hydration logged: +${amount}ml (Total: ${(newTotal / 1000).toFixed(2)}L)`);

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const urls = [
        `${API_BASE_URL}/api/mobile/nutrition/water`,
        `${LOCAL_USB_URL}/api/mobile/nutrition/water`,
        `${LOCAL_LAN_URL}/api/mobile/nutrition/water`,
        'http://localhost:3000/api/mobile/nutrition/water',
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              date: todayDateStr,
              amountMl: amount,
              waterMl: newTotal,
            }),
          });
          if (res.ok) {
            break;
          }
        } catch {}
      }
    } catch (e) {
      console.warn('[WaterLog] Error syncing water:', e);
    }
  };

  // 4 Primary Quick Action Buttons
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
        handleLogWater(250);
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

  // Wire delete meal to DELETE /api/mobile/nutrition/food-log/[id]
  const handleMealPress = (meal: MealHistoryItem) => {
    Alert.alert(
      meal.title,
      `${meal.calories} kcal • P: ${meal.macros?.protein}g  C: ${meal.macros?.carbs}g  F: ${meal.macros?.fat}g\n\nManage this logged meal:`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete Meal',
          style: 'destructive',
          onPress: async () => {
            // Delete locally first for responsive UI
            diaryActions.deleteMeal(meal.id);
            setRemoteSummary((prev) => {
              if (!prev || !prev.meals) return prev;
              const nextMeals = prev.meals.filter((m) => m.id !== meal.id);
              return {
                ...prev,
                meals: nextMeals,
                consumed: {
                  calories: nextMeals.reduce((s, m) => s + m.calories, 0),
                  protein: nextMeals.reduce((s, m) => s + m.macros.protein, 0),
                  carbs: nextMeals.reduce((s, m) => s + m.macros.carbs, 0),
                  fat: nextMeals.reduce((s, m) => s + m.macros.fat, 0),
                },
              };
            });
            setActiveNotice(`Deleted: ${meal.title}`);

            try {
              const token = await getAuthToken();
              const headers: Record<string, string> = { 'Content-Type': 'application/json' };
              if (token) headers['Authorization'] = `Bearer ${token}`;

              const urls = [
                `${API_BASE_URL}/api/mobile/nutrition/food-log/${meal.id}`,
                `${LOCAL_USB_URL}/api/mobile/nutrition/food-log/${meal.id}`,
                `${LOCAL_LAN_URL}/api/mobile/nutrition/food-log/${meal.id}`,
                `http://localhost:3000/api/mobile/nutrition/food-log/${meal.id}`,
              ];

              for (const url of urls) {
                try {
                  const res = await fetch(url, { method: 'DELETE', headers });
                  if (res.ok) break;
                } catch {}
              }
            } catch (err) {
              console.warn('[DeleteMeal] Error syncing delete:', err);
            }
          },
        },
      ]
    );
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
              {dynamicStreakDays > 0 ? `${dynamicStreakDays} Day Streak` : '0 Day Streak'}
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
          streakDays={dynamicStreakDays}
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
            goalMl={waterGoal}
            onAddWater={(ml) => {
              handleLogWater(ml);
            }}
          />
        </View>

        {/* Structured Meal History Diary Section with Real Empty States */}
        <MealDiarySection
          meals={activeMeals}
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
          fetchSummary();
        }}
        onWaterLogged={async (newTotalMl) => {
          setWaterMl(newTotalMl);
          setActiveNotice(`Water updated: ${(newTotalMl / 1000).toFixed(2)}L`);
          try {
            const token = await getAuthToken();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const urls = [
              `${API_BASE_URL}/api/mobile/nutrition/water`,
              `${LOCAL_USB_URL}/api/mobile/nutrition/water`,
              `${LOCAL_LAN_URL}/api/mobile/nutrition/water`,
              'http://localhost:3000/api/mobile/nutrition/water',
            ];
            for (const u of urls) {
              try {
                const res = await fetch(u, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    date: todayDateStr,
                    totalMl: newTotalMl,
                    mode: 'set',
                  }),
                });
                if (res.ok) break;
              } catch {}
            }
          } catch {}
          fetchSummary();
        }}
        initialWaterMl={waterMl}
      />

      {/* AI Snap-to-Calorie Meal Scanner Modal */}
      <MealScannerModal
        visible={scannerModalVisible}
        onClose={() => setScannerModalVisible(false)}
        onMealLogged={(meal) => {
          setActiveNotice(`AI Logged: ${meal.title} (${meal.calories} kcal)`);
          fetchSummary();
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
