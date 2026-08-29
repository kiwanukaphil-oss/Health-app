import { type ReactNode, useMemo, useState } from 'react';
import { Modal, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Radii, Spacing } from '@/constants/theme';
import {
  createProfileChangePreview,
  validateProfileUpdate,
} from '@/domain/personalization';
import {
  type GoalId,
  type MobilityPreference,
  type ProfileUpdateInput,
  type ReminderSupportLevel,
} from '@/domain/models';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

const goals: readonly { id: GoalId; label: string }[] = [
  { id: 'sit_less', label: 'Sit less' },
  { id: 'move_more', label: 'Move more' },
  { id: 'mobility', label: 'Improve mobility' },
  { id: 'strength', label: 'Build strength' },
  { id: 'energy', label: 'Improve energy' },
];

const weekdays = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
] as const;

const mobilityOptions: readonly { id: MobilityPreference; label: string }[] = [
  { id: 'standing', label: 'Standing works for me' },
  { id: 'seated_or_standing', label: 'Offer seated and standing' },
  { id: 'seated', label: 'Prefer seated activities' },
];

const supportOptions: readonly { id: ReminderSupportLevel; label: string }[] = [
  { id: 'gentle', label: 'Gentle · up to 2 prompts' },
  { id: 'balanced', label: 'Balanced · up to 3 prompts' },
  { id: 'supportive', label: 'Supportive · up to 4 prompts' },
];

const timeFields: readonly {
  id: 'workdayStart' | 'workdayEnd' | 'lunchWindowStart' | 'lunchWindowEnd';
  label: string;
}[] = [
  { id: 'workdayStart', label: 'Work starts' },
  { id: 'workdayEnd', label: 'Work ends' },
  { id: 'lunchWindowStart', label: 'Lunch from' },
  { id: 'lunchWindowEnd', label: 'Lunch until' },
];

