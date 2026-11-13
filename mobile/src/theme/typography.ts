/**
 * NutriFlexs Mobile Design System - Typography Tokens
 * Headings: Poppins (geometric & clean)
 * Body: Inter (legible system typography)
 */
export const typography = {
  fonts: {
    heading: 'Poppins',
    body: 'Inter',
    mono: 'monospace',
  },
  fontFamilies: {
    regular: 'Inter',
    medium: 'Inter',
    bold: 'Poppins',
    mono: 'monospace',
  },
  weights: {
    regular: '400' as const,
    normal: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
    display: 34,
  },
  lineHeights: {
    xs: 15,
    sm: 18,
    md: 22,
    lg: 24,
    xl: 28,
    xxl: 32,
    title: 36,
    display: 42,
  },
} as const;

export type Typography = typeof typography;
