import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { radii } from '../../src/theme/radii';
import {
  Sparkles,
  Zap,
  Droplets,
  Dumbbell,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Plus,
  Flame,
} from 'lucide-react-native';
import { useHealthSync } from '../../src/services/useHealthSync';
import { useDiaryStore } from '../../src/store/diaryStore';

interface PromptQA {
  question: string;
  answer: string;
}

const COACH_FAQS: PromptQA[] = [
  {
    question: 'How do I hit 120g protein on a pure veg diet?',
    answer:
      'Prioritize high-density vegetarian sources: Low-fat Paneer (20g/100g), Soya chunks (52g/100g), Greek Yogurt (10g/100g), and 1 scoop of NutriFlexs Plant/Whey isolate (26g). Combining legumes with grains ensures complete amino acid profiles.',
  },
  {
    question: 'What is the best pre-workout snack 30 mins before?',
    answer:
      'A medium banana with 1 tbsp peanut butter or 2 medjool dates. These provide easily digestible glucose and fructose without causing gastrointestinal distress during heavy compound lifts.',
  },
  {
    question: 'Should I drink cold-pressed juices post-workout?',
    answer:
      'Yes, especially high-nitrate and potassium blends (like Beetroot-Pomegranate or Valencia Orange with Himalayan pink salt). They aid vasodilation, accelerate nutrient delivery to fatigued muscles, and rapidly restore electrolytes.',
  },
];

interface KioskRecommendation {
  id: string;
  name: string;
  proteinGrams: number;
  calories: number;
  prepTimeMinutes: number;
  price: number;
  description: string;
}

const KIOSK_RECOVERY_ITEMS: KioskRecommendation[] = [
  {
    id: '4',
    name: 'Whey Isolate Berry Blast Recovery',
    proteinGrams: 36,
    calories: 280,
    prepTimeMinutes: 5,
    price: 229,
    description: 'Hydrolyzed whey isolate, blueberries, strawberries, almond milk.',
  },
  {
    id: '1',
    name: 'High Protein Peanut Butter Banana Shake',
    proteinGrams: 32,
    calories: 420,
    prepTimeMinutes: 5,
    price: 199,
    description: 'Raw whey isolate, roasted peanut butter, banana, chia seeds.',
  },
  {
    id: '2',
    name: 'Low-Fat Paneer Quinoa Power Bowl',
    proteinGrams: 28,
    calories: 380,
    prepTimeMinutes: 7,
    price: 249,
    description: 'Low-fat malai paneer, quinoa, broccoli, bell peppers, mint dip.',
  },
  {
    id: '3',
    name: 'Cold-Pressed Citrus Electrolyte Booster',
    proteinGrams: 4,
    calories: 120,
    prepTimeMinutes: 3,
    price: 149,
    description: 'Valencia orange, amla, pink salt, fresh tender coconut water.',
  },
];

