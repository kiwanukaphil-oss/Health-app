import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FoundationScreenProps = {
  eyebrow: string;
  title: string;
  description: string;
  foundationNote: string;
};

/** Presents consistent, intentionally sparse placeholders while Stage 1 contains no product features. */
export function FoundationScreen({
  eyebrow,
  title,
  description,
  foundationNote,
}: FoundationScreenProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.page}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <View style={[styles.brandMark, { backgroundColor: theme.primary }]}>
              <ThemedText style={{ color: theme.onPrimary }}>⌁</ThemedText>
            </View>
            <ThemedText type="smallBold" themeColor="primaryStrong">
              Little Gains
            </ThemedText>
          </View>

          <View style={styles.introduction}>
            <ThemedText type="smallBold" themeColor="primaryStrong" style={styles.eyebrow}>
              {eyebrow}
            </ThemedText>
            <ThemedText type="title">{title}</ThemedText>
            <ThemedText themeColor="textSecondary">{description}</ThemedText>
          </View>

          <ThemedView type="backgroundSelected" style={styles.foundationCard}>
            <View style={[styles.statusDot, { backgroundColor: theme.primary }]} />
            <View style={styles.foundationCopy}>
              <ThemedText type="smallBold">Foundation ready</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {foundationNote}
              </ThemedText>
            </View>
          </ThemedView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.select({ web: Spacing.six, default: Spacing.three }),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.medium,
  },
  introduction: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    maxWidth: 520,
  },
  eyebrow: {
    letterSpacing: 1.4,
  },
  foundationCard: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radii.large,
  },
  statusDot: {
    width: 10,
    height: 10,
    marginTop: 5,
    borderRadius: Radii.round,
  },
  foundationCopy: {
    flex: 1,
    gap: Spacing.one,
  },
});
