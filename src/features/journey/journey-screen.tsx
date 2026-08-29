import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { Radii, Spacing } from '@/constants/theme';
import { WeeklyReflectionModal } from '@/features/journey/weekly-reflection-modal';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

function formatDayLabel(localDate: string) {
  const date = new Date(`${localDate}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date);
}

/** Shows cumulative gains and a neutral seven-day rhythm without streak loss or missed-day penalties. */
export function JourneyScreen() {
  const theme = useTheme();
  const {
    progress,
    latestWeeklyReflection,
    adaptationSuggestion,
    journeyInsights,
    resolveAdaptation,
  } = useAppData();
  const [reflectionVisible, setReflectionVisible] = useState(false);
  const [adaptationMessage, setAdaptationMessage] = useState<string | null>(null);
  const tallestBarCount = Math.max(1, ...progress.recentDays.map((day) => day.completionCount));

  const chooseAdaptation = async (decision: 'accepted' | 'modified' | 'dismissed') => {
    await resolveAdaptation(decision);
    setAdaptationMessage(
      decision === 'accepted'
        ? 'Applied. You can change this again from Your rhythm.'
        : decision === 'modified'
          ? 'Nothing changed. Use Your rhythm or Habits to choose your own adjustment.'
          : 'Dismissed. Your current plan stays exactly as it is.',
    );
  };

  return (
    <>
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
        <ActionButton
          label={latestWeeklyReflection ? 'Update this week’s reflection' : 'Reflect on this week'}
          onPress={() => setReflectionVisible(true)}
        />
      </View>

        {adaptationSuggestion?.status === 'pending' ? (
          <View style={[styles.adaptationCard, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" themeColor="primaryStrong">A SUGGESTION YOU CONTROL</ThemedText>
            <ThemedText type="subtitle">{adaptationSuggestion.title}</ThemedText>
            <ThemedText themeColor="textSecondary">{adaptationSuggestion.reason}</ThemedText>
            <View style={styles.adaptationActions}>
              <ActionButton label="Accept" onPress={() => void chooseAdaptation('accepted')} style={styles.flexAction} />
              <ActionButton label="Modify" onPress={() => void chooseAdaptation('modified')} variant="secondary" />
              <ActionButton label="Dismiss" onPress={() => void chooseAdaptation('dismissed')} variant="quiet" />
            </View>
          </View>
        ) : null}

        {adaptationMessage ? (
          <ThemedText accessibilityRole="alert" themeColor="primaryStrong">{adaptationMessage}</ThemedText>
        ) : null}

        <View style={styles.insightSection}>
          <ThemedText type="smallBold" themeColor="primaryStrong">INSIGHTS WITHOUT JUDGMENT</ThemedText>
          {journeyInsights.map((insight) => (
            <View key={insight.id} style={[styles.insightCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="smallBold" themeColor="accent">{insight.eyebrow}</ThemedText>
              <ThemedText type="subtitle">{insight.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{insight.body}</ThemedText>
            </View>
          ))}
        </View>
      </ScreenShell>
      {reflectionVisible ? <WeeklyReflectionModal visible onClose={() => setReflectionVisible(false)} /> : null}
    </>
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
  adaptationCard: {
    gap: Spacing.two,
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
  },
  adaptationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flexAction: { flexGrow: 1 },
  insightSection: { gap: Spacing.two, marginTop: Spacing.four },
  insightCard: { gap: Spacing.one, padding: Spacing.three, borderWidth: 1, borderRadius: Radii.large },
});
