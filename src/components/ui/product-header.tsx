import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ProductHeaderProps = {
  eyebrow?: string;
};

/** Draws the code-native Little Gains sprout so the product does not depend on placeholder imagery. */
export function ProductHeader({ eyebrow }: ProductHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.brandMark, { backgroundColor: theme.primary }]}>
        <View style={[styles.stem, { backgroundColor: theme.onPrimary }]} />
        <View style={[styles.leaf, styles.leftLeaf, { backgroundColor: theme.onPrimary }]} />
        <View style={[styles.leaf, styles.rightLeaf, { backgroundColor: theme.onPrimary }]} />
      </View>
      <View>
        <ThemedText type="smallBold" themeColor="primaryStrong">
          Little Gains
        </ThemedText>
        {eyebrow ? (
          <ThemedText style={styles.eyebrow} themeColor="textSecondary">
            {eyebrow}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 38,
    height: 38,
    position: 'relative',
    borderRadius: Radii.medium,
  },
  stem: {
    width: 2,
    height: 17,
    position: 'absolute',
    left: 18,
    bottom: 8,
    borderRadius: Radii.round,
  },
  leaf: {
    width: 11,
    height: 7,
    position: 'absolute',
    top: 10,
    borderRadius: 8,
  },
  leftLeaf: {
    left: 9,
    transform: [{ rotate: '28deg' }],
  },
  rightLeaf: {
    right: 8,
    transform: [{ rotate: '-28deg' }],
  },
  eyebrow: {
    marginTop: 1,
    fontSize: 11,
    letterSpacing: 1,
  },
});
