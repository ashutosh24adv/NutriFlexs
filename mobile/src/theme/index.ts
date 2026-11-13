import { colors, type Colors, type MacroKey } from './colors';
import { typography, type Typography } from './typography';
import { spacing, type Spacing } from './spacing';
import { radii, type Radii } from './radii';
import { shadows, type Shadows } from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
} as const;

export type Theme = typeof theme;
export { colors, typography, spacing, radii, shadows };
export type { Colors, Typography, Spacing, Radii, Shadows, MacroKey };

export default theme;
