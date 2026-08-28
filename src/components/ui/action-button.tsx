import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  isLoading?: boolean;
  style?: ViewStyle;
};

/** Renders a consistent accessible action while preserving the hierarchy between primary and quiet choices. */
export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  isLoading = false,
  style,
}: ActionButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isQuiet = variant === 'quiet';
  const backgroundColor = isPrimary
    ? theme.primary
    : isQuiet
      ? 'transparent'
      : theme.backgroundElement;
  const borderColor = isQuiet ? 'transparent' : isPrimary ? theme.primary : theme.border;
  const textColor = isPrimary ? theme.onPrimary : isQuiet ? theme.textSecondary : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || isLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, borderColor, opacity: disabled ? 0.45 : pressed ? 0.75 : 1 },
        style,
      ]}>
      {isLoading ? (
        <ActivityIndicator color={textColor} />
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
