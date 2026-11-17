import { useState, useEffect } from 'react';
import { cartActions } from './cartStore';

export interface NutritionGoalProfile {
  id?: string;
  userId?: string;
  dailyCalorieGoal?: number | null;
  proteinGoal?: number | null;
  carbohydrateGoal?: number | null;
  fatGoal?: number | null;
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  carbsTarget?: number | null;
  fatsTarget?: number | null;
  waterGoalMl?: number | null;
  onboardingCompleted?: boolean;
  sex?: string | null;
  dateOfBirth?: string | Date | null;
  heightCm?: number | null;
  weightKg?: number | null;
  workoutFrequency?: string | null;
  primaryGoal?: string | null;
  desiredTargetWeightKg?: number | null;
  goalDays?: number | null;
  goalPace?: string | null;
  dietPreference?: string | null;
  barriers?: string[];
  accomplishments?: string[];
  dietitianConsulted?: string | null;
  calorieRollover?: boolean;
  notificationsEnabled?: boolean;
  [key: string]: any;
}

export interface UserProfile {
  id: string;
  name: string;
  phone?: string;
  email: string;
  membershipTier?: string;
  homeKiosk?: string;
  passBalance?: number;
  memberCode?: string;
  avatarInitials?: string;
  isGuest?: boolean;
  sex?: string | null;
  dateOfBirth?: string | Date | null;
  heightCm?: number | null;
  weightKg?: number | null;
  workoutFrequency?: string | null;
  primaryGoal?: string | null;
  primaryNutritionGoal?: string | null;
  desiredTargetWeightKg?: number | null;
  goalDays?: number | null;
  goalPace?: string | null;
  dietPreference?: string | null;
  barriers?: string[];
  accomplishments?: string[];
  dietitianConsulted?: string | null;
  calorieRollover?: boolean;
  notificationsEnabled?: boolean;
  streakDays?: number;
  targets?: {
    calories?: number | null;
    proteinGrams?: number | null;
    carbsGrams?: number | null;
    fatGrams?: number | null;
    waterMl?: number | null;
    calorieTarget?: number | null;
    proteinTarget?: number | null;
    carbsTarget?: number | null;
    fatsTarget?: number | null;
    waterGoalMl?: number | null;
  };
  goals?: NutritionGoalProfile | null;
  nutritionGoal?: NutritionGoalProfile | null;
  [key: string]: any;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  nutritionGoal: NutritionGoalProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Computes avatar initials strictly from user name:
 * Take first letter of each word, max 2 chars (e.g. "Manish 2" → "MA", "John Doe" → "JD").
 */
export function computeAvatarInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '?';
  const clean = name.trim();
  if (!clean) return '?';

