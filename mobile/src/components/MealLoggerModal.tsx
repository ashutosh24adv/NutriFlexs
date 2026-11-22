import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radii } from '../theme/radii';
import { getAuthToken } from '../services/apiClient';
import { getLocalDateString } from '../utils/date';
import { API_BASE_URL, LOCAL_USB_URL, LOCAL_LAN_URL } from '../config/api';

// ─────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────

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
  { id: 'f1', name: 'Egg Whites',           serving: '4 large (132g)',      calories: 68,  protein: 14, carbs: 1,  fat: 0.2 },
  { id: 'f2', name: 'Paneer Bhurji',        serving: '1 bowl (150g)',       calories: 280, protein: 18, carbs: 6,  fat: 20  },
  { id: 'f3', name: 'Whey Protein Scoop',   serving: '1 scoop (33g)',       calories: 130, protein: 26, carbs: 3,  fat: 1.5 },
  { id: 'f4', name: 'Brown Rice',           serving: '1 cup cooked (195g)', calories: 216, protein: 5,  carbs: 45, fat: 1.8 },
  { id: 'f5', name: 'Grilled Chicken Breast', serving: '1 breast (150g)',   calories: 245, protein: 46, carbs: 0,  fat: 5   },
];

export type MealSlot = 'Breakfast' | 'Lunch' | 'Post-Workout' | 'Dinner';
const MEAL_SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Post-Workout', 'Dinner'];

