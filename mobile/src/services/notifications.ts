/**
 * NutriFlexs Mobile Notification Service
 *
 * Configures expo-notifications foreground handler, Android channels (orders & reminders),
 * push token registration with backend (POST /api/mobile/notifications/register-token),
 * and local meal/water reminder & order notification helpers.
 *
 * Designed with defensive error handling to ensure zero crashes on emulators,
 * web previews, or devices where notification permissions are denied.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from './apiClient';

// Android Notification Importance Enums
export enum AndroidImportance {
  UNKNOWN = 0,
  UNSPECIFIED = 1,
  NONE = 2,
  MIN = 3,
  LOW = 4,
  DEFAULT = 5,
  HIGH = 6,
  MAX = 7,
}

// Android Notification Priority Enums
export enum AndroidNotificationPriority {
  MIN = 'min',
  LOW = 'low',
  DEFAULT = 'default',
  HIGH = 'high',
  MAX = 'max',
}

export interface MealReminderOptions {
  title?: string;
  body?: string;
  hour?: number;
  minute?: number;
  repeats?: boolean;
}

export interface WaterReminderOptions {
  title?: string;
  body?: string;
  intervalSeconds?: number;
  repeats?: boolean;
}

export interface NotificationPreferences {
  orderUpdates: boolean;
  reminders: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  reminders: true,
};

const PREFERENCES_STORAGE_KEY = '@nutriflex_notification_preferences';

// In-memory fallback if AsyncStorage is unavailable
let inMemoryPreferences: NotificationPreferences = { ...DEFAULT_PREFERENCES };

/**
 * Safely fetches notification preferences from AsyncStorage with in-memory fallback
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const asyncStorageMod =
      typeof require !== 'undefined'
        ? require('@react-native-async-storage/async-storage')
        : null;
    const AsyncStorage = asyncStorageMod?.default || asyncStorageMod;
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      const stored = await AsyncStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        inMemoryPreferences = { ...DEFAULT_PREFERENCES, ...parsed };
        return inMemoryPreferences;
      }
    }
  } catch (err) {
    console.warn('[notifications] Failed loading notification preferences:', err);
  }
  return inMemoryPreferences;
}

/**
 * Saves notification preferences to AsyncStorage and applies side-effects (scheduling or cancelling)
 */
export async function setNotificationPreferences(
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences();
  const updated: NotificationPreferences = {
    ...current,
    ...prefs,
  };
  inMemoryPreferences = updated;

  try {
    const asyncStorageMod =
      typeof require !== 'undefined'
        ? require('@react-native-async-storage/async-storage')
        : null;
    const AsyncStorage = asyncStorageMod?.default || asyncStorageMod;
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      await AsyncStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('[notifications] Failed saving notification preferences:', err);
  }

  // Handle side-effects of preference toggles
  if (prefs.reminders === true) {
    await scheduleMealReminder().catch(() => null);
    await scheduleWaterReminder().catch(() => null);
  } else if (prefs.reminders === false) {
    await cancelAllNotifications().catch(() => null);
  }

  if (prefs.orderUpdates === true) {
    await setupNotificationChannels().catch(() => null);
    await registerForPushNotificationsAsync().catch(() => null);
  }

  return updated;
}

// Cached Expo push token in-memory
let cachedPushToken: string | null = null;
let channelsInitialized = false;

/**
 * Safely resolves expo-notifications module across native, emulator, and web environments
 */
function getNotificationsModule(): any {
  try {
    // @ts-ignore
    if (typeof require !== 'undefined') {
      // @ts-ignore
      const mod = require('expo-notifications');
      return mod?.default || mod;
    }
  } catch {
    // Graceful fallback for non-native environments or missing binary linking
  }
  return null;
}

/**
 * Configure foreground notification behavior:
 * Alerts, sound, and badge are enabled for incoming notifications.
 */