/** Edits the user's rhythm in two explicit steps so timing effects are visible before persistence. */
export function ProfileEditor({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const isReducedMotionEnabled = useReducedMotion();
  const { profile, reminderPreferences, saveProfileChanges } = useAppData();
  const [draft, setDraft] = useState<ProfileUpdateInput>({
    name: profile.name,
    priorities: profile.priorities,
    mobilityPreference: profile.mobilityPreference,
    workdays: profile.workdays,
    workdayStart: profile.workdayStart,
    workdayEnd: profile.workdayEnd,
    lunchWindowStart: profile.lunchWindowStart,
    lunchWindowEnd: profile.lunchWindowEnd,
  });
  const [supportLevel, setSupportLevel] = useState(reminderPreferences.supportLevel);
  const [resetStarterPlan, setResetStarterPlan] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const preview = useMemo(() => createProfileChangePreview(
    profile,
    draft,
    reminderPreferences.supportLevel,
    supportLevel,
    resetStarterPlan,
  ), [draft, profile, reminderPreferences.supportLevel, resetStarterPlan, supportLevel]);

  const togglePriority = (goalId: GoalId) => {
    setDraft((current) => {
      const selected = current.priorities.includes(goalId);
      if (!selected && current.priorities.length >= 3) return current;
      return {
        ...current,
        priorities: selected
          ? current.priorities.filter((priority) => priority !== goalId)
          : [...current.priorities, goalId],
      };
    });
  };

  const toggleWorkday = (weekday: number) => {
    setDraft((current) => ({
      ...current,
      workdays: current.workdays.includes(weekday)
        ? current.workdays.filter((day) => day !== weekday)
        : [...current.workdays, weekday],
    }));
  };

  const reviewChanges = () => {
    const validationMessage = validateProfileUpdate(draft);
    setMessage(validationMessage);
    if (!validationMessage) setShowPreview(true);
  };

  const saveChanges = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await saveProfileChanges(draft, supportLevel, resetStarterPlan);
      onClose();
    } catch {
      setMessage('These changes could not be saved. Your previous routine is still intact.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      animationType={isReducedMotionEnabled ? 'none' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}>
      <ScreenShell>
        <ProductHeader eyebrow={showPreview ? 'REVIEW CHANGES' : 'EDIT YOUR RHYTHM'} />
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <ThemedText type="title">{showPreview ? 'Know what changes when' : 'Fit Little Gains to real life'}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {showPreview
                ? 'Nothing is saved until you confirm.'
                : 'Approximate windows are enough. You can update this again at any time.'}
            </ThemedText>
          </View>
          <ActionButton label="Close" onPress={onClose} variant="quiet" />
        </View>

        {showPreview ? (
          <View style={styles.previewStack}>
            <PreviewCard title="Today" lines={preview.today} />
            <PreviewCard title="Tomorrow and later" lines={preview.tomorrow} />
            {resetStarterPlan ? (
              <View style={[styles.noteCard, { backgroundColor: theme.surfaceWarm }]}>
                <ThemedText type="smallBold">Your history is safe</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Restoring starter habits changes the active plan only. Completed wins and reflections remain.
                </ThemedText>
              </View>
            ) : null}
            {message ? <ThemedText accessibilityRole="alert" themeColor="danger">{message}</ThemedText> : null}
            <View style={styles.actions}>
              <ActionButton label="Back to edit" onPress={() => setShowPreview(false)} variant="secondary" />
              <ActionButton isLoading={isSaving} label="Save changes" onPress={() => void saveChanges()} style={styles.flexAction} />
            </View>
          </View>
        ) : (
          <View style={styles.form}>
            <EditorSection title="ABOUT YOU">
              <ThemedText type="small" themeColor="textSecondary">Name</ThemedText>
              <TextInput
                accessibilityLabel="Your name"
                autoCapitalize="words"
                onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={draft.name}
              />
            </EditorSection>

            <EditorSection title="PRIORITIES · CHOOSE UP TO 3">
              {goals.map((goal) => (
                <SelectionChip key={goal.id} label={goal.label} onPress={() => togglePriority(goal.id)} selected={draft.priorities.includes(goal.id)} />
              ))}
            </EditorSection>

            <EditorSection title="USUAL WORKDAYS">
              <View style={styles.wrapRow}>
                {weekdays.map((weekday) => (
                  <SelectionChip key={weekday.id} label={weekday.label} onPress={() => toggleWorkday(weekday.id)} selected={draft.workdays.includes(weekday.id)} />
                ))}
              </View>
              <View style={styles.timeGrid}>
                {timeFields.map((field) => (
                  <View key={field.id} style={styles.timeField}>
                    <ThemedText type="small" themeColor="textSecondary">{field.label}</ThemedText>
                    <TextInput
                      accessibilityLabel={field.label}
                      maxLength={5}
                      onChangeText={(value) => setDraft((current) => ({ ...current, [field.id]: value }))}
                      style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                      value={draft[field.id]}
                    />
                  </View>
                ))}
              </View>
            </EditorSection>

            <EditorSection title="MOVEMENT OPTIONS">
              {mobilityOptions.map((option) => (
                <SelectionChip key={option.id} label={option.label} onPress={() => setDraft((current) => ({ ...current, mobilityPreference: option.id }))} selected={draft.mobilityPreference === option.id} />
              ))}
            </EditorSection>

            <EditorSection title="REMINDER SUPPORT">
              {supportOptions.map((option) => (
                <SelectionChip key={option.id} label={option.label} onPress={() => setSupportLevel(option.id)} selected={supportLevel === option.id} />
              ))}
            </EditorSection>

            <EditorSection title="STARTER PLAN RECOVERY">
              <SelectionChip
                label="Restore my three starter habits tomorrow"
                onPress={() => setResetStarterPlan((current) => !current)}
                selected={resetStarterPlan}
              />
              <ThemedText type="small" themeColor="textSecondary">This never deletes completed wins.</ThemedText>
            </EditorSection>

            {message ? <ThemedText accessibilityRole="alert" themeColor="danger">{message}</ThemedText> : null}
            <ActionButton label="Review changes" onPress={reviewChanges} />
          </View>
        )}
      </ScreenShell>
    </Modal>
  );
}

function EditorSection({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><ThemedText type="smallBold" themeColor="primaryStrong">{title}</ThemedText>{children}</View>;
}

function PreviewCard({ title, lines }: { title: string; lines: string[] }) {
  const theme = useTheme();
  return (
    <View style={[styles.previewCard, { borderColor: theme.border }]}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {lines.map((line) => <ThemedText key={line} themeColor="textSecondary">• {line}</ThemedText>)}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, marginTop: Spacing.four },
  titleCopy: { flex: 1, gap: Spacing.one },
  form: { gap: Spacing.four, marginTop: Spacing.four },
  section: { gap: Spacing.two },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  timeField: { flexGrow: 1, flexBasis: '45%', gap: Spacing.one },
  input: { minHeight: 48, paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Radii.medium, fontSize: 16 },
  previewStack: { gap: Spacing.three, marginTop: Spacing.four },
  previewCard: { gap: Spacing.two, padding: Spacing.three, borderWidth: 1, borderRadius: Radii.large },
  noteCard: { gap: Spacing.one, padding: Spacing.three, borderRadius: Radii.large },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flexAction: { flex: 1 },
});
