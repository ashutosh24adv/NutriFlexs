import * as React from 'react';

declare module 'react-native' {
  export interface ViewStyle {
    flex?: number;
    flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
    alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
    margin?: number | string;
    marginVertical?: number | string;
    marginHorizontal?: number | string;
    marginTop?: number | string;
    marginBottom?: number | string;
    marginLeft?: number | string;
    marginRight?: number | string;
    padding?: number;
    paddingVertical?: number;
    paddingHorizontal?: number;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    width?: number | string;
    height?: number | string;
    minWidth?: number | string;
    minHeight?: number | string;
    maxWidth?: number | string;
    maxHeight?: number | string;
    backgroundColor?: string;
    borderRadius?: number;
    borderTopLeftRadius?: number;
    borderTopRightRadius?: number;
    borderBottomLeftRadius?: number;
    borderBottomRightRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    borderTopWidth?: number;
    borderBottomWidth?: number;
    borderLeftWidth?: number;
    borderRightWidth?: number;
    borderTopColor?: string;
    borderBottomColor?: string;
    borderLeftColor?: string;
    borderRightColor?: string;
    overflow?: 'visible' | 'hidden' | 'scroll';
    position?: 'absolute' | 'relative' | 'static' | 'fixed' | 'sticky';
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    zIndex?: number;
    opacity?: number;
    shadowColor?: string;
    shadowOffset?: { width: number; height: number };
    shadowOpacity?: number;
    shadowRadius?: number;
    elevation?: number;
    gap?: number;
    rowGap?: number;
    columnGap?: number;
    flexWrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
    transform?: any[];
  }

  export interface TextStyle extends ViewStyle {
    color?: string;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: 'normal' | 'italic';
    fontWeight?: '400' | '500' | '600' | '700' | '800' | 'normal' | 'bold';
    letterSpacing?: number;
    lineHeight?: number;
    textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify';
    textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  }

  export interface ImageStyle extends ViewStyle {
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  }

  export type StyleProp<T> = T | false | null | undefined | StyleProp<T>[] | any;

  export interface ViewProps {
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
    testID?: string;
    pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto' | string;
  }

  export interface TextProps {
    style?: StyleProp<TextStyle>;
    children?: React.ReactNode;
    numberOfLines?: number;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip' | string;
    onPress?: () => void;
    testID?: string;
  }

  export interface Insets {
    top?: number;
    left?: number;
    bottom?: number;
    right?: number;
  }

  export interface PressableStateCallbackType {
    pressed: boolean;
  }

  export interface PressableProps extends ViewProps {
    onPress?: () => void;
    disabled?: boolean;
    hitSlop?: Insets | number;
    style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
    children?: React.ReactNode | ((state: PressableStateCallbackType) => React.ReactNode);
  }

  export interface TouchableOpacityProps extends ViewProps {
    onPress?: () => void;
    activeOpacity?: number;
    disabled?: boolean;
    hitSlop?: Insets | number;
  }

  export interface ImageProps extends ViewProps {
    source?: any;
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    style?: StyleProp<ImageStyle>;
  }

  export interface ScrollViewProps extends ViewProps {
    horizontal?: boolean;
    showsHorizontalScrollIndicator?: boolean;
    showsVerticalScrollIndicator?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
  }

  export interface SafeAreaViewProps extends ViewProps {}

  export interface TextInputProps extends ViewProps {
    value?: string;
    placeholder?: string;
    placeholderTextColor?: string;
    onChangeText?: (text: string) => void;
    style?: StyleProp<TextStyle>;
    clearButtonMode?: 'never' | 'while-editing' | 'unless-editing' | 'always' | string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad' | 'decimal-pad' | string;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters' | string;
    autoCorrect?: boolean;
    returnKeyType?: string;
    onSubmitEditing?: () => void;
    multiline?: boolean;
    numberOfLines?: number;
    secureTextEntry?: boolean;
  }

  export interface SwitchProps extends ViewProps {
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    disabled?: boolean;
    trackColor?: { false?: string; true?: string };
    thumbColor?: string;
    ios_backgroundColor?: string;
  }

  export interface ModalProps extends ViewProps {
    visible?: boolean;
    transparent?: boolean;
    animationType?: 'none' | 'slide' | 'fade';
    onRequestClose?: () => void;
    onShow?: () => void;
    statusBarTranslucent?: boolean;
  }

  export const View: React.FC<ViewProps>;
  export const Text: React.FC<TextProps>;
  export const TextInput: React.FC<TextInputProps>;
  export const Pressable: React.FC<PressableProps>;
  export const TouchableOpacity: React.FC<TouchableOpacityProps>;
  export const ScrollView: React.FC<ScrollViewProps>;
  export const SafeAreaView: React.FC<SafeAreaViewProps>;
  export const Image: React.FC<ImageProps>;
  export const Switch: React.FC<SwitchProps>;
  export const Modal: React.FC<ModalProps>;

  export namespace StyleSheet {
    type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle | any };
    export function create<T extends NamedStyles<T> | NamedStyles<any>>(styles: T | NamedStyles<T>): T;
  }

  export interface ActivityIndicatorProps {
    animating?: boolean;
    color?: string;
    size?: 'small' | 'large' | number;
    style?: ViewStyle;
  }
  export const ActivityIndicator: React.FC<ActivityIndicatorProps>;

  export const Platform: {
    OS: 'ios' | 'android' | 'web';
    select: <T>(specifics: { ios?: T; android?: T; web?: T; default?: T }) => T;
  };

  export interface AlertButton {
    text?: string;
    onPress?: (value?: string) => void;
    style?: 'default' | 'cancel' | 'destructive';
  }

  export interface AlertOptions {
    cancelable?: boolean;
    onDismiss?: () => void;
  }

  export const Alert: {
    alert: (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions
    ) => void;
  };

  export const StatusBar: {
    currentHeight?: number;
    setBarStyle?: (style: 'default' | 'light-content' | 'dark-content') => void;
    setBackgroundColor?: (color: string) => void;
    setTranslucent?: (translucent: boolean) => void;
  };
}
