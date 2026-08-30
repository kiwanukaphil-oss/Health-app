import { describe, expect, it, jest } from '@jest/globals';
import { Colors } from '@/constants/theme';

jest.mock('@/global.css', () => ({}));

const minimumBodyTextContrast = 4.5;
type ColorPalette = typeof Colors.light | typeof Colors.dark;
const themePalettes: [string, ColorPalette][] = [
  ['light', Colors.light],
  ['dark', Colors.dark],
];

function convertHexToLuminance(hexColor: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255);
  const linearChannels = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linearChannels[0] + 0.7152 * linearChannels[1] + 0.0722 * linearChannels[2];
}

function calculateContrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = convertHexToLuminance(foreground);
  const backgroundLuminance = convertHexToLuminance(background);
  const lighterLuminance = Math.max(foregroundLuminance, backgroundLuminance);
  const darkerLuminance = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighterLuminance + 0.05) / (darkerLuminance + 0.05);
}

describe.each(themePalettes)('%s theme contrast', (_themeName, palette) => {
  it.each([
    ['text on app background', palette.text, palette.background],
    ['text on card', palette.text, palette.backgroundElement],
    ['text on warm surface', palette.text, palette.surfaceWarm],
    ['secondary text on app background', palette.textSecondary, palette.background],
    ['secondary text on card', palette.textSecondary, palette.backgroundElement],
    ['strong primary text on app background', palette.primaryStrong, palette.background],
    ['strong primary text on selected background', palette.primaryStrong, palette.backgroundSelected],
    ['button text on primary', palette.onPrimary, palette.primary],
    ['danger text on card', palette.danger, palette.backgroundElement],
    ['accent text on app background', palette.accent, palette.background],
    ['accent text on card', palette.accent, palette.backgroundElement],
    ['accent text on warm surface', palette.accent, palette.surfaceWarm],
  ])('%s meets WCAG AA', (_pairName, foreground, background) => {
    expect(calculateContrastRatio(foreground, background)).toBeGreaterThanOrEqual(
      minimumBodyTextContrast,
    );
  });
});
