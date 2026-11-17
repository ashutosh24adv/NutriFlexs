import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { HeaderBand } from '../../src/components/HeaderBand';
import { FolderTabs, type AppMode } from '../../src/components/FolderTabs';
import { useAuthStore } from '../../src/store/authStore';
import { useDiaryStore } from '../../src/store/diaryStore';
import { useHealthSync } from '../../src/services/useHealthSync';

export default function TrackLayout() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const isAuthed = Boolean(isAuthenticated && user && !user.isGuest);
  const userName = isAuthed && user?.name?.trim() ? user.name.trim() : '';

  const [selectedGym, setSelectedGym] = useState(user?.homeKiosk || 'Cult.fit HSR Layout');

  useEffect(() => {
    if (user?.homeKiosk) {
      setSelectedGym(user.homeKiosk);
    }
  }, [user?.homeKiosk]);

  // Dynamic live remaining calories for Track Health top switcher
  const { todayCalories } = useDiaryStore();
  const { targets, telemetry } = useHealthSync();
  const calorieGoal = targets?.calories || 2000;
  const foodCalories = todayCalories || 0;
  const activeBurned = telemetry?.activeCaloriesBurned ?? telemetry?.activeBurned ?? 0;
  const remainingCalories = Math.max(0, calorieGoal - foodCalories + activeBurned);
  const trackSubtext = `${remainingCalories.toLocaleString()} kcal left`;

  const handleTabChange = (tab: AppMode) => {
    if (tab === 'order') {
      router.replace('/(order)');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#1D4D3E" />

      {/* Solid Brand Green Header Band with Dynamic Initials */}
      <HeaderBand
        kioskLocation={selectedGym}
        onSelectKiosk={(newKiosk) => setSelectedGym(newKiosk)}
        userName={userName}
        onAvatarPress={() => router.push('/(track)/profile')}
      />

      {/* Mode Switcher Folder Tabs */}
      <FolderTabs
        activeTab="track"
        onTabChange={handleTabChange}
        orderSubtext="Ready in 5 min"
        trackSubtext={trackSubtext}
      />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brandGreen,
          tabBarInactiveTintColor: colors.text.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Today',
            tabBarLabel: 'Today',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={size || 22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: 'Activity',
            tabBarLabel: 'Activity',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? 'fitness' : 'fitness-outline'}
                size={size || 22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="trends"
          options={{
            title: 'Trends',
            tabBarLabel: 'Trends',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? 'stats-chart' : 'stats-chart-outline'}
                size={size || 22}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={size || 22}
                color={color}
              />
            ),
          }}
        />

      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
});
