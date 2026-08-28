import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Radii, Spacing } from '@/constants/theme';
import { formatTargetMeasurement, resolveHabitTargetValue } from '@/domain/daily-planner';
import { type DailyPlanItem, type EnergyLevel } from '@/domain/models';
import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';
import { GuidedActivityModal } from '@/features/today/guided-activity-modal';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

const energyChoices: readonly { id: EnergyLevel; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'steady', label: 'Steady' },
  { id: 'strong', label: 'Strong' },
  { id: 'busy', label: 'Very busy' },
];

const energyMessages: Readonly<Record<EnergyLevel, string>> = {
  low: 'The minimum version is enough today.',
  steady: 'Your plan is balanced and comfortably achievable.',
  strong: 'Standard actions are ready; bonus effort remains optional.',
  busy: 'Your plan has been reduced to the smallest useful actions.',
};

/** Orchestrates the minimum healthy day, energy adjustment, and guided completion experience. */
export function TodayScreen() {
  const theme = useTheme();
  const {
    profile,
    todayPlan,
    isLoading,
    errorMessage,
    updateTodayEnergy,
    completePlanItem,
  } = useAppData();
  const [selectedItem, setSelectedItem] = useState<DailyPlanItem | null>(null);
  const [changingEnergy, setChangingEnergy] = useState<EnergyLevel | null>(null);

  if (isLoading) {
    return (
      <ScreenShell contentStyle={styles.centeredState}>
        <ActivityIndicator color={theme.primary} size="large" />
        <ThemedText themeColor="textSecondary">Preparing your day…</ThemedText>
      </ScreenShell>
    );
  }

  if (!profile.onboardingComplete) return <OnboardingFlow />;

  if (errorMessage || !todayPlan) {
    return (
      <ScreenShell contentStyle={styles.centeredState}>
        <ThemedText type="title">Your day is taking a moment</ThemedText>
        <ThemedText themeColor="textSecondary">
          {errorMessage ?? 'Close and reopen the app to prepare today’s plan.'}
        </ThemedText>
      </ScreenShell>
    );
  }

  const completedCount = todayPlan.items.filter((item) => item.status === 'complete').length;
  const nextPendingItem = todayPlan.items.find((item) => item.status === 'pending') ?? null;
  const firstName = profile.name.trim().split(/\s+/)[0];
  const greeting = firstName ? `Good day, ${firstName}` : 'Good day';

  const chooseEnergy = async (energyLevel: EnergyLevel) => {
    if (energyLevel === todayPlan.energyLevel) return;
    setChangingEnergy(energyLevel);
    try {
      await updateTodayEnergy(energyLevel);
    } finally {
      setChangingEnergy(null);
    }
  };

  return (
    <>
      <ScreenShell>
        <ProductHeader eyebrow="TODAY" />
        <View style={styles.introduction}>
          <ThemedText type="title">{greeting}</ThemedText>
          <ThemedText themeColor="textSecondary">A small day still moves you forward.</ThemedText>
        </View>

        <ThemedText type="smallBold">How is your energy?</ThemedText>
        <View style={styles.energyChoices}>
          {energyChoices.map((choice) => (
            <SelectionChip
              key={choice.id}
              label={changingEnergy === choice.id ? 'Adjusting…' : choice.label}
              onPress={() => void chooseEnergy(choice.id)}
              selected={todayPlan.energyLevel === choice.id}
            />
          ))}
        </View>
        <ThemedText type="small" themeColor="primaryStrong" style={styles.energyMessage}>
          {energyMessages[todayPlan.energyLevel]}
        </ThemedText>

        {nextPendingItem ? (
          <View style={[styles.nextAction, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="smallBold" themeColor="primaryStrong">NEXT SMALL WIN</ThemedText>
            <ThemedText type="subtitle">{nextPendingItem.habit.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {nextPendingItem.habit.cueLabel} · {formatTargetMeasurement(
                resolveHabitTargetValue(nextPendingItem.habit, nextPendingItem.targetLevel),
                nextPendingItem.habit.targetUnit,
              )}
            </ThemedText>
            <ActionButton label="Start gently" onPress={() => setSelectedItem(nextPendingItem)} />
          </View>
        ) : (
          <View style={[styles.completeCard, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="subtitle">Your minimum day is complete</ThemedText>
            <ThemedText themeColor="textSecondary">Everything else today is a bonus. Your progress is safely recorded.</ThemedText>
          </View>
        )}

        <View style={styles.sectionHeading}>
          <ThemedText type="smallBold">Your minimum day</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{completedCount} of {todayPlan.items.length}</ThemedText>
        </View>

        <View style={styles.planList}>
          {todayPlan.items.map((item, index) => {
            const isComplete = item.status === 'complete';
            const targetValue = resolveHabitTargetValue(item.habit, item.targetLevel);
            return (
              <Pressable
                accessibilityLabel={`${item.habit.title}, ${isComplete ? 'complete' : 'not complete'}`}
                accessibilityRole="button"
                disabled={isComplete}
                key={item.id}
                onPress={() => setSelectedItem(item)}
                style={({ pressed }) => [
                  styles.planItem,
                  { borderColor: theme.border, opacity: pressed ? 0.72 : 1 },
                ]}>
                <View
                  style={[
                    styles.planItemNumber,
                    { backgroundColor: isComplete ? theme.primary : theme.surfaceWarm },
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: isComplete ? theme.onPrimary : theme.accent }}>
                    {isComplete ? '✓' : index + 1}
                  </ThemedText>
                </View>
                <View style={styles.planItemCopy}>
                  <ThemedText type="smallBold">{item.habit.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.habit.cueLabel} · {formatTargetMeasurement(targetValue, item.habit.targetUnit)}
                  </ThemedText>
                </View>
                {!isComplete ? <ThemedText themeColor="primaryStrong">›</ThemedText> : null}
              </Pressable>
            );
          })}
        </View>
      </ScreenShell>

      {selectedItem ? (
        <GuidedActivityModal
          key={selectedItem.id}
          item={selectedItem}
          mobilityPreference={profile.mobilityPreference}
          onClose={() => setSelectedItem(null)}
          onComplete={() => completePlanItem(selectedItem.id)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  introduction: {
    gap: Spacing.one,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  energyChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  energyMessage: {
    marginTop: Spacing.two,
  },
  nextAction: {
    gap: Spacing.two,
    marginTop: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radii.large,
  },
  completeCard: {
    gap: Spacing.two,
    marginTop: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radii.large,
  },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  planList: {
    gap: Spacing.one,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  planItemNumber: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.medium,
  },
  planItemCopy: {
    flex: 1,
    gap: 2,
  },
});
