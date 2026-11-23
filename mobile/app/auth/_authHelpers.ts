import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, normalizeApiUrl } from '../../src/config/api';

/**
 * In-memory fallback token cache when secure storage is unavailable
 */
let inMemoryToken: string | null = null;

/**
 * Save JWT token safely to Expo SecureStore with fallback to web localStorage and memory
 */
export async function saveSecureToken(token: string): Promise<void> {
  if (!token) return;
  inMemoryToken = token;

  // 1. Expo SecureStore (Native)
  try {
    if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
      await Promise.allSettled([
        SecureStore.setItemAsync('jwt_token', token),
        SecureStore.setItemAsync('auth_token', token),
        SecureStore.setItemAsync('token', token),
      ]);
    }
  } catch {
    // Non-native / missing secure-store fallback
  }

  // 2. Web localStorage fallback
  try {
    if (typeof window !== 'undefined' && window?.localStorage) {
      window.localStorage.setItem('jwt_token', token);
      window.localStorage.setItem('auth_token', token);
    }
  } catch {
    // Ignore storage errors
  }

  // 3. AsyncStorage backup (ensures token survives app kills when SecureStore has keystore delays)
  try {
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await Promise.allSettled([
        AsyncStorage.setItem('jwt_token', token),
        AsyncStorage.setItem('auth_token', token),
        AsyncStorage.setItem('token', token),
        AsyncStorage.setItem('nutriflex_token', token),
      ]);
    }
  } catch {
    // Non-fatal fallback
  }
}

/**
 * Retrieve JWT token safely from Expo SecureStore or fallbacks
 */
export async function getSecureToken(): Promise<string | null> {
  // 1. Try Native Expo SecureStore
  try {
    if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
      const jwt = await SecureStore.getItemAsync('jwt_token');
      if (jwt) return jwt;
      const auth = await SecureStore.getItemAsync('auth_token');
      if (auth) return auth;
      const tok = await SecureStore.getItemAsync('token');
      if (tok) return tok;
    }
  } catch {
    // Fallback
  }

  // 2. Try AsyncStorage backup
  try {
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      const jwt = await AsyncStorage.getItem('jwt_token');
      if (jwt) return jwt;
      const auth = await AsyncStorage.getItem('auth_token');
      if (auth) return auth;
      const tok = await AsyncStorage.getItem('token');
      if (tok) return tok;
      const nutri = await AsyncStorage.getItem('nutriflex_token');
      if (nutri) return nutri;
    }
  } catch {}

  // 3. Try Web localStorage
  try {
    if (typeof window !== 'undefined' && window?.localStorage) {
      const stored = window.localStorage.getItem('jwt_token') || window.localStorage.getItem('auth_token');
      if (stored) return stored;
    }
  } catch {
    // Fallback
  }

  // 3. Try AsyncStorage backup
  try {
    const AsyncStorage = typeof require !== 'undefined' ? require('@react-native-async-storage/async-storage') : null;
    const storage = AsyncStorage?.default || AsyncStorage;
    if (storage && typeof storage.getItem === 'function') {
      for (const k of ['jwt_token', 'auth_token', 'token', 'nutriflex_token']) {
        const val = await storage.getItem(k);
        if (val && typeof val === 'string' && val.trim().length > 0) {
          return val.trim();
        }
      }
    }
  } catch {
    // Fallback
  }

  return inMemoryToken;
}

/**
 * Safely clear JWT tokens and session data from Expo SecureStore and local caches
 */
export async function clearSecureToken(): Promise<void> {
  inMemoryToken = null;

  // 1. Expo SecureStore (Native)
  try {
    // @ts-ignore
    const SecureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
    if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
      await Promise.allSettled([
        SecureStore.deleteItemAsync('jwt_token'),
        SecureStore.deleteItemAsync('auth_token'),
        SecureStore.deleteItemAsync('token'),
        SecureStore.deleteItemAsync('refreshToken'),
        SecureStore.deleteItemAsync('refresh_token'),
        SecureStore.deleteItemAsync('user_session'),
      ]);
    }
  } catch {
    // Graceful fallback
  }

  // 2. Web localStorage fallback
  try {
    if (typeof window !== 'undefined' && window?.localStorage) {
      window.localStorage.removeItem('jwt_token');
      window.localStorage.removeItem('auth_token');
      window.localStorage.removeItem('token');
      window.localStorage.removeItem('refreshToken');
      window.localStorage.removeItem('refresh_token');
    }
  } catch {
    // Fallback
  }
}

/**
 * Global Sign Out Helper:
 * Clears Expo SecureStore, resets useAuthStore & useCartStore,
 * and calls router.dismissAll(); router.replace('/welcome') so the back button
 * can never return to authenticated or onboarding screens.
 */
export async function performSignOut(router?: any): Promise<void> {
  // 1. Clear secure store tokens
  await clearSecureToken();

  // 2. Reset auth store
  try {
    // @ts-ignore
    const { authActions } = require('../../src/store/authStore');
    if (authActions && typeof authActions.resetAuth === 'function') {
      authActions.resetAuth();
    } else if (authActions && typeof authActions.signOut === 'function') {
      await authActions.signOut();
    }
  } catch {
    // Store fallback
  }

  // 3. Reset cart store
  try {
    // @ts-ignore
    const { cartActions } = require('../../src/store/cartStore');
    if (cartActions && typeof cartActions.clearCart === 'function') {
      cartActions.clearCart();
      cartActions.setPassApplied(false);
      cartActions.removeTrainerCode();
    }
  } catch {
    // Store fallback
  }

  // 4. Safe navigation to welcome screen, clearing navigation history stack
  if (router) {
    if (typeof router.dismissAll === 'function') {
      try {
        router.dismissAll();
      } catch {
        // Safe navigation fallback
      }
    }
    router.replace('/welcome');
  }
}

