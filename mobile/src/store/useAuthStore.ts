import { useState, useEffect } from 'react';
import { cartActions } from './cartStore';
import { API_BASE_URL } from '../config/api';

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
  lastMode?: 'track' | 'order' | string;
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
const ASYNC_STORAGE_SESSION_KEY = 'nutriflex_session';
const ASYNC_STORAGE_USER_KEY = 'nutriflex_user';
const ASYNC_STORAGE_GOAL_KEY = 'nutriflex_nutrition_goal';
const ASYNC_STORAGE_LAST_MODE_KEY = 'last_active_mode';

export interface SessionCache {
  user: UserProfile | null;
  nutritionGoal: NutritionGoalProfile | null;
  lastMode?: 'track' | 'order' | string;
}

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

  for (const key of SECURE_STORE_TOKEN_KEYS) {
    const memVal = memoryCache.get(key);
    if (memVal && typeof memVal === 'string' && memVal.trim().length > 0) {
      return memVal.trim();
    }
  }

  return null;
}

async function writeTokenToSecureStore(token: string): Promise<void> {
  for (const key of SECURE_STORE_TOKEN_KEYS) {
    memoryCache.set(key, token);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      for (const key of SECURE_STORE_TOKEN_KEYS) {
        localStorage.setItem(key, token);
      }
    } catch {}
  }

  try {
    const secureStore = await getSecureStore();
    if (secureStore && typeof secureStore.setItemAsync === 'function') {
      await Promise.allSettled(
        SECURE_STORE_TOKEN_KEYS.map((k) => secureStore.setItemAsync(k, token))
      );
    }
  } catch {}
}

