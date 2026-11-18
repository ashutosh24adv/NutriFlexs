import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Target,
  Sparkles,
} from 'lucide-react-native';
import { triggerHaptic, mobileApiRequest } from './_authHelpers';
import { useAuthStore } from '../../src/store/authStore';

export default function GoalTargetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    sex?: string;
    age?: string;
    heightCm?: string;
    weightKg?: string;
    workoutFrequency?: string;
    dietPreference?: string;
    primaryGoal?: string;
    redirect?: string;
  }>();

  const name = params.name || 'Member';
  const currentWeightKg = parseFloat(params.weightKg || '74') || 74;
  const primaryGoal = params.primaryGoal || 'Lose weight';
  const isLoss = primaryGoal === 'Lose weight';

  // Target Weight with unit toggle
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const defaultTargetKg = isLoss
    ? Math.max(45, Math.round((currentWeightKg - 6) * 10) / 10)
    : Math.round((currentWeightKg + 4) * 10) / 10;

  const [targetWeightInput, setTargetWeightInput] = useState<string>(
    defaultTargetKg.toString()
  );

  // Timeline (30, 60, 90, 180 days)
  const [timelineDays, setTimelineDays] = useState<30 | 60 | 90 | 180>(90);

  // Pace (Slow & steady | Moderate | Fast)
  const [pace, setPace] = useState<'Slow & steady' | 'Moderate' | 'Fast'>('Moderate');

  // Unit toggle handler with conversion
  const toggleWeightUnit = (newUnit: 'kg' | 'lbs') => {
    if (newUnit === weightUnit) return;
    triggerHaptic('light');
    const val = parseFloat(targetWeightInput) || defaultTargetKg;
    if (newUnit === 'lbs') {
      setTargetWeightInput(Math.round(val * 2.20462).toString());
      setWeightUnit('lbs');
    } else {
      setTargetWeightInput(Math.round((val / 2.20462) * 10) / 10 + '');
      setWeightUnit('kg');
    }
  };

  // Resolved target in kg
  const resolvedTargetKg = useMemo(() => {
    const val = parseFloat(targetWeightInput) || defaultTargetKg;
    if (weightUnit === 'lbs') {
      return Math.round((val / 2.20462) * 10) / 10;
    }
    return val;
  }, [weightUnit, targetWeightInput, defaultTargetKg]);

  // Live delta and weekly rate
  const weightDeltaKg = useMemo(() => {
    return Math.round((resolvedTargetKg - currentWeightKg) * 10) / 10;
  }, [resolvedTargetKg, currentWeightKg]);

  const weeklyChangeRate = useMemo(() => {
    const totalDiff = Math.abs(weightDeltaKg);
    const weeks = timelineDays / 7;
    return weeks > 0 ? totalDiff / weeks : 0;
  }, [weightDeltaKg, timelineDays]);

  // Formatted weekly rate with explicit sign
  // When desiredTargetWeightKg > currentWeightKg (Build muscle), display with a "+" sign (e.g. "+0.47 kg/wk"), NOT negative "-0.47 kg/wk"
  const formattedWeeklyRate = useMemo(() => {
    const rate = weeklyChangeRate.toFixed(2);
    if (resolvedTargetKg > currentWeightKg) {
      return `+${rate} kg/wk`;
    } else if (resolvedTargetKg < currentWeightKg) {
      return `-${rate} kg/wk`;
    }
    return `0.00 kg/wk`;
  }, [resolvedTargetKg, currentWeightKg, weeklyChangeRate]);

  // Live Realism Assessment
  // For fat loss: <= 0.75 kg/week is realistic & sustainable
  // For muscle building: <= 0.40 kg/week is realistic & sustainable
  const isRealistic = useMemo(() => {
    if (isLoss) {
      return weeklyChangeRate <= 0.75;
    } else {
      return weeklyChangeRate <= 0.4;
    }
  }, [isLoss, weeklyChangeRate]);

  const handleContinue = async () => {
    triggerHaptic('selection');

    // Immediately persist calibrated targets to useAuthStore
    try {
      await useAuthStore.updateGoals({
        desiredTargetWeightKg: resolvedTargetKg,
        goalDays: timelineDays,
        goalPace: pace,
        primaryGoal,
      });

      // Non-blocking background sync of calibrated targets to PUT /api/mobile/nutrition/goals
      mobileApiRequest('/api/mobile/nutrition/goals', {
        method: 'PUT',
        body: JSON.stringify({
          desiredTargetWeightKg: resolvedTargetKg,
          goalDays: timelineDays,
          goalPace: pace,
          primaryGoal,
        }),
      }).catch((err) => {
        console.warn('[GoalTarget] Non-blocking PUT goals error:', err);
      });
    } catch (storeErr) {
      console.warn('[GoalTarget] Store update warning:', storeErr);
    }

    const query = new URLSearchParams({
      name,
      sex: params.sex || 'Male',
      age: params.age || '25',
      heightCm: params.heightCm || '175',
      weightKg: currentWeightKg.toString(),
      workoutFrequency: params.workoutFrequency || '4-6 days/wk',
      dietPreference: params.dietPreference || 'Vegetarian',
      primaryGoal,
      desiredTargetWeightKg: resolvedTargetKg.toString(),
      goalDays: timelineDays.toString(),
      goalPace: pace,
      redirect: params.redirect || 'track',
    }).toString();

    router.push(`/auth/plan-ready?${query}`);
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
            <Text style={styles.stepBadgeText}>Step 2 of 3</Text>
          </View>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.goalTag}>
              {isLoss ? (
                <TrendingDown size={14} color="#1D4D3E" />
              ) : (
                <TrendingUp size={14} color="#1D4D3E" />
              )}
              <Text style={styles.goalTagText}>{primaryGoal.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.title}>Calibrate Your Target & Pace</Text>
          <Text style={styles.subtitle}>
            Set your target weight and preferred milestone horizon to unlock a customized calorie & macro budget.
          </Text>
        </View>

        {/* Current Weight Reference Pill */}
        <View style={styles.currentWeightBand}>
          <Text style={styles.currentWeightLabel}>Current Baseline:</Text>
          <Text style={styles.currentWeightValue}>
            {weightUnit === 'kg'
              ? `${currentWeightKg} kg`
              : `${Math.round(currentWeightKg * 2.20462)} lbs`}
          </Text>
        </View>

        {/* 1. Desired Target Weight Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Target size={18} color="#1D4D3E" />
              <Text style={styles.cardTitle}>Desired Target Weight</Text>
            </View>
            <View style={styles.unitToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.unitPill,
                  weightUnit === 'kg' && styles.unitPillActive,
                ]}
                onPress={() => toggleWeightUnit('kg')}
              >
                <Text
                  style={[
                    styles.unitPillText,
                    weightUnit === 'kg' && styles.unitPillTextActive,
                  ]}
                >
                  kg
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.unitPill,
                  weightUnit === 'lbs' && styles.unitPillActive,
                ]}
                onPress={() => toggleWeightUnit('lbs')}
              >
                <Text
                  style={[
                    styles.unitPillText,
                    weightUnit === 'lbs' && styles.unitPillTextActive,
                  ]}
                >
                  lbs
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.bigInput}
              value={targetWeightInput}
              onChangeText={(val) => setTargetWeightInput(val.replace(/[^\d.]/g, '').slice(0, 5))}
              keyboardType="decimal-pad"
              placeholder="70"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.bigInputSuffix}>{weightUnit}</Text>
          </View>

          {/* Delta indicator */}
          <View style={styles.deltaRow}>
            <Text style={styles.deltaLabel}>Net Target Change:</Text>
            <Text
              style={[
                styles.deltaValue,
                { color: weightDeltaKg < 0 ? '#1D4D3E' : '#EA580C' },
              ]}
            >
              {weightDeltaKg > 0 ? `+${weightDeltaKg}` : `${weightDeltaKg}`} kg (
              {weightDeltaKg > 0
                ? `+${Math.round(weightDeltaKg * 2.20462)}`
                : `${Math.round(weightDeltaKg * 2.20462)}`}{' '}
              lbs)
            </Text>
          </View>
        </View>

        {/* 2. Timeline Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Milestone Horizon</Text>
          <Text style={styles.cardSubtitle}>
            How many days would you like to target for this transformation?
          </Text>

          <View style={styles.timelineGrid}>
            {(
              [
                { days: 30, label: '30 Days', desc: '1 Month' },
                { days: 60, label: '60 Days', desc: '2 Months' },
                { days: 90, label: '90 Days', desc: 'Recommended' },
                { days: 180, label: '180 Days', desc: '6 Months' },
              ] as const
            ).map((item) => {
              const isSelected = timelineDays === item.days;
              return (
                <TouchableOpacity
                  key={item.days}
                  style={[
                    styles.timelineCard,
                    isSelected && styles.timelineCardActive,
                  ]}
                  onPress={() => {
                    triggerHaptic('selection');
                    setTimelineDays(item.days);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.timelineDays,
                      isSelected && styles.timelineDaysActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.timelineDesc,
                      isSelected && styles.timelineDescActive,
                    ]}
                  >
                    {item.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Pace Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Transformation Pace</Text>
          <Text style={styles.cardSubtitle}>
            Select your preferred adherence intensity.
          </Text>

          <View style={styles.paceList}>
            {(
              [
                {
                  key: 'Slow & steady',
                  title: 'Slow & Steady',
                  tag: 'Zero Fatigue',
                  desc: 'Gentle deficit/surplus. Easiest adherence with zero workout burnout.',
                },
                {
                  key: 'Moderate',
                  title: 'Moderate',
                  tag: 'Optimal Balance',
                  desc: 'The athletic sweet spot. Steady physical changes with prime energy.',
                },
                {
                  key: 'Fast',
                  title: 'Fast',
                  tag: 'High Focus',
                  desc: 'Aggressive discipline. Strict nutrient timing and high-protein intake.',
                },
              ] as const
            ).map((item) => {
              const isSelected = pace === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.paceRow, isSelected && styles.paceRowActive]}
                  onPress={() => {
                    triggerHaptic('selection');
                    setPace(item.key);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.radioOuter}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.paceContent}>
                    <View style={styles.paceTitleRow}>
                      <Text style={[styles.paceTitle, isSelected && styles.paceTitleActive]}>
                        {item.title}
                      </Text>
                      <View
                        style={[
                          styles.paceTag,
                          isSelected && styles.paceTagActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.paceTagText,
                            isSelected && styles.paceTagTextActive,
                          ]}
                        >
                          {item.tag}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.paceDesc}>{item.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. Live Realism Assessment Banner */}
        <View
          style={[
            styles.realismBanner,
            isRealistic ? styles.realismBannerGreen : styles.realismBannerAmber,
          ]}
        >
          <View style={styles.realismIconCol}>
            {isRealistic ? (
              <CheckCircle size={22} color="#15803D" />
            ) : (
              <AlertTriangle size={22} color="#B45309" />
            )}
          </View>
          <View style={styles.realismTextCol}>
            <View style={styles.realismBadgeRow}>
              <View
                style={[
                  styles.realismBadge,
                  isRealistic ? styles.realismBadgeGreen : styles.realismBadgeAmber,
                ]}
              >
                <Text
                  style={[
                    styles.realismBadgeText,
                    isRealistic ? styles.realismTextGreen : styles.realismTextAmber,
                  ]}
                >
                  {isRealistic ? 'Realistic & Sustainable' : 'Ambitious Pace'}
                </Text>
              </View>
              <Text style={styles.weeklyRateNumber}>
                {formattedWeeklyRate}
              </Text>
            </View>
            <Text
              style={[
                styles.realismDescription,
                isRealistic ? styles.realismDescGreen : styles.realismDescAmber,
              ]}
            >
              {isRealistic
                ? `Your projected change rate of ${formattedWeeklyRate} is healthy and preserves peak gym performance while preventing metabolic slowdown.`
                : `Your projected change rate of ${formattedWeeklyRate} is aggressive. Following a high-protein nutrition plan will be essential to protect muscle mass.`}
            </Text>
          </View>
        </View>

        {/* Continue Primary CTA */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <View style={styles.submitRow}>
            <Text style={styles.continueButtonText}>Reveal My Personalized Plan</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
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
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F2EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  goalTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4D3E',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
  },
  currentWeightBand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  currentWeightLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  currentWeightValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  unitToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 2,
  },
  unitPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  unitPillActive: {
    backgroundColor: '#1D4D3E',
  },
  unitPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    height: 56,
  },
  bigInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  bigInputSuffix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginLeft: 6,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deltaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  deltaValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  timelineGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  timelineCardActive: {
    backgroundColor: '#E8F2EC',
    borderColor: '#1D4D3E',
  },
  timelineDays: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  timelineDaysActive: {
    color: '#1D4D3E',
  },
  timelineDesc: {
    fontSize: 10,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 3,
  },
  timelineDescActive: {
    color: '#1D4D3E',
    fontWeight: '600',
  },
  paceList: {
    gap: 8,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
  },
  paceRowActive: {
    borderColor: '#1D4D3E',
    backgroundColor: '#F0F6F2',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#1D4D3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1D4D3E',
  },
  paceContent: {
    flex: 1,
  },
  paceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  paceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  paceTitleActive: {
    color: '#1D4D3E',
  },
  paceTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paceTagActive: {
    backgroundColor: '#E8F2EC',
  },
  paceTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  paceTagTextActive: {
    color: '#1D4D3E',
  },
  paceDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
  },
  realismBanner: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  realismBannerGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  realismBannerAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  realismIconCol: {
    paddingTop: 2,
  },
  realismTextCol: {
    flex: 1,
  },
  realismBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  realismBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  realismBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  realismBadgeAmber: {
    backgroundColor: '#FEF3C7',
  },
  realismBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  realismTextGreen: {
    color: '#15803D',
  },
  realismTextAmber: {
    color: '#B45309',
  },
  weeklyRateNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  realismDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  realismDescGreen: {
    color: '#166534',
  },
  realismDescAmber: {
    color: '#92400E',
  },
  continueButton: {
    backgroundColor: '#1D4D3E',
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1D4D3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