export function configureNotificationHandler(): void {
  try {
    const Notifications = getNotificationsModule();
    if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority?.HIGH ?? AndroidNotificationPriority.HIGH,
        }),
      });
    }
  } catch (err) {
    console.warn('[notifications] Failed to set notification handler:', err);
  }
}

// Run handler configuration on module import
configureNotificationHandler();

/**
 * Set up Android notification channels:
 * - 'orders': High importance, vibration pattern, sound for order updates.
 * - 'reminders': Default importance for meal & water intake reminders.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  if (channelsInitialized) {
    return;
  }

  try {
    const Notifications = getNotificationsModule();
    if (!Notifications || typeof Notifications.setNotificationChannelAsync !== 'function') {
      return;
    }

    const Importance = Notifications.AndroidImportance || AndroidImportance;

    // 1. 'orders' Channel: High importance for immediate order status updates
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: Importance.HIGH ?? AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lightColor: '#1D4D3E', // NutriFlex Forest Green
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
      description: 'Real-time updates on your post-workout food preparation and pickup ready status.',
    });

    // 2. 'reminders' Channel: Default importance for scheduled meal & water reminders
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Meal & Water Reminders',
      importance: Importance.DEFAULT ?? AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lightColor: '#1D4D3E',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
      description: 'Scheduled reminders for tracking daily calories, macronutrients, and hydration.',
    });

    channelsInitialized = true;
  } catch (err) {
    console.warn('[notifications] Failed to set up Android notification channels:', err);
  }
}

/**
 * Returns cached push token if previously retrieved
 */
export function getCachedPushToken(): string | null {
  return cachedPushToken;
}

/**
 * Sends retrieved Expo push token to backend via POST /api/mobile/notifications/register-token
 * Authenticated automatically via Bearer token in apiClient.
 */
export async function sendPushTokenToBackend(pushToken: string): Promise<boolean> {
  if (!pushToken || typeof pushToken !== 'string' || !pushToken.trim()) {
    return false;
  }

  try {
    const authToken = await apiClient.getAuthToken();
    if (!authToken) {
      // User is not authenticated yet; token remains cached and will be registered on login/hydration
      return false;
    }

    const response = await apiClient.post(
      '/api/mobile/notifications/register-token',
      {
        token: pushToken.trim(),
        expoPushToken: pushToken.trim(),
        pushToken: pushToken.trim(),
      },
      {
        suppressNetworkAlert: true,
      }
    );

    return response.ok === true || response.status === 200;
  } catch (err) {
    console.warn('[notifications] Failed to send push token to backend:', err);
    return false;
  }
}

/**
 * Request permission, retrieve Expo push token, and register it with the backend.
 * Safely guards against denied permissions, web, and simulator/unsupported environments.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // 1. Configure channels on Android
    if (Platform.OS === 'android') {
      await setupNotificationChannels();
    }

    // 2. Push notifications are not supported on web
    if (Platform.OS === 'web') {
      return null;
    }

    const Notifications = getNotificationsModule();
    if (!Notifications) {
      console.info('[notifications] expo-notifications not available in this environment.');
      return null;
    }

    // 3. Permission verification & request
    if (typeof Notifications.getPermissionsAsync === 'function') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted' && typeof Notifications.requestPermissionsAsync === 'function') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.info('[notifications] Permission for push notifications not granted (' + finalStatus + ').');
        return null;
      }
    }

    // 4. Retrieve Expo push token
    let token: string | null = null;
    if (typeof Notifications.getExpoPushTokenAsync === 'function') {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        (Constants as any)?.easConfig?.projectId ??
        Constants?.expoConfig?.extra?.projectId;

      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      token = tokenResult?.data || null;
    }

    if (!token) {
      return null;
    }

    cachedPushToken = token;

    // 5. Register with backend if user is authenticated
    await sendPushTokenToBackend(token);

    return token;
  } catch (err) {
    // Do not crash if notifications are denied or on emulators/unsupported environments
    console.warn('[notifications] registerForPushNotificationsAsync safe fallback:', err);
    return null;
  }
}

/**
 * Schedule a local meal reminder notification on the 'reminders' channel
 */
