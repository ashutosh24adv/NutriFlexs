// Type declarations for expo-notifications

declare module 'expo-notifications' {
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

  export enum AndroidNotificationPriority {
    MIN = 'min',
    LOW = 'low',
    DEFAULT = 'default',
    HIGH = 'high',
    MAX = 'max',
  }

  export interface NotificationBehavior {
    shouldShowAlert?: boolean;
    shouldPlaySound?: boolean;
    shouldSetBadge?: boolean;
    priority?: AndroidNotificationPriority;
  }

  export interface NotificationHandler {
    handleNotification: (notification: any) => Promise<NotificationBehavior>;
    handleSuccess?: (notificationId: string) => void;
    handleError?: (notificationId: string, error: Error) => void;
  }

  export function setNotificationHandler(handler: NotificationHandler | null): void;

  export interface NotificationChannelInput {
    name: string | null;
    importance: AndroidImportance;
    bypassDnd?: boolean;
    description?: string | null;
    groupId?: string | null;
    lightColor?: string;
    lockscreenVisibility?: number;
    showBadge?: boolean;
    sound?: string | null | boolean;
    vibrationPattern?: number[] | null;
    enableLights?: boolean;
    enableVibrate?: boolean;
    audioAttributes?: {
      usage?: number;
      contentType?: number;
      flags?: {
        enforceAudibility?: boolean;
        requestHardwareAudioVideoSynchronization?: boolean;
      };
    };
  }

  export interface NotificationChannel extends NotificationChannelInput {
    id: string;
  }

  export function setNotificationChannelAsync(
    channelId: string,
    channel: NotificationChannelInput
  ): Promise<NotificationChannel | null>;

  export function getNotificationChannelAsync(
    channelId: string
  ): Promise<NotificationChannel | null>;

  export function deleteNotificationChannelAsync(
    channelId: string
  ): Promise<void>;

  export interface PermissionResponse {
    status: 'granted' | 'undetermined' | 'denied';
    granted: boolean;
    canAskAgain: boolean;
    expires: 'never' | number;
  }

  export function getPermissionsAsync(): Promise<PermissionResponse>;
  export function requestPermissionsAsync(permissions?: any): Promise<PermissionResponse>;

  export interface ExpoPushTokenOptions {
    projectId?: string;
    applicationId?: string;
    devicePushToken?: string;
    development?: boolean;
  }

  export interface ExpoPushToken {
    data: string;
    type: 'expo';
  }

  export function getExpoPushTokenAsync(
    options?: ExpoPushTokenOptions
  ): Promise<ExpoPushToken>;

  export interface NotificationContentInput {
    title?: string | null;
    subtitle?: string | null;
    body?: string | null;
    data?: Record<string, any> | null;
    categoryIdentifier?: string | null;
    sound?: boolean | string | null;
    badge?: number | null;
    channelId?: string | null;
    priority?: AndroidNotificationPriority;
    color?: string | null;
    autoDismiss?: boolean;
    sticky?: boolean;
  }

  export type NotificationTriggerInput =
    | null
    | number
    | Date
    | {
        channelId?: string;
        seconds?: number;
        repeats?: boolean;
      }
    | {
        channelId?: string;
        hour?: number;
        minute?: number;
        repeats?: boolean;
      }
    | {
        channelId?: string;
        weekday?: number;
        hour?: number;
        minute?: number;
        repeats?: boolean;
      }
    | {
        date: Date | number;
      };

  export interface NotificationRequestInput {
    identifier?: string;
    content: NotificationContentInput;
    trigger: NotificationTriggerInput;
  }

  export function scheduleNotificationAsync(
    request: NotificationRequestInput
  ): Promise<string>;

  export function cancelScheduledNotificationAsync(
    identifier: string
  ): Promise<void>;

  export function cancelAllScheduledNotificationsAsync(): Promise<void>;

  export function getAllScheduledNotificationsAsync(): Promise<any[]>;

  export interface Subscription {
    remove: () => void;
  }

  export function addNotificationReceivedListener(
    listener: (event: any) => void
  ): Subscription;

  export function addNotificationResponseReceivedListener(
    listener: (event: any) => void
  ): Subscription;

  export function removeNotificationSubscription(
    subscription: Subscription
  ): void;
}
