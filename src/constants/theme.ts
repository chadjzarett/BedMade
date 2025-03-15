import { MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { colors } from './colors';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
    text: colors.text.primary,
    onSurface: colors.text.primary,
    disabled: colors.text.disabled,
    placeholder: colors.text.secondary,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: colors.accent,
  },
  fonts: {
    ...DefaultTheme.fonts,
    // We'll use the default fonts for now
    // Later we can customize with Inter font family
  },
}; 