/**
 * Safely trigger haptics feedback with fallback
 */
export async function triggerHaptic(type: 'selection' | 'success' | 'warning' | 'light' = 'selection'): Promise<void> {
  try {
    const RN = typeof require !== 'undefined' ? require('react-native') : null;
    if (RN && RN.Vibration && typeof RN.Vibration.vibrate === 'function') {
      RN.Vibration.vibrate(type === 'success' ? 40 : 20);
    }
  } catch {
    // Silently continue in environments without haptic motor
  }
}

/**
 * Live Age Calculator from Date of Birth string (YYYY-MM-DD)
 */
export function calculateAge(dobString?: string | null): number {
  if (!dobString) return 25; // Sensible default
  const parts = dobString.split('-');
  const year = parseInt(parts[0], 10);
  if (isNaN(year) || year < 1930 || year > 2018) {
    return 25;
  }
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return 25;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(10, Math.min(100, age));
}

export interface CalculatedPlanTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

/**
 * Science-backed Mifflin-St Jeor daily nutrition calculator
 * Strictly aligned with lib/nutrition-baseline.ts to prevent target jumps
 */
export function calculateDailyTargets(params: {
  sex?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  workoutFrequency?: string;
  primaryGoal?: string;
  desiredTargetWeightKg?: number;
}): CalculatedPlanTargets {
  const weight = params.weightKg && params.weightKg > 0 ? params.weightKg : 70;
  const height = params.heightCm && params.heightCm > 0 ? params.heightCm : 175;
  const age = params.age && params.age > 0 ? params.age : 25;
  const sex = params.sex || 'Male';
  const isFemale = sex.toLowerCase().includes('female');

  // 1. Basal Metabolic Rate (BMR) - Mifflin-St Jeor
  const bmr = 10 * weight + 6.25 * height - 5 * age + (isFemale ? -161 : 5);

  // 2. Activity Multiplier based on workout frequency
  const freq = (params.workoutFrequency || '').toLowerCase();
  let activityMultiplier = 1.4; // default moderate
  if (
    freq.includes('7+') ||
    freq.includes('every day') ||
    freq.includes('daily') ||
    freq.includes('athlete') ||
    freq.includes('6-7')
  ) {
    activityMultiplier = 1.725;
  } else if (freq.includes('4-6') || freq.includes('5') || freq.includes('active')) {
    activityMultiplier = 1.55;
  } else if (
    freq.includes('0-4') ||
    freq.includes('1-3') ||
    freq.includes('sedentary') ||
    freq.includes('light')
  ) {
    activityMultiplier = 1.35;
  }

  let tdee = bmr * activityMultiplier;

  // 3. Fitness goal adjustment
  const goal = (params.primaryGoal || '').toLowerCase();
  if (
    goal.includes('lose') ||
    goal.includes('fat loss') ||
    goal.includes('cut') ||
    goal.includes('weight loss')
  ) {
    tdee -= 400; // Calorie deficit
  } else if (
    goal.includes('build') ||
    goal.includes('muscle') ||
    goal.includes('hypertrophy') ||
    goal.includes('mass') ||
    goal.includes('gain')
  ) {
    tdee += 300; // Calorie surplus
  }

  // Exact alignment with lib/nutrition-baseline.ts: rounded to nearest 50 kcal
  const dailyCalorieGoal = Math.max(1200, Math.min(4500, Math.round(tdee / 50) * 50));

  // 4. Macro Distribution
  let proteinPerKg = 1.6;
  if (
    goal.includes('muscle') ||
    goal.includes('build') ||
    freq.includes('4-6') ||
    freq.includes('7+')
  ) {
    proteinPerKg = 2.0;
  } else if (goal.includes('lose') || goal.includes('fat loss')) {
    proteinPerKg = 1.8;
  }
  const protein = Math.max(60, Math.min(260, Math.round(weight * proteinPerKg)));

  // Fat: ~25% of calories / 9
  const fat = Math.max(40, Math.min(120, Math.round((dailyCalorieGoal * 0.25) / 9)));

  // Carbs: Remaining calories / 4
  const carbCalories = dailyCalorieGoal - protein * 4 - fat * 9;
  const carbs = Math.max(100, Math.min(600, Math.round(carbCalories / 4)));

  const water = 3000;

  return {
    calories: dailyCalorieGoal,
    protein,
    carbs,
    fat,
    water,
  };
}

/**
 * Universal safe API caller for mobile auth flows
 */
export async function mobileApiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const token = await getSecureToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const urlsToTry = [
    `${normalizeApiUrl(API_BASE_URL)}${cleanPath}`,
    `http://localhost:3000${cleanPath}`,
    `http://10.91.111.142:3000${cleanPath}`,
  ];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (res.ok) {
        return {
          ok: true,
          status: res.status,
          data: json as T,
        };
      } else {
        // Only return if it's an intentional client/server error response from the real server
        if (res.status === 400 || res.status === 401 || res.status === 409 || res.status === 422) {
          return {
            ok: false,
            status: res.status,
            error: json?.error || json?.message || `Request failed with status ${res.status}`,
          };
        }
      }
    } catch {
      // Continue to next endpoint URL
    }
  }

  return {
    ok: false,
    status: 503,
    error: 'Could not connect to server. Please check your network.',
  };
}
