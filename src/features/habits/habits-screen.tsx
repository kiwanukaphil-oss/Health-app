import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { Radii, Spacing } from '@/constants/theme';
import { formatTargetMeasurement } from '@/domain/daily-planner';
import { type HabitCategory } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

const categoryLabels: Readonly<Record<HabitCategory, string>> = {
  sitting: 'Sit less',
  walking: 'Walking',
  mobility: 'Mobility',
  strength: 'Strength',
  recovery: 'Recovery',
};

/** Lets the user keep a deliberately small set of active habits without changing today's plan. */
export function HabitsScreen() {
  const theme = useTheme();
  const { habits, updateHabitActivation } = useAppData();
  const [updatingHabitId, setUpdatingHabitId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const activeCount = habits.filter((habit) => habit.isActive).length;

  const toggleHabit = async (habitId: string, shouldBeActive: boolean) => {
    setUpdatingHabitId(habitId);
    setFeedbackMessage(null);
    try {
      const result = await updateHabitActivation(habitId, shouldBeActive);
      setFeedbackMessage(
        result.message ??
          (shouldBeActive
            ? 'Added. This habit will appear in tomorrow\'s plan.'
            : 'Paused. Today\'s plan stays unchanged.'),
      );
    } catch {
      setFeedbackMessage('That change could not be saved. Please try again.');
    } finally {
      setUpdatingHabitId(null);
    }
  };

  return (
    <ScreenShell>
      <ProductHeader eyebrow="HABITS" />
      <View style={styles.introduction}>
        <ThemedText type="title">Small enough to keep</ThemedText>
        <ThemedText themeColor="textSecondary">
          Choose up to three active habits. A tiny repeatable plan matters more than a crowded one.
        </ThemedText>
      </View>

      <View style={[styles.activeSummary, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="subtitle">{activeCount} of 3 active</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Changes begin tomorrow so today never moves underneath you.
        </ThemedText>
      </View>

      {feedbackMessage ? (
        <ThemedText accessibilityRole="alert" type="small" themeColor="primaryStrong">
          {feedbackMessage}
        </ThemedText>
      ) : null}

      <View style={styles.habitList}>
        {habits.map((habit) => {
          const isUpdating = updatingHabitId === habit.id;
          return (
            <View
              key={habit.id}
              style={[
                styles.habitCard,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <View style={styles.habitHeading}>
                <View style={styles.habitCopy}>
                  <ThemedText type="smallBold" themeColor="primaryStrong">
                    {categoryLabels[habit.category].toUpperCase()}
                  </ThemedText>
                  <ThemedText type="subtitle">{habit.title}</ThemedText>
                </View>
                <Pressable
                  accessibilityLabel={`${habit.isActive ? 'Pause' : 'Activate'} ${habit.title}`}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: habit.isActive, disabled: isUpdating }}
                  disabled={isUpdating}
                  onPress={() => void toggleHabit(habit.id, !habit.isActive)}
                  style={({ pressed }) => [
                    styles.toggle,
                    {
                      backgroundColor: habit.isActive ? theme.primary : theme.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}>
                  {isUpdating ? (
                    <ActivityIndicator color={theme.onPrimary} size="small" />
                  ) : (
                    <View
                      style={[
                        styles.toggleKnob,
                        {
                          backgroundColor: theme.backgroundElement,
                          transform: [{ translateX: habit.isActive ? 20 : 0 }],
                        },
                      ]}
                    />
                  )}
                </Pressable>
              </View>

              <ThemedText themeColor="textSecondary">{habit.cueLabel}</ThemedText>
              <View style={styles.targetRow}>
                <TargetPill label="Minimum" value={formatTargetMeasurement(habit.minimumTargetValue, habit.targetUnit)} />
                <TargetPill label="Standard" value={formatTargetMeasurement(habit.standardTargetValue, habit.targetUnit)} />
                <TargetPill label="Bonus" value={formatTargetMeasurement(habit.bonusTargetValue, habit.targetUnit)} />
              </View>
            </View>
          );
        })}
      </View>
    </ScreenShell>
  );
}

/** Displays the three effort sizes without framing the easiest option as a lesser achievement. */
function TargetPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.targetPill}>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  introduction: {
    gap: Spacing.one,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  activeSummary: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radii.large,
    marginBottom: Spacing.three,
  },
  habitList: {
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  habitCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
  },
  habitHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  habitCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  toggle: {
    width: 52,
    height: 32,
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: Radii.round,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: Radii.round,
  },
  targetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  targetPill: {
    flexGrow: 1,
    minWidth: 92,
    gap: 2,
  },
});
