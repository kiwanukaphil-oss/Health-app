import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { Colors } from '@/constants/theme';
import { AppDatabaseProvider } from '@/data/database/database-provider';

SplashScreen.preventAutoHideAsync();

/** Composes the global theme, encrypted database lifecycle, and app-wide navigation shell. */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = isDark ? Colors.dark : Colors.light;
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.backgroundElement,
      text: palette.text,
      border: palette.border,
      notification: palette.accent,
    },
  };

  return (
    <AppDatabaseProvider>
      <ThemeProvider value={navigationTheme}>
        <AppTabs />
      </ThemeProvider>
    </AppDatabaseProvider>
  );
}
