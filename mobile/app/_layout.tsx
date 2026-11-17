import React, { useEffect } from 'react';
import { StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import { colors } from '../src/theme/colors';
import { registerForPushNotificationsAsync } from '../src/services/notifications';
import { useAuthStore } from '../src/store/useAuthStore';

/**
 * Root Mobile App Layout
 * Strictly renders SafeAreaView, StatusBar, and Slot.
 * HeaderBand and FolderTabs are mounted strictly in the (order) and (track) sub-layouts,
 * keeping splash, welcome, auth, and onboarding screens clean.
 */
export default function RootLayout() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Configure channels and register push token on launch and authentication state change
    registerForPushNotificationsAsync().catch((err) => {
      console.warn('[RootLayout] Push notification registration error:', err);
    });
  }, [isAuthenticated]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" backgroundColor={colors.canvas} />
      <Slot />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas, // Off-white #F7F8F6
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0,
  },
});
