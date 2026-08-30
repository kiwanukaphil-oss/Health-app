import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { Radii, Spacing } from '@/constants/theme';
import { type ReminderMoreDecision } from '@/domain/reminder-actions';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { type PendingReminderMoreChoice } from '@/state/app-data-context';

type ReminderMoreActionsModalProps = {
  choice: PendingReminderMoreChoice;
  onClose: () => void;
  onRespond: (decision: ReminderMoreDecision) => Promise<void>;
};

/** Presents the two lower-frequency responses that do not fit Android's three-action notification limit. */
export function ReminderMoreActionsModal({
  choice,
  onClose,
  onRespond,
}: ReminderMoreActionsModalProps) {
  const theme = useTheme();
  const isReducedMotionEnabled = useReducedMotion();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** Keeps the sheet open with a useful recovery message if the local response cannot be saved. */
  const saveReminderDecision = async (decision: ReminderMoreDecision) => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await onRespond(decision);
    } catch {
      setErrorMessage('That choice could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      animationType={isReducedMotionEnabled ? 'none' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible>
      <ScreenShell>
        <ProductHeader eyebrow="REMINDER RESPONSE" />
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <ThemedText accessibilityRole="header" type="title">
              What would help right now?
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              This choice guides reminder timing without judging your day.
            </ThemedText>
          </View>
          <ActionButton disabled={isSaving} label="Close" onPress={onClose} variant="quiet" />
        </View>

        <View style={[styles.reminderCard, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="subtitle">{choice.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{choice.body}</ThemedText>
        </View>

        <View style={styles.choiceStack}>
          <View style={[styles.choiceCard, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Bad time</ThemedText>
            <ThemedText themeColor="textSecondary">
              Try again about an hour later when your work window and quiet hours allow it. Repeated feedback can gently shift future timing.
            </ThemedText>
            <ActionButton
              accessibilityHint="Records timing feedback and may schedule a calmer reminder later"
              isLoading={isSaving}
              label="Choose Bad time"
              onPress={() => void saveReminderDecision('bad_time')}
            />
          </View>

          <View style={[styles.choiceCard, { borderColor: theme.border }]}>
            <ThemedText type="subtitle">Not today</ThemedText>
            <ThemedText themeColor="textSecondary">
              End this reminder for today. Your habit and all existing progress stay unchanged.
            </ThemedText>
            <ActionButton
              accessibilityHint="Ends this reminder without changing your habit or progress"
              disabled={isSaving}
              label="Choose Not today"
              onPress={() => void saveReminderDecision('not_today')}
              variant="secondary"
            />
          </View>
        </View>

        {errorMessage ? (
          <ThemedText accessibilityRole="alert" themeColor="danger" type="small">
            {errorMessage}
          </ThemedText>
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
  reminderCard: {
    gap: Spacing.two,
    marginVertical: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radii.large,
  },
  choiceStack: { gap: Spacing.three },
  choiceCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Radii.large,
  },
});
