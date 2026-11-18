import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';
import { getAuthToken } from '../services/apiClient';
import { getLocalDateString } from '../utils/date';
import { API_BASE_URL, LOCAL_USB_URL, LOCAL_LAN_URL } from '../config/api';

export interface FitnessFood {
  id: string;
  name: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const COMMON_INDIAN_FITNESS_FOODS: FitnessFood[] = [
  {
    id: 'f1',
    name: 'Egg Whites',
    serving: '4 large (132g)',
    calories: 68,
    protein: 14,
    carbs: 1,
    fat: 0.2,
  },
  {
    id: 'f2',
    name: 'Paneer Bhurji',
    serving: '1 bowl (150g)',
    calories: 280,
    protein: 18,
    carbs: 6,
    fat: 20,
  },
  {
    id: 'f3',
    name: 'Whey Protein Scoop',
    serving: '1 scoop (33g)',
    calories: 130,
    protein: 26,
    carbs: 3,
    fat: 1.5,
  },
  {
    id: 'f4',
    name: 'Brown Rice',
    serving: '1 cup cooked (195g)',
    calories: 216,
    protein: 5,
    carbs: 45,
    fat: 1.8,
  },
  {
    id: 'f5',
    name: 'Grilled Chicken Breast',
    serving: '1 breast (150g)',
    calories: 245,
    protein: 46,
    carbs: 0,
    fat: 5,
  },
];

export type MealSlot = 'Breakfast' | 'Lunch' | 'Post-Workout' | 'Dinner';
const MEAL_SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Post-Workout', 'Dinner'];

interface MealLoggerModalProps {
  visible: boolean;
  onClose: () => void;
  onMealLogged?: (meal: {
    name: string;
    slot: MealSlot;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => void;
  onWaterLogged?: (newTotalMl: number) => void;
  initialWaterMl?: number;
  initialMode?: 'search' | 'quick-add' | 'water';
}

export const MealLoggerModal: React.FC<MealLoggerModalProps> = ({
  visible,
  onClose,
  onMealLogged,
  onWaterLogged,
  initialWaterMl = 2100,
  initialMode = 'search',
}) => {
  const [activeTab, setActiveTab] = useState<'meal' | 'water'>('meal');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>('Post-Workout');
  const [searchQuery, setSearchQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCals, setCustomCals] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1);
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const searchInputRef = useRef<any>(null);
  const customNameRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setPortionMultiplier(1);
      if (initialMode === 'water') {
        setActiveTab('water');
      } else {
        setActiveTab('meal');
        const timer = setTimeout(() => {
          if (initialMode === 'search') {
            searchInputRef.current?.focus();
          } else if (initialMode === 'quick-add') {
            customNameRef.current?.focus();
          }
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, initialMode]);

  const waterGoal = 3000;

  const handleSelectFood = (food: FitnessFood) => {
    setCustomName(food.name);
    setCustomCals(food.calories.toString());
    setCustomProtein(food.protein.toString());
    setCustomCarbs(food.carbs.toString());
    setCustomFat(food.fat.toString());
  };

  const handleAddWater = (deltaMl: number) => {
    const updated = Math.max(0, Math.min(6000, waterMl + deltaMl));
    setWaterMl(updated);
    if (onWaterLogged) {
      onWaterLogged(updated);
    }
    const sign = deltaMl > 0 ? `+${deltaMl}ml` : `${deltaMl}ml`;
    setFeedbackMsg(`${sign} logged! Total: ${updated}ml / ${waterGoal}ml`);
    setTimeout(() => setFeedbackMsg(null), 3000);

    // Persist water to backend with Bearer token
    const todayStr = getLocalDateString();
    getAuthToken().then(async (token) => {
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
              date: todayStr,
              amountMl: deltaMl,
              waterMl: updated,
            }),
          });
          if (res.ok) break;
        } catch {}
      }
    }).catch((e) => console.warn('[MealLoggerModal] Water sync error:', e));
  };

  const handleSubmitMeal = () => {
    const name = customName.trim() || 'Custom Nutrition Log';
    const baseCals = parseInt(customCals, 10) || 250;
    const baseP = parseFloat(customProtein) || 20;
    const baseC = parseFloat(customCarbs) || 25;
    const baseF = parseFloat(customFat) || 6;

    const cals = Math.round(baseCals * portionMultiplier);
    const p = Math.round(baseP * portionMultiplier * 10) / 10;
    const c = Math.round(baseC * portionMultiplier * 10) / 10;
    const f = Math.round(baseF * portionMultiplier * 10) / 10;

    // 1. Immediately inform parent and local UI
    if (onMealLogged) {
      onMealLogged({
        name: portionMultiplier !== 1 ? `${name} (${portionMultiplier}x)` : name,
        slot: selectedSlot,
        calories: cals,
        protein: Math.round(p),
        carbs: Math.round(c),
        fat: Math.round(f),
      });
    }

    // 2. Persist to backend database via POST /api/mobile/nutrition/food-log with Bearer token
    const todayStr = getLocalDateString();
    getAuthToken().then(async (token) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const urls = [
        `${API_BASE_URL}/api/mobile/nutrition/food-log`,
        `${LOCAL_USB_URL}/api/mobile/nutrition/food-log`,
        `${LOCAL_LAN_URL}/api/mobile/nutrition/food-log`,
        'http://localhost:3000/api/mobile/nutrition/food-log',
      ];

      for (const u of urls) {
        try {
          const res = await fetch(u, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              foodName: name,
              foodNameSnapshot: name,
              title: name,
              name,
              mealType: selectedSlot.toUpperCase(),
              slot: selectedSlot,
              category: selectedSlot,
              calories: cals,
              protein: Math.round(p),
              carbohydrates: Math.round(c),
              carbs: Math.round(c),
              fat: Math.round(f),
              fats: Math.round(f),
              quantity: portionMultiplier,
              unit: 'serving',
              date: todayStr,
              dateKey: todayStr,
            }),
          });
          if (res.ok) break;
        } catch {}
      }
    }).catch((e) => console.warn('[MealLoggerModal] Server food log error:', e));

    setFeedbackMsg(`✓ Logged ${name} (${cals} kcal • ${portionMultiplier}x) to ${selectedSlot}!`);
    setTimeout(() => {
      setFeedbackMsg(null);
      onClose();
    }, 1200);
  };

  const filteredFoods = COMMON_INDIAN_FITNESS_FOODS.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheetContainer}>
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Fitness Logger</Text>
              <Text style={styles.sheetSubtitle}>
                Log whole foods, custom macros & hydration
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Segmented Mode Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('meal')}
              style={[
                styles.switchTab,
                activeTab === 'meal' && styles.switchTabActive,
              ]}
            >
              <Ionicons
                name="restaurant-outline"
                size={16}
                color={activeTab === 'meal' ? '#1D4D3E' : colors.text.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.switchTabText,
                  activeTab === 'meal' && styles.switchTabTextActive,
                ]}
              >
                Log Meal & Macros
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('water')}
              style={[
                styles.switchTab,
                activeTab === 'water' && styles.switchTabActive,
              ]}
            >
              <Ionicons
                name="water-outline"
                size={16}
                color={activeTab === 'water' ? '#1D4D3E' : colors.text.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.switchTabText,
                  activeTab === 'water' && styles.switchTabTextActive,
                ]}
              >
                Water Tracker
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feedback Toast */}
          {feedbackMsg && (
            <View style={styles.feedbackBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#1D4D3E" style={{ marginRight: 6 }} />
              <Text style={styles.feedbackText}>{feedbackMsg}</Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === 'meal' ? (
              <>
                {/* Meal Slot Selection */}
                <Text style={styles.sectionLabel}>MEAL SLOT</Text>
                <View style={styles.slotRow}>
                  {MEAL_SLOTS.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <TouchableOpacity
                        key={slot}
                        activeOpacity={0.75}
                        onPress={() => setSelectedSlot(slot)}
                        style={[styles.slotPill, isSelected && styles.slotPillActive]}
                      >
                        <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                          {slot}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Search Bar for Common Fitness Foods */}
                <Text style={styles.sectionLabel}>COMMON INDIAN FITNESS FOODS</Text>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={16} color={colors.text.muted} style={{ marginRight: 8 }} />
                  <TextInput
                    {...({ ref: searchInputRef } as any)}
                    placeholder="Search egg whites, paneer, whey, chicken..."
                    placeholderTextColor={colors.text.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                  />
                </View>

                {/* Common Food Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickFoodRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredFoods.map((food) => {
                    const isPicked = customName === food.name;
                    return (
                      <TouchableOpacity
                        key={food.id}
                        activeOpacity={0.8}
                        onPress={() => handleSelectFood(food)}
                        style={[styles.quickFoodChip, isPicked && styles.quickFoodChipActive]}
                      >
                        <Text style={[styles.quickFoodName, isPicked && styles.quickFoodNameActive]}>
                          {food.name}
                        </Text>
                        <Text style={styles.quickFoodServing}>{food.serving}</Text>
                        <View style={styles.quickFoodStats}>
                          <Text style={styles.quickFoodStatP}>{food.protein}g P</Text>
                          <Text style={styles.quickFoodStatC}>{food.calories} kcal</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Custom Food & Macro Input Form */}
                <Text style={styles.sectionLabel}>FOOD & MACRO DETAILS</Text>
                <TextInput
                  {...({ ref: customNameRef } as any)}
                  placeholder="Food / Meal description (e.g. Grilled Chicken Salad)"
                  placeholderTextColor={colors.text.muted}
                  value={customName}
                  onChangeText={setCustomName}
                  style={styles.textInput}
                />

                <View style={styles.macroInputGrid}>
                  <View style={styles.inputCol}>
                    <Text style={styles.colLabel}>Calories (kcal)</Text>
                    <TextInput
                      placeholder="e.g. 350"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="numeric"
                      value={customCals}
                      onChangeText={setCustomCals}
                      style={styles.numberInput}
                    />
                  </View>

                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: '#1D4D3E' }]}>Protein (g)</Text>
                    <TextInput
                      placeholder="e.g. 28"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="numeric"
                      value={customProtein}
                      onChangeText={setCustomProtein}
                      style={[styles.numberInput, { borderColor: '#1D4D3E' }]}
                    />
                  </View>

                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: '#F59E0B' }]}>Carbs (g)</Text>
                    <TextInput
                      placeholder="e.g. 35"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="numeric"
                      value={customCarbs}
                      onChangeText={setCustomCarbs}
                      style={[styles.numberInput, { borderColor: '#F59E0B' }]}
                    />
                  </View>

                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: '#EA580C' }]}>Fat (g)</Text>
                    <TextInput
                      placeholder="e.g. 8"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="numeric"
                      value={customFat}
                      onChangeText={setCustomFat}
                      style={[styles.numberInput, { borderColor: '#EA580C' }]}
                    />
                  </View>
                </View>

                {/* Portion Multiplier Capsules */}
                <Text style={styles.sectionLabel}>PORTION SIZE</Text>
                <View style={styles.multiplierRow}>
                  {[0.5, 1, 1.5, 2].map((mult) => {
                    const isSelected = portionMultiplier === mult;
                    return (
                      <TouchableOpacity
                        key={mult}
                        activeOpacity={0.8}
                        onPress={() => setPortionMultiplier(mult)}
                        style={[styles.multiplierPill, isSelected && styles.multiplierPillActive]}
                      >
                        <Text
                          style={[
                            styles.multiplierText,
                            isSelected && styles.multiplierTextActive,
                          ]}
                        >
                          {mult}x
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Primary CTA Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSubmitMeal}
                  style={styles.submitCtaButton}
                >
                  <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitCtaText}>
                    Save & Log Entry ({portionMultiplier}x)
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Water Intake Section */
              <View style={styles.waterContainer}>
                <View style={styles.waterHeroCard}>
                  <View style={styles.waterGlassIcon}>
                    <Ionicons name="water" size={32} color="#0284C7" />
                  </View>
                  <Text style={styles.waterReadout}>
                    {(waterMl / 1000).toFixed(2)}L
                    <Text style={styles.waterGoalSub}> / 3.0L Goal</Text>
                  </Text>
                  <Text style={styles.waterPercentText}>
                    {Math.round((waterMl / waterGoal) * 100)}% of daily hydration goal achieved
                  </Text>

                  {/* Water Progress Bar */}
                  <View style={styles.waterTrack}>
                    <View
                      style={[
                        styles.waterFill,
                        { width: `${Math.min(100, Math.round((waterMl / waterGoal) * 100))}%` },
                      ]}
                    />
                  </View>
                </View>

                <Text style={styles.sectionLabel}>1-TAP HYDRATION LOG</Text>
                <View style={styles.waterActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleAddWater(250)}
                    style={styles.waterBtn}
                  >
                    <Ionicons name="add" size={16} color="#0284C7" />
                    <Text style={styles.waterBtnText}>+250 ml</Text>
                    <Text style={styles.waterBtnSub}>1 Glass</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleAddWater(500)}
                    style={styles.waterBtn}
                  >
                    <Ionicons name="add" size={16} color="#0284C7" />
                    <Text style={styles.waterBtnText}>+500 ml</Text>
                    <Text style={styles.waterBtnSub}>1 Bottle</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleAddWater(750)}
                    style={styles.waterBtn}
                  >
                    <Ionicons name="add" size={16} color="#0284C7" />
                    <Text style={styles.waterBtnText}>+750 ml</Text>
                    <Text style={styles.waterBtnSub}>Gym Shaker</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleAddWater(-250)}
                  style={styles.waterUndoBtn}
                >
                  <Ionicons name="remove-circle-outline" size={16} color={colors.text.muted} />
                  <Text style={styles.waterUndoText}>Undo -250ml</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    maxHeight: '88%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderDark,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  sheetSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.round,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  switchTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
  },
  switchTabActive: {
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  switchTabText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text.muted,
  },
  switchTabTextActive: {
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1ED',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#C6DED4',
  },
  feedbackText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
  scrollBody: {
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.text.muted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  slotRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  slotPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotPillActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  multiplierRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  multiplierPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiplierPillActive: {
    backgroundColor: '#1D4D3E',
    borderColor: '#1D4D3E',
  },
  multiplierText: {
    fontSize: 12,
    fontWeight: typography.weights.semiBold,
    color: colors.text.secondary,
  },
  multiplierTextActive: {
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  slotText: {
    fontSize: 11,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  slotTextActive: {
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.xs,
    color: colors.text.primary,
  },
  quickFoodRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  quickFoodChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    minWidth: 120,
  },
  quickFoodChipActive: {
    borderColor: '#1D4D3E',
    backgroundColor: '#F0F6F2',
  },
  quickFoodName: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  quickFoodNameActive: {
    color: '#1D4D3E',
  },
  quickFoodServing: {
    fontSize: 9,
    color: colors.text.muted,
    marginTop: 1,
  },
  quickFoodStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  quickFoodStatP: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: '#1D4D3E',
  },
  quickFoodStatC: {
    fontSize: 10,
    color: '#EA580C',
    fontWeight: typography.weights.medium,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 42,
    fontSize: typography.sizes.xs,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  macroInputGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  inputCol: {
    flex: 1,
  },
  colLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
    marginBottom: 3,
  },
  numberInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    textAlign: 'center',
    height: 38,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  submitCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4D3E',
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    minHeight: spacing.touchTargetMin,
  },
  submitCtaText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  waterContainer: {
    paddingTop: spacing.xs,
  },
  waterHeroCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  waterGlassIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.round,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  waterReadout: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
    color: '#0369A1',
  },
  waterGoalSub: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
    color: '#0284C7',
  },
  waterPercentText: {
    fontSize: typography.sizes.xs,
    color: '#0284C7',
    fontWeight: typography.weights.medium,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  waterTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#E0F2FE',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  waterFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: radii.pill,
  },
  waterActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  waterBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#0369A1',
    marginTop: 2,
  },
  waterBtnSub: {
    fontSize: 9,
    color: colors.text.muted,
  },
  waterUndoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: 4,
  },
  waterUndoText: {
    fontSize: typography.sizes.xs,
    color: colors.text.muted,
    fontWeight: typography.weights.medium,
  },
});
