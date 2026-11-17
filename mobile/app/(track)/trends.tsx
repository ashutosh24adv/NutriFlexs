import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { radii } from '../../src/theme/radii';
import { StackedBarChart, DailyMacroData } from '../../src/components/StackedBarChart';
import { MealLoggerModal } from '../../src/components/MealLoggerModal';
import { Ionicons } from '@expo/vector-icons';
import { useDiaryStore } from '../../src/store/diaryStore';
import { useHealthSync } from '../../src/services/useHealthSync';
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

export default function TrackTrendsScreen() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>('1w');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loggerModalVisible, setLoggerModalVisible] = useState(false);

  const { targets } = useHealthSync();
  const [remoteTargets, setRemoteTargets] = useState<{ calories: number; proteinGrams: number } | null>(null);
  const [remoteTrends, setRemoteTrends] = useState<DailyMacroData[] | null>(null);

  const {
    todayMeals,
    todayCalories,
    todayProtein,
    todayCarbs,
    todayFat,
    get7DayHistory,
    calculateNutritionScore,
    addMeal,
    setWaterMl,
    waterMl,
  } = useDiaryStore();

  const todayDateStr = new Date().toISOString().split('T')[0];

  // Fetch real 7-day bars from GET /api/mobile/nutrition/summary?date=YYYY-MM-DD
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

            if (summary.targets) {
              setRemoteTargets({
                calories: summary.targets.calories || summary.targets.dailyCalorieGoal || 2000,
                proteinGrams: summary.targets.proteinGrams || summary.targets.proteinGoal || 120,
              });
            }

            const rawTrends = summary.trends || summary.history || summary.sevenDayTrends;
            if (Array.isArray(rawTrends) && rawTrends.length > 0) {
              const mapped: DailyMacroData[] = rawTrends.map((t: any) => {
                const dateStr = t.date || t.dateStr || '';
                let dayName = t.day || t.dayName;
                if (!dayName && dateStr) {
                  const d = new Date(dateStr);
                  if (!isNaN(d.getTime())) {
                    dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                  }
                }
                return {
                  day: dayName || 'Day',
                  dateStr,
                  protein: Math.round(t.protein || 0),
                  carbs: Math.round(t.carbohydrates || t.carbs || 0),
                  fat: Math.round(t.fat || t.fats || 0),
                  calories: Math.round(t.calories || 0),
                  isToday: Boolean(t.isToday ?? (dateStr === todayDateStr)),
                };
              });
              setRemoteTrends(mapped);
            }
            break;
          }
        } catch {
          // try next url
        }
      }
    } catch (e) {
      // offline fallback
    }
  }, [todayDateStr]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const targetCalories = remoteTargets?.calories || targets.calories || 2000;
  const targetProtein = remoteTargets?.proteinGrams || targets.proteinGrams || 120;

  // Real 7-day bars fetched from backend summary, with fallback to real local history
  const weekData = remoteTrends && remoteTrends.length > 0 ? remoteTrends : get7DayHistory();
  const hasLoggedData = todayMeals.length > 0 || weekData.some((d) => d.calories > 0);
  const nutritionScore = calculateNutritionScore(targetCalories, targetProtein);

  // Dynamic macro adherence percentages
  const proteinPct = Math.min(100, Math.round((todayProtein / Math.max(1, targetProtein)) * 100));
  const caloriePct = Math.min(100, Math.round((todayCalories / Math.max(1, targetCalories)) * 100));
  const balancePct = hasLoggedData
    ? Math.min(100, Math.max(10, Math.round((proteinPct * 0.6) + (caloriePct * 0.4))))
    : 0;

  // Real hit rate calculation across 7 days
  const proteinHitDays = weekData.filter((d) => d.protein >= targetProtein * 0.75).length;
  const calorieHitDays = weekData.filter(
    (d) => d.calories >= targetCalories * 0.75 && d.calories <= targetCalories * 1.15
  ).length;

  const handleLogMeal = () => {
    setLoggerModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Trends</Text>
          <Text style={styles.subtitle}>Calorie balance & macro consistency</Text>
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

        {/* Status Toast/Message */}
        {statusMessage && (
          <View style={styles.toastBanner}>
            <Text style={styles.toastText}>{statusMessage}</Text>
            <TouchableOpacity onPress={() => setStatusMessage(null)}>
              <Text style={styles.toastDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dynamic Nutrition Score Hero Card */}
        <View style={styles.scoreHeroCard}>
          <View style={styles.scoreHeaderRow}>
            <View style={styles.scoreTitleGroup}>
              <View style={styles.awardCircle}>
                <Ionicons name="ribbon" size={20} color="#1D4D3E" />
              </View>
              <View>
                <Text style={styles.scoreHeroTitle}>Nutrition Score</Text>
                <Text style={styles.scoreSubtext}>
                  {nutritionScore !== null
                    ? `Adherence based on today's logged meals`
                    : 'Log your first meal to unlock score'}
                </Text>
              </View>
            </View>
            <View style={styles.scoreNumberContainer}>
              <Text style={styles.scoreBig}>
                {nutritionScore !== null ? nutritionScore : '--'}
              </Text>
              <Text style={styles.scoreOutOf}>/100</Text>
            </View>
          </View>

          {/* Metric Sub-bars */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Protein</Text>
              <Text style={styles.breakdownValue}>{hasLoggedData ? `${proteinPct}%` : '0%'}</Text>
              <View style={styles.breakdownBarTrack}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    { width: `${hasLoggedData ? proteinPct : 0}%`, backgroundColor: '#1D4D3E' },
                  ]}
                />
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Calories</Text>
              <Text style={styles.breakdownValue}>{hasLoggedData ? `${caloriePct}%` : '0%'}</Text>
              <View style={styles.breakdownBarTrack}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    { width: `${hasLoggedData ? caloriePct : 0}%`, backgroundColor: '#F59E0B' },
                  ]}
                />
              </View>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Macro Balance</Text>
              <Text style={styles.breakdownValue}>{hasLoggedData ? `${balancePct}%` : '0%'}</Text>
              <View style={styles.breakdownBarTrack}>
                <View
                  style={[
                    styles.breakdownBarFill,
                    { width: `${hasLoggedData ? balancePct : 0}%`, backgroundColor: '#EA580C' },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* 7-Day Stacked Capsule Pill Bar Chart built strictly from real logs */}
        <StackedBarChart
          title="7-Day Stacked Macro Breakdown"
          data={weekData}
        />

        {/* Consistency Stat Cards */}
        <View style={styles.statCardsRow}>
          {/* Protein Target Hit Rate */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Ionicons name="checkmark-circle" size={16} color="#1D4D3E" />
              <Text style={styles.statCardTitle}>Protein Hit Rate</Text>
            </View>
            <Text style={styles.statLarge}>{proteinHitDays} / 7 Days</Text>
            <Text style={styles.statSubtext}>
              {hasLoggedData ? `Target: ${targetProtein}g daily` : 'No logs recorded'}
            </Text>
          </View>

          {/* Calorie Consistency */}
          <View style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Ionicons name="trending-up" size={16} color="#1D4D3E" />
              <Text style={styles.statCardTitle}>Calorie Target</Text>
            </View>
            <Text style={styles.statLarge}>{calorieHitDays} / 7 Days</Text>
            <Text style={styles.statSubtext}>
              {hasLoggedData ? `Target: ${targetCalories} kcal` : 'No logs recorded'}
            </Text>
          </View>
        </View>

        {/* Full-width Solid Forest Green Pill CTA Button: + Log New Meal */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleLogMeal}
            style={styles.logMealCtaButton}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.logMealCtaText}>Log New Meal</Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Meal & Water Logger Modal */}
        <MealLoggerModal
          visible={loggerModalVisible}
          onClose={() => setLoggerModalVisible(false)}
          onMealLogged={(meal) => {
            addMeal({
              title: meal.name,
              category: meal.slot,
              calories: meal.calories,
              macros: {
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
              },
            });
            setStatusMessage(`Logged ${meal.name} (${meal.calories} kcal)`);
            fetchSummary();
          }}
          onWaterLogged={(newTotalMl) => {
            setWaterMl(newTotalMl);
            setStatusMessage(`Water logged: ${(newTotalMl / 1000).toFixed(2)}L`);
            fetchSummary();
          }}
          initialWaterMl={waterMl}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Off-white canvas
  },
  scrollContent: {
    paddingBottom: 80,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  timeframeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
    gap: 8,
  },
  timeframePill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  timeframePillActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  timeframeText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.medium,
    color: '#4B5563',
  },
  timeframeTextActive: {
    fontFamily: typography.fontFamilies.bold,
    color: '#FFFFFF',
  },
  toastBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F1ED',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#C6DED4',
  },
  toastText: {
    fontSize: typography.sizes.xs,
    color: '#1D4D3E',
    fontFamily: typography.fontFamilies.medium,
  },
  toastDismiss: {
    fontSize: typography.sizes.sm,
    color: '#1D4D3E',
    fontFamily: typography.fontFamilies.bold,
    marginLeft: 8,
  },
  scoreHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBECE8',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  scoreHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  awardCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.round,
    backgroundColor: '#E8F1ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreHeroTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
  },
  scoreSubtext: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: typography.fontFamilies.medium,
  },
  scoreNumberContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreBig: {
    fontSize: 32,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  scoreOutOf: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.bold,
    color: '#9CA3AF',
    marginLeft: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: spacing.xs,
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: '#6B7280',
    marginBottom: 2,
  },
  breakdownValue: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
    marginBottom: 4,
  },
  breakdownBarTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  statCardsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    padding: spacing.md,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statCardTitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: '#6B7280',
  },
  statLarge: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
    marginVertical: 2,
  },
  statSubtext: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: '#9CA3AF',
  },
  ctaContainer: {
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  logMealCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4D3E',
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  logMealCtaText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
  },
});
