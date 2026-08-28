import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionButton } from '@/components/ui/action-button';
import { ProductHeader } from '@/components/ui/product-header';
import { Radii, Spacing } from '@/constants/theme';
import {
  formatTargetMeasurement,
  formatTargetUnit,
  resolveHabitTargetValue,
} from '@/domain/daily-planner';
import { type DailyPlanItem, type MobilityPreference } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';

type GuidedActivityModalProps = {
  item: DailyPlanItem;
  mobilityPreference: MobilityPreference;
  onClose: () => void;
  onComplete: () => Promise<void>;
};

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/** Guides one selected action with an optional timer, an adapted instruction set, and explicit completion. */
export function GuidedActivityModal({
  item,
  mobilityPreference,
  onClose,
  onComplete,
}: GuidedActivityModalProps) {
  const theme = useTheme();
  const targetValue = resolveHabitTargetValue(item.habit, item.targetLevel);
  const initialSeconds = item.habit.targetUnit === 'minutes' ? targetValue * 60 : 0;
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const instructions = useMemo(
    () =>
      mobilityPreference === 'seated' && item.habit.seatedAlternative
        ? item.habit.seatedAlternative
        : item.habit.instructions,
    [item.habit, mobilityPreference],
  );

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) return;
    const countdownId = setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          setIsRunning(false);
          return 0;
        }
        return currentSeconds - 1;
      });
    }, 1000);
    return () => clearInterval(countdownId);
  }, [isRunning, remainingSeconds]);

  const finishActivity = async () => {
    setIsCompleting(true);
    try {
      await onComplete();
      onClose();
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <ThemedView style={styles.modalPage}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.headerRow}>
            <ProductHeader eyebrow="GUIDED SMALL WIN" />
            <Pressable accessibilityLabel="Close activity" accessibilityRole="button" onPress={onClose}>
              <ThemedText type="smallBold" themeColor="textSecondary">Close</ThemedText>
            </Pressable>
          </View>

          <View style={styles.activityContent}>
            <ThemedText type="title">{item.habit.title}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {formatTargetMeasurement(targetValue, item.habit.targetUnit)} · {item.targetLevel} version
            </ThemedText>

            {initialSeconds > 0 ? (
              <View
                accessibilityLabel={`${remainingSeconds} seconds remaining`}
                style={[
                  styles.timerCircle,
                  { backgroundColor: theme.backgroundSelected, borderColor: theme.primary },
                ]}>
                <ThemedText type="title">
                  {remainingSeconds === 0 ? 'Done' : formatCountdown(remainingSeconds)}
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.targetCircle, { backgroundColor: theme.surfaceWarm }]}>
                <ThemedText type="title" themeColor="accent">{targetValue}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatTargetUnit(targetValue, item.habit.targetUnit)}
                </ThemedText>
              </View>
            )}

            <View style={styles.instructions}>
              {instructions.map((instruction, index) => (
                <View key={instruction} style={styles.instructionRow}>
                  <View style={[styles.instructionNumber, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="smallBold" themeColor="primaryStrong">{index + 1}</ThemedText>
                  </View>
                  <ThemedText style={styles.instructionCopy}>{instruction}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            {initialSeconds > 0 && remainingSeconds > 0 ? (
              <ActionButton
                label={isRunning ? 'Pause timer' : remainingSeconds === initialSeconds ? 'Start timer' : 'Resume timer'}
                onPress={() => setIsRunning((running) => !running)}
                variant="secondary"
              />
            ) : null}
            <ActionButton
              isLoading={isCompleting}
              label="Mark complete"
              onPress={() => void finishActivity()}
            />
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalPage: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityContent: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.two,
  },
  timerCircle: {
    width: 176,
    height: 176,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.four,
    borderWidth: 10,
    borderRadius: Radii.round,
  },
  targetCircle: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.four,
    borderRadius: Radii.round,
  },
  instructions: {
    gap: Spacing.three,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.round,
  },
  instructionCopy: {
    flex: 1,
  },
  actions: {
    gap: Spacing.two,
  },
});
