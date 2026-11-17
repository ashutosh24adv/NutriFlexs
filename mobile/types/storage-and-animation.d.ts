declare module 'expo-secure-store' {
  export interface SecureStoreOptions {
    keychainService?: string;
    keychainAccessible?: number;
    requireAuthentication?: boolean;
    authenticationPrompt?: string;
  }
  export function getItemAsync(key: string, options?: SecureStoreOptions): Promise<string | null>;
  export function setItemAsync(key: string, value: string, options?: SecureStoreOptions): Promise<void>;
  export function deleteItemAsync(key: string, options?: SecureStoreOptions): Promise<void>;
  export function isAvailableAsync(): Promise<boolean>;
}

declare module '@react-native-async-storage/async-storage' {
  export interface AsyncStorageStatic {
    getItem(key: string, callback?: (error?: Error | null, result?: string | null) => void): Promise<string | null>;
    setItem(key: string, value: string, callback?: (error?: Error | null) => void): Promise<void>;
    removeItem(key: string, callback?: (error?: Error | null) => void): Promise<void>;
    mergeItem(key: string, value: string, callback?: (error?: Error | null) => void): Promise<void>;
    clear(callback?: (error?: Error | null) => void): Promise<void>;
    getAllKeys(callback?: (error?: Error | null, keys?: string[] | null) => void): Promise<readonly string[]>;
    multiGet(keys: string[], callback?: (errors?: (Error | null)[], result?: [string, string | null][]) => void): Promise<[string, string | null][]>;
    multiSet(keyValuePairs: [string, string][], callback?: (errors?: (Error | null)[]) => void): Promise<void>;
    multiRemove(keys: string[], callback?: (errors?: (Error | null)[]) => void): Promise<void>;
  }
  const AsyncStorage: AsyncStorageStatic;
  export default AsyncStorage;
}

declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
  }
  export enum NotificationFeedbackType {
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
  }
  export function impactAsync(style?: ImpactFeedbackStyle): Promise<void>;
  export function notificationAsync(type?: NotificationFeedbackType): Promise<void>;
  export function selectionAsync(): Promise<void>;
}

declare module 'react-native-reanimated' {
  import * as React from 'react';
  import { ViewProps, TextProps, ImageProps, ViewStyle, TextStyle, ImageStyle } from 'react-native';

  export interface SharedValue<T> {
    value: T;
  }

  export function useSharedValue<T>(initialValue: T): SharedValue<T>;
  export function useAnimatedStyle<T extends object>(updater: () => T, dependencies?: any[]): T;
  export function withTiming<T>(
    toValue: T,
    userConfig?: {
      duration?: number;
      easing?: (t: number) => number;
    },
    callback?: (isFinished?: boolean) => void
  ): T;
  export function withSpring<T>(
    toValue: T,
    userConfig?: any,
    callback?: (isFinished?: boolean) => void
  ): T;
  export function withSequence<T>(...animations: T[]): T;
  export function withDelay<T>(delayMs: number, delayedAnimation: T): T;
  export function runOnJS<F extends (...args: any[]) => any>(fn: F): F;
  export function cancelAnimation(sharedValue: SharedValue<any>): void;

  export const Easing: {
    linear: (t: number) => number;
    ease: (t: number) => number;
    quad: (t: number) => number;
    cubic: (t: number) => number;
    bezier: (x1: number, y1: number, x2: number, y2: number) => (t: number) => number;
    in: (easing: (t: number) => number) => (t: number) => number;
    out: (easing: (t: number) => number) => (t: number) => number;
    inOut: (easing: (t: number) => number) => (t: number) => number;
  };

  export namespace Animated {
    export class View extends React.Component<ViewProps & { style?: any }> {}
    export class Text extends React.Component<TextProps & { style?: any }> {}
    export class Image extends React.Component<ImageProps & { style?: any }> {}
  }

  const AnimatedDefault: {
    View: typeof Animated.View;
    Text: typeof Animated.Text;
    Image: typeof Animated.Image;
  };

  export default AnimatedDefault;
}
