/**
 * NutriFlexs Welcome Gateway Screen
 *
 * Light Theme (#F7F8F6 canvas, #1D4D3E forest green):
 * - Top Header: Clean NutriFlexs brand mark on left; crisp "Log In" & "Sign Up" pills on top-right.
 * - Center Showcase: Header "What would you like to do today?"
 * - Two large visual cards:
 *   1. "Order Food": High-protein gym meal imagery + subtitle "Fresh meals ready in 5 mins" -> opens /(order)
 *   2. "Track Calories": Clean visual macro/calorie progress graphic + subtitle "Snap meals & track daily calories"
 *      -> opens /(track) if logged in, or /auth/signup?redirect=track if logged out.
 * - Clutter-free layout (no dense bullet lists, feature paragraphs, or cluttered badges).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, authActions } from '../src/store/useAuthStore';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const isLoggedIn = Boolean(isAuthenticated && user && !user.isGuest);

  const handleOrderMode = async () => {
    try {
      authActions.setLastMode('order');
    } catch {}

    router.replace('/(order)');
  };

  const handleTrackMode = async () => {
    try {
      authActions.setLastMode('track');
    } catch {}

    if (isLoggedIn) {
      router.replace('/(track)');
    } else {
      router.push('/auth/signup?redirect=track' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#F7F8F6" />

      {/* Top Header with Clean NutriFlexs Brand Mark & Crisp Auth Pills */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <View style={styles.brandIconCircle}>
            <Ionicons name="leaf" size={15} color="#10B981" />
          </View>
          <Text style={styles.brandName}>NutriFlexs</Text>
        </View>

        <View style={styles.authPillsRow}>
          <TouchableOpacity
            style={styles.loginPill}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginPillText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupPill}
            onPress={() => router.push('/auth/signup')}
            activeOpacity={0.8}
          >
            <Text style={styles.signupPillText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Center Showcase Header */}
        <View style={styles.showcaseSection}>
          <Text style={styles.showcaseTitle}>What would you like to do today?</Text>
          <Text style={styles.showcaseSubtitle}>
            Choose your path to peak athletic nutrition and daily performance.
          </Text>
        </View>

        {/* Two Large Visual Cards */}
        <View style={styles.cardsContainer}>
          {/* Card 1 — Order Food */}
          <TouchableOpacity
            style={styles.visualCard}
            onPress={handleOrderMode}
            activeOpacity={0.92}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=80',
                }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlayGradient} />
              <View style={styles.floatingTag}>
                <Ionicons name="restaurant" size={12} color="#FFFFFF" />
                <Text style={styles.floatingTagText}>High Protein</Text>
              </View>
            </View>

            <View style={styles.cardDetailsRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Order Food</Text>
                <Text style={styles.cardSubtitle}>Fresh meals ready in 5 mins</Text>
              </View>

              <View style={styles.arrowButton}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2 — Track Calories */}
          <TouchableOpacity
            style={styles.visualCard}
            onPress={handleTrackMode}
            activeOpacity={0.92}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&auto=format&fit=crop&q=80',
                }}
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlayGradient} />

              {/* Clean Visual Macro & Calorie Progress Graphic */}
              <View style={styles.macroGraphicBadge}>
                <View style={styles.macroTopRow}>
                  <View style={styles.macroCalorieLabelRow}>
                    <Ionicons name="flame" size={13} color="#F59E0B" />
                    <Text style={styles.macroCalorieText}>1,850 / 2,400 kcal</Text>
                  </View>
                  <Text style={styles.macroPercentageText}>77%</Text>
                </View>

                {/* Progress Bar Graphic */}
                <View style={styles.macroProgressBarContainer}>
                  <View style={[styles.macroProgressBarFill, { width: '77%' }]} />
                </View>

                {/* Macro Distribution Pills */}
                <View style={styles.macroPillsRow}>
                  <View style={styles.macroPillEmerald}>
                    <Text style={styles.macroPillLabel}>P</Text>
                    <Text style={styles.macroPillVal}>48g</Text>
                  </View>
                  <View style={styles.macroPillAmber}>
                    <Text style={styles.macroPillLabel}>C</Text>
                    <Text style={styles.macroPillVal}>55g</Text>
                  </View>
                  <View style={styles.macroPillBlue}>
                    <Text style={styles.macroPillLabel}>F</Text>
                    <Text style={styles.macroPillVal}>16g</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.cardDetailsRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Track Calories</Text>
                <Text style={styles.cardSubtitle}>Snap meals & track daily calories</Text>
              </View>

              <View style={styles.arrowButton}>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8F6', // Warm Off-White brand canvas
    paddingTop: Platform.OS === 'android' ? 28 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#F7F8F6',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(29, 77, 62, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D4D3E', // Forest Green brand text
    letterSpacing: -0.3,
  },
  authPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  loginPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4D3E',
  },
  signupPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1D4D3E', // Deep Forest Green
  },
  signupPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  showcaseSection: {
    marginBottom: 22,
  },
  showcaseTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    lineHeight: 33,
    marginBottom: 6,
  },
  showcaseSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  cardsContainer: {
    gap: 20,
  },
  visualCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: {
    height: 195,
    position: 'relative',
    backgroundColor: '#EBECE8',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  floatingTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(29, 77, 62, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  floatingTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  macroGraphicBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  macroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroCalorieLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroCalorieText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  macroPercentageText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981', // Emerald percent indicator
  },
  macroProgressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  macroProgressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  macroPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  macroPillEmerald: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  macroPillAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  macroPillBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  macroPillLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  macroPillVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1D4D3E', // Forest Green
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 19,
  },
  arrowButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1D4D3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
