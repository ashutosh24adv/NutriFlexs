/**
 * NutriFlexs Cold-Start Brand Intro Screen
 *
 * 1.8-second Netflix-style zoom-through brand reveal:
 * - Warm Off-White background (#F7F8F6)
 * - Forest Green (#1D4D3E) brand palette
 * - Bold NUTRIFLEXS wordmark scales into center with a crisp haptic pulse (Medium)
 * - Wordmark then dramatically scales (1.0 -> 18.0) and fades out zooming straight through the letters
 * - Concurrently hydrates useAuthStore:
 *     - If authenticated: routes to /(track) or /(order) based on last active mode
 *     - If unauthenticated: routes to /welcome
 * - Uses router.replace(...)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { authActions } from '../src/store/useAuthStore';

// Safe haptic feedback trigger
async function triggerCrispHaptic(): Promise<void> {
  try {
    if (Haptics && typeof Haptics.impactAsync === 'function') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch {
    // Safe no-op on web / simulators without haptic engine
  }
}

export default function BrandIntroScreen() {
  const router = useRouter();
  const destinationRef = useRef<string | null>(null);
  const hasNavigatedRef = useRef<boolean>(false);

  // Reanimated shared values
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const ambientScale = useSharedValue(0.9);

  const navigateToDestination = () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    const target = destinationRef.current || '/welcome';
    router.replace(target);
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Concurrently hydrate useAuthStore during the 1.8-second animation
    async function performHydration() {
      try {
        const result = await authActions.hydrate();

        if (result.isAuthenticated && result.user) {
          // Check last active mode (defaulting to /(order))
          let lastMode = 'order';

          try {
            const secureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
            if (secureStore && typeof secureStore.getItemAsync === 'function') {
              const saved = await secureStore.getItemAsync('last_active_mode');
              if (saved) lastMode = saved;
            }
          } catch {}

          try {
            const asyncStorageMod = typeof require !== 'undefined' ? require('@react-native-async-storage/async-storage') : null;
            const asyncStorage = asyncStorageMod?.default || asyncStorageMod;
            if (asyncStorage && typeof asyncStorage.getItem === 'function') {
              const saved = await asyncStorage.getItem('last_active_mode');
              if (saved) lastMode = saved;
            }
          } catch {}

          if (isMounted) {
            destinationRef.current = lastMode === 'track' ? '/(track)' : '/(order)';
          }
        } else {
          if (isMounted) {
            destinationRef.current = '/welcome';
          }
        }
      } catch (err) {
        console.warn('[BrandIntroScreen] Hydration check fallback:', err);
        if (isMounted) {
          destinationRef.current = '/welcome';
        }
      }
    }

    performHydration();

    // 2. 1.8-second Netflix-style zoom-through animation
    // Phase 1 (0 -> 750ms): Wordmark enters from 0.8 to 1.0 with haptic pulse
    // Phase 2 (750ms -> 1800ms, ~1050ms): Dramatic scale 1.0 -> 18.0 zooming through screen into next route
    try {
      scale.value = withSequence(
        withTiming(1.0, {
          duration: 750,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          if (finished) {
            runOnJS(triggerCrispHaptic)();
          }
        }),
        withTiming(18.0, {
          duration: 1050,
          easing: Easing.in(Easing.cubic),
        })
      );

      // Fade in wordmark (0 -> 350ms), hold, then fade out zooming through (1200ms -> 1800ms)
      opacity.value = withSequence(
        withTiming(1.0, { duration: 350, easing: Easing.out(Easing.quad) }),
        withDelay(
          850,
          withTiming(0.0, {
            duration: 600,
            easing: Easing.in(Easing.quad),
          }, (finished) => {
            if (finished) {
              runOnJS(navigateToDestination)();
            }
          })
        )
      );

      // Tagline subtly fades in then fades out before the deep zoom
      taglineOpacity.value = withSequence(
        withTiming(1.0, { duration: 500, easing: Easing.out(Easing.quad) }),
        withDelay(300, withTiming(0.0, { duration: 400, easing: Easing.in(Easing.quad) }))
      );

      // Ambient forest backdrop expands
      ambientScale.value = withSequence(
        withTiming(1.0, { duration: 750, easing: Easing.out(Easing.cubic) }),
        withTiming(3.5, { duration: 1050, easing: Easing.in(Easing.cubic) })
      );
    } catch {
      // Safe fallback if reanimated native driver is unsupported
    }

    // High-precision 1800ms safety timer guaranteeing navigation
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        navigateToDestination();
      }
    }, 1800);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [router]);

  const animatedWordmarkStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const animatedTaglineStyle = useAnimatedStyle(() => {
    return {
      opacity: taglineOpacity.value,
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: ambientScale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F7F8F6" />

      {/* Ambient Forest Green Backdrop Glow */}
      <Animated.View style={[styles.ambientGlow, animatedBackdropStyle]} />

      {/* Center Brand Zoom Container */}
      <Animated.View style={[styles.brandWrapper, animatedWordmarkStyle]}>
        <View style={styles.wordmarkRow}>
          <Text style={styles.brandWordmark}>NUTRIFLEXS</Text>
        </View>

        <Animated.View style={[styles.taglineWrapper, animatedTaglineStyle]}>
          <View style={styles.taglineDivider} />
          <Text style={styles.taglineText}>ATHLETIC FUEL & NUTRITION OS</Text>
          <View style={styles.taglineDivider} />
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
  taglineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  taglineDivider: {
    width: 20,
    height: 1.5,
    backgroundColor: '#F59E0B',
    opacity: 0.8,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B', // Amber athletic accent
    letterSpacing: 2.2,
    textAlign: 'center',
  },
});
