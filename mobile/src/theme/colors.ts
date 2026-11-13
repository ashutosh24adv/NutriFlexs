/**
 * NutriFlexs Mobile Design System - Color Palette
 * Approved brand palette: Deep Forest Green (#1D4D3E), Off-white canvas (#F7F8F6),
 * clean white cards, Amber (#F59E0B), Coral (#EA580C), Green (#22C55E), no gradients.
 */
export const colors = {
  // Core Strict Light Theme Palette
  canvas: '#F7F8F6', // Off-white canvas
  surface: '#FFFFFF', // Clean pure white surface
  surfaceMuted: '#F3F4F1', // Secondary surface
  border: '#E5E7EB', // Neutral light border
  borderSubtle: '#EBECE8', // Subtle card border
  borderDark: '#D1D5DB',

  // Deep Forest Green
  primary: '#1D4D3E',
  brandGreen: '#1D4D3E', // Primary Forest Green
  brandGreenDark: '#1B5E20', // Deep Forest Green Variant
  brandGreenLight: '#E8F2EC', // Soft sage/forest tint
  brandGreenSoft: '#F0F6F2', // Very soft green tint

  // Semantic Accent Colors
  amber: '#F59E0B',
  coral: '#EA580C',
  green: '#22C55E',

  // Macro Palette
  macros: {
    protein: '#1D4D3E', // Forest Green (Protein)
    carbs: '#F59E0B', // Amber (Carbs)
    fat: '#EA580C', // Coral (Fat)
    calories: '#EA580C', // Coral / Calories
  },

  // Typography / Neutral Colors
  text: {
    primary: '#111827', // High contrast charcoal/near-black
    secondary: '#4B5563', // Slate gray
    muted: '#9CA3AF', // Subtle helper text
    inverse: '#FFFFFF', // Text on dark/brand backgrounds
    brand: '#1D4D3E', // Branded text accent
  },

  // Functional Status
  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Food Indicators
  veg: '#22C55E',
  nonVeg: '#EA580C',

  // Interactive
  overlay: 'rgba(0, 0, 0, 0.45)',
  ripple: 'rgba(29, 77, 62, 0.12)',
} as const;

export type Colors = typeof colors;
export type MacroKey = keyof typeof colors.macros;
