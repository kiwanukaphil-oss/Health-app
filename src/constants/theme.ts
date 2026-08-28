/** Calm, nature-led tokens shared by every Little Gains surface. */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1E2A21',
    background: '#FBFAF7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F0F3EA',
    surfaceWarm: '#F5EEE2',
    textSecondary: '#687269',
    primary: '#416B4B',
    primaryStrong: '#285A36',
    onPrimary: '#FFFFFF',
    border: '#DFE4DC',
    accent: '#D98D36',
    danger: '#A44A3F',
  },
  dark: {
    text: '#F0F4ED',
    background: '#1B1E1A',
    backgroundElement: '#252923',
    backgroundSelected: '#20281F',
    surfaceWarm: '#2A241C',
    textSecondary: '#AEB8AD',
    primary: '#8EC59A',
    primaryStrong: '#A6D9AF',
    onPrimary: '#142018',
    border: '#394038',
    accent: '#EFB66B',
    danger: '#EF9D91',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  small: 10,
  medium: 16,
  large: 24,
  round: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