export async function scheduleMealReminder(options?: MealReminderOptions): Promise<string | null> {
  try {
    const prefs = await getNotificationPreferences();
    if (!prefs.reminders) {
      return null;
    }

    const Notifications = getNotificationsModule();
    if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
      return null;
    }

    if (Platform.OS === 'android') {
      await setupNotificationChannels();
    }

    const title = options?.title || 'Time for a nutritious meal! 🥗';
    const body = options?.body || 'Log your meal or pick up fresh high-protein food on NutriFlex.';
    const hour = options?.hour ?? 13; // Default 1:00 PM
    const minute = options?.minute ?? 0;
    const repeats = options?.repeats ?? true;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        channelId: 'reminders',
        data: { type: 'meal_reminder' },
      },
      trigger: {
        hour,
        minute,
        repeats,
      },
    });

    return notificationId;
  } catch (err) {
    console.warn('[notifications] scheduleMealReminder error:', err);
    return null;
  }
}

/**
 * Schedule a recurring water intake reminder notification on the 'reminders' channel
 */
export async function scheduleWaterReminder(options?: WaterReminderOptions): Promise<string | null> {
  try {
    const prefs = await getNotificationPreferences();
    if (!prefs.reminders) {
      return null;
    }

    const Notifications = getNotificationsModule();
    if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
      return null;
    }

    if (Platform.OS === 'android') {
      await setupNotificationChannels();
    }

    const title = options?.title || 'Hydration Check-in 💧';
    const body = options?.body || "Don't forget to drink water and track your daily hydration goal!";
    const intervalSeconds = options?.intervalSeconds ?? 7200; // Default 2 hours (7200 seconds)
    const repeats = options?.repeats ?? true;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        channelId: 'reminders',
        data: { type: 'water_reminder' },
      },
      trigger: {
        seconds: intervalSeconds,
        repeats,
      },
    });

    return notificationId;
  } catch (err) {
    console.warn('[notifications] scheduleWaterReminder error:', err);
    return null;
  }
}

/**
 * Sends an immediate local notification on the 'orders' channel for order updates
 */
export async function sendLocalOrderNotification(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<string | null> {
  try {
    const prefs = await getNotificationPreferences();
    if (!prefs.orderUpdates) {
      return null;
    }

    const Notifications = getNotificationsModule();
    if (!Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
      return null;
    }

    if (Platform.OS === 'android') {
      await setupNotificationChannels();
    }

    const Priority = Notifications.AndroidNotificationPriority || AndroidNotificationPriority;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        channelId: 'orders',
        priority: Priority.HIGH ?? AndroidNotificationPriority.HIGH,
        data: { type: 'order_update', ...(data || {}) },
      },
      trigger: null, // null delivers immediately
    });

    return notificationId;
  } catch (err) {
    console.warn('[notifications] sendLocalOrderNotification error:', err);
    return null;
  }
}

/**
 * Cancels a specific scheduled notification by id
 */
export async function cancelNotification(identifier: string): Promise<void> {
  try {
    const Notifications = getNotificationsModule();
    if (Notifications && typeof Notifications.cancelScheduledNotificationAsync === 'function') {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }
  } catch (err) {
    console.warn('[notifications] cancelNotification error:', err);
  }
}

/**
 * Cancels all scheduled local notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    const Notifications = getNotificationsModule();
    if (Notifications && typeof Notifications.cancelAllScheduledNotificationsAsync === 'function') {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  } catch (err) {
    console.warn('[notifications] cancelAllNotifications error:', err);
  }
}

export default {
  configureNotificationHandler,
  setupNotificationChannels,
  registerForPushNotificationsAsync,
  sendPushTokenToBackend,
  getCachedPushToken,
  getNotificationPreferences,
  setNotificationPreferences,
  scheduleMealReminder,
  scheduleWaterReminder,
  sendLocalOrderNotification,
  cancelNotification,
  cancelAllNotifications,
};