  // Extract words that start with alphabetic letters
  const words = clean.split(/\s+/).filter((w) => /^[a-zA-Z]/.test(w));
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    const single = words[0];
    if (single.length >= 2) {
      return single.slice(0, 2).toUpperCase();
    }
    return single.slice(0, 1).toUpperCase();
  }

  // Fallback for non-alphabetic names
  const anyWords = clean.split(/\s+/).filter(Boolean);
  if (anyWords.length >= 2) {
    return (anyWords[0][0] + anyWords[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Clean unauthenticated initial user reference
 */
export const DEFAULT_USER: UserProfile | null = null;

// Storage keys
const SECURE_STORE_TOKEN_KEYS = ['jwt_token', 'auth_token', 'token'] as const;
const ASYNC_STORAGE_USER_KEY = 'nutriflex_user';
const ASYNC_STORAGE_GOAL_KEY = 'nutriflex_nutrition_goal';

// In-memory fallback for environments where native storage is unavailable
const memoryCache = new Map<string, string>();

async function getSecureStore() {
  try {
    if (typeof require !== 'undefined') {
      const mod = require('expo-secure-store');
      return mod?.default || mod;
    }
  } catch {}
  return null;
}

async function getAsyncStorage() {
  try {
    if (typeof require !== 'undefined') {
      const mod = require('@react-native-async-storage/async-storage');
      return mod?.default || mod;
    }
  } catch {}
  return null;
}

async function readTokenFromSecureStore(): Promise<string | null> {
  try {
    const secureStore = await getSecureStore();
    if (secureStore && typeof secureStore.getItemAsync === 'function') {
      for (const key of SECURE_STORE_TOKEN_KEYS) {
        const val = await secureStore.getItemAsync(key);
        if (val && typeof val === 'string' && val.trim().length > 0) {
          return val.trim();
        }
      }
    }
  } catch {}

  if (typeof localStorage !== 'undefined') {
    for (const key of SECURE_STORE_TOKEN_KEYS) {
      const val = localStorage.getItem(key);
      if (val && typeof val === 'string' && val.trim().length > 0) {
        return val.trim();
      }
    }
  }

  return memoryCache.get('jwt_token') || null;
}

async function writeTokenToSecureStore(token: string): Promise<void> {
  memoryCache.set('jwt_token', token);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('jwt_token', token);
      localStorage.setItem('token', token);
    } catch {}
  }

  try {
    const secureStore = await getSecureStore();
    if (secureStore && typeof secureStore.setItemAsync === 'function') {
      await secureStore.setItemAsync('jwt_token', token);
      await secureStore.setItemAsync('token', token);
    }
  } catch {}
}

export async function clearSecureStoreToken(): Promise<void> {
  memoryCache.delete('jwt_token');

  if (typeof localStorage !== 'undefined') {
    try {
      for (const key of SECURE_STORE_TOKEN_KEYS) {
        localStorage.removeItem(key);
      }
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user_session');
    } catch {}
  }

  try {
    const secureStore = await getSecureStore();
    if (secureStore && typeof secureStore.deleteItemAsync === 'function') {
      await Promise.allSettled(
        [...SECURE_STORE_TOKEN_KEYS, 'refreshToken', 'user_session'].map((k) =>
          secureStore.deleteItemAsync(k)
        )
      );
    }
  } catch {}
}

async function readItemFromAsyncStorage<T>(key: string): Promise<T | null> {
  try {
    const storage = await getAsyncStorage();
    if (storage && typeof storage.getItem === 'function') {
      const raw = await storage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  } catch {}

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
  }

  const inMemory = memoryCache.get(key);
  if (inMemory) {
    try {
      return JSON.parse(inMemory);
    } catch {}
  }

  return null;
}

async function writeItemToAsyncStorage(key: string, value: any): Promise<void> {
  const serialized = JSON.stringify(value);
  memoryCache.set(key, serialized);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, serialized);
    } catch {}
  }

  try {
    const storage = await getAsyncStorage();
    if (storage && typeof storage.setItem === 'function') {
      await storage.setItem(key, serialized);
    }
  } catch {}
}

async function removeItemFromAsyncStorage(key: string): Promise<void> {
  memoryCache.delete(key);

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  try {
    const storage = await getAsyncStorage();
    if (storage && typeof storage.removeItem === 'function') {
      await storage.removeItem(key);
    }
  } catch {}
}

