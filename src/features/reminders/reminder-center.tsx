import { useState } from 'react';
import { Linking, Modal, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Radii, Spacing } from '@/constants/theme';
import {
  type ReminderFamily,
  type ReminderPreferences,
  type ReminderSupportLevel,
} from '@/domain/models';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

const supportChoices: readonly {
  id: ReminderSupportLevel;
  label: string;
  description: string;
}[] = [
  { id: 'gentle', label: 'Gentle', description: 'Up to 2 prompts on a workday' },
  { id: 'balanced', label: 'Balanced', description: 'Up to 3 prompts on a workday' },
  { id: 'supportive', label: 'Supportive', description: 'Up to 4 prompts on a workday' },
];

const familyChoices: readonly {
  id: ReminderFamily;
  label: string;
  description: string;
}[] = [
  { id: 'workday', label: 'Sitting and workday bookends', description: 'Start, midmorning, and close-work support' },
  { id: 'lunch', label: 'Lunch movement', description: 'Uses the end of your approximate lunch window' },
  { id: 'afternoon', label: 'Afternoon reset', description: 'A calm recovery prompt before work ends' },
];

function isValidClockTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function formatNextReminder(nextReminderAt: string | null) {
  if (!nextReminderAt) return 'No prompt is currently scheduled';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(nextReminderAt));
}

