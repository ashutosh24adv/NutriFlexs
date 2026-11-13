/**
 * NutriFlexs Mobile Design System - Spacing & Layout Tokens
 * Base 4px scale, 44px min touch target compliant
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
  gutter: 16,
  touchTargetMin: 44, // Minimum touch target size (44x44)
} as const;

export type Spacing = typeof spacing;
