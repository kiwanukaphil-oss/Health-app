import { useMemo, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Radii, Spacing } from '@/constants/theme';
import { selectStarterHabits } from '@/domain/habit-library';
import { formatTargetMeasurement } from '@/domain/daily-planner';
import {
  type GoalId,
  type MobilityPreference,
  type OnboardingInput,
} from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

const onboardingSteps = ['Welcome', 'Priorities', 'Routine', 'Movement', 'Starter plan'] as const;

const goalChoices: readonly { id: GoalId; label: string; description: string }[] = [
  { id: 'sit_less', label: 'Sit less', description: 'Break up long desk sessions.' },
  { id: 'move_more', label: 'Move more', description: 'Collect short walks during the day.' },
  { id: 'mobility', label: 'Improve mobility', description: 'Ease stiffness with gentle resets.' },
  { id: 'strength', label: 'Build strength', description: 'Start with a few controlled repetitions.' },
  { id: 'energy', label: 'Improve energy', description: 'Use small recovery moments during work.' },
] as const;

const weekdayChoices = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
] as const;

const routineTimeFields: readonly {
  field: 'workdayStart' | 'workdayEnd' | 'lunchWindowStart' | 'lunchWindowEnd';
  label: string;
}[] = [
  { label: 'Work starts', field: 'workdayStart' },
  { label: 'Work ends', field: 'workdayEnd' },
  { label: 'Lunch from', field: 'lunchWindowStart' },
  { label: 'Lunch until', field: 'lunchWindowEnd' },
];

const mobilityChoices: readonly {
  id: MobilityPreference;
  label: string;
  description: string;
}[] = [
  { id: 'standing', label: 'Standing activities work for me', description: 'Standing remains the default.' },
  { id: 'seated_or_standing', label: 'Offer both options', description: 'Every activity can be adapted.' },
  { id: 'seated', label: 'Prefer seated activities', description: 'Seated alternatives appear first.' },
] as const;