/** Presents permission education and every reminder control without requiring a calendar or account. */
export function ReminderCenter({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const isReducedMotionEnabled = useReducedMotion();
  const {
    reminderPreferences,
    notificationPermissionState,
    scheduledReminderCount,
    nextReminderAt,
    isReminderSyncing,
    reminderErrorMessage,
    requestReminderPermissionAndEnable,
    saveReminderPreferences,
    pauseRemindersForToday,
    setRemindersEnabled,
  } = useAppData();
  const [draft, setDraft] = useState<ReminderPreferences>(reminderPreferences);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const toggleFamily = (family: ReminderFamily) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      enabledFamilies: currentDraft.enabledFamilies.includes(family)
        ? currentDraft.enabledFamilies.filter((candidate) => candidate !== family)
        : [...currentDraft.enabledFamilies, family],
    }));
  };

  /** Validates the complete timing contract before the provider reschedules the native queue. */
  const savePreferences = async () => {
    setValidationMessage(null);
    if (!isValidClockTime(draft.quietHoursStart) || !isValidClockTime(draft.quietHoursEnd)) {
      setValidationMessage('Use 24-hour quiet times such as 20:30 and 08:00.');
      return;
    }
    if (draft.enabledFamilies.length === 0) {
      setValidationMessage('Keep at least one reminder type, or turn reminders off instead.');
      return;
    }
    setIsSaving(true);
    try {
      await saveReminderPreferences(draft);
    } catch {
      setValidationMessage('These reminder choices could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const requestPermission = async () => {
    setIsSaving(true);
    try {
      const permissionState = await requestReminderPermissionAndEnable();
      if (permissionState !== 'granted') {
        setValidationMessage('Notifications were not enabled. Your plan remains fully usable.');
      }
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
        <ProductHeader eyebrow="HELPFUL REMINDERS" />
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <ThemedText type="title">Support that respects your day</ThemedText>
            <ThemedText themeColor="textSecondary">
              Approximate work and lunch windows are enough. Little Gains never needs meeting or meal details.
            </ThemedText>
          </View>
          <ActionButton label="Close" onPress={onClose} variant="quiet" />
        </View>

        <View style={[styles.promiseCard, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor="primaryStrong">YOU STAY IN CONTROL</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Prompts are local, quiet, capped each day, and easy to pause. Choosing “Bad time” gently shifts that type later after repeated feedback.
          </ThemedText>
        </View>

        {notificationPermissionState === 'unavailable' ? (
          <View style={[styles.sectionCard, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Try reminders on your phone</ThemedText>
            <ThemedText themeColor="textSecondary">
              Browser preview keeps reminders off. The Android or iOS build provides local scheduling.
            </ThemedText>
          </View>
        ) : null}

        {notificationPermissionState === 'undetermined' ? (
          <View style={[styles.sectionCard, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Allow helpful reminders?</ThemedText>
            <ThemedText themeColor="textSecondary">
              The system permission appears only after this explanation. Denying it does not remove any habit or progress.
            </ThemedText>
            <ActionButton
              isLoading={isSaving}
              label="Continue to system permission"
              onPress={() => void requestPermission()}
            />
          </View>
        ) : null}

        {notificationPermissionState === 'denied' ? (
          <View style={[styles.sectionCard, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Notifications are blocked</ThemedText>
            <ThemedText themeColor="textSecondary">
              Your habits still work normally. If you change your mind, enable Little Gains notifications in system settings.
            </ThemedText>
            <ActionButton label="Open system settings" onPress={() => void Linking.openSettings()} />
          </View>
        ) : null}

        {notificationPermissionState === 'granted' ? (
          <>
            <View style={[styles.statusCard, { backgroundColor: theme.backgroundSelected }]}>
              <View style={styles.statusCopy}>
                <ThemedText type="smallBold">
                  {reminderPreferences.enabled ? 'Reminders are on' : 'Reminders are off'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {isReminderSyncing
                    ? 'Preparing your next prompts…'
                    : `${formatNextReminder(nextReminderAt)} · ${scheduledReminderCount} planned`}
                </ThemedText>
              </View>
              <ActionButton
                label={reminderPreferences.enabled ? 'Turn off' : 'Turn on'}
                onPress={() => void setRemindersEnabled(!reminderPreferences.enabled)}
                variant="secondary"
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="primaryStrong">SUPPORT LEVEL</ThemedText>
              <View style={styles.choiceList}>
                {supportChoices.map((choice) => (
                  <SelectionChip
                    key={choice.id}
                    label={`${choice.label} · ${choice.description}`}
                    onPress={() => setDraft((current) => ({ ...current, supportLevel: choice.id }))}
                    selected={draft.supportLevel === choice.id}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="primaryStrong">REMINDER TYPES</ThemedText>
              <View style={styles.choiceList}>
                {familyChoices.map((choice) => (
                  <SelectionChip
                    key={choice.id}
                    label={`${choice.label} · ${choice.description}`}
                    onPress={() => toggleFamily(choice.id)}
                    selected={draft.enabledFamilies.includes(choice.id)}
                  />
                ))}
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Meeting reset stays manual until optional calendar awareness is separately approved.
              </ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold" themeColor="primaryStrong">QUIET HOURS</ThemedText>
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <ThemedText type="small" themeColor="textSecondary">Quiet from</ThemedText>
                  <TextInput
                    accessibilityLabel="Quiet hours start"
                    maxLength={5}
                    onChangeText={(quietHoursStart) => setDraft((current) => ({ ...current, quietHoursStart }))}
                    style={[styles.timeInput, { color: theme.text, borderColor: theme.border }]}
                    value={draft.quietHoursStart}
                  />
                </View>
                <View style={styles.timeField}>
                  <ThemedText type="small" themeColor="textSecondary">Until</ThemedText>
                  <TextInput
                    accessibilityLabel="Quiet hours end"
                    maxLength={5}
                    onChangeText={(quietHoursEnd) => setDraft((current) => ({ ...current, quietHoursEnd }))}
                    style={[styles.timeInput, { color: theme.text, borderColor: theme.border }]}
                    value={draft.quietHoursEnd}
                  />
                </View>
              </View>
            </View>

            {validationMessage || reminderErrorMessage ? (
              <ThemedText accessibilityRole="alert" type="small" themeColor="danger">
                {validationMessage ?? reminderErrorMessage}
              </ThemedText>
            ) : null}

            <View style={styles.actionStack}>
              <ActionButton isLoading={isSaving} label="Save reminder choices" onPress={() => void savePreferences()} />
              <ActionButton label="Pause for today" onPress={() => void pauseRemindersForToday()} variant="secondary" />
            </View>
          </>
        ) : null}
      </ScreenShell>
    </Modal>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  titleCopy: { flex: 1, gap: Spacing.two },
  promiseCard: { gap: Spacing.one, marginVertical: Spacing.four, padding: Spacing.three, borderRadius: Radii.large },
  section: { gap: Spacing.two, marginBottom: Spacing.four },
  sectionCard: { gap: Spacing.three, padding: Spacing.four, borderWidth: 1, borderRadius: Radii.large },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.four, padding: Spacing.three, borderRadius: Radii.large },
  statusCopy: { flex: 1, gap: Spacing.one },
  choiceList: { gap: Spacing.two },
  timeRow: { flexDirection: 'row', gap: Spacing.two },
  timeField: { flex: 1, gap: Spacing.one },
  timeInput: { minHeight: 48, paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Radii.medium, fontSize: 16 },
  actionStack: { gap: Spacing.two },
});
