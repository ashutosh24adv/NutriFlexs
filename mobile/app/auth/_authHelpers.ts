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
    // @ts-ignore
    const SecureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
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
}

/**
 * Retrieve JWT token safely from Expo SecureStore or fallbacks
 */
export async function getSecureToken(): Promise<string | null> {
  // 1. Try Native Expo SecureStore
  try {
    // @ts-ignore
    const SecureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
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

  // 2. Try Web localStorage
  try {
    if (typeof window !== 'undefined' && window?.localStorage) {
      const stored = window.localStorage.getItem('jwt_token') || window.localStorage.getItem('auth_token');
      if (stored) return stored;
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
 * Safely trigger Expo Haptics feedback with fallback
 */
export async function triggerHaptic(type: 'selection' | 'success' | 'warning' | 'light' = 'selection'): Promise<void> {
  try {
    // @ts-ignore
    const ExpoHaptics = typeof require !== 'undefined' ? require('expo-haptics') : null;
    if (!ExpoHaptics) return;

    if (type === 'selection' && typeof ExpoHaptics.selectionAsync === 'function') {
      await ExpoHaptics.selectionAsync();
    } else if (type === 'success' && typeof ExpoHaptics.notificationAsync === 'function') {
      await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType?.Success || 'success');
    } else if (type === 'warning' && typeof ExpoHaptics.notificationAsync === 'function') {
      await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType?.Warning || 'warning');
    } else if (type === 'light' && typeof ExpoHaptics.impactAsync === 'function') {
      await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle?.Light || 'light');
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
  const sex = params.sex || 'Male';
  const age = params.age && params.age > 0 ? params.age : 25;
  const heightCm = params.heightCm && params.heightCm > 0 ? params.heightCm : 175;
  const weightKg = params.weightKg && params.weightKg > 0 ? params.weightKg : 72;
  const goal = params.primaryGoal || 'Maintain weight';
  const freq = params.workoutFrequency || '4-6 days/wk';

  // 1. Basal Metabolic Rate (BMR)
  let bmr: number;
  if (sex.toLowerCase().includes('female')) {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else if (sex.toLowerCase().includes('male')) {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
  }

  // 2. Activity Multiplier
  let multiplier = 1.45;
  if (freq.includes('0-4')) {
    multiplier = 1.375;
  } else if (freq.includes('4-6')) {
    multiplier = 1.55;
  } else if (freq.includes('7+')) {
    multiplier = 1.725;
  }

  const tdee = Math.round(bmr * multiplier);

  // 3. Goal Calorie Adjustment
  let calories = tdee;
  if (goal.toLowerCase().includes('lose')) {
    calories = Math.max(1300, Math.round(tdee - 450));
  } else if (goal.toLowerCase().includes('muscle') || goal.toLowerCase().includes('gain')) {
    calories = Math.round(tdee + 350);
  } else {
    calories = tdee;
  }

  // 4. Macro Distribution
  // High-protein athlete focus: ~2.0g/kg body weight (min 110g, max 240g)
  const protein = Math.min(240, Math.max(110, Math.round(weightKg * 2.0)));
  // Fat: ~25% of total calories (9 kcal/g)
  const fat = Math.round((calories * 0.25) / 9);
  // Carbs: Remaining calories (4 kcal/g)
  const carbs = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));
  // Water: ~35-40ml/kg bodyweight, rounded to nearest 250ml, min 2500ml
  const water = Math.max(2500, Math.round((weightKg * 38) / 250) * 250);

  return {
    calories,
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
