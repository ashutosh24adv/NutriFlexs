/**
 * NutriFlexs Cold-Start Brand Intro Screen
 *
 * 1.8-second Netflix-style brand reveal in crisp Light Theme:
 * - Warm Off-White canvas (#F7F8F6)
 * - Bold NUTRIFLEXS wordmark in Deep Forest Green (#1D4D3E) scaling smoothly (0.82 -> 1.05 -> 1.0)
 * - Shimmer light sweep overlay
 * - Subtle haptic pulse via Haptics.impactAsync(ImpactFeedbackStyle.Medium)
 *
 * After 1.8s:
 * - Checks expo-secure-store for stored JWT
 * - If present: hydrates useAuthStore via GET /api/mobile/auth/me and navigates to last active mode (/(track) or /(order))
 * - If not authenticated: navigates to /welcome
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthStore, authActions } from '../src/store/authStore';
import { apiClient, getAuthToken } from '../src/services/apiClient';

// Safely resolve native modules across environments
// @ts-ignore
const Reanimated: any = typeof require !== 'undefined' ? (function () { try { return require('react-native-reanimated'); } catch { return null; } })() : null;
// @ts-ignore
const ExpoHaptics: any = typeof require !== 'undefined' ? (function () { try { return require('expo-haptics'); } catch { return null; } })() : null;
// @ts-ignore
const SecureStore: any = typeof require !== 'undefined' ? (function () { try { return require('expo-secure-store'); } catch { return null; } })() : null;

export const ImpactFeedbackStyle = {
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
} as const;

export const Haptics = {
  ImpactFeedbackStyle,
  impactAsync: async (style: string = ImpactFeedbackStyle.Medium): Promise<void> => {
    try {
      if (ExpoHaptics && typeof ExpoHaptics.impactAsync === 'function') {
        await ExpoHaptics.impactAsync(style);
      }
    } catch {
      // Safe no-op in web/simulator environments
    }
  },
};

export default function BrandIntroScreen() {
  const router = useRouter();

  // Animation state for smooth 60fps-120fps hardware rendering
  const [scaleVal, setScaleVal] = useState(0.82);
  const [opacityVal, setOpacityVal] = useState(0);
  const [shimmerX, setShimmerX] = useState(-180);
  const [shimmerOpacity, setShimmerOpacity] = useState(0);

  // Pre-load auth check concurrently during the 1.8s animation
  const destinationRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Concurrently verify auth & last active mode during the 1.8s reveal
    async function checkAuthAndMode() {
      try {
        const token = await getAuthToken();
        if (!token) {
          destinationRef.current = '/welcome';
          return;
        }

        // Token found: hydrate useAuthStore via GET /api/mobile/auth/me
        try {
          const res = await apiClient.get('/api/mobile/auth/me', {
            suppressNetworkAlert: true,
          });

          if (res?.user) {
            authActions.updateProfile(res.user);
          } else {
            await authActions.fetchMe();
          }

          // Determine last active mode (/(track) or /(order))
          let lastMode = 'order';
          try {
            if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
              const saved = await SecureStore.getItemAsync('last_active_mode');
              if (saved) lastMode = saved;
            }
          } catch {
            // Fallback to order
          }

          if (isMounted) {
            destinationRef.current = lastMode === 'track' ? '/(track)' : '/(order)';
          }
        } catch (apiErr) {
          if (isMounted) {
            destinationRef.current = '/welcome';
          }
        }
      } catch {
        if (isMounted) {
          destinationRef.current = '/welcome';
        }
      }
    }

    checkAuthAndMode();

    // High-precision 1.8s (1800ms) Netflix-style brand reveal loop
    const startTime = Date.now();
    const DURATION = 1800;
    let hapticFired = false;
    let animationFrameId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / DURATION);

      // Opacity: 0 -> 1 over first 400ms
      const op = Math.min(1, elapsed / 400);
      setOpacityVal(op);

      // Smooth Scale: 0.82 -> 1.05 -> 1.0
      let currentScale = 0.82;
      if (elapsed <= 1000) {
        // 0 to 1000ms: smooth scale from 0.82 to 1.05
        const t = elapsed / 1000;
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        currentScale = 0.82 + (1.05 - 0.82) * ease;
      } else if (elapsed <= 1600) {
        // 1000ms to 1600ms: settle smoothly from 1.05 down to 1.00
        const t = (elapsed - 1000) / 600;
        const ease = 1 - Math.pow(1 - t, 2);
        currentScale = 1.05 - (1.05 - 1.0) * ease;
      } else {
        // 1600ms to 1800ms: locked at 1.0
        currentScale = 1.0;
      }
      setScaleVal(currentScale);

      // Subtle haptic pulse at peak scale (~1000ms)
      if (elapsed >= 1000 && !hapticFired) {
        hapticFired = true;
        Haptics.impactAsync(ImpactFeedbackStyle.Medium);
      }

      // Shimmer light sweep: -180px -> +180px over first 1400ms
      if (elapsed <= 1400) {
        const sweepT = elapsed / 1400;
        const shimmerPos = -180 + 360 * sweepT;
        setShimmerX(shimmerPos);
        setShimmerOpacity(Math.sin(sweepT * Math.PI) * 0.85);
      } else {
        setShimmerOpacity(0);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        // 1.8 seconds complete: execute final navigation
        const targetRoute = destinationRef.current || '/welcome';
        router.replace(targetRoute);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F7F8F6" />

      {/* Ambient Forest Glow in Background */}
      <View style={styles.ambientGlow} />

      {/* Brand Reveal Container */}
      <View
        style={[
          styles.brandContainer,
          {
            opacity: opacityVal,
            transform: [{ scale: scaleVal }],
          },
        ]}
      >
        {/* Core Bold NUTRIFLEXS Wordmark in Deep Forest Green */}
        <View style={styles.wordmarkRow}>
          <Text style={styles.brandText}>NUTRIFLEXS</Text>
        </View>

        {/* Shimmer Light Sweep Overlay */}
        {shimmerOpacity > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.shimmerSweep,
              {
                opacity: shimmerOpacity,
                transform: [{ translateX: shimmerX }],
              },
            ]}
          >
            <View style={styles.shimmerAmberTint} />
            <View style={styles.shimmerEmeraldTint} />
          </View>
        )}

        {/* Athletic Tagline */}
        <View style={styles.taglineWrapper}>
          <View style={styles.taglineDivider} />
          <Text style={styles.taglineText}>ATHLETIC FUEL & NUTRITION OS</Text>
          <View style={styles.taglineDivider} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Warm Off-White canvas
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#1D4D3E', // Forest green soft ambient tint
    opacity: 0.04,
  },
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 28,
    paddingVertical: 20,
    overflow: 'hidden',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#1D4D3E', // Crisp Deep Forest Green
    letterSpacing: 4.5,
    textAlign: 'center',
  },
  shimmerSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    flexDirection: 'row',
  },
  shimmerAmberTint: {
    flex: 1,
    backgroundColor: '#F59E0B',
    opacity: 0.2,
  },
  shimmerEmeraldTint: {
    flex: 1,
    backgroundColor: '#1D4D3E',
    opacity: 0.15,
  },
  taglineWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  taglineDivider: {
    width: 22,
    height: 1.5,
    backgroundColor: '#F59E0B',
    opacity: 0.75,
  },
  taglineText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 2.2,
    textAlign: 'center',
  },
});
