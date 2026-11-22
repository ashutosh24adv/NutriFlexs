import React, { useEffect, useRef } from 'react';
import * as ReactNative from 'react-native';
const { View, Text, StyleSheet, Platform, Animated, Easing } = ReactNative;
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { authActions } from '../src/store/useAuthStore';

// Safe haptic feedback trigger using native Vibration bridge
async function triggerCrispHaptic(): Promise<void> {
  try {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      const vibration = (ReactNative as any).Vibration;
      if (vibration && typeof vibration.vibrate === 'function') {
        vibration.vibrate(25);
      }
    }
  } catch {
    // Safe no-op on web / simulators without haptic engine
  }
}

/**
 * Non-blocking background session refresh:
 * Sends GET /api/mobile/auth/me with Bearer token.
 * ONLY clears session and invokes onUnauthorized() if the server returns HTTP 401 Unauthorized.
 * On network timeout, 500, or offline state, it NEVER clears session or routes to /welcome.
 */
async function refreshSessionInBackground(
  token: string,
  onUnauthorized: () => void
): Promise<void> {
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
      console.warn('[BrandIntroScreen] Background refresh 401 Unauthorized: clearing session and routing to /welcome');
      await authActions.signOut();
      onUnauthorized();
      return;
    }

    if (res.ok) {
      const data = await res.json();
      if (data?.user) {
        authActions.updateProfile(data.user);
        if (data.nutritionGoal) {
          authActions.updateGoals(data.nutritionGoal);
        }
      }
    }
    // Any other status (500, 502, 503, 404, etc.): keep cached session!
  } catch (netErr) {
    // Network timeout, DNS failure, or offline: NEVER clear session or route to /welcome!
    console.log('[BrandIntroScreen] Background refresh skipped (network offline/timeout):', netErr);
  }
}

export default function BrandIntroScreen() {
  const router = useRouter();
  const destinationRef = useRef<string | null>(null);
  const hasNavigatedRef = useRef<boolean>(false);

  // Native-driven Animated values for 60fps performance
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const taglineOpacityAnim = useRef(new Animated.Value(0)).current;
  const ambientScaleAnim = useRef(new Animated.Value(0.9)).current;

  const navigateToDestination = () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    const target = destinationRef.current || '/welcome';
    router.replace(target as any);
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Cold start hydration: explicitly await authActions.hydrate() before deciding route.
    // Returns the target route string after SecureStore/AsyncStorage reads are complete.
    const hydrationPromise = (async (): Promise<string> => {
      try {
        const result = await authActions.hydrate();

        if (result && result.isAuthenticated && result.token) {
          // Token found — route into the app based on last active mode
          const rawMode = (result.lastMode || '').toLowerCase();
          const targetRoute = rawMode === 'order' || rawMode === '/(order)' ? '/(order)' : '/(track)';

          // Non-blocking background GET /api/mobile/auth/me:
          // ONLY clear session and redirect to /welcome if the server explicitly returns HTTP 401.
          // Never clear on network timeout, 500, or offline state.
          refreshSessionInBackground(result.token, () => {
            if (isMounted) {
              destinationRef.current = '/welcome';
              if (hasNavigatedRef.current) {
                router.replace('/welcome');
              }
            }
          }).catch(() => {});

          return targetRoute;
        }
      } catch (err) {
        console.warn('[BrandIntroScreen] Cold start hydration error:', err);
      }
      return '/welcome';
    })();

    // 4.5-second hard timeout — if SecureStore is pathologically slow, navigate anyway.
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve('/welcome');
      }, 4500);
    });

    // Race: navigate as soon as hydration finishes (or timeout fires after 3 s).
    // This replaces the old unconditional 1800 ms safety timer so the router always
    // sees the hydrated token value rather than the unset in-memory default.
    const racePromise = Promise.race([hydrationPromise, timeoutPromise]);

    // Helper: navigate once — called by animation callback or the race winner.
    const proceedWhenReady = async () => {
      if (hasNavigatedRef.current || !isMounted) return;

      let targetRoute = '/welcome';
      try {
        targetRoute = await racePromise;
      } catch {
        targetRoute = '/welcome';
      }

      destinationRef.current = targetRoute;

      if (hasNavigatedRef.current || !isMounted) return;
      hasNavigatedRef.current = true;
      router.replace(targetRoute as Parameters<typeof router.replace>[0]);
    };

    // 2. 1.8-second Netflix-style zoom-through animation using React Native Native Driver (60fps)
    Animated.parallel([
      // Scale: 0.8 -> 1.0 (750ms), then dramatic 1.0 -> 18.0 (1050ms) zooming straight through letters
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 18.0,
          duration: 1050,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Opacity: fade in (350ms), delay, then fade out (600ms)
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1.0,
          duration: 350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(850),
        Animated.timing(opacityAnim, {
          toValue: 0.0,
          duration: 600,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Tagline: subtle fade in, hold, and fade out
      Animated.sequence([
        Animated.timing(taglineOpacityAnim, {
          toValue: 1.0,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(300),
        Animated.timing(taglineOpacityAnim, {
          toValue: 0.0,
          duration: 400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Ambient glow backdrop expands
      Animated.sequence([
        Animated.timing(ambientScaleAnim, {
          toValue: 1.0,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ambientScaleAnim, {
          toValue: 3.5,
          duration: 1050,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      proceedWhenReady();
    });

    // High-precision haptic pulse at 750ms when wordmark locks center
    const hapticTimer = setTimeout(() => {
      triggerCrispHaptic();
    }, 750);

    return () => {
      isMounted = false;
      clearTimeout(hapticTimer);
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F7F8F6" />

      {/* Ambient Forest Green Backdrop Glow */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            transform: [{ scale: ambientScaleAnim }],
          },
        ]}
      />

      {/* Center Brand Zoom Container */}
      <Animated.View
        style={[
          styles.brandWrapper,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.wordmarkRow}>
          <Text style={styles.brandWordmark}>NUTRIFLEXS</Text>
        </View>

        {/* Emerald Accent Bar */}
        <View style={styles.emeraldAccentBar} />

        <Animated.View
          style={[
            styles.taglineWrapper,
            {
              opacity: taglineOpacityAnim,
            },
          ]}
        >
          <Text style={styles.taglineText}>ATHLETIC FUEL & NUTRITION OS</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Warm Off-White brand background
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ambientGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#1D4D3E', // Forest Green ambient tone
    opacity: 0.05,
  },
  brandWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandWordmark: {
    fontSize: 42,
    fontWeight: '900',
    color: '#1D4D3E', // Deep Forest Green
    letterSpacing: 5.5,
    textAlign: 'center',
    includeFontPadding: false,
  },
  emeraldAccentBar: {
    width: 56,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#10B981', // Emerald accent bar
    marginTop: 10,
    marginBottom: 8,
  },
  taglineWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4D3E', // Deep Forest Green subtle accent
    opacity: 0.75,
    letterSpacing: 2.2,
    textAlign: 'center',
  },
});
