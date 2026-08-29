import { type ReactNode, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { ScreenShell } from '@/components/ui/screen-shell';
import { SelectionChip } from '@/components/ui/selection-chip';
import { Radii, Spacing } from '@/constants/theme';
import {
  type ReflectionAdjustment,
  type ReflectionDifficulty,
  type ReflectionHelpfulness,
  type WeeklyReflectionInput,
} from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { useAppData } from '@/state/app-data-context';

const helpfulnessOptions: readonly { id: ReflectionHelpfulness; label: string }[] = [
  { id: 'helpful', label: 'Helpful' },
  { id: 'mixed', label: 'Mixed' },
  { id: 'not_helpful', label: 'Not helpful' },
];

const difficultyOptions: readonly { id: ReflectionDifficulty; label: string }[] = [
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'manageable', label: 'Manageable' },
  { id: 'hard', label: 'Hard this week' },
];

const adjustmentOptions: readonly { id: ReflectionAdjustment; label: string }[] = [
  { id: 'keep', label: 'Keep things steady' },
  { id: 'less_support', label: 'Use less reminder support' },
  { id: 'more_support', label: 'Use more reminder support' },
  { id: 'different_habit', label: 'Try a different habit' },
];

/** Captures four explicit weekly choices and leaves every resulting adaptation under user control. */
export function WeeklyReflectionModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { latestWeeklyReflection, saveWeeklyReflection } = useAppData();
  const [draft, setDraft] = useState<WeeklyReflectionInput>({
    helpfulness: latestWeeklyReflection?.helpfulness ?? 'mixed',
    difficulty: latestWeeklyReflection?.difficulty ?? 'manageable',
    energyRating: latestWeeklyReflection?.energyRating ?? 3,
    adjustment: latestWeeklyReflection?.adjustment ?? 'keep',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveReflection = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      await saveWeeklyReflection(draft);
      onClose();
    } catch {
      setMessage('Your reflection could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <ScreenShell>
        <ProductHeader eyebrow="TWO-MINUTE REFLECTION" />
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <ThemedText type="title">What supported you this week?</ThemedText>
            <ThemedText themeColor="textSecondary">Missed days are information, never a penalty.</ThemedText>
          </View>
          <ActionButton label="Close" onPress={onClose} variant="quiet" />
        </View>

        <View style={[styles.promiseCard, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor="primaryStrong">NO HIDDEN SCORE</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Little Gains uses only these answers and your visible completion pattern. You approve every suggested change.
          </ThemedText>
        </View>

        <ReflectionQuestion title="Were reminders helpful?">
          {helpfulnessOptions.map((option) => (
            <SelectionChip key={option.id} label={option.label} onPress={() => setDraft((current) => ({ ...current, helpfulness: option.id }))} selected={draft.helpfulness === option.id} />
          ))}
        </ReflectionQuestion>

        <ReflectionQuestion title="How did the plan feel?">
          {difficultyOptions.map((option) => (
            <SelectionChip key={option.id} label={option.label} onPress={() => setDraft((current) => ({ ...current, difficulty: option.id }))} selected={draft.difficulty === option.id} />
          ))}
        </ReflectionQuestion>

        <ReflectionQuestion title="Your usual energy this week">
          <View style={styles.energyRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <SelectionChip key={rating} accessibilityLabel={`Energy ${rating} of 5`} label={rating.toString()} onPress={() => setDraft((current) => ({ ...current, energyRating: rating }))} selected={draft.energyRating === rating} />
            ))}
          </View>
          <ThemedText type="small" themeColor="textSecondary">1 is very low · 5 is strong</ThemedText>
        </ReflectionQuestion>

        <ReflectionQuestion title="Choose one adjustment">
          {adjustmentOptions.map((option) => (
            <SelectionChip key={option.id} label={option.label} onPress={() => setDraft((current) => ({ ...current, adjustment: option.id }))} selected={draft.adjustment === option.id} />
          ))}
        </ReflectionQuestion>

        {message ? <ThemedText accessibilityRole="alert" themeColor="danger">{message}</ThemedText> : null}
        <ActionButton isLoading={isSaving} label="Save my reflection" onPress={() => void saveReflection()} />
      </ScreenShell>
    </Modal>
  );
}

function ReflectionQuestion({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.question}><ThemedText type="subtitle">{title}</ThemedText>{children}</View>;
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, marginTop: Spacing.four },
  titleCopy: { flex: 1, gap: Spacing.one },
  promiseCard: { gap: Spacing.one, marginVertical: Spacing.four, padding: Spacing.three, borderRadius: Radii.large },
  question: { gap: Spacing.two, marginBottom: Spacing.four },
  energyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