const INITIAL_ONBOARDING_INPUT: OnboardingInput = {
  name: '',
  priorities: ['sit_less', 'move_more'],
  mobilityPreference: 'seated_or_standing',
  workdays: [1, 2, 3, 4, 5],
  workdayStart: '08:30',
  workdayEnd: '17:30',
  lunchWindowStart: '12:30',
  lunchWindowEnd: '14:00',
};

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Guides setup through a few low-effort choices and previews the exact three habits before saving. */
export function OnboardingFlow() {
  const theme = useTheme();
  const { completeOnboarding } = useAppData();
  const [currentStep, setCurrentStep] = useState(0);
  const [draft, setDraft] = useState(INITIAL_ONBOARDING_INPUT);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const starterHabits = useMemo(
    () => selectStarterHabits(draft.priorities),
    [draft.priorities],
  );

  /** Keeps priorities unique and enforces the three-habit starter-plan limit. */
  const togglePriority = (goalId: GoalId) => {
    setDraft((currentDraft) => {
      const isSelected = currentDraft.priorities.includes(goalId);
      if (!isSelected && currentDraft.priorities.length >= 3) return currentDraft;
      return {
        ...currentDraft,
        priorities: isSelected
          ? currentDraft.priorities.filter((priority) => priority !== goalId)
          : [...currentDraft.priorities, goalId],
      };
    });
  };

  const toggleWorkday = (weekday: number) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      workdays: currentDraft.workdays.includes(weekday)
        ? currentDraft.workdays.filter((day) => day !== weekday)
        : [...currentDraft.workdays, weekday],
    }));
  };

  /** Validates only the current decision, then persists the complete setup on the final step. */
  const advanceOnboarding = async () => {
    setValidationMessage(null);
    if (currentStep === 1 && draft.priorities.length === 0) {
      setValidationMessage('Choose at least one priority so your starter plan fits you.');
      return;
    }
    if (
      currentStep === 2 &&
      (!isValidTime(draft.workdayStart) ||
        !isValidTime(draft.workdayEnd) ||
        !isValidTime(draft.lunchWindowStart) ||
        !isValidTime(draft.lunchWindowEnd) ||
        draft.workdays.length === 0)
    ) {
      setValidationMessage('Use 24-hour times such as 08:30 and choose at least one workday.');
      return;
    }
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep((step) => step + 1);
      return;
    }

    setIsSaving(true);
    try {
      await completeOnboarding(draft);
    } catch {
      setValidationMessage('Setup could not be saved. Please try once more.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenShell contentStyle={styles.screenContent}>
      <ProductHeader eyebrow={`SETUP · ${currentStep + 1} OF ${onboardingSteps.length}`} />
      <View style={styles.progressTrack} accessibilityLabel={`Step ${currentStep + 1} of ${onboardingSteps.length}`}>
        {onboardingSteps.map((step, index) => (
          <View
            key={step}
            style={[
              styles.progressSegment,
              { backgroundColor: index <= currentStep ? theme.primary : theme.border },
            ]}
          />
        ))}
      </View>

      <View style={styles.stepContent}>
        {currentStep === 0 ? (
          <>
            <ThemedText type="title">A healthier workday, built gently</ThemedText>
            <ThemedText themeColor="textSecondary">
              Little Gains starts with three actions small enough to repeat. Missing a day never erases your progress.
            </ThemedText>
            <View style={[styles.promiseCard, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">What should we call you?</ThemedText>
              <TextInput
                accessibilityLabel="Your name"
                autoCapitalize="words"
                onChangeText={(name) => setDraft((currentDraft) => ({ ...currentDraft, name }))}
                placeholder="Name (optional)"
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.textInput,
                  { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
                ]}
                value={draft.name}
              />
            </View>
          </>
        ) : null}

        {currentStep === 1 ? (
          <>
            <ThemedText type="title">What matters most right now?</ThemedText>
            <ThemedText themeColor="textSecondary">Choose up to three. You can change them later.</ThemedText>
            <View style={styles.choiceList}>
              {goalChoices.map((goal) => (
                <SelectionChip
                  key={goal.id}
                  label={`${goal.label} · ${goal.description}`}
                  onPress={() => togglePriority(goal.id)}
                  selected={draft.priorities.includes(goal.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        {currentStep === 2 ? (
          <>
            <ThemedText type="title">When does work usually happen?</ThemedText>
            <ThemedText themeColor="textSecondary">Approximate windows are enough. The app will not assume exact meal times.</ThemedText>
            <View style={styles.weekdayRow}>
              {weekdayChoices.map((weekday, index) => (
                <SelectionChip
                  key={`${weekday.value}-${index}`}
                  accessibilityLabel={`Toggle workday ${weekday.label} ${index + 1}`}
                  label={weekday.label}
                  onPress={() => toggleWorkday(weekday.value)}
                  selected={draft.workdays.includes(weekday.value)}
                />
              ))}
            </View>
            <View style={styles.timeGrid}>
              {routineTimeFields.map(({ label, field }) => (
                <View key={field} style={styles.timeField}>
                  <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
                  <TextInput
                    accessibilityLabel={label}
                    inputMode="text"
                    maxLength={5}
                    onChangeText={(value) =>
                      setDraft((currentDraft) => ({ ...currentDraft, [field]: value }))
                    }
                    placeholder="08:30"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.textInput,
                      { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement },
                    ]}
                    value={draft[field]}
                  />
                </View>
              ))}
            </View>
          </>
        ) : null}

        {currentStep === 3 ? (
          <>
            <ThemedText type="title">How should movement be adapted?</ThemedText>
            <ThemedText themeColor="textSecondary">Choose the option that feels safest and most useful today.</ThemedText>
            <View style={styles.choiceList}>
              {mobilityChoices.map((choice) => (
                <SelectionChip
                  key={choice.id}
                  label={`${choice.label} · ${choice.description}`}
                  onPress={() =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      mobilityPreference: choice.id,
                    }))
                  }
                  selected={draft.mobilityPreference === choice.id}
                />
              ))}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Stop any activity that causes pain, dizziness, or unusual shortness of breath. Seek professional guidance if you are unsure what is appropriate for you.
            </ThemedText>
          </>
        ) : null}

        {currentStep === 4 ? (
          <>
            <ThemedText type="title">Your first three small wins</ThemedText>
            <ThemedText themeColor="textSecondary">Each minimum version counts completely. Nothing increases without your choice.</ThemedText>
            <View style={styles.choiceList}>
              {starterHabits.map((habit, index) => (
                <View
                  key={habit.id}
                  style={[
                    styles.starterHabit,
                    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <View style={[styles.habitNumber, { backgroundColor: theme.surfaceWarm }]}>
                    <ThemedText type="smallBold" themeColor="accent">{index + 1}</ThemedText>
                  </View>
                  <View style={styles.starterHabitCopy}>
                    <ThemedText type="smallBold">{habit.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {habit.cueLabel} · {formatTargetMeasurement(
                        habit.minimumTargetValue,
                        habit.targetUnit,
                      )}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </View>

      {validationMessage ? (
        <ThemedText accessibilityRole="alert" type="small" themeColor="danger" style={styles.validationMessage}>
          {validationMessage}
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        {currentStep > 0 ? (
          <ActionButton label="Back" onPress={() => setCurrentStep((step) => step - 1)} variant="quiet" />
        ) : null}
        <ActionButton
          isLoading={isSaving}
          label={currentStep === onboardingSteps.length - 1 ? 'Start my journey' : 'Continue'}
          onPress={() => void advanceOnboarding()}
          style={styles.continueButton}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: Platform.select({ web: Spacing.five, default: Spacing.four }),
  },
  progressTrack: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.four,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: Radii.round,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  promiseCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radii.large,
  },
  textInput: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.medium,
    fontSize: 16,
  },
  choiceList: {
    gap: Spacing.two,
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  timeField: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: Spacing.one,
  },
  starterHabit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radii.large,
  },
  habitNumber: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.medium,
  },
  starterHabitCopy: {
    flex: 1,
    gap: 2,
  },
  validationMessage: {
    marginBottom: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  continueButton: {
    flex: 1,
  },
});
