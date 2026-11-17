/**
 * NutriFlexs Welcome Gateway Screen
 *
 * Light Theme (#F7F8F6 canvas, #1D4D3E forest green):
 * - Top-right "Log In" / "Sign Up" pills
 * - Clean, clutter-free layout (no dense bullet lists, badges, or footer clutter)
 * - Two large visual cards:
 *   1. "Order Food": High-protein meal imagery + subtitle "Fresh gym meals in 5 mins" -> opens /(order)
 *   2. "Track Calories": Clean calorie & macro graphic + subtitle "Snap meals & track daily macros" -> opens /(track)
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

export default function WelcomeScreen() {
  const router = useRouter();

  const handleOrderMode = async () => {
    try {
      const secureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
      if (secureStore && typeof secureStore.setItemAsync === 'function') {
        await secureStore.setItemAsync('last_active_mode', 'order');
      }
    } catch {}
    try {
      const asyncStorageMod = typeof require !== 'undefined' ? require('@react-native-async-storage/async-storage') : null;
      const asyncStorage = asyncStorageMod?.default || asyncStorageMod;
      if (asyncStorage && typeof asyncStorage.setItem === 'function') {
        await asyncStorage.setItem('last_active_mode', 'order');
      }
    } catch {}

    router.replace('/(order)');
  };

  const handleTrackMode = async () => {
    try {
      const secureStore = typeof require !== 'undefined' ? require('expo-secure-store') : null;
      if (secureStore && typeof secureStore.setItemAsync === 'function') {
        await secureStore.setItemAsync('last_active_mode', 'track');
      }
    } catch {}
    try {
      const asyncStorageMod = typeof require !== 'undefined' ? require('@react-native-async-storage/async-storage') : null;
      const asyncStorage = asyncStorageMod?.default || asyncStorageMod;
      if (asyncStorage && typeof asyncStorage.setItem === 'function') {
        await asyncStorage.setItem('last_active_mode', 'track');
      }
    } catch {}

    router.replace('/(track)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor="#F7F8F6" />

      {/* Top Header with Brand Title and Top-Right Log In / Sign Up Pills */}
      <View style={styles.header}>
        <View style={styles.brandContainer}>
          <View style={styles.brandIconCircle}>
            <Ionicons name="flash" size={16} color="#F59E0B" />
          </View>
          <Text style={styles.brandName}>NUTRIFLEXS</Text>
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
        {/* Editorial Subheading */}
        <View style={styles.titleSection}>
          <Text style={styles.headingTitle}>Fuel Your Performance</Text>
          <Text style={styles.headingSubtitle}>Choose how you want to experience NutriFlexs today</Text>
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
                <Ionicons name="restaurant" size={13} color="#FFFFFF" />
                <Text style={styles.floatingTagText}>High Protein</Text>
              </View>
            </View>

            <View style={styles.cardDetailsRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Order Food</Text>
                <Text style={styles.cardSubtitle}>Fresh gym meals in 5 mins</Text>
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

              {/* Clean Macro Graphic Overlay */}
              <View style={styles.macroGraphicBadge}>
                <View style={styles.macroPillAmber}>
                  <Text style={styles.macroPillLabel}>P</Text>
                  <Text style={styles.macroPillVal}>48g</Text>
                </View>
                <View style={styles.macroPillEmerald}>
                  <Text style={styles.macroPillLabel}>C</Text>
                  <Text style={styles.macroPillVal}>55g</Text>
                </View>
                <View style={styles.macroPillBlue}>
                  <Text style={styles.macroPillLabel}>F</Text>
                  <Text style={styles.macroPillVal}>16g</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardDetailsRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>Track Calories</Text>
                <Text style={styles.cardSubtitle}>Snap meals & track daily macros</Text>
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
    backgroundColor: '#F7F8F6', // Warm Off-White brand background
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1D4D3E', // Forest Green
    letterSpacing: 1.5,
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
    backgroundColor: '#1D4D3E', // Forest Green
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
  titleSection: {
    marginBottom: 20,
  },
  headingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  headingSubtitle: {
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
    height: 190,
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
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  floatingTag: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(29, 77, 62, 0.88)',
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
    bottom: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  macroPillAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  macroPillEmerald: {
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
    color: '#F59E0B',
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
