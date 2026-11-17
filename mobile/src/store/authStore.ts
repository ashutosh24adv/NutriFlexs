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
 * Clean unauthenticated initial user reference (zero mock data)
 */
export const DEFAULT_USER: UserProfile | null = null;

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
 * Safely clear JWT tokens and session data from expo-secure-store
 */
export async function clearSecureStoreToken(): Promise<void> {
  try {
    // Dynamic require to prevent static bundling/type errors when expo-secure-store is not installed
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
    // Graceful fallback in environments without secure-store
  }
}

export const authActions = {
  /**
   * Hydrates current authenticated user and nutrition goals from backend.
   */
  fetchMe: async () => {
    state = { ...state, isLoading: true, error: null };
    notify();

    try {
      let token: string | null = null;
      try {
        // @ts-ignore
        const SecureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
        if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
          for (const key of ['jwt_token', 'auth_token', 'token']) {
            const val = await SecureStore.getItemAsync(key);
            if (val && typeof val === 'string' && val.trim().length > 0) {
              token = val.trim();
              break;
            }
          }
        }
      } catch {
        // Graceful fallback
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const base = (process.env.EXPO_PUBLIC_API_URL || 'https://nutri-flexs.vercel.app').replace(/\/+$/, '');
      const res = await fetch(`${base}/api/mobile/auth/me`, {
        method: 'GET',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          const userGoal = data.nutritionGoal || data.user.nutritionGoal || data.user.goals || null;
          state = {
            ...state,
            user: {
              ...data.user,
              avatarInitials: computeAvatarInitials(data.user.name),
              passBalance: typeof data.user.passBalance === 'number' ? data.user.passBalance : 0,
              isGuest: false,
            },
            nutritionGoal: userGoal,
            token: token || state.token,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          };
          notify();
          return;
        }
      }
    } catch (err: any) {
      console.warn('[authStore fetchMe error]:', err?.message || err);
    }

    state = { ...state, isLoading: false };
    notify();
  },

  /**
   * Sets the authenticated session with user, token, and nutritionGoal.
   */
  setAuthSession: (params: {
    user: UserProfile;
    token?: string;
    nutritionGoal?: NutritionGoalProfile | null;
  }) => {
    state = {
      ...state,
      user: {
        ...params.user,
        avatarInitials: computeAvatarInitials(params.user?.name),
      },
      token: params.token || state.token,
      nutritionGoal:
        params.nutritionGoal !== undefined
          ? params.nutritionGoal
          : params.user?.nutritionGoal || (params.user?.goals as any) || state.nutritionGoal,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };
    notify();
  },

  /**
   * Updates current user profile and syncs nested goals.
   */
  updateProfile: (updates: Partial<UserProfile>) => {
    if (!state.user) {
      if (updates && (updates.id || updates.email || updates.name)) {
        state = {
          ...state,
          user: {
            ...(updates as UserProfile),
            avatarInitials: computeAvatarInitials(updates.name),
          },
          nutritionGoal: updates.nutritionGoal || (updates.goals as any) || state.nutritionGoal,
          isAuthenticated: true,
        };
        notify();
      }
      return;
    }
    const mergedUser = {
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
  },

  /**
   * Updates or sets the user's NutritionGoal.
   */
  setNutritionGoal: (goal: Partial<NutritionGoalProfile> | null) => {
    state = {
      ...state,
      nutritionGoal: goal ? { ...(state.nutritionGoal || {}), ...goal } : null,
      user:
        state.user && goal
          ? {
              ...state.user,
              goals: { ...(state.user.goals || {}), ...goal },
              nutritionGoal: { ...(state.user.nutritionGoal || {}), ...goal },
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
          : state.user,
    };
    notify();
  },

  topUpPass: (amount: number) => {
    if (!state.user || !state.isAuthenticated || state.user.isGuest) return;
    state = {
      ...state,
      user: {
        ...state.user,
        passBalance: (state.user.passBalance || 0) + amount,
      },
    };
    notify();
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
    } catch {
      // Safe fallback
    }
  },

  signOut: async () => {
    // 1. Clear JWT tokens from expo-secure-store
    await clearSecureStoreToken();

    // 2. Reset auth store: unauthenticated, null user, 0 credits
    state = {
      user: null,
      token: null,
      nutritionGoal: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    };
    notify();

    // 3. Reset cart store
    try {
      cartActions.clearCart();
      cartActions.setPassApplied(false);
      cartActions.removeTrainerCode();
    } catch {
      // Safe fallback
    }
  },
};

export function useAuthStore(): AuthState &
  typeof authActions & {
    passBalance: number;
    token: string | null;
    nutritionGoal: NutritionGoalProfile | null;
    avatarInitials: string;
  } {
  const [currentState, setCurrentState] = useState<AuthState>(state);

  useEffect(() => {
    listeners.add(setCurrentState);
    return () => {
      listeners.delete(setCurrentState);
    };
  }, []);

  const isAuthed = currentState.isAuthenticated && currentState.user && !currentState.user.isGuest;

  return {
    ...currentState,
    token: currentState.token,
    nutritionGoal: currentState.nutritionGoal,
    passBalance: isAuthed ? (currentState.user?.passBalance ?? 0) : 0,
    avatarInitials: isAuthed ? (currentState.user?.avatarInitials || computeAvatarInitials(currentState.user?.name)) : '?',
    ...authActions,
  };
}