// New: category chips matching the brief (Breakfast/Lunch/Dinner/Snack)
type CategoryChip = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
const CATEGORY_CHIPS: CategoryChip[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type UnitOption = 'g' | 'ml' | 'serving';
const UNIT_OPTIONS: UnitOption[] = ['g', 'ml', 'serving'];

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function categoryToSlot(cat: CategoryChip): MealSlot {
  if (cat === 'Snack') return 'Post-Workout';
  return cat as MealSlot;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const RNTextInput = TextInput as any;

export const MealLoggerModal: React.FC<MealLoggerModalProps> = ({
  visible,
  onClose,
  onMealLogged,
  onWaterLogged,
  initialWaterMl = 2100,
  initialMode = 'search',
}) => {
  // ── Tab ──
  const [activeTab, setActiveTab] = useState<'meal' | 'water'>('meal');

  // ── Category chip (new: Breakfast / Lunch / Dinner / Snack) ──
  const [selectedCategory, setSelectedCategory] = useState<CategoryChip>('Lunch');

  // ── Search ──
  const [searchQuery, setSearchQuery] = useState('');

  // ── Manual entry ──
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<UnitOption>('serving');

  // ── Macros (from food selection or typed) ──
  const [customCals, setCustomCals] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');

  // ── Water ──
  const [waterMl, setWaterMl] = useState(initialWaterMl);
  const waterGoal = 3000;

  // ── Feedback ──
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // ── Refs ──
  const searchInputRef = useRef<any>(null);
  const foodNameRef = useRef<any>(null);

  // ── Slide-up animation ──
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      // Reset state on open
      setSearchQuery('');
      if (initialMode === 'water') {
        setActiveTab('water');
      } else {
        setActiveTab('meal');
      }

      // Animate sheet in
      (Animated as any).spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      }).start();

      // Auto-focus
      const timer = setTimeout(() => {
        if (initialMode === 'search') {
          searchInputRef.current?.focus();
        } else if (initialMode === 'quick-add') {
          foodNameRef.current?.focus();
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Reset to offscreen instantly when hidden
      slideAnim.setValue(400);
    }
  }, [visible, initialMode, slideAnim]);

  // ── Live macro preview values ──
  const previewCals    = parseInt(customCals, 10) || 0;
  const previewProtein = parseFloat(customProtein) || 0;
  const previewCarbs   = parseFloat(customCarbs) || 0;
  const previewFat     = parseFloat(customFat) || 0;

  // ── Handlers ──
  const handleSelectFood = useCallback((food: FitnessFood) => {
    setFoodName(food.name);
    setCustomCals(food.calories.toString());
    setCustomProtein(food.protein.toString());
    setCustomCarbs(food.carbs.toString());
    setCustomFat(food.fat.toString());
  }, []);

  const handleAddWater = useCallback((deltaMl: number) => {
    const updated = Math.max(0, Math.min(6000, waterMl + deltaMl));
    setWaterMl(updated);
    if (onWaterLogged) {
      onWaterLogged(updated);
    }
    const sign = deltaMl > 0 ? `+${deltaMl}ml` : `${deltaMl}ml`;
    setFeedbackMsg(`${sign} logged! Total: ${updated}ml / ${waterGoal}ml`);
    setTimeout(() => setFeedbackMsg(null), 3000);

    // Persist water to backend
    const todayStr = getLocalDateString();
    getAuthToken()
      .then(async (token) => {
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
              body: JSON.stringify({ date: todayStr, amountMl: deltaMl, waterMl: updated }),
            });
            if (res.ok) break;
          } catch {}
        }
      })
      .catch((e) => console.warn('[MealLoggerModal] Water sync error:', e));
  }, [waterMl, onWaterLogged, waterGoal]);

  const handleSubmitMeal = useCallback(() => {
    const name = foodName.trim() || 'Custom Nutrition Log';
    const qty = parseFloat(quantity) || 1;
    const baseCals = parseInt(customCals, 10) || 250;
    const baseP    = parseFloat(customProtein) || 20;
    const baseC    = parseFloat(customCarbs) || 25;
    const baseF    = parseFloat(customFat) || 6;

    const cals = Math.round(baseCals * qty);
    const p    = Math.round(baseP * qty);
    const c    = Math.round(baseC * qty);
    const f    = Math.round(baseF * qty);

    const slot = categoryToSlot(selectedCategory);
    const displayName = qty !== 1 ? `${name} (${qty}${unit})` : name;

    if (onMealLogged) {
      onMealLogged({ name: displayName, slot, calories: cals, protein: p, carbs: c, fat: f });
    }

    // Persist to backend
    const todayStr = getLocalDateString();
    getAuthToken()
      .then(async (token) => {
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
                mealType: slot.toUpperCase(),
                slot,
                category: slot,
                calories: cals,
                protein: p,
                carbohydrates: c,
                carbs: c,
                fat: f,
                fats: f,
                quantity: qty,
                unit,
                date: todayStr,
                dateKey: todayStr,
              }),
            });
            if (res.ok) break;
          } catch {}
        }
      })
      .catch((e) => console.warn('[MealLoggerModal] Server food log error:', e));

    setFeedbackMsg(`✓ ${name} (${cals} kcal) → ${selectedCategory}`);
    setTimeout(() => {
      setFeedbackMsg(null);
      onClose();
    }, 1200);
  }, [foodName, quantity, customCals, customProtein, customCarbs, customFat, unit, selectedCategory, onMealLogged, onClose]);

  const filteredFoods = COMMON_INDIAN_FITNESS_FOODS.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLogEnabled = foodName.trim().length > 0;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.overlay}
      >
        {/* Backdrop */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        {/* Animated bottom sheet */}
        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sheetTitle}>Food Logger</Text>
              <Text style={styles.sheetSubtitle}>Log meals, macros &amp; hydration</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Tab switcher: Meal | Water */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('meal')}
              style={[styles.switchTab, activeTab === 'meal' && styles.switchTabActive]}
            >
              <Ionicons
                name="restaurant-outline"
                size={15}
                color={activeTab === 'meal' ? '#1D4D3E' : colors.text.muted}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.switchTabText, activeTab === 'meal' && styles.switchTabTextActive]}>
                Log Meal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setActiveTab('water')}
              style={[styles.switchTab, activeTab === 'water' && styles.switchTabActive]}
            >
              <Ionicons
                name="water-outline"
                size={15}
                color={activeTab === 'water' ? '#1D4D3E' : colors.text.muted}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.switchTabText, activeTab === 'water' && styles.switchTabTextActive]}>
                Water
              </Text>
            </TouchableOpacity>
          </View>

          {/* Feedback toast */}
          {feedbackMsg && (
            <View style={styles.feedbackBanner}>
              <Ionicons name="checkmark-circle" size={15} color="#1D4D3E" style={{ marginRight: 6 }} />
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
                {/* ── Meal Category Chips ── */}
                <Text style={styles.sectionLabel}>MEAL CATEGORY</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {CATEGORY_CHIPS.map((chip) => {
                    const isActive = selectedCategory === chip;
                    return (
                      <TouchableOpacity
                        key={chip}
                        activeOpacity={0.75}
                        onPress={() => setSelectedCategory(chip)}
                        style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                      >
                        <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                          {chip}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* ── Search bar ── */}
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={16} color="#1D4D3E" style={{ marginRight: 8 }} />
                  <RNTextInput
                    ref={searchInputRef}
                    placeholder="Search food..."
                    placeholderTextColor={colors.text.muted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={15} color={colors.text.muted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* ── Recent / Quick-add row ── */}
                <Text style={styles.sectionLabel}>RECENT FOODS</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentFoodRow}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredFoods.length === 0 ? (
                    <View style={styles.emptyRecentCard}>
                      <Ionicons name="leaf-outline" size={18} color="#1D4D3E" />
                      <Text style={styles.emptyRecentText}>No recent foods</Text>
                    </View>
                  ) : (
                    filteredFoods.map((food) => {
                      const isPicked = foodName === food.name;
                      return (
                        <TouchableOpacity
                          key={food.id}
                          activeOpacity={0.8}
                          onPress={() => handleSelectFood(food)}
                          style={[styles.recentCard, isPicked && styles.recentCardActive]}
                        >
                          <Text style={[styles.recentCardName, isPicked && styles.recentCardNameActive]} numberOfLines={1}>
                            {food.name}
                          </Text>
                          <View style={styles.recentCardKcalBadge}>
                            <Text style={styles.recentCardKcalText}>{food.calories} kcal</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>

                {/* ── Manual entry ── */}
                <Text style={styles.sectionLabel}>MANUAL ENTRY</Text>

                {/* Food name */}
                <RNTextInput
                  ref={foodNameRef}
                  placeholder="Food name (e.g. Grilled Chicken Salad)"
                  placeholderTextColor={colors.text.muted}
                  value={foodName}
                  onChangeText={setFoodName}
                  style={styles.textInput}
                />

                {/* Quantity + Unit row */}
                <View style={styles.quantityRow}>
                  <View style={styles.quantityInputWrapper}>
                    <Text style={styles.colLabel}>Quantity</Text>
                    <TextInput
                      placeholder="1"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="decimal-pad"
                      value={quantity}
                      onChangeText={setQuantity}
                      style={styles.quantityInput}
                    />
                  </View>
                  <View style={styles.unitSelectorWrapper}>
                    <Text style={styles.colLabel}>Unit</Text>
                    <View style={styles.unitPillRow}>
                      {UNIT_OPTIONS.map((u) => {
                        const isActive = unit === u;
                        return (
                          <TouchableOpacity
                            key={u}
                            activeOpacity={0.75}
                            onPress={() => setUnit(u)}
                            style={[styles.unitPill, isActive && styles.unitPillActive]}
                          >
                            <Text style={[styles.unitPillText, isActive && styles.unitPillTextActive]}>
                              {u}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* Macro inputs */}
                <View style={styles.macroInputGrid}>
                  <View style={styles.inputCol}>
                    <Text style={styles.colLabel}>Calories</Text>
                    <TextInput
                      placeholder="kcal"
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
                      placeholder="g"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="numeric"
                      value={customProtein}
                      onChangeText={setCustomProtein}
                      style={[styles.numberInput, { borderColor: '#1D4D3E' }]}
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={[styles.colLabel, { color: '#B45309' }]}>Carbs (g)</Text>
                    <TextInput
                      placeholder="g"
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
                      placeholder="g"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="numeric"
                      value={customFat}
                      onChangeText={setCustomFat}
                      style={[styles.numberInput, { borderColor: '#EA580C' }]}
                    />
                  </View>
                </View>

                {/* ── Live Macro Preview Bar ── */}
                {(previewCals > 0 || previewProtein > 0 || previewCarbs > 0 || previewFat > 0) && (
                  <View style={styles.macroPreviewBar}>
                    <Text style={styles.macroPreviewLabel}>Preview</Text>
                    <View style={styles.macroPillRow}>
                      <View style={[styles.macroPill, styles.macroPillP]}>
                        <Text style={styles.macroPillLabel}>P</Text>
                        <Text style={styles.macroPillValueP}>{previewProtein}g</Text>
                      </View>
                      <View style={[styles.macroPill, styles.macroPillC]}>
                        <Text style={styles.macroPillLabel}>C</Text>
                        <Text style={styles.macroPillValueC}>{previewCarbs}g</Text>
                      </View>
                      <View style={[styles.macroPill, styles.macroPillF]}>
                        <Text style={styles.macroPillLabel}>F</Text>
                        <Text style={styles.macroPillValueF}>{previewFat}g</Text>
                      </View>
                      {previewCals > 0 && (
                        <View style={styles.macroPillKcal}>
                          <Text style={styles.macroPillKcalText}>{previewCals} kcal</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* ── Log Meal button ── */}
                <TouchableOpacity
                  activeOpacity={isLogEnabled ? 0.85 : 1}
                  onPress={isLogEnabled ? handleSubmitMeal : undefined}
                  style={[styles.logMealButton, !isLogEnabled && styles.logMealButtonDisabled]}
                >
                  <Ionicons
                    name="checkmark-sharp"
                    size={18}
                    color={isLogEnabled ? '#FFFFFF' : '#9CA3AF'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.logMealText, !isLogEnabled && styles.logMealTextDisabled]}>
                    Log Meal
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Water Tab ── */
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
                    {Math.round((waterMl / waterGoal) * 100)}% of daily hydration goal
                  </Text>
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
                  {([250, 500, 750] as const).map((ml) => (
                    <TouchableOpacity
                      key={ml}
                      activeOpacity={0.8}
                      onPress={() => handleAddWater(ml)}
                      style={styles.waterBtn}
                    >
                      <Ionicons name="add" size={16} color="#0284C7" />
                      <Text style={styles.waterBtnText}>+{ml} ml</Text>
                      <Text style={styles.waterBtnSub}>
                        {ml === 250 ? '1 Glass' : ml === 500 ? '1 Bottle' : 'Gym Shaker'}
                      </Text>
                    </TouchableOpacity>
                  ))}
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const FOREST = '#1D4D3E';
const OFF_WHITE = '#F7F8F6';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    maxHeight: '90%',
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

  // Tab switcher
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
    color: FOREST,
  },

  // Feedback
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
    color: FOREST,
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

  // Category chips
  chipRow: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
    flexDirection: 'row',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: OFF_WHITE,
    borderWidth: 1,
    borderColor: '#DDEAE2',
  },
  categoryChipActive: {
    backgroundColor: FOREST,
    borderColor: FOREST,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: typography.weights.semiBold,
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },

  // Search bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OFF_WHITE,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#C6DED4',
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
  },

  // Recent foods
  recentFoodRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
  },
  recentCard: {
    backgroundColor: OFF_WHITE,
    borderWidth: 1,
    borderColor: '#DDEAE2',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 110,
    alignItems: 'flex-start',
  },
  recentCardActive: {
    backgroundColor: '#E8F1ED',
    borderColor: FOREST,
  },
  recentCardName: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  recentCardNameActive: {
    color: FOREST,
  },
  recentCardKcalBadge: {
    backgroundColor: '#1D4D3E22',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  recentCardKcalText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: FOREST,
  },
  emptyRecentCard: {
    backgroundColor: OFF_WHITE,
    borderWidth: 1,
    borderColor: '#DDEAE2',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  emptyRecentText: {
    fontSize: 11,
    color: colors.text.muted,
    fontWeight: typography.weights.medium,
  },

  // Manual entry
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  // Quantity + Unit
  quantityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  quantityInputWrapper: {
    width: 80,
  },
  quantityInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    textAlign: 'center',
    height: 40,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
  },
  unitSelectorWrapper: {
    flex: 1,
  },
  unitPillRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unitPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    backgroundColor: OFF_WHITE,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitPillActive: {
    backgroundColor: FOREST,
    borderColor: FOREST,
  },
  unitPillText: {
    fontSize: 12,
    fontWeight: typography.weights.semiBold,
    color: colors.text.secondary,
  },
  unitPillTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },

  // Macro inputs
  macroInputGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
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

  // Macro preview bar
  macroPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F1ED',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#C6DED4',
  },
  macroPreviewLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: FOREST,
    letterSpacing: 0.5,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    gap: 3,
  },
  macroPillLabel: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  macroPillP: { backgroundColor: '#E8F1ED', borderWidth: 1, borderColor: '#C6DED4' },
  macroPillC: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' },
  macroPillF: { backgroundColor: '#FFEDD5', borderWidth: 1, borderColor: '#FED7AA' },
  macroPillValueP: { fontSize: 11, fontWeight: typography.weights.bold, color: FOREST },
  macroPillValueC: { fontSize: 11, fontWeight: typography.weights.bold, color: '#B45309' },
  macroPillValueF: { fontSize: 11, fontWeight: typography.weights.bold, color: '#EA580C' },
  macroPillKcal: {
    backgroundColor: FOREST,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  macroPillKcalText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },

  // Log Meal button
  logMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FOREST,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    minHeight: spacing.touchTargetMin,
    marginTop: spacing.xs,
  },
  logMealButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  logMealText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  logMealTextDisabled: {
    color: '#9CA3AF',
  },

  // Water
  waterContainer: { paddingTop: spacing.xs },
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
  waterBtnSub: { fontSize: 9, color: colors.text.muted },
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
