import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Flame,
  Check,
  Droplets,
  Bell,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react-native';
import {
  calculateDailyTargets,
  triggerHaptic,
  mobileApiRequest,
} from './_authHelpers';
import { useAuthStore } from '../../src/store/authStore';

// Optional Reanimated loader with fallback to frame animation
let Reanimated: any = null;
try {
  // @ts-ignore
  Reanimated = typeof require !== 'undefined' ? require('react-native-reanimated') : null;
} catch {
  // Graceful fallback
}

export default function PlanReadyScreen() {
  const router = useRouter();
  const authStore = useAuthStore();
  const params = useLocalSearchParams<{
    name?: string;
    sex?: string;
    age?: string;
    heightCm?: string;
    weightKg?: string;
    workoutFrequency?: string;
    dietPreference?: string;
    primaryGoal?: string;
    desiredTargetWeightKg?: string;
    goalDays?: string;
    goalPace?: string;
    redirect?: string;
  }>();

  const fullName = params.name || 'Athlete';
  const firstName = fullName.trim().split(/\s+/)[0] || 'Athlete';
  const sex = params.sex || 'Male';
  const age = parseInt(params.age || '25', 10) || 25;
  const heightCm = parseFloat(params.heightCm || '175') || 175;
  const weightKg = parseFloat(params.weightKg || '74') || 74;
  const workoutFrequency = params.workoutFrequency || '4-6 days/wk';
  const primaryGoal = params.primaryGoal || 'Lose weight';
  const targetWeightKg = parseFloat(params.desiredTargetWeightKg || '70') || weightKg;
  const goalDays = parseInt(params.goalDays || '90', 10) || 90;
  const goalPace = params.goalPace || 'Moderate';
  const redirectTarget = params.redirect === 'order' ? '/(order)' : '/(track)';

  // Calculate science-backed daily targets
  const targets = useMemo(() => {
    return calculateDailyTargets({
      sex,
      age,
      heightCm,
      weightKg,
      workoutFrequency,
      primaryGoal,
      desiredTargetWeightKg: targetWeightKg,
    });
  }, [sex, age, heightCm, weightKg, workoutFrequency, primaryGoal, targetWeightKg]);

  // Switches
  const [calorieRollover, setCalorieRollover] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Hold-to-personalize state (1.5s = 1500ms)
  const [holdProgress, setHoldProgress] = useState(0); // 0.0 to 1.0
  const [isHolding, setIsHolding] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const holdStartTimeRef = useRef<number>(0);
  const animFrameRef = useRef<any>(null);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const startHold = () => {
    if (isCompleted || isSubmitting) return;
    setIsHolding(true);
    triggerHaptic('light');
    holdStartTimeRef.current = Date.now();

    const HOLD_DURATION_MS = 1500;

    const tick = () => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(1.0, elapsed / HOLD_DURATION_MS);
      setHoldProgress(progress);

      if (progress >= 1.0) {
        // Complete hold!
        completePersonalization();
      } else {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (isCompleted || isSubmitting) return;
    setIsHolding(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    // Smooth reset
    setHoldProgress(0);
  };

  const completePersonalization = async () => {
    setIsCompleted(true);
    setIsHolding(false);
    setIsSubmitting(true);

    // Haptics requirement: Haptics.selectionAsync
    await triggerHaptic('selection');
    await triggerHaptic('success');

    // Finalized targets dictionary matching exact names requested:
    // (calorieTarget, proteinTarget, carbsTarget, fatsTarget, waterGoalMl, calorieRollover, notificationsEnabled)
    const finalizedTargets = {
      calorieTarget: targets.calories,
      proteinTarget: targets.protein,
      carbsTarget: targets.carbs,
      fatsTarget: targets.fat,
      waterGoalMl: targets.water,
      calorieRollover,
      notificationsEnabled,
      // Standard schema aliases for backend & UI compatibility
      dailyCalorieGoal: targets.calories,
      proteinGoal: targets.protein,
      carbohydrateGoal: targets.carbs,
      fatGoal: targets.fat,
      calories: targets.calories,
      protein: targets.protein,
      carbs: targets.carbs,
      fat: targets.fat,
      water: targets.water,
      desiredTargetWeightKg: targetWeightKg,
      goalDays,
      goalPace,
      workoutFrequency,
      primaryGoal,
    };

    // 1. Immediately save finalized targets to useAuthStore
    try {
      if (typeof (authStore as any)?.setNutritionGoal === 'function') {
        (authStore as any).setNutritionGoal(finalizedTargets);
      }
      if (typeof (authStore as any)?.updateProfile === 'function') {
        (authStore as any).updateProfile({
          goals: finalizedTargets,
          targets: {
            calories: targets.calories,
            proteinGrams: targets.protein,
            carbsGrams: targets.carbs,
            fatGrams: targets.fat,
            waterMl: targets.water,
          },
        } as any);
      }
      const rawStore = useAuthStore as any;
      if (typeof rawStore.getState === 'function') {
        const storeState = rawStore.getState();
        if (typeof storeState?.setNutritionGoal === 'function') {
          storeState.setNutritionGoal(finalizedTargets);
        }
      }
    } catch (storeErr) {
      console.warn('[PlanReady] Store persistence warning:', storeErr);
    }

    // 2. Trigger PUT /api/mobile/nutrition/goals with a 5s timeout fallback
    const putGoalsPromise = mobileApiRequest('/api/mobile/nutrition/goals', {
      method: 'PUT',
      body: JSON.stringify(finalizedTargets),
    });

    const timeoutPromise = new Promise<{ ok: boolean; error: string }>((resolve) =>
      setTimeout(() => resolve({ ok: false, error: 'Request timed out after 5s fallback' }), 5000)
    );

    Promise.race([putGoalsPromise, timeoutPromise]).catch((err) => {
      console.warn('[PlanReady] Background sync warning:', err);
    });

    // 3. Immediately call router.replace('/(track)')
    router.replace('/(track)');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color="#1D4D3E" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 3 of 3</Text>
          </View>
        </View>

        {/* Header: Thanks for giving us your time, {FirstName}! */}
        <View style={styles.header}>
          <View style={styles.sparkleRow}>
            <Sparkles size={16} color="#1D4D3E" />
            <Text style={styles.planReadyTag}>PLAN CALIBRATION COMPLETE</Text>
          </View>
          <Text style={styles.title}>
            Thanks for giving us your time, {firstName}!
          </Text>
          <Text style={styles.subtitle}>
            We have engineered your custom daily macronutrient and hydration targets for optimal metabolic health.
          </Text>
        </View>

        {/* Hero Daily Calorie Card */}
        <View style={styles.calorieHeroCard}>
          <View style={styles.calorieHeaderRow}>
            <View style={styles.calorieTitleGroup}>
              <Flame size={20} color="#EA580C" />
              <Text style={styles.calorieTitle}>Daily Calorie Target</Text>
            </View>
            <View style={styles.calorieBadge}>
              <Text style={styles.calorieBadgeText}>{primaryGoal}</Text>
            </View>
          </View>
          <View style={styles.calorieNumberRow}>
            <Text style={styles.calorieNumber}>
              {targets.calories.toLocaleString()}
            </Text>
            <Text style={styles.calorieUnit}>kcal / day</Text>
          </View>
          <Text style={styles.calorieSubtext}>
            Calculated via Mifflin-St Jeor equation calibrated for your {workoutFrequency} training intensity.
          </Text>
        </View>

        {/* Daily Macro Targets Grid */}
        <Text style={styles.sectionHeader}>Calculated Daily Targets</Text>
        <View style={styles.macroGrid}>
          {/* Protein */}
          <View style={[styles.macroCard, styles.macroCardProtein]}>
            <View style={styles.macroDotProtein} />
            <Text style={styles.macroLabel}>Protein</Text>
            <Text style={styles.macroValue}>{targets.protein}g</Text>
            <Text style={styles.macroSub}>2.0g/kg lean muscle</Text>
          </View>

          {/* Carbs */}
          <View style={[styles.macroCard, styles.macroCardCarbs]}>
            <View style={styles.macroDotCarbs} />
            <Text style={styles.macroLabel}>Carbs</Text>
            <Text style={styles.macroValue}>{targets.carbs}g</Text>
            <Text style={styles.macroSub}>Clean fuel & glycogen</Text>
          </View>

          {/* Fats */}
          <View style={[styles.macroCard, styles.macroCardFats]}>
            <View style={styles.macroDotFats} />
            <Text style={styles.macroLabel}>Fats</Text>
            <Text style={styles.macroValue}>{targets.fat}g</Text>
            <Text style={styles.macroSub}>Hormonal balance</Text>
          </View>

          {/* Water */}
          <View style={[styles.macroCard, styles.macroCardWater]}>
            <Droplets size={14} color="#3B82F6" />
            <Text style={styles.macroLabel}>Daily Water</Text>
            <Text style={styles.macroValue}>
              {(targets.water / 1000).toFixed(1)}L
            </Text>
            <Text style={styles.macroSub}>{targets.water} ml</Text>
          </View>
        </View>

        {/* Switches Section */}
        <View style={styles.switchesCard}>
          <Text style={styles.switchesTitle}>Smart Plan Preferences</Text>

          {/* Switch 1: Calorie Rollover */}
          <View style={styles.switchRow}>
            <View style={styles.switchIconBox}>
              <RotateCcw size={18} color="#1D4D3E" />
            </View>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchTitle}>Calorie Rollover</Text>
              <Text style={styles.switchDesc}>
                Carry up to 200 unused kcal to next day
              </Text>
            </View>
            <Switch
              value={calorieRollover}
              onValueChange={(val) => {
                triggerHaptic('selection');
                setCalorieRollover(val);
              }}
              trackColor={{ false: '#D1D5DB', true: '#1D4D3E' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchDivider} />

          {/* Switch 2: Meal & Pickup Notifications */}
          <View style={styles.switchRow}>
            <View style={styles.switchIconBox}>
              <Bell size={18} color="#1D4D3E" />
            </View>
            <View style={styles.switchTextBox}>
              <Text style={styles.switchTitle}>Meal & Pickup Notifications</Text>
              <Text style={styles.switchDesc}>
                Reminders for macro diary & 5-min gym kiosk pickup
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => {
                triggerHaptic('selection');
                setNotificationsEnabled(val);
              }}
              trackColor={{ false: '#D1D5DB', true: '#1D4D3E' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Hold-to-Personalize Interactive Ring Button */}
        <View style={styles.holdContainer}>
          {React.createElement(
            TouchableOpacity as any,
            {
              style: [
                styles.holdButton,
                isCompleted && styles.holdButtonCompleted,
              ],
              onPressIn: startHold,
              onPressOut: cancelHold,
              onPress: () => {
                // If tapped instead of held, trigger friendly prompt
                if (!isCompleted) {
                  triggerHaptic('light');
                }
              },
              activeOpacity: 0.9,
              disabled: isCompleted || isSubmitting,
            },
            <>
              {/* Animated filling background progress indicator */}
              <View
                style={[
                  styles.holdProgressFill,
                  { width: `${Math.round(holdProgress * 100)}%` },
                  isCompleted && styles.holdProgressFillCompleted,
                ]}
              />

              <View style={styles.holdContentRow}>
                {isCompleted ? (
                  <>
                    <ShieldCheck size={20} color="#FFFFFF" />
                    <Text style={styles.holdButtonText}>
                      Plan Personalized & Locked!
                    </Text>
                  </>
                ) : isHolding ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.holdButtonText}>
                      Hold to Commit ({Math.round(holdProgress * 100)}%)
                    </Text>
                  </>
                ) : (
                  <>
                    <View style={styles.ringIndicatorOuter}>
                      <View style={styles.ringIndicatorInner} />
                    </View>
                    <Text style={styles.holdButtonText}>
                      Hold to Personalize Plan
                    </Text>
                  </>
                )}
              </View>
            </>
          )}

          <Text style={styles.holdHelperText}>
            {isCompleted
              ? 'Routing you to your daily tracker...'
              : 'Press and hold for 1.5 seconds to personalize and activate your plan'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 48,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4D3E',
    marginLeft: 2,
  },
  stepBadge: {
    backgroundColor: '#E8F2EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  header: {
    marginBottom: 16,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  planReadyTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4D3E',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
  },
  calorieHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  calorieHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calorieTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calorieTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  calorieBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  calorieBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  calorieNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  calorieNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
  },
  calorieUnit: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  calorieSubtext: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  macroCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  macroCardProtein: {
    borderLeftWidth: 4,
    borderLeftColor: '#1D4D3E',
  },
  macroCardCarbs: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  macroCardFats: {
    borderLeftWidth: 4,
    borderLeftColor: '#EA580C',
  },
  macroCardWater: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  macroDotProtein: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1D4D3E',
    marginBottom: 6,
  },
  macroDotCarbs: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginBottom: 6,
  },
  macroDotFats: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
    marginBottom: 6,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginVertical: 2,
  },
  macroSub: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  switchesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  switchesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F2EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTextBox: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  switchDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  switchDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  holdContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  holdButton: {
    position: 'relative',
    width: '100%',
    height: 56,
    backgroundColor: '#1D4D3E',
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D4D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3,
  },
  holdButtonCompleted: {
    backgroundColor: '#16A34A',
  },
  holdProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  holdProgressFillCompleted: {
    backgroundColor: '#16A34A',
  },
  holdContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 2,
  },
  ringIndicatorOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringIndicatorInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  holdButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  holdHelperText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
});