export async function clearSecureStoreToken(): Promise<void> {
  for (const key of SECURE_STORE_TOKEN_KEYS) {
    memoryCache.delete(key);
  }

  if (typeof localStorage !== 'undefined') {
    try {
      for (const key of SECURE_STORE_TOKEN_KEYS) {
        localStorage.removeItem(key);
      }
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_session');
    } catch {}
  }

  try {
    const secureStore = await getSecureStore();
    if (secureStore && typeof secureStore.deleteItemAsync === 'function') {
      await Promise.allSettled(
        [...SECURE_STORE_TOKEN_KEYS, 'refreshToken', 'refresh_token', 'user_session', 'user_session_jwt'].map((k) =>
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
  lastMode: 'track',
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
 * Persists session:
 * - Saves `token` in `expo-secure-store`
 * - Saves `{ user, nutritionGoal, lastMode }` in `@react-native-async-storage/async-storage`
 * (with resilient in-memory/web fallbacks)
 */
export async function persistSession(params: {
  token?: string | null;
  user?: UserProfile | null;
  nutritionGoal?: NutritionGoalProfile | null;
  lastMode?: 'track' | 'order' | string | null;
}): Promise<void> {
  const token = params.token !== undefined ? params.token : state.token;
  const user = params.user !== undefined ? params.user : state.user;
  const nutritionGoal = params.nutritionGoal !== undefined ? params.nutritionGoal : state.nutritionGoal;
  const lastMode = params.lastMode !== undefined && params.lastMode !== null ? params.lastMode : (state.lastMode || 'track');

  const promises: Promise<any>[] = [];

  // 1. Save token in expo-secure-store (with resilient fallbacks)
  if (token) {
    promises.push(writeTokenToSecureStore(token));
  }

  // 2. Save { user, nutritionGoal, lastMode } in @react-native-async-storage/async-storage
  const sessionData: SessionCache = {
    user,
    nutritionGoal,
    lastMode,
  };
  promises.push(writeItemToAsyncStorage(ASYNC_STORAGE_SESSION_KEY, sessionData));
  promises.push(writeItemToAsyncStorage('auth_session', sessionData));

  // Mirror individual keys for backwards compatibility across existing readers
  if (user) {
    promises.push(writeItemToAsyncStorage(ASYNC_STORAGE_USER_KEY, user));
    promises.push(writeItemToAsyncStorage('user_profile', user));
  }
  if (nutritionGoal) {
    promises.push(writeItemToAsyncStorage(ASYNC_STORAGE_GOAL_KEY, nutritionGoal));
    promises.push(writeItemToAsyncStorage('nutrition_goal', nutritionGoal));
  } else {
    promises.push(removeItemFromAsyncStorage(ASYNC_STORAGE_GOAL_KEY));
    promises.push(removeItemFromAsyncStorage('nutrition_goal'));
  }
  if (lastMode) {
    promises.push(writeItemToAsyncStorage(ASYNC_STORAGE_LAST_MODE_KEY, lastMode));
    promises.push(writeItemToAsyncStorage('last_active_mode', lastMode));
  }

  await Promise.allSettled(promises);
}

/**
 * Clears persisted session from SecureStore and AsyncStorage
 */
export async function clearPersistedSession(): Promise<void> {
  await Promise.allSettled([
    clearSecureStoreToken(),
    removeItemFromAsyncStorage(ASYNC_STORAGE_SESSION_KEY),
    removeItemFromAsyncStorage('auth_session'),
    removeItemFromAsyncStorage(ASYNC_STORAGE_USER_KEY),
    removeItemFromAsyncStorage('user_profile'),
    removeItemFromAsyncStorage(ASYNC_STORAGE_GOAL_KEY),
    removeItemFromAsyncStorage('nutrition_goal'),
    removeItemFromAsyncStorage(ASYNC_STORAGE_LAST_MODE_KEY),
    removeItemFromAsyncStorage('last_active_mode'),
  ]);
}

/**
 * Background refresh of authenticated user via GET /api/mobile/auth/me
 * Only clears auth on HTTP 401 Unauthorized; never on offline or network timeouts.
 */
async function fetchMeBackground(token: string): Promise<void> {
  try {
    const base = API_BASE_URL;
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

        // Update AsyncStorage cache with latest { user, nutritionGoal, lastMode } and SecureStore token
        await persistSession({
          token,
          user: updatedUser,
          nutritionGoal: userGoal,
          lastMode: state.lastMode || 'track',
        });
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
   * Async hydration method: loads token from SecureStore and user + nutritionGoal from AsyncStorage.
   * On cold start, if token & user exist, stay logged in. In the background call GET /api/mobile/auth/me
   * to refresh; only clear auth if the server returns HTTP 401 Unauthorized (never on network timeout or offline).
   */
  hydrate: async (): Promise<{
    isAuthenticated: boolean;
    user: UserProfile | null;
    token: string | null;
    nutritionGoal: NutritionGoalProfile | null;
    lastMode: string;
  }> => {
    state = { ...state, isLoading: true, error: null };
    notify();

    let token: string | null = null;
    let user: UserProfile | null = null;
    let nutritionGoal: NutritionGoalProfile | null = null;
    let lastMode: string = 'track';

    try {
      token = await readTokenFromSecureStore();

      // 1. Load session { user, nutritionGoal, lastMode } from AsyncStorage
      let session = await readItemFromAsyncStorage<SessionCache>(ASYNC_STORAGE_SESSION_KEY);
      if (!session) {
        session = await readItemFromAsyncStorage<SessionCache>('auth_session');
      }
      if (session && typeof session === 'object') {
        user = session.user || null;
        nutritionGoal = session.nutritionGoal || null;
        if (session.lastMode) lastMode = session.lastMode;
      }

      // 2. Resilient fallbacks for individual keys
      if (!user) {
        user = (await readItemFromAsyncStorage<UserProfile>(ASYNC_STORAGE_USER_KEY)) ||
               (await readItemFromAsyncStorage<UserProfile>('user_profile'));
      }
      if (!nutritionGoal) {
        nutritionGoal = (await readItemFromAsyncStorage<NutritionGoalProfile>(ASYNC_STORAGE_GOAL_KEY)) ||
                        (await readItemFromAsyncStorage<NutritionGoalProfile>('nutrition_goal'));
      }
      const storedLastMode = (await readItemFromAsyncStorage<string>(ASYNC_STORAGE_LAST_MODE_KEY)) ||
                             (await readItemFromAsyncStorage<string>('last_active_mode'));
      if (storedLastMode) {
        lastMode = storedLastMode;
      }
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
        lastMode,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      notify();

      // Trigger non-blocking background refresh:
      // ONLY clear session if server returns HTTP 401 Unauthorized (never on network timeout or offline)
      fetchMeBackground(token).catch(() => {});

      return {
        isAuthenticated: true,
        user: normalizedUser,
        token,
        nutritionGoal: mergedGoal,
        lastMode,
      };
    }

    // Unauthenticated cold start
    state = {
      ...state,
      token: null,
      user: null,
      nutritionGoal: null,
      lastMode: 'track',
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
      lastMode: 'track',
    };
  },

  /**
   * Persists session: saves token in expo-secure-store and { user, nutritionGoal, lastMode }
   * in @react-native-async-storage/async-storage on login.
   */
  login: async (params: {
    token: string;
    user: UserProfile;
    nutritionGoal?: NutritionGoalProfile | null;
    lastMode?: 'track' | 'order' | string;
  }): Promise<void> => {
    const { token, user } = params;
    const nutritionGoal = params.nutritionGoal || user.nutritionGoal || user.goals || null;
    const lastMode = params.lastMode || state.lastMode || 'track';

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
      lastMode,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };
    notify();

    await persistSession({
      token,
      user: normalizedUser,
      nutritionGoal,
      lastMode,
    });
  },

  /**
   * Persists session: saves token in expo-secure-store and { user, nutritionGoal, lastMode }
   * in @react-native-async-storage/async-storage on register.
   */
  register: async (params: {
    token: string;
    user: UserProfile;
    nutritionGoal?: NutritionGoalProfile | null;
    lastMode?: 'track' | 'order' | string;
  }): Promise<void> => {
    await authActions.login(params);
  },

  /**
   * Persists session: saves token in expo-secure-store and { user, nutritionGoal, lastMode }
   * in @react-native-async-storage/async-storage on updateGoals.
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

    await persistSession({
      token: state.token,
      user: updatedUser,
      nutritionGoal: mergedGoal,
      lastMode: state.lastMode || 'track',
    });
  },

  /**
   * Sets lastMode ('track' or 'order') and persists to storage
   */
  setLastMode: (mode: 'track' | 'order' | string) => {
    const cleanMode = mode.includes('order') ? 'order' : 'track';
    state = {
      ...state,
      lastMode: cleanMode,
    };
    notify();
    persistSession({ lastMode: cleanMode }).catch(() => {});
  },

  /**
   * Backward-compatible setter for authentication state
   */
  setAuth: async (params: {
    token?: string;
    user?: any;
    nutritionGoal?: any;
    lastMode?: string;
  }): Promise<void> => {
    if (params.token && params.user) {
      await authActions.login({
        token: params.token,
        user: params.user,
        nutritionGoal: params.nutritionGoal,
        lastMode: params.lastMode,
      });
    } else if (params.user) {
      authActions.updateProfile(params.user);
    }
  },

  /**
   * Sets auth session and persists data to SecureStore and AsyncStorage
   */
  setAuthSession: (params: {
    user: UserProfile;
    token?: string;
    nutritionGoal?: NutritionGoalProfile | null;
    lastMode?: 'track' | 'order' | string;
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
    const lastMode = params.lastMode || state.lastMode || 'track';

    state = {
      ...state,
      user: normalizedUser,
      token,
      nutritionGoal: goal,
      lastMode,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };
    notify();

    persistSession({
      token,
      user: normalizedUser,
      nutritionGoal: goal,
      lastMode,
    }).catch(() => {});
  },

  /**
   * Updates user profile and syncs nested goals and session to storage
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
        persistSession({
          token: state.token,
          user: newUser,
          nutritionGoal: state.nutritionGoal,
          lastMode: state.lastMode || 'track',
        }).catch(() => {});
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

    persistSession({
      token: state.token,
      user: mergedUser,
      nutritionGoal: state.nutritionGoal,
      lastMode: state.lastMode || 'track',
    }).catch(() => {});
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
      persistSession({ nutritionGoal: null }).catch(() => {});
    }
  },

  /**
   * Hydrates current authenticated user and nutrition goals from backend.
   * Whenever me/fetchMe succeeds, persists token in SecureStore and { user, nutritionGoal, lastMode } in AsyncStorage.
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

      const base = API_BASE_URL;
      const res = await fetch(`${base}/api/mobile/auth/me`, {
        method: 'GET',
        headers,
      });

      if (res.status === 401) {
        // Clear auth ONLY on 401 Unauthorized
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
            isLoading: false,
            isAuthenticated: true,
            error: null,
          };
          notify();

          await persistSession({
            token,
            user: updatedUser,
            nutritionGoal: userGoal,
            lastMode: state.lastMode || 'track',
          });
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

  /**
   * Alias for fetchMe: refreshes session from GET /api/mobile/auth/me and persists
   */
  me: async (): Promise<void> => {
    await authActions.fetchMe();
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
    persistSession({ user: updatedUser }).catch(() => {});
  },

  setPassBalance: (balance: number) => {
    if (!state.user || !state.isAuthenticated || state.user.isGuest) return;
    const updatedUser = {
      ...state.user,
      passBalance: Math.max(0, balance),
    };
    state = {
      ...state,
      user: updatedUser,
    };
    notify();
    persistSession({ user: updatedUser }).catch(() => {});
  },

  resetAuth: () => {
    state = {
      user: null,
      token: null,
      nutritionGoal: null,
      lastMode: 'track',
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
    // 1. Clear JWT tokens from expo-secure-store and session cache from AsyncStorage
    await clearPersistedSession();

    // 2. Reset auth state
    state = {
      user: null,
      token: null,
      nutritionGoal: null,
      lastMode: 'track',
      isLoading: false,
      isAuthenticated: false,
      error: null,
    };
    notify();

    // 3. Reset cart
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
    lastMode: string;
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
    lastMode: currentState.lastMode || 'track',
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
useAuthStore.me = authActions.me;
useAuthStore.fetchMe = authActions.fetchMe;
useAuthStore.updateGoals = authActions.updateGoals;
useAuthStore.setLastMode = authActions.setLastMode;
useAuthStore.signOut = authActions.signOut;
useAuthStore.setAuthSession = authActions.setAuthSession;
useAuthStore.updateProfile = authActions.updateProfile;
useAuthStore.setNutritionGoal = authActions.setNutritionGoal;
useAuthStore.setAuth = authActions.setAuth;
useAuthStore.resetAuth = authActions.resetAuth;
useAuthStore.topUpPass = authActions.topUpPass;
useAuthStore.setPassBalance = authActions.setPassBalance;

export default useAuthStore;