// Global in-memory state
let state: AuthState = {
  user: null,
  token: null,
  nutritionGoal: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

const listeners = new Set<(s: AuthState) => void>();

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

/**
 * Background refresh of authenticated user via GET /api/mobile/auth/me
 * Only clears auth on HTTP 401 Unauthorized; never on offline or network timeouts.
 */
async function fetchMeBackground(token: string): Promise<void> {
  try {
    const base = (process.env.EXPO_PUBLIC_API_URL || 'https://nutri-flexs.vercel.app').replace(/\/+$/, '');
    const res = await fetch(`${base}/api/mobile/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      // ONLY clear auth if server returns HTTP 401 Unauthorized
      await authActions.signOut();
      return;
    }

    if (res.ok) {
      const data = await res.json();
      if (data?.user) {
        const userGoal = data.nutritionGoal || data.user.nutritionGoal || data.user.goals || state.nutritionGoal;
        const updatedUser: UserProfile = {
          ...state.user,
          ...data.user,
          avatarInitials: computeAvatarInitials(data.user.name),
          passBalance: typeof data.user.passBalance === 'number' ? data.user.passBalance : (state.user?.passBalance ?? 0),
          isGuest: false,
          nutritionGoal: userGoal,
        };

        state = {
          ...state,
          user: updatedUser,
          nutritionGoal: userGoal,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        };
        notify();

        // Update AsyncStorage cache with latest server data
        await Promise.allSettled([
          writeItemToAsyncStorage(ASYNC_STORAGE_USER_KEY, updatedUser),
          userGoal ? writeItemToAsyncStorage(ASYNC_STORAGE_GOAL_KEY, userGoal) : Promise.resolve(),
        ]);
      }
    }
    // Any other HTTP code (500, 502, 503, 404, etc.): do not wipe auth!
  } catch (netErr) {
    // Network timeout, DNS failure, or offline: NEVER clear auth!
    console.log('[useAuthStore] Background session verification skipped (offline/timeout):', netErr);
  }
}

export const authActions = {
  /**
   * Async hydration method: loads token from SecureStore and user + goal from AsyncStorage.
   * On cold start, if token & user exist, stay logged in. In the background call GET /api/mobile/auth/me
   * to refresh; only clear auth if the server returns HTTP 401 Unauthorized (never on network timeout or offline).
   */
  hydrate: async (): Promise<{
    isAuthenticated: boolean;
    user: UserProfile | null;
    token: string | null;
    nutritionGoal: NutritionGoalProfile | null;
  }> => {
    state = { ...state, isLoading: true, error: null };
    notify();

    let token: string | null = null;
    let user: UserProfile | null = null;
    let nutritionGoal: NutritionGoalProfile | null = null;

    try {
      token = await readTokenFromSecureStore();
      user = await readItemFromAsyncStorage<UserProfile>(ASYNC_STORAGE_USER_KEY);
      nutritionGoal = await readItemFromAsyncStorage<NutritionGoalProfile>(ASYNC_STORAGE_GOAL_KEY);
    } catch (storageErr) {
      console.warn('[useAuthStore hydrate storage read error]:', storageErr);
    }

    if (token && user) {
      const mergedGoal = nutritionGoal || user.nutritionGoal || user.goals || null;
      const normalizedUser: UserProfile = {
        ...user,
        avatarInitials: computeAvatarInitials(user.name),
        nutritionGoal: mergedGoal,
      };

      state = {
        ...state,
        token,
        user: normalizedUser,
        nutritionGoal: mergedGoal,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      notify();

      // Trigger non-blocking background refresh
      fetchMeBackground(token).catch(() => {});

      return {
        isAuthenticated: true,
        user: normalizedUser,
        token,
        nutritionGoal: mergedGoal,
      };
    }

    // Unauthenticated cold start
    state = {
      ...state,
      token: null,
      user: null,
      nutritionGoal: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };
    notify();

    return {
      isAuthenticated: false,
      user: null,
      token: null,
      nutritionGoal: null,
    };
  },

  /**
   * Persists { token, user, nutritionGoal } in expo-secure-store (token)
   * and @react-native-async-storage/async-storage (user & goal cache) on login.
   */
  login: async (params: {
    token: string;
    user: UserProfile;
    nutritionGoal?: NutritionGoalProfile | null;
  }): Promise<void> => {
    const { token, user } = params;
    const nutritionGoal = params.nutritionGoal || user.nutritionGoal || user.goals || null;

    const normalizedUser: UserProfile = {
      ...user,
      avatarInitials: computeAvatarInitials(user.name),
      nutritionGoal,
      isGuest: false,
    };

    state = {
      ...state,
      user: normalizedUser,
      token,
      nutritionGoal,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };
    notify();

    await Promise.allSettled([
      writeTokenToSecureStore(token),
      writeItemToAsyncStorage(ASYNC_STORAGE_USER_KEY, normalizedUser),
      nutritionGoal
        ? writeItemToAsyncStorage(ASYNC_STORAGE_GOAL_KEY, nutritionGoal)
        : removeItemFromAsyncStorage(ASYNC_STORAGE_GOAL_KEY),
    ]);
  },

  /**
   * Persists { token, user, nutritionGoal } on register.
   */
  register: async (params: {
    token: string;
    user: UserProfile;
    nutritionGoal?: NutritionGoalProfile | null;
  }): Promise<void> => {
    await authActions.login(params);
  },

  /**
   * Persists updated goals in @react-native-async-storage/async-storage on updateGoals.
   */
  updateGoals: async (goal: Partial<NutritionGoalProfile>): Promise<void> => {
    const mergedGoal: NutritionGoalProfile = {
      ...(state.nutritionGoal || {}),
      ...goal,
    };

    const updatedUser: UserProfile | null = state.user
      ? {
          ...state.user,
          goals: { ...(state.user.goals || {}), ...goal },
          nutritionGoal: mergedGoal,
          targets: {
            ...(state.user.targets || {}),
            ...(goal.calorieTarget !== undefined || goal.dailyCalorieGoal !== undefined
              ? { calories: goal.calorieTarget ?? goal.dailyCalorieGoal ?? undefined }
              : {}),
            ...(goal.proteinTarget !== undefined || goal.proteinGoal !== undefined
              ? { proteinGrams: goal.proteinTarget ?? goal.proteinGoal ?? undefined }
              : {}),
            ...(goal.carbsTarget !== undefined || goal.carbohydrateGoal !== undefined
              ? { carbsGrams: goal.carbsTarget ?? goal.carbohydrateGoal ?? undefined }
              : {}),
            ...(goal.fatsTarget !== undefined || goal.fatGoal !== undefined
              ? { fatGrams: goal.fatsTarget ?? goal.fatGoal ?? undefined }
              : {}),
            ...(goal.waterGoalMl !== undefined ? { waterMl: goal.waterGoalMl ?? undefined } : {}),
          },
        }
      : null;

    state = {
      ...state,
      nutritionGoal: mergedGoal,
      user: updatedUser,
    };
    notify();

    await Promise.allSettled([
      writeItemToAsyncStorage(ASYNC_STORAGE_GOAL_KEY, mergedGoal),
      updatedUser ? writeItemToAsyncStorage(ASYNC_STORAGE_USER_KEY, updatedUser) : Promise.resolve(),
    ]);
  },

  /**
   * Backward-compatible setter for authentication state
   */
  setAuth: async (params: {
    token?: string;
    user?: any;
    nutritionGoal?: any;
  }): Promise<void> => {
    if (params.token && params.user) {
      await authActions.login({
        token: params.token,
        user: params.user,
        nutritionGoal: params.nutritionGoal,
      });
    } else if (params.user) {
      authActions.updateProfile(params.user);
    }
  },

  /**
   * Sets auth session and persists data
   */
  setAuthSession: (params: {
    user: UserProfile;
    token?: string;
    nutritionGoal?: NutritionGoalProfile | null;
  }) => {
    const goal =
      params.nutritionGoal !== undefined
        ? params.nutritionGoal
        : params.user?.nutritionGoal || (params.user?.goals as any) || state.nutritionGoal;

    const normalizedUser: UserProfile = {
      ...params.user,
      avatarInitials: computeAvatarInitials(params.user?.name),
      nutritionGoal: goal,
    };

    const token = params.token || state.token;

    state = {
      ...state,
      user: normalizedUser,
      token,
      nutritionGoal: goal,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };
    notify();

    if (token) {
      writeTokenToSecureStore(token).catch(() => {});
    }
    writeItemToAsyncStorage(ASYNC_STORAGE_USER_KEY, normalizedUser).catch(() => {});
    if (goal) {
      writeItemToAsyncStorage(ASYNC_STORAGE_GOAL_KEY, goal).catch(() => {});
    }
  },

  /**
   * Updates user profile and syncs nested goals to storage
   */
  updateProfile: (updates: Partial<UserProfile>) => {
    if (!state.user) {
      if (updates && (updates.id || updates.email || updates.name)) {
        const newUser = {
          ...(updates as UserProfile),
          avatarInitials: computeAvatarInitials(updates.name),
        };
        state = {
          ...state,
          user: newUser,
          nutritionGoal: updates.nutritionGoal || (updates.goals as any) || state.nutritionGoal,
          isAuthenticated: true,
        };
        notify();
        writeItemToAsyncStorage(ASYNC_STORAGE_USER_KEY, newUser).catch(() => {});
      }
      return;
    }

    const mergedUser: UserProfile = {
      ...state.user,
      ...updates,
      avatarInitials: computeAvatarInitials(updates.name || state.user.name),
    };

    state = {
      ...state,
      user: mergedUser,
      nutritionGoal: updates.nutritionGoal || (updates.goals as any) || state.nutritionGoal,
    };
    notify();

    writeItemToAsyncStorage(ASYNC_STORAGE_USER_KEY, mergedUser).catch(() => {});
    if (state.nutritionGoal) {
      writeItemToAsyncStorage(ASYNC_STORAGE_GOAL_KEY, state.nutritionGoal).catch(() => {});
    }
  },

  /**
   * Sets or updates nutrition goal and persists to AsyncStorage
   */
  setNutritionGoal: (goal: Partial<NutritionGoalProfile> | null) => {
    if (goal) {
      authActions.updateGoals(goal);
    } else {
      state = {
        ...state,
        nutritionGoal: null,
      };
      notify();
      removeItemFromAsyncStorage(ASYNC_STORAGE_GOAL_KEY).catch(() => {});
    }
  },

  /**
   * Hydrates current authenticated user and nutrition goals from backend.
   */
  fetchMe: async (): Promise<void> => {
    state = { ...state, isLoading: true, error: null };
    notify();

    try {
      const token = state.token || (await readTokenFromSecureStore());
      if (!token) {
        state = { ...state, isLoading: false };
        notify();
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const base = (process.env.EXPO_PUBLIC_API_URL || 'https://nutri-flexs.vercel.app').replace(/\/+$/, '');
      const res = await fetch(`${base}/api/mobile/auth/me`, {
        method: 'GET',
        headers,
      });

      if (res.status === 401) {
        // Clear auth only on 401 Unauthorized
        await authActions.signOut();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          const userGoal = data.nutritionGoal || data.user.nutritionGoal || data.user.goals || null;
          const updatedUser: UserProfile = {
            ...state.user,
            ...data.user,
            avatarInitials: computeAvatarInitials(data.user.name),
            passBalance: typeof data.user.passBalance === 'number' ? data.user.passBalance : 0,
            isGuest: false,
            nutritionGoal: userGoal,
          };

          state = {
            ...state,
            user: updatedUser,
            nutritionGoal: userGoal,
            token,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          };
          notify();

          await Promise.allSettled([
            writeItemToAsyncStorage(ASYNC_STORAGE_USER_KEY, updatedUser),
            userGoal ? writeItemToAsyncStorage(ASYNC_STORAGE_GOAL_KEY, userGoal) : Promise.resolve(),
          ]);
          return;
        }
      }
    } catch (err: any) {
      console.warn('[authStore fetchMe error]:', err?.message || err);
      // On network error or timeout: DO NOT clear auth
    }

    state = { ...state, isLoading: false };
    notify();
  },

  topUpPass: (amount: number) => {
    if (!state.user || !state.isAuthenticated || state.user.isGuest) return;
    const updatedUser = {
      ...state.user,
      passBalance: (state.user.passBalance || 0) + amount,
    };
    state = {
      ...state,
      user: updatedUser,
    };
    notify();
    writeItemToAsyncStorage(ASYNC_STORAGE_USER_KEY, updatedUser).catch(() => {});
  },

  resetAuth: () => {
    state = {
      user: null,
      token: null,
      nutritionGoal: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    };
    notify();
    try {
      cartActions.clearCart();
      cartActions.setPassApplied(false);
      cartActions.removeTrainerCode();
    } catch {}
  },

  signOut: async () => {
    // 1. Clear JWT tokens from expo-secure-store
    await clearSecureStoreToken();

    // 2. Clear user and goal cache from AsyncStorage
    await Promise.allSettled([
      removeItemFromAsyncStorage(ASYNC_STORAGE_USER_KEY),
      removeItemFromAsyncStorage(ASYNC_STORAGE_GOAL_KEY),
    ]);

    // 3. Reset auth state
    state = {
      user: null,
      token: null,
      nutritionGoal: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    };
    notify();

    // 4. Reset cart
    try {
      cartActions.clearCart();
      cartActions.setPassApplied(false);
      cartActions.removeTrainerCode();
    } catch {}
  },
};

export function useAuthStore(): AuthState &
  typeof authActions & {
    passBalance: number;
    token: string | null;
    nutritionGoal: NutritionGoalProfile | null;
    avatarInitials: string;
    calorieTarget: number | null;
    proteinTarget: number | null;
    carbsTarget: number | null;
    fatsTarget: number | null;
    waterGoalMl: number | null;
  } {
  const [currentState, setCurrentState] = useState<AuthState>(state);

  useEffect(() => {
    listeners.add(setCurrentState);
    return () => {
      listeners.delete(setCurrentState);
    };
  }, []);

  const isAuthed = currentState.isAuthenticated && currentState.user && !currentState.user.isGuest;
  const currentGoal = currentState.nutritionGoal || currentState.user?.nutritionGoal || currentState.user?.goals || null;

  return {
    ...currentState,
    token: currentState.token,
    nutritionGoal: currentGoal,
    passBalance: isAuthed ? (currentState.user?.passBalance ?? 0) : 0,
    avatarInitials: isAuthed ? (currentState.user?.avatarInitials || computeAvatarInitials(currentState.user?.name)) : '?',
    calorieTarget: currentGoal?.calorieTarget ?? currentGoal?.dailyCalorieGoal ?? currentState.user?.targets?.calories ?? null,
    proteinTarget: currentGoal?.proteinTarget ?? currentGoal?.proteinGoal ?? currentState.user?.targets?.proteinGrams ?? null,
    carbsTarget: currentGoal?.carbsTarget ?? currentGoal?.carbohydrateGoal ?? currentState.user?.targets?.carbsGrams ?? null,
    fatsTarget: currentGoal?.fatsTarget ?? currentGoal?.fatGoal ?? currentState.user?.targets?.fatGrams ?? null,
    waterGoalMl: currentGoal?.waterGoalMl ?? currentState.user?.targets?.waterMl ?? null,
    ...authActions,
  };
}

// Static methods for zustand-style / non-hook callers:
// e.g. useAuthStore.getState(), useAuthStore.hydrate(), useAuthStore.login()
useAuthStore.getState = () => state;
useAuthStore.setState = (partial: Partial<AuthState>) => {
  state = { ...state, ...partial };
  notify();
};
useAuthStore.subscribe = (fn: (s: AuthState) => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
useAuthStore.hydrate = authActions.hydrate;
useAuthStore.login = authActions.login;
useAuthStore.register = authActions.register;
useAuthStore.updateGoals = authActions.updateGoals;
useAuthStore.fetchMe = authActions.fetchMe;
useAuthStore.signOut = authActions.signOut;
useAuthStore.setAuthSession = authActions.setAuthSession;
useAuthStore.updateProfile = authActions.updateProfile;
useAuthStore.setNutritionGoal = authActions.setNutritionGoal;
useAuthStore.setAuth = authActions.setAuth;
useAuthStore.resetAuth = authActions.resetAuth;

export default useAuthStore;
