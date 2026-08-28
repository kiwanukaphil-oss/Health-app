import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

function formatDayLabel(localDate: string) {
  const date = new Date(`${localDate}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date);
}

/** Shows cumulative gains and a neutral seven-day rhythm without streak loss or missed-day penalties. */
export function JourneyScreen() {
  const theme = useTheme();
  const { progress } = useAppData();
  const tallestBarCount = Math.max(1, ...progress.recentDays.map((day) => day.completionCount));

  return (
    <ScreenShell>
      <ProductHeader eyebrow="JOURNEY" />
      <View style={styles.introduction}>
        <ThemedText type="title">Every small action stays</ThemedText>
        <ThemedText themeColor="textSecondary">
          There are no broken streaks here. This is the progress you have collected, one workday at a time.
        </ThemedText>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Small wins" value={progress.totalCompletions.toString()} />
        <MetricCard label="Active minutes" value={progress.activeMinutes.toString()} />
        <MetricCard label="Sitting breaks" value={progress.sittingBreaks.toString()} />
      </View>

      <View
        accessibilityLabel="Your completed habits over the last seven days"
        style={[styles.weekCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="subtitle">Your last seven days</ThemedText>
        <View style={styles.chart}>
          {progress.recentDays.map((day) => {
            const barHeight = day.completionCount === 0
              ? 6
              : Math.max(16, (day.completionCount / tallestBarCount) * 76);
            return (
              <View key={day.localDate} style={styles.chartColumn}>
                <ThemedText type="smallBold">{day.completionCount}</ThemedText>
                <View style={[styles.barTrack, { backgroundColor: theme.backgroundSelected }]}>
                  <View
                    style={[
                      styles.barFill,
                      { backgroundColor: theme.primary, height: barHeight },
                    ]}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDayLabel(day.localDate)}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.reflectionCard, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold" themeColor="primaryStrong">A GENTLE REFLECTION</ThemedText>
        <ThemedText type="subtitle">
          {progress.totalCompletions === 0
            ? 'Your first small win is ready when you are.'
            : progress.totalCompletions === 1
              ? '1 choice has already supported your health.'
              : `${progress.totalCompletions} choices have already supported your health.`}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Minimum versions count fully. Rest days do not take anything away.
        </ThemedText>
      </View>
    </ScreenShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.metricCard, { backgroundColor: theme.surfaceWarm }]}>
      <ThemedText type="title">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  introduction: {
    gap: Spacing.one,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: 100,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radii.large,
  },
  weekCard: {
    gap: Spacing.four,
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
  },
  chart: {
    height: 126,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  barTrack: {
    height: 80,
    width: '100%',
    justifyContent: 'flex-end',
    borderRadius: Radii.small,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: Radii.small,
  },
  reflectionCard: {
    gap: Spacing.two,
    marginTop: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radii.large,
  },
});