export default function TrackCoachScreen() {
  const router = useRouter();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { targets, telemetry } = useHealthSync();
  const {
    todayCalories,
    todayProtein,
    todayCarbs,
    waterMl,
    waterGoalMl,
    addWater,
  } = useDiaryStore();

  const targetProtein = targets.proteinGrams || 120;
  const targetCalories = targets.calories || 2000;
  const targetCarbs = targets.carbsGrams || 250;
  const activeBurned = telemetry.activeBurned || 0;

  // Real remaining macro gap calculations
  const remainingProtein = Math.max(0, targetProtein - todayProtein);
  const remainingCalories = Math.max(0, targetCalories - todayCalories + activeBurned);
  const remainingCarbs = Math.max(0, targetCarbs - todayCarbs);
  const remainingWaterMl = Math.max(0, waterGoalMl - waterMl);

  // Pick real kiosk item matching user's remaining gap
  const recommendedMeal: KioskRecommendation = (() => {
    if (remainingProtein >= 30) {
      return KIOSK_RECOVERY_ITEMS[0]; // 36g protein Berry Blast
    } else if (remainingProtein >= 20) {
      return remainingCalories >= 400
        ? KIOSK_RECOVERY_ITEMS[1] // 32g protein PB Shake
        : KIOSK_RECOVERY_ITEMS[2]; // 28g protein Power Bowl
    } else if (remainingWaterMl > 1000) {
      return KIOSK_RECOVERY_ITEMS[3]; // Citrus Electrolyte Booster
    }
    return KIOSK_RECOVERY_ITEMS[0];
  })();

  const handleAddWater = (ml: number) => {
    addWater(ml);
    const updated = waterMl + ml;
    setToastMessage(`Logged +${ml}ml water! Today's total: ${(updated / 1000).toFixed(2)}L / ${(waterGoalMl / 1000).toFixed(1)}L`);
  };

  const handleOrderRecovery = () => {
    setToastMessage(`Added ${recommendedMeal.name} to kiosk order!`);
    router.push('/(order)');
  };

  // Readiness calculation based on hydration & macro balance
  const hydrationRatio = Math.min(1, waterMl / Math.max(1, waterGoalMl));
  const proteinRatio = Math.min(1, todayProtein / Math.max(1, targetProtein));
  const carbRatio = Math.min(1, todayCarbs / Math.max(1, targetCarbs));
  const readinessScore = Math.round((hydrationRatio * 35) + (proteinRatio * 35) + (carbRatio * 30));

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.coachAvatar}>
              <Sparkles size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.title}>NutriFlexs AI Coach</Text>
              <Text style={styles.subtitle}>
                Real-time biometric & workout recovery intelligence
              </Text>
            </View>
          </View>
        </View>

        {/* Toast Banner */}
        {toastMessage && (
          <View style={styles.toastBanner}>
            <Text style={styles.toastText}>{toastMessage}</Text>
            <TouchableOpacity onPress={() => setToastMessage(null)}>
              <Text style={styles.toastDismiss}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Daily Readiness & Metabolic State Card */}
        <View style={styles.readinessCard}>
          <View style={styles.readinessTop}>
            <View style={styles.readinessScoreGroup}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreNumber}>{readinessScore > 0 ? `${readinessScore}%` : '50%'}</Text>
              </View>
              <View>
                <Text style={styles.readinessTitle}>
                  {readinessScore >= 80 ? 'Prime Recovery State' : readinessScore >= 50 ? 'Steady Progress' : 'Fueling Needed'}
                </Text>
                <Text style={styles.readinessSub}>
                  {activeBurned > 0 ? `${activeBurned} active kcal burned today` : 'Awaiting workout session sync'}
                </Text>
              </View>
            </View>
            <View style={styles.primeBadge}>
              <Text style={styles.primeBadgeText}>
                {readinessScore >= 80 ? 'OPTIMAL' : 'ACTIVE'}
              </Text>
            </View>
          </View>

          <View style={styles.readinessStatsRow}>
            <View style={styles.readinessStat}>
              <Text style={styles.readinessStatLabel}>Glycogen Fuel</Text>
              <Text style={styles.readinessStatValue}>
                {Math.round(carbRatio * 100)}% ({todayCarbs}g / {targetCarbs}g)
              </Text>
            </View>
            <View style={styles.readinessStat}>
              <Text style={styles.readinessStatLabel}>Hydration Index</Text>
              <Text style={styles.readinessStatValue}>
                {Math.round(hydrationRatio * 100)}% ({(waterMl / 1000).toFixed(1)}L)
              </Text>
            </View>
            <View style={styles.readinessStat}>
              <Text style={styles.readinessStatLabel}>Active Burned</Text>
              <Text style={styles.readinessStatValue}>{activeBurned} kcal</Text>
            </View>
          </View>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Actionable Recovery Directives</Text>
          <Text style={styles.sectionSub}>Calculated from your live macro gaps</Text>
        </View>

        {/* Actionable Directive 1: Dynamic Protein Gap */}
        <View style={styles.card}>
          <View style={styles.ruleBadgeRow}>
            <View style={styles.highPriorityPill}>
              <Zap size={11} color="#B45309" style={{ marginRight: 4 }} />
              <Text style={styles.highPriorityText}>
                {remainingProtein > 0 ? 'HIGH PRIORITY • PROTEIN REPAIR' : 'GOAL ACHIEVED • MAINTENANCE'}
              </Text>
            </View>
            <Text style={styles.timestampText}>
              {todayProtein}g / {targetProtein}g Target
            </Text>
          </View>

          <Text style={styles.insightTitle}>
            {remainingProtein > 0
              ? `Protein Gap: ${remainingProtein}g remaining today`
              : `Protein Goal Met (${todayProtein}g logged)`}
          </Text>
          <Text style={styles.insightDesc}>
            {remainingProtein > 0
              ? `Based on your ${activeBurned} active kcal burned and current intake of ${todayProtein}g protein, you require ${remainingProtein}g more to maximize muscle protein synthesis and prevent DOMS.`
              : `You have successfully hit your daily ${targetProtein}g protein threshold. Maintain cellular hydration for optimal nutrient transport.`}
          </Text>

          {/* Recommended Real Kiosk Menu Item */}
          <View style={styles.recommendedMealBox}>
            <Dumbbell size={16} color="#1D4D3E" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mealBoxTitle}>{recommendedMeal.name}</Text>
              <Text style={styles.mealBoxSub}>
                {recommendedMeal.proteinGrams}g Protein • {recommendedMeal.calories} kcal • {recommendedMeal.prepTimeMinutes}m at Kiosk (₹{recommendedMeal.price})
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOrderRecovery}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>
              Order at Cult.fit Kiosk ({recommendedMeal.prepTimeMinutes}m Express Pickup) →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actionable Directive 2: Dynamic Water & Hydration Gap */}
        <View style={styles.card}>
          <View style={styles.ruleBadgeRow}>
            <View style={styles.hydrationPill}>
              <Droplets size={11} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.hydrationPillText}>HYDRATION PACER</Text>
            </View>
            <Text style={styles.timestampText}>Goal: {(waterGoalMl / 1000).toFixed(1)}L</Text>
          </View>

          <Text style={styles.insightTitle}>
            Water Intake: {(waterMl / 1000).toFixed(2)}L / {(waterGoalMl / 1000).toFixed(1)}L
          </Text>
          <Text style={styles.insightDesc}>
            {remainingWaterMl > 0
              ? `You are ${remainingWaterMl}ml away from your daily baseline. Intracellular fluid levels need replenishment${activeBurned > 0 ? ' after burning ' + activeBurned + ' kcal' : ''}.`
              : 'Hydration baseline complete! Excellent fluid replenishment for joint lubrication and nutrient transport.'}
          </Text>

          {/* Quick Water Log Buttons */}
          <View style={styles.waterButtonsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAddWater(250)}
              style={styles.waterLogBtn}
            >
              <Plus size={14} color="#1D4D3E" style={{ marginRight: 4 }} />
              <Text style={styles.waterLogText}>+250ml (1 Glass)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleAddWater(500)}
              style={styles.waterLogBtn}
            >
              <Plus size={14} color="#1D4D3E" style={{ marginRight: 4 }} />
              <Text style={styles.waterLogText}>+500ml (1 Bottle)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actionable Directive 3: Dynamic Carb Strategy */}
        <View style={styles.card}>
          <View style={styles.ruleBadgeRow}>
            <View style={styles.carbPill}>
              <CheckCircle2 size={11} color="#1D4D3E" style={{ marginRight: 4 }} />
              <Text style={styles.carbPillText}>GLYCOGEN PACING</Text>
            </View>
            <Text style={styles.timestampText}>
              {todayCarbs}g / {targetCarbs}g Target
            </Text>
          </View>

          <Text style={styles.insightTitle}>
            {remainingCarbs > 0
              ? `Carb Reserve Gap: ${remainingCarbs}g remaining`
              : `Carb Intake Satisfied (${todayCarbs}g)`}
          </Text>
          <Text style={styles.insightDesc}>
            {remainingCarbs > 0
              ? `Consuming slow-digesting complex carbohydrates (like quinoa, brown rice, or oats) will refill glycogen stores for sustained energy output.`
              : `Your glycogen saturation is complete. Extra energy will support prolonged metabolic recovery.`}
          </Text>
        </View>

        {/* Coach Knowledge Base / FAQs */}
        <View style={styles.faqSection}>
          <View style={styles.faqHeaderRow}>
            <HelpCircle size={16} color="#1D4D3E" style={{ marginRight: 6 }} />
            <Text style={styles.faqTitle}>Ask Coach: Quick Nutrition Answers</Text>
          </View>

          {COACH_FAQS.map((faq, index) => {
            const isExpanded = activeFaq === index;
            return (
              <TouchableOpacity
                key={faq.question}
                activeOpacity={0.75}
                onPress={() => setActiveFaq(isExpanded ? null : index)}
                style={styles.faqCard}
              >
                <View style={styles.faqQuestionRow}>
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  <ChevronRight
                    size={16}
                    color="#6B7280"
                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                  />
                </View>
                {isExpanded && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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
    padding: spacing.lg,
    paddingBottom: 80,
  },
  header: {
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: radii.round,
    backgroundColor: '#1D4D3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
  },
  subtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F1ED',
    borderWidth: 1,
    borderColor: '#C6DED4',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  toastText: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: '#1D4D3E',
  },
  toastDismiss: {
    fontSize: typography.sizes.sm,
    color: '#1D4D3E',
    fontFamily: typography.fontFamilies.bold,
    marginLeft: 8,
  },
  readinessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EBECE8',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  readinessTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  readinessScoreGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F1ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1D4D3E',
  },
  scoreNumber: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  readinessTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
  },
  readinessSub: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: '#6B7280',
  },
  primeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  primeBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: '#B45309',
  },
  readinessStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: spacing.sm,
  },
  readinessStat: {
    flex: 1,
  },
  readinessStatLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: '#9CA3AF',
  },
  readinessStatValue: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
    marginTop: 2,
  },
  sectionHeaderRow: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
  },
  sectionSub: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBECE8',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  ruleBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  highPriorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  highPriorityText: {
    fontSize: 9,
    fontFamily: typography.fontFamilies.bold,
    color: '#B45309',
  },
  hydrationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  hydrationPillText: {
    fontSize: 9,
    fontFamily: typography.fontFamilies.bold,
    color: '#2563EB',
  },
  carbPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1ED',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  carbPillText: {
    fontSize: 9,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  timestampText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: '#9CA3AF',
  },
  insightTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
    marginVertical: 4,
  },
  insightDesc: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  recommendedMealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8F6',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#EBECE8',
  },
  mealBoxTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
  },
  mealBoxSub: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: '#6B7280',
    marginTop: 1,
  },
  actionButton: {
    backgroundColor: '#1D4D3E',
    borderRadius: radii.pill,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
  },
  waterButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  waterLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1ED',
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  waterLogText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: '#1D4D3E',
  },
  faqSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  faqHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  faqTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBECE8',
    padding: spacing.md,
    marginBottom: 8,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    color: '#111111',
    flex: 1,
    paddingRight: 8,
  },
  faqAnswerContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  faqAnswerText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: '#4B5563',
    lineHeight: 16,
  },
});
