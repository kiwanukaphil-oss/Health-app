import { type PropsWithChildren, useCallback, useMemo, useState } from 'react';

import {
  createDailyPlanDraft,
  createRecentLocalDates,
  estimateCompletionMinutes,
  formatLocalDate,
  selectTargetLevelForEnergy,
} from '@/domain/daily-planner';
import { createHabitFromDefinition, HABIT_LIBRARY, selectStarterHabits } from '@/domain/habit-library';
import {
  type AppSnapshot,
  type DailyPlan,
  type EnergyLevel,
  type Habit,
  type NotificationPermissionState,
  type OnboardingInput,
  type ReminderPreferences,
} from '@/domain/models';
import { AppDataContext } from '@/state/app-data-context';

const initialHabits = HABIT_LIBRARY.map((habit, position) =>
  createHabitFromDefinition(habit, false, position),
);

const INITIAL_WEB_SNAPSHOT: AppSnapshot = {
  profile: {
    onboardingComplete: false,
    name: '',
    priorities: [],
    mobilityPreference: 'seated_or_standing',
    workdays: [1, 2, 3, 4, 5],
    workdayStart: '08:30',
    workdayEnd: '17:30',
    lunchWindowStart: '12:30',
    lunchWindowEnd: '14:00',
    promptIntensity: 'gentle',
  },
  habits: initialHabits,
  todayPlan: null,
  progress: {
    activeMinutes: 0,
    sittingBreaks: 0,
    totalCompletions: 0,
    recentDays: createRecentLocalDates(new Date()).map((localDate) => ({
      localDate,
      completionCount: 0,
    })),
  },
  reminderPreferences: {
    enabled: false,
    supportLevel: 'gentle',
    quietHoursStart: '20:30',
    quietHoursEnd: '08:00',
    pausedUntil: null,
    enabledFamilies: ['workday', 'lunch', 'afternoon'],
  },
};

function createWebDailyPlan(activeHabits: Habit[], energyLevel: EnergyLevel): DailyPlan {
  const planDraft = createDailyPlanDraft(activeHabits, energyLevel);
  return {
    id: 'web-today-plan',
    localDate: formatLocalDate(new Date()),
    energyLevel,
    status: 'active',
    items: planDraft.flatMap((draftItem, index) => {
      const habit = activeHabits.find((candidate) => candidate.id === draftItem.habitId);
      return habit
        ? [{
            id: `web-plan-item-${index}`,
            habit,
            targetLevel: draftItem.targetLevel,
            status: 'pending' as const,
            completedAt: null,
          }]
        : [];
    }),
  };
}

/** Provides a no-account browser preview that mirrors native behavior without persisting health data. */
export function AppDataProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState(INITIAL_WEB_SNAPSHOT);

  const completeOnboarding = useCallback(async (input: OnboardingInput) => {
    const starterIds = new Set(selectStarterHabits(input.priorities).map((habit) => habit.id));
    const habits = HABIT_LIBRARY.map((definition, position) =>
      createHabitFromDefinition(definition, starterIds.has(definition.id), position),
    );
    setSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      profile: { ...input, onboardingComplete: true, promptIntensity: 'gentle' },
      habits,
      todayPlan: createWebDailyPlan(habits, 'steady'),
    }));
  }, []);

  const updateTodayEnergy = useCallback(async (energyLevel: EnergyLevel) => {
    setSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      todayPlan: currentSnapshot.todayPlan
        ? {
            ...currentSnapshot.todayPlan,
            energyLevel,
            items: currentSnapshot.todayPlan.items.map((item) => ({
              ...item,
              targetLevel:
                item.status === 'pending'
                  ? selectTargetLevelForEnergy(energyLevel)
                  : item.targetLevel,
            })),
          }
        : null,
    }));
  }, []);

  /** Updates the preview's plan and cumulative metrics together so the Journey tab responds immediately. */
  const completePlanItem = useCallback(async (planItemId: string) => {
    setSnapshot((currentSnapshot) => {
      const completedItem = currentSnapshot.todayPlan?.items.find(
        (item) => item.id === planItemId && item.status === 'pending',
      );
      if (!completedItem || !currentSnapshot.todayPlan) return currentSnapshot;

      const localDate = formatLocalDate(new Date());
      const completedAt = new Date().toISOString();
      const updatedItems = currentSnapshot.todayPlan.items.map((item) =>
        item.id === planItemId ? { ...item, status: 'complete' as const, completedAt } : item,
      );
      const allItemsComplete = updatedItems.every((item) => item.status === 'complete');

      return {
        ...currentSnapshot,
        todayPlan: {
          ...currentSnapshot.todayPlan,
          items: updatedItems,
          status: allItemsComplete ? 'complete' : 'active',
        },
        progress: {
          activeMinutes:
            currentSnapshot.progress.activeMinutes +
            estimateCompletionMinutes(completedItem.habit, completedItem.targetLevel),
          sittingBreaks:
            currentSnapshot.progress.sittingBreaks +
            (completedItem.habit.category === 'sitting' ||
            completedItem.habit.category === 'mobility'
              ? 1
              : 0),
          totalCompletions: currentSnapshot.progress.totalCompletions + 1,
          recentDays: currentSnapshot.progress.recentDays.map((day) =>
            day.localDate === localDate
              ? { ...day, completionCount: day.completionCount + 1 }
              : day,
          ),
        },
      };
    });
  }, []);

  const updateHabitActivation = useCallback(
    async (habitId: string, shouldBeActive: boolean) => {
      const activeCount = snapshot.habits.filter((habit) => habit.isActive).length;
      if (shouldBeActive && activeCount >= 3) {
        return { updated: false, message: 'Keep no more than three active habits at a time.' };
      }
      setSnapshot((currentSnapshot) => ({
        ...currentSnapshot,
        habits: currentSnapshot.habits.map((habit) =>
          habit.id === habitId ? { ...habit, isActive: shouldBeActive } : habit,
        ),
      }));
      return { updated: true };
    },
    [snapshot.habits],
  );

  const requestReminderPermissionAndEnable = useCallback(async () => (
    'unavailable' as NotificationPermissionState
  ), []);

  const saveReminderPreferences = useCallback(async (preferences: ReminderPreferences) => {
    setSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      reminderPreferences: { ...preferences, enabled: false },
    }));
  }, []);

  const pauseRemindersForToday = useCallback(async () => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    setSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      reminderPreferences: {
        ...currentSnapshot.reminderPreferences,
        pausedUntil: endOfToday.toISOString(),
      },
    }));
  }, []);

  const setRemindersEnabled = useCallback(async (_enabled: boolean) => {
    setSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      reminderPreferences: { ...currentSnapshot.reminderPreferences, enabled: false },
    }));
  }, []);

  const contextValue = useMemo(
    () => ({
      ...snapshot,
      isLoading: false,
      errorMessage: null,
      notificationPermissionState: 'unavailable' as const,
      scheduledReminderCount: 0,
      nextReminderAt: null,
      isReminderSyncing: false,
      reminderErrorMessage: null,
      completeOnboarding,
      updateTodayEnergy,
      completePlanItem,
      updateHabitActivation,
      requestReminderPermissionAndEnable,
      saveReminderPreferences,
      pauseRemindersForToday,
      setRemindersEnabled,
    }),
    [
      snapshot,
      completeOnboarding,
      updateTodayEnergy,
      completePlanItem,
      updateHabitActivation,
      requestReminderPermissionAndEnable,
      saveReminderPreferences,
      pauseRemindersForToday,
      setRemindersEnabled,
    ],
  );

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>;
}
