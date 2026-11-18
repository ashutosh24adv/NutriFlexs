import { useState, useEffect } from 'react';
import { MealHistoryItem, MealDateGroup } from '../components/MealDiarySection';

export interface DiaryEntryMeal extends MealHistoryItem {
  dateStr: string; // YYYY-MM-DD
}

export interface DiaryState {
  meals: DiaryEntryMeal[];
  waterMl: number;
  waterGoalMl: number;
}

const INITIAL_STATE: DiaryState = {
  meals: [], // 100% Real - Zero mock fallback meals
  waterMl: 0, // Real starting water
  waterGoalMl: 3000,
};

let state: DiaryState = INITIAL_STATE;
const listeners = new Set<(s: DiaryState) => void>();

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

import { getLocalDateString } from '../utils/date';

function getTodayDateStr(): string {
  return getLocalDateString();
}

export const diaryActions = {
  addMeal: (meal: {
    title: string;
    category?: MealHistoryItem['category'];
    calories: number;
    macros: { protein: number; carbs: number; fat: number };
    autoLoggedFromOrder?: boolean;
    dateStr?: string;
  }) => {
    const today = getTodayDateStr();
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const timeStr = `${formattedHours}:${minutes} ${ampm}`;

    const newMeal: DiaryEntryMeal = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category: meal.category || 'Lunch',
      categoryLabel: `${meal.category || 'Lunch'} • ${timeStr}`,
      time: timeStr,
      title: meal.title,
      calories: Math.max(0, meal.calories),
      macros: {
        protein: Math.max(0, meal.macros.protein),
        carbs: Math.max(0, meal.macros.carbs),
        fat: Math.max(0, meal.macros.fat),
      },
      autoLoggedFromOrder: !!meal.autoLoggedFromOrder,
      dateStr: meal.dateStr || today,
    };

    state = {
      ...state,
      meals: [newMeal, ...state.meals],
    };
    notify();
  },

  deleteMeal: (id: string) => {
    state = {
      ...state,
      meals: state.meals.filter((m) => m.id !== id),
    };
    notify();
  },

  addWater: (ml: number) => {
    state = {
      ...state,
      waterMl: Math.max(0, state.waterMl + ml),
    };
    notify();
  },

  setWaterMl: (ml: number) => {
    state = {
      ...state,
      waterMl: Math.max(0, ml),
    };
    notify();
  },

  setWaterGoalMl: (goalMl: number) => {
    state = {
      ...state,
      waterGoalMl: Math.max(500, goalMl),
    };
    notify();
  },

  resetToday: () => {
    const today = getTodayDateStr();
    state = {
      ...state,
      meals: state.meals.filter((m) => m.dateStr !== today),
      waterMl: 0,
    };
    notify();
  },
};

export function useDiaryStore() {
  const [currentState, setCurrentState] = useState<DiaryState>(state);

  useEffect(() => {
    listeners.add(setCurrentState);
    return () => {
      listeners.delete(setCurrentState);
    };
  }, []);

  const todayStr = getTodayDateStr();
  const todayMeals = currentState.meals.filter((m) => m.dateStr === todayStr);

  const todayCalories = todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const todayProtein = todayMeals.reduce((acc, m) => acc + m.macros.protein, 0);
  const todayCarbs = todayMeals.reduce((acc, m) => acc + m.macros.carbs, 0);
  const todayFat = todayMeals.reduce((acc, m) => acc + m.macros.fat, 0);

  // Group meals by date for MealDiarySection
  const dateGroups: MealDateGroup[] = [];
  const groupedByDate: Record<string, DiaryEntryMeal[]> = {};

  for (const meal of currentState.meals) {
    if (!groupedByDate[meal.dateStr]) {
      groupedByDate[meal.dateStr] = [];
    }
    groupedByDate[meal.dateStr].push(meal);
  }

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));
  for (const d of sortedDates) {
    const mealsForDate = groupedByDate[d];
    const totalCal = mealsForDate.reduce((sum, m) => sum + m.calories, 0);
    const isToday = d === todayStr;
    const dateLabel = isToday ? 'Today' : d;
    dateGroups.push({
      date: dateLabel,
      totalCalories: totalCal,
      meals: mealsForDate,
    });
  }

  // 7-day capsule bar chart builder
  const get7DayHistory = () => {
    const days: {
      day: string;
      dateStr: string;
      protein: number;
      carbs: number;
      fat: number;
      calories: number;
      isToday: boolean;
    }[] = [];

    const now = new Date();
    // 7 days ending today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = getLocalDateString(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const mealsForDay = currentState.meals.filter((m) => m.dateStr === iso);

      const protein = mealsForDay.reduce((acc, m) => acc + m.macros.protein, 0);
      const carbs = mealsForDay.reduce((acc, m) => acc + m.macros.carbs, 0);
      const fat = mealsForDay.reduce((acc, m) => acc + m.macros.fat, 0);
      const calories = mealsForDay.reduce((acc, m) => acc + m.calories, 0);

      days.push({
        day: dayName,
        dateStr: iso,
        protein,
        carbs,
        fat,
        calories,
        isToday: iso === todayStr,
      });
    }

    return days;
  };

  // Streak count: number of consecutive days backwards with at least 1 meal
  let streakDays = 0;
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = getLocalDateString(d);
    const hasMeals = currentState.meals.some((m) => m.dateStr === iso);
    if (hasMeals) {
      streakDays++;
    } else if (i > 0) {
      // If today has no meals yet, don't break streak if yesterday had meals
      break;
    }
  }

  // Dynamic nutrition score (0-100) from macro adherence
  const calculateNutritionScore = (targetCalories: number = 2000, targetProtein: number = 120): number | null => {
    if (todayMeals.length === 0) {
      return null;
    }
    const calRatio = Math.min(todayCalories / Math.max(1, targetCalories), 1.2);
    const calScore = calRatio <= 1 ? calRatio * 50 : Math.max(0, (2 - calRatio) * 50);

    const proRatio = Math.min(todayProtein / Math.max(1, targetProtein), 1.2);
    const proScore = proRatio <= 1 ? proRatio * 50 : Math.max(0, (2 - proRatio) * 50);

    return Math.min(100, Math.round(calScore + proScore));
  };

  return {
    ...currentState,
    ...diaryActions,
    todayMeals,
    todayCalories,
    todayProtein,
    todayCarbs,
    todayFat,
    dateGroups,
    get7DayHistory,
    streakDays,
    calculateNutritionScore,
  };
}

