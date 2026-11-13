import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Slot, useRouter, usePathname } from 'expo-router';
import { colors } from '../src/theme/colors';
import { HeaderBand } from '../src/components/HeaderBand';
import { FolderTabs, type AppMode } from '../src/components/FolderTabs';

/**
 * Root Mobile App Shell
 * Matches the design brief:
 * - Solid brand green header band (#1D4D3E) with safe area status bar insets
 * - <StatusBar style="light" backgroundColor="#1D4D3E" />
 * - Streamlined top header:
 *   - Primary screens ((order)/index and (track)/index): Full FolderTabs switcher
 *   - Secondary tabs (orders, reorder, trends, coach, profile, cart): Compact header without FolderTabs,
 *     giving secondary tab content maximum breathing room.
 */
export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeSide, setActiveSide] = useState<AppMode>('order');
  const [selectedGym, setSelectedGym] = useState('Cult.fit HSR Layout');

  // Determine whether current screen is a secondary screen
  const isSecondaryScreen = Boolean(
    pathname?.includes('orders') ||
    pathname?.includes('reorder') ||
    pathname?.includes('trends') ||
    pathname?.includes('coach') ||
    pathname?.includes('profile') ||
    pathname?.includes('cart') ||
    pathname?.includes('health-connections')
  );

  // Sync active side when navigation route changes
  useEffect(() => {
    if (pathname?.includes('track')) {
      setActiveSide('track');
    } else if (pathname?.includes('order')) {
      setActiveSide('order');
    }
  }, [pathname]);

  const handleTabChange = (tab: AppMode) => {
    setActiveSide(tab); // Immediate optimistic visual toggle
    if (tab === 'order') {
      router.replace('/(order)');
    } else {
      router.replace('/(track)');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#1D4D3E" />

      {/* Solid Brand Green Header Band with Interactive Kiosk Selector */}
      <HeaderBand
        kioskLocation={selectedGym}
        onSelectKiosk={(newKiosk) => setSelectedGym(newKiosk)}
        userName="Nutri Member"
      />

      {/* Full FolderTabs switcher only on Primary Screens for extra breathing room on secondary tabs */}
      {!isSecondaryScreen && (
        <FolderTabs
          activeTab={activeSide}
          onTabChange={handleTabChange}
          orderSubtext="Ready in 5 min"
          trackSubtext="1,170 kcal left"
        />
      )}

      {/* Dynamic Shell Content */}
      <View style={styles.contentContainer}>
        <Slot />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1D4D3E', // Ensures top status bar and notch match header band
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) : 0,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: colors.canvas, // Off-white #F7F8F6
  },
});
