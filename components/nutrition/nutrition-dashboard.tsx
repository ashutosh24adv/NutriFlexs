"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Target,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Info,
  Clock,
  Sparkles,
  Utensils,
  Coffee,
  Sun,
  Sunrise,
  Moon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Apple,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DailyNutritionSummary, MealDiarySection } from "@/services/nutrition.service";
import { FoodSearchModal } from "@/components/nutrition/food-search-modal";
import { CustomFoodModal } from "@/components/nutrition/custom-food-modal";
import { EditLogModal } from "@/components/nutrition/edit-log-modal";
import { NutritionGoalsModal } from "@/components/nutrition/nutrition-goals-modal";

const MEAL_ICONS: Record<string, any> = {
  BREAKFAST: Sunrise,
  LUNCH: Sun,
  SNACKS: Coffee,
  DINNER: Moon,
};

const MEAL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BREAKFAST: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  LUNCH: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  SNACKS: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  DINNER: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
};

function getLocalTodayDateKey(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function shiftDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

function formatHumanDate(dateKey: string): { label: string; sublabel: string; isToday: boolean } {
  const todayKey = getLocalTodayDateKey();
  const isToday = dateKey === todayKey;

  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const formatted = date.toLocaleDateString("en-US", options);

  if (isToday) {
    return { label: "Today", sublabel: formatted, isToday: true };
  }
  const yesterdayKey = shiftDateKey(todayKey, -1);
  if (dateKey === yesterdayKey) {
    return { label: "Yesterday", sublabel: formatted, isToday: false };
  }
  const tomorrowKey = shiftDateKey(todayKey, 1);
  if (dateKey === tomorrowKey) {
    return { label: "Tomorrow", sublabel: formatted, isToday: false };
  }
  return { label: formatted, sublabel: dateKey, isToday: false };
}

export function NutritionDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentDateKey, setCurrentDateKey] = useState<string>(getLocalTodayDateKey());
  const [diary, setDiary] = useState<DailyNutritionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchModalMealType, setSearchModalMealType] = useState<"BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER">("BREAKFAST");
  const [customFoodModalOpen, setCustomFoodModalOpen] = useState(false);
  const [editLogModalOpen, setEditLogModalOpen] = useState(false);
  const [selectedLogItem, setSelectedLogItem] = useState<any | null>(null);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);

  // Fetch diary data for currentDateKey
  const fetchDiary = useCallback(async (targetDateKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/nutrition/diary?date=${targetDateKey}`);
      const data = await res.json();
      if (data.success && data.diary) {
        setDiary(data.diary);
      } else {
        setError(data.error || "Failed to load nutrition diary.");
      }
    } catch (err: any) {
      console.error("Diary fetch error", err);
      setError("Network error fetching food diary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/nutrition");
      return;
    }
    if (status === "authenticated") {
      fetchDiary(currentDateKey);
    }
  }, [currentDateKey, status, router, fetchDiary]);

  const handlePrevDay = () => setCurrentDateKey((prev) => shiftDateKey(prev, -1));
  const handleNextDay = () => setCurrentDateKey((prev) => shiftDateKey(prev, 1));
  const handleJumpToday = () => setCurrentDateKey(getLocalTodayDateKey());

  const handleOpenSearchModal = (mealType: "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER") => {
    setSearchModalMealType(mealType);
    setSearchModalOpen(true);
  };

  const handleOpenEditModal = (item: any, mealType: "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER") => {
    setSelectedLogItem({ ...item, mealType });
    setEditLogModalOpen(true);
  };

  const humanDate = formatHumanDate(currentDateKey);
  const totals = diary?.totals || { calories: 0, protein: 0, carbohydrates: 0, fat: 0 };
  const goals = diary?.goals || {
    dailyCalorieGoal: null,
    proteinGoal: null,
    carbohydrateGoal: null,
    fatGoal: null,
    remainingCalories: null,
    calorieProgressPercent: 0,
    remainingProtein: null,
    proteinProgressPercent: 0,
    remainingCarbs: null,
    carbsProgressPercent: 0,
    remainingFat: null,
    fatProgressPercent: 0,
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-nutri-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-nutri-green-light text-nutri-green">
              <Flame className="w-5 h-5 fill-nutri-green" />
            </span>
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-nutri-charcoal tracking-tight">
              Daily Nutrition Tracker
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-nutri-secondary mt-1 ml-1">
            Log your NutriFlexs kiosk orders, homemade meals, and custom foods with exact macros.
          </p>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-nutri-bg p-1.5 rounded-2xl border border-nutri-border">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 rounded-xl text-nutri-secondary hover:text-nutri-green hover:bg-white transition-all cursor-pointer shadow-none hover:shadow-xs"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative flex items-center gap-1.5 px-3 py-1 cursor-pointer">
            <Calendar className="w-4 h-4 text-nutri-green" />
            <div className="text-center">
              <span className="font-heading font-bold text-xs sm:text-sm text-nutri-charcoal block leading-none">
                {humanDate.label}
              </span>
              <span className="text-[10px] text-nutri-secondary block leading-tight">
                {humanDate.sublabel}
              </span>
            </div>
            {/* Native calendar date picker overlay */}
            <input
              type="date"
              value={currentDateKey}
              onChange={(e) => {
                if (e.target.value) setCurrentDateKey(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Jump to date"
            />
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 rounded-xl text-nutri-secondary hover:text-nutri-green hover:bg-white transition-all cursor-pointer shadow-none hover:shadow-xs"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!humanDate.isToday && (
            <button
              type="button"
              onClick={handleJumpToday}
              className="px-2.5 py-1 text-[11px] font-bold rounded-xl bg-nutri-green text-white hover:bg-nutri-green-dark transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchDiary(currentDateKey)}
            className="text-xs font-bold underline hover:text-rose-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Nutrition Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Calories Card */}
        <Card className="p-5 bg-white border border-nutri-border rounded-3xl shadow-xs space-y-3 relative overflow-hidden md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-nutri-secondary flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" /> Calories
            </span>
            <button
              type="button"
              onClick={() => setGoalsModalOpen(true)}
              className="text-[11px] font-bold text-nutri-green hover:underline cursor-pointer flex items-center gap-1"
            >
              <Target className="w-3.5 h-3.5" />
              {goals.dailyCalorieGoal ? "Edit Goal" : "+ Set Goal"}
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading font-extrabold text-3xl sm:text-4xl text-nutri-charcoal">
                {totals.calories}
              </span>
              <span className="text-xs font-bold text-nutri-secondary">
                {goals.dailyCalorieGoal ? `/ ${goals.dailyCalorieGoal} kcal` : "kcal"}
              </span>
            </div>

            {goals.dailyCalorieGoal ? (
              <div className="mt-2 space-y-1.5">
                <div className="w-full bg-nutri-bg rounded-full h-2.5 overflow-hidden border border-nutri-border-light">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      goals.calorieProgressPercent > 100 ? "bg-rose-500" : "bg-nutri-green"
                    }`}
                    style={{ width: `${Math.min(100, goals.calorieProgressPercent)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  {goals.remainingCalories !== null && goals.remainingCalories >= 0 ? (
                    <span className="text-nutri-green">
                      {goals.remainingCalories} kcal remaining
                    </span>
                  ) : (
                    <span className="text-rose-600">
                      +{Math.abs(goals.remainingCalories || 0)} kcal over goal
                    </span>
                  )}
                  <span className="text-nutri-secondary">{goals.calorieProgressPercent}%</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-nutri-muted mt-2">
                No goal set yet. Tap &apos;+ Set Goal&apos; to target daily calories.
              </p>
            )}
          </div>
        </Card>

        {/* Protein Macro Card */}
        <Card className="p-5 bg-white border border-nutri-border rounded-3xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-nutri-secondary flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Protein
            </span>
            {goals.proteinGoal && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Goal: {goals.proteinGoal}g
              </span>
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading font-extrabold text-2xl sm:text-3xl text-nutri-charcoal">
                {totals.protein}
              </span>
              <span className="text-xs font-bold text-nutri-secondary">g</span>
            </div>
            {goals.proteinGoal ? (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-nutri-bg rounded-full h-2 overflow-hidden border border-nutri-border-light">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, goals.proteinProgressPercent)}%` }}
                  />
                </div>
                <span className="text-[10px] text-nutri-secondary block text-right font-bold">
                  {goals.proteinProgressPercent}% of goal
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-nutri-muted block mt-2">Muscle repair &amp; recovery</span>
            )}
          </div>
        </Card>

        {/* Carbohydrates Macro Card */}
        <Card className="p-5 bg-white border border-nutri-border rounded-3xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-nutri-secondary flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Carbohydrates
            </span>
            {goals.carbohydrateGoal && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                Goal: {goals.carbohydrateGoal}g
              </span>
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading font-extrabold text-2xl sm:text-3xl text-nutri-charcoal">
                {totals.carbohydrates}
              </span>
              <span className="text-xs font-bold text-nutri-secondary">g</span>
            </div>
            {goals.carbohydrateGoal ? (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-nutri-bg rounded-full h-2 overflow-hidden border border-nutri-border-light">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, goals.carbsProgressPercent)}%` }}
                  />
                </div>
                <span className="text-[10px] text-nutri-secondary block text-right font-bold">
                  {goals.carbsProgressPercent}% of goal
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-nutri-muted block mt-2">Daily workout fuel</span>
            )}
          </div>
        </Card>

        {/* Fat Macro Card */}
        <Card className="p-5 bg-white border border-nutri-border rounded-3xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-nutri-secondary flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Healthy Fats
            </span>
            {goals.fatGoal && (
              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md">
                Goal: {goals.fatGoal}g
              </span>
            )}
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading font-extrabold text-2xl sm:text-3xl text-nutri-charcoal">
                {totals.fat}
              </span>
              <span className="text-xs font-bold text-nutri-secondary">g</span>
            </div>
            {goals.fatGoal ? (
              <div className="mt-2 space-y-1">
                <div className="w-full bg-nutri-bg rounded-full h-2 overflow-hidden border border-nutri-border-light">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, goals.fatProgressPercent)}%` }}
                  />
                </div>
                <span className="text-[10px] text-nutri-secondary block text-right font-bold">
                  {goals.fatProgressPercent}% of goal
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-nutri-muted block mt-2">Hormonal balance</span>
            )}
          </div>
        </Card>
      </div>

      {/* Action shortcuts banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-nutri-green-soft border border-nutri-green/20 rounded-2xl">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-nutri-green shrink-0" />
          <span className="text-xs text-nutri-secondary leading-snug">
            Completed NutriFlexs express kiosk orders are synced automatically. Use <strong>+ Add Food</strong> to log homemade &amp; outside meals.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCustomFoodModalOpen(true)}
            className="text-xs font-bold border-nutri-border text-nutri-charcoal hover:bg-white cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Custom Food
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleOpenSearchModal("BREAKFAST")}
            className="bg-nutri-green hover:bg-nutri-green-dark text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Food
          </Button>
        </div>
      </div>

      {/* 4 Meal Diary Categories */}
      <div className="space-y-5">
        {(["BREAKFAST", "LUNCH", "SNACKS", "DINNER"] as const).map((mealType) => {
          const section: MealDiarySection = diary?.meals?.[mealType] || {
            mealType,
            label: mealType === "BREAKFAST" ? "Breakfast" : mealType === "LUNCH" ? "Lunch" : mealType === "SNACKS" ? "Evening Snacks" : "Dinner",
            items: [],
            totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 },
          };

          const IconComponent = MEAL_ICONS[mealType] || Utensils;
          const colors = MEAL_COLORS[mealType] || MEAL_COLORS.LUNCH;

          return (
            <Card
              key={mealType}
              className="bg-white border border-nutri-border rounded-3xl p-5 shadow-xs overflow-hidden transition-all"
            >
              {/* Meal Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-nutri-border-light">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${colors.bg} ${colors.border} border flex items-center justify-center ${colors.text}`}>
                    <IconComponent className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-base sm:text-lg text-nutri-charcoal">
                      {section.label}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-nutri-secondary mt-0.5">
                      <span className="font-bold text-nutri-green">
                        {section.totals.calories} kcal
                      </span>
                      <span>·</span>
                      <span>P: <strong>{section.totals.protein}g</strong></span>
                      <span>·</span>
                      <span>C: <strong>{section.totals.carbohydrates}g</strong></span>
                      <span>·</span>
                      <span>F: <strong>{section.totals.fat}g</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenSearchModal(mealType)}
                    className="text-xs font-bold border-nutri-green text-nutri-green hover:bg-nutri-green-light py-1.5 px-3 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Food
                  </Button>
                </div>
              </div>

              {/* Items List */}
              <div className="pt-3">
                {loading ? (
                  <div className="py-6 flex items-center justify-center text-xs text-nutri-muted space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-nutri-green" />
                    <span>Loading diary...</span>
                  </div>
                ) : section.items.length === 0 ? (
                  <div className="py-6 text-center text-xs text-nutri-muted">
                    No items logged for {section.label.toLowerCase()} yet.
                  </div>
                ) : (
                  <div className="divide-y divide-nutri-border-light">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-nutri-bg/50 px-2 rounded-xl transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-bold text-xs sm:text-sm text-nutri-charcoal">
                              {item.name}
                            </span>
                            {item.isAutoLoggedFromOrder && (
                              <Badge className="bg-nutri-green-light text-nutri-green border-none text-[10px] font-bold py-0.5 px-2">
                                NutriFlexs Kiosk
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-nutri-secondary mt-0.5">
                            {item.quantity} {item.unit}
                          </p>
                        </div>

                        {/* Nutrition details badge */}
                        <div className="text-right shrink-0">
                          <span className="font-heading font-extrabold text-xs sm:text-sm text-nutri-green block">
                            {item.calories} kcal
                          </span>
                          <span className="text-[10px] text-nutri-muted font-medium">
                            P: {item.protein}g · C: {item.carbohydrates}g · F: {item.fat}g
                          </span>
                        </div>

                        {/* Edit & Delete actions */}
                        <div className="flex items-center gap-1 shrink-0 pl-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item, mealType)}
                            className="p-1.5 rounded-lg text-nutri-muted hover:text-nutri-charcoal hover:bg-nutri-border-light transition-colors cursor-pointer"
                            title="Edit entry"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* General Disclaimer */}
      <div className="text-center p-4 text-[11px] text-nutri-muted max-w-xl mx-auto space-y-1">
        <p>
          * Nutritional values are standard reference estimates. NutriFlexs provides this food tracker for general wellness monitoring, not clinical diagnosis or medical dietetics.
        </p>
      </div>

      {/* Modals */}
      <FoodSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onFoodAdded={() => fetchDiary(currentDateKey)}
        initialMealType={searchModalMealType}
        dateKey={currentDateKey}
        onOpenCustomFood={() => setCustomFoodModalOpen(true)}
      />

      <CustomFoodModal
        isOpen={customFoodModalOpen}
        onClose={() => setCustomFoodModalOpen(false)}
        onCustomFoodCreated={() => fetchDiary(currentDateKey)}
        targetMealType={searchModalMealType}
        dateKey={currentDateKey}
      />

      <EditLogModal
        isOpen={editLogModalOpen}
        onClose={() => {
          setEditLogModalOpen(false);
          setSelectedLogItem(null);
        }}
        onLogUpdated={() => fetchDiary(currentDateKey)}
        item={selectedLogItem}
      />

      <NutritionGoalsModal
        isOpen={goalsModalOpen}
        onClose={() => setGoalsModalOpen(false)}
        onGoalsUpdated={() => fetchDiary(currentDateKey)}
        currentGoals={{
          dailyCalorieGoal: goals.dailyCalorieGoal,
          proteinGoal: goals.proteinGoal,
          carbohydrateGoal: goals.carbohydrateGoal,
          fatGoal: goals.fatGoal,
        }}
      />
    </div>
  );
}

