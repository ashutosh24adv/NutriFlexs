import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  membershipTier: string;
  homeKiosk: string;
  passBalance: number;
  memberCode: string;
  avatarInitials: string;
}

export interface AuthState {
  user: UserProfile;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const DEFAULT_USER: UserProfile = {
  id: 'usr_live_01',
  name: 'Nutri Member',
  phone: '+91 98765 43210',
  email: 'athlete@nutriflex.fit',
  membershipTier: 'PRO',
  homeKiosk: 'Cult.fit HSR Layout, Bengaluru',
  passBalance: 1500,
  memberCode: 'NF-PRO',
  avatarInitials: 'NM',
};

let state: AuthState = {
  user: DEFAULT_USER,
  isLoading: false,
  isAuthenticated: true,
  error: null,
};

const listeners = new Set<(s: AuthState) => void>();

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export const authActions = {
  fetchMe: async () => {
    state = { ...state, isLoading: true, error: null };
    notify();

    try {
      const urlsToTry = [
        process.env.EXPO_PUBLIC_API_URL || 'https://nutri-flexs.vercel.app',
        'http://localhost:3000',
        'http://10.91.111.142:3000',
      ];
      let response: any = null;

      for (const base of urlsToTry) {
        try {
          const res = await fetch(`${base.replace(/\/$/, '')}/api/mobile/auth/me`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (res.ok) {
            response = res;
            break;
          }
        } catch {
          // Try next url
        }
      }

      if (response && response.ok) {
        const data = await response.json();
        if (data?.user) {
          state = {
            ...state,
            user: {
              ...state.user,
              ...data.user,
            },
            isLoading: false,
            isAuthenticated: true,
          };
          notify();
          return;
        }
      }
    } catch {
      // Offline / local preview fallback - retain safe default user
    }

    state = { ...state, isLoading: false };
    notify();
  },

  updateProfile: (updates: Partial<UserProfile>) => {
    state = {
      ...state,
      user: {
        ...state.user,
        ...updates,
      },
    };
    notify();
  },

  topUpPass: (amount: number) => {
    state = {
      ...state,
      user: {
        ...state.user,
        passBalance: state.user.passBalance + amount,
      },
    };
    notify();
  },

  signOut: async () => {
    state = {
      ...state,
      isAuthenticated: false,
      user: {
        ...DEFAULT_USER,
        name: 'Guest Athlete',
        avatarInitials: 'GA',
      },
    };
    notify();
  },
};

export function useAuthStore(): AuthState & typeof authActions & { passBalance: number } {
  const [currentState, setCurrentState] = useState<AuthState>(state);

  useEffect(() => {
    listeners.add(setCurrentState);
    return () => {
      listeners.delete(setCurrentState);
    };
  }, []);

  return {
    ...currentState,
    passBalance: currentState.user.passBalance,
    ...authActions,
  };
}
