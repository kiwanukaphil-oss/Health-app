import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  isLoading?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
};

/** Renders a consistent accessible action while preserving the hierarchy between primary and quiet choices. */
export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  isLoading = false,
  accessibilityHint,
  style,
}: ActionButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isQuiet = variant === 'quiet';
  const isDanger = variant === 'danger';
  const backgroundColor = isPrimary
    ? theme.primary
    : isDanger
      ? theme.danger
    : isQuiet
      ? 'transparent'
      : theme.backgroundElement;
  const borderColor = isQuiet
    ? 'transparent'
    : isPrimary
      ? theme.primary
      : isDanger
        ? theme.danger
        : theme.border;
  const textColor = isPrimary || isDanger
    ? theme.onPrimary
    : isQuiet
      ? theme.textSecondary
      : theme.text;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, disabled: disabled || isLoading }}
      disabled={disabled || isLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: disabled || isLoading ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}>
      {isLoading ? (
        <ActivityIndicator
          accessibilityElementsHidden
          color={textColor}
          importantForAccessibility="no"
        />
      ) : (
        <ThemedText type="smallBold" style={{ color: textColor }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderRadius: Radii.medium,
  },
});
