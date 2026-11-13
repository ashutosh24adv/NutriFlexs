import * as React from 'react';

declare module 'expo-router' {
  export interface TabsScreenProps {
    name: string;
    options?: {
      title?: string;
      headerShown?: boolean;
      tabBarLabel?: string;
      tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
      tabBarStyle?: any;
    };
  }

  export const Tabs: React.FC<{
    screenOptions?: {
      headerShown?: boolean;
      tabBarActiveTintColor?: string;
      tabBarInactiveTintColor?: string;
      tabBarStyle?: any;
    };
    children?: React.ReactNode;
  }> & {
    Screen: React.FC<TabsScreenProps>;
  };

  export interface StackScreenProps {
    name: string;
    options?: {
      title?: string;
      headerShown?: boolean;
    };
  }

  export const Stack: React.FC<{
    screenOptions?: {
      headerShown?: boolean;
    };
    children?: React.ReactNode;
  }> & {
    Screen: React.FC<StackScreenProps>;
  };

  export interface SlotProps {}
  export const Slot: React.FC<SlotProps>;

  export interface LinkProps {
    href: string;
    asChild?: boolean;
    children?: React.ReactNode;
  }
  export const Link: React.FC<LinkProps>;

  export interface Router {
    push: (href: string) => void;
    replace: (href: string) => void;
    back: () => void;
  }
  export function useRouter(): Router;
  export function useSegments(): string[];
  export function usePathname(): string;
  export function useLocalSearchParams<T = Record<string, string>>(): T;
}

declare module 'expo-status-bar' {
  import * as React from 'react';
  export interface StatusBarProps {
    style?: 'auto' | 'inverted' | 'light' | 'dark';
    backgroundColor?: string;
  }
  export const StatusBar: React.FC<StatusBarProps>;
}
