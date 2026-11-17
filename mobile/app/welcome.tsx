/**
 * NutriFlexs Dual-Mode Welcome Gateway Screen
 *
 * Screen Features (Crisp Light Theme #1D4D3E + #F7F8F6):
 * - Top Header: NutriFlexs logo on left; clean Log In and Sign Up buttons on top right.
 * - Two prominent mode cards:
 *   1. "Order Food (Fuel Mode)":
 *      "5-min gym kiosk pickup • High-protein bowls, shakes & meals" -> routes to /(order).
 *   2. "Track Health (Health & Nutrition Mode)":
 *      "AI Snap-to-Calorie • Macro diary & wearable sync" ->
 *      if logged in, routes to /(track); if logged out, routes to /auth/signup?redirect=track.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { getAuthToken } from '../src/services/apiClient';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const handleOrderMode = async () => {
    try {
      // @ts-ignore
      const SecureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync('last_active_mode', 'order');
      }
    } catch {
      // Safe fallback
    }
    router.replace('/(order)');
  };

  const handleTrackMode = async () => {
    try {
      // @ts-ignore
      const SecureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync('last_active_mode', 'track');
      }
    } catch {
      // Safe fallback
    }

    // Check if user is authenticated (store state or stored JWT token)
    const token = await getAuthToken();
    const isAuthed = (isAuthenticated && user && !user.isGuest) || Boolean(token);

    if (isAuthed) {
      router.replace('/(track)');
    } else {
      router.push('/auth/signup?redirect=track');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#F7F8F6" />

      {/* Top Header */}
      <View style={styles.header}>
        {/* NutriFlexs Logo on Left */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="flash" size={16} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.logoTitle}>NUTRIFLEXS</Text>
            <Text style={styles.logoSubtitle}>ATHLETIC FUEL & MACROS</Text>
          </View>
        </View>

        {/* Clean Log In and Sign Up Buttons on Top Right */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push('/auth/signup')}
            activeOpacity={0.8}
          >
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gateway Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Tagline */}
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.heroBadgeText}>DUAL-ENGINE ATHLETIC PLATFORM</Text>
          </View>
          <Text style={styles.heroTitle}>
            Fuel Your Workout.{'\n'}
            <Text style={styles.heroTitleHighlight}>Master Your Macros.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Select your mode below to experience instant gym kiosk nutrition or precision AI calorie tracking.
          </Text>
        </View>

        {/* Mode Cards Container */}
        <View style={styles.cardsContainer}>
          {/* Mode Card 1: Order Food (Fuel Mode) */}
          <TouchableOpacity
            style={styles.card}
            onPress={handleOrderMode}
            activeOpacity={0.88}
          >
            {/* Ambient Card Accent */}
            <View style={[styles.cardAccentBar, { backgroundColor: '#F59E0B' }]} />

            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Ionicons name="fast-food-outline" size={26} color="#F59E0B" />
              </View>
              <View style={styles.badgePillAmber}>
                <Ionicons name="time-outline" size={12} color="#D97706" />
                <Text style={styles.badgePillTextAmber}>5-MIN KIOSK PICKUP</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>Order Food (Fuel Mode)</Text>
            <Text style={styles.cardDescription}>
              5-min gym kiosk pickup • High-protein bowls, shakes & meals
            </Text>

            {/* Feature Bullets */}
            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#1D4D3E" />
                <Text style={styles.featureText}>Macro-balanced protein bowls & recovery smoothies</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#1D4D3E" />
                <Text style={styles.featureText}>Ready immediately at Cult.fit HSR Layout kiosk</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#1D4D3E" />
                <Text style={styles.featureText}>Auto-syncs nutrition data directly to your daily diary</Text>
              </View>
            </View>

            {/* Action CTA */}
            <View style={[styles.actionCta, { backgroundColor: '#1D4D3E' }]}>
              <Text style={styles.actionCtaText}>Enter Fuel Mode</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Mode Card 2: Track Health (Health & Nutrition Mode) */}
          <TouchableOpacity
            style={styles.card}
            onPress={handleTrackMode}
            activeOpacity={0.88}
          >
            {/* Ambient Card Accent */}
            <View style={[styles.cardAccentBar, { backgroundColor: '#1D4D3E' }]} />

            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(29, 77, 62, 0.1)' }]}>
                <Ionicons name="analytics-outline" size={26} color="#1D4D3E" />
              </View>
              <View style={styles.badgePillGreen}>
                <Ionicons name="sparkles" size={12} color="#1D4D3E" />
                <Text style={styles.badgePillTextGreen}>AI POWERED</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>Track Health (Health & Nutrition Mode)</Text>
            <Text style={styles.cardDescription}>
              AI Snap-to-Calorie • Macro diary & wearable sync
            </Text>

            {/* Feature Bullets */}
            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#1D4D3E" />
                <Text style={styles.featureText}>Snap a meal photo for instant AI macro breakdown</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#1D4D3E" />
                <Text style={styles.featureText}>Syncs Apple Health, Health Connect & Samsung Health</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#1D4D3E" />
                <Text style={styles.featureText}>Dynamic calorie budget, water tracker & coaching</Text>
              </View>
            </View>

            {/* Action CTA */}
            <View style={[styles.actionCta, { backgroundColor: '#1D4D3E' }]}>
              <Text style={styles.actionCtaText}>
                {isAuthenticated && user && !user.isGuest ? 'Enter Health Mode' : 'Start Free with Health Mode'}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <View style={styles.kioskLocationRow}>
            <Ionicons name="location-sharp" size={14} color="#1D4D3E" />
            <Text style={styles.kioskLocationText}>Cult.fit HSR Layout • Bengaluru</Text>
          </View>
          <Text style={styles.footerSubtext}>
            NutriFlexs Unified Health OS • Trusted by Pro Athletes
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Off-white canvas
    paddingTop: Platform.OS === 'android' ? 28 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBECE8',
    backgroundColor: '#F7F8F6',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D4D3E',
    letterSpacing: 1.2,
  },
  logoSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  loginButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4D3E',
  },
  signupButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1D4D3E',
  },
  signupButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heroSection: {
    marginBottom: 28,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(29, 77, 62, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(29, 77, 62, 0.2)',
    marginBottom: 12,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1D4D3E',
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4D3E',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroTitleHighlight: {
    color: '#1D4D3E',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  cardsContainer: {
    gap: 18,
    marginBottom: 32,
  },
  card: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePillAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  badgePillTextAmber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  badgePillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(29, 77, 62, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(29, 77, 62, 0.22)',
  },
  badgePillTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4D3E',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
    marginBottom: 16,
  },
  featureList: {
    gap: 8,
    marginBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F1',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  actionCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
  },
  actionCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  kioskLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kioskLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});
