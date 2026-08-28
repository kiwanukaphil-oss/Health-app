import { useSQLiteContext } from 'expo-sqlite';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import {
  completeStoredOnboarding,
  completeStoredPlanItem,
  loadAppSnapshot,
  updateStoredHabitActivation,
  updateStoredTodayEnergy,
} from '@/data/repositories/little-gains-repository';
import {
  type AppSnapshot,
  type EnergyLevel,
  type OnboardingInput,
} from '@/domain/models';
import { AppDataContext } from '@/state/app-data-context';

const INITIAL_SNAPSHOT: AppSnapshot = {
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
  habits: [],
  todayPlan: null,
  progress: { activeMinutes: 0, sittingBreaks: 0, totalCompletions: 0, recentDays: [] },
};

/** Bridges screens to encrypted repositories and reloads a coherent snapshot after every write. */
export function AppDataProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const [snapshot, setSnapshot] = useState<AppSnapshot>(INITIAL_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshAppSnapshot = useCallback(async () => {
    try {
      const refreshedSnapshot = await loadAppSnapshot(database);
      setSnapshot(refreshedSnapshot);
      setErrorMessage(null);
    } catch (error) {
      console.error('Little Gains could not load local app data.', error);
      setErrorMessage('Your local data could not be loaded. Please close and reopen the app.');
    } finally {
      setIsLoading(false);
    }
  }, [database]);

  /** Loads once per database instance and ignores a late result if the provider has already unmounted. */
  useEffect(() => {
    let isMounted = true;
    loadAppSnapshot(database)
      .then((loadedSnapshot) => {
        if (!isMounted) return;
        setSnapshot(loadedSnapshot);
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        console.error('Little Gains could not load local app data.', error);
        if (isMounted) {
          setErrorMessage('Your local data could not be loaded. Please close and reopen the app.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [database]);

  const completeOnboarding = useCallback(
    async (input: OnboardingInput) => {
      await completeStoredOnboarding(database, input);
      await refreshAppSnapshot();
    },
    [database, refreshAppSnapshot],
  );

  const updateTodayEnergy = useCallback(
    async (energyLevel: EnergyLevel) => {
      await updateStoredTodayEnergy(database, energyLevel);
      await refreshAppSnapshot();
    },
    [database, refreshAppSnapshot],
  );

  const completePlanItem = useCallback(
    async (planItemId: string) => {
      await completeStoredPlanItem(database, planItemId);
      await refreshAppSnapshot();
    },
    [database, refreshAppSnapshot],
  );

  const updateHabitActivation = useCallback(
    async (habitId: string, shouldBeActive: boolean) => {
      const updated = await updateStoredHabitActivation(database, habitId, shouldBeActive);
      if (updated) await refreshAppSnapshot();
      return {
        updated,
        message: updated ? undefined : 'Keep no more than three active habits at a time.',
      };
    },
    [database, refreshAppSnapshot],
  );

  const contextValue = useMemo(
    () => ({
      ...snapshot,
      isLoading,
      errorMessage,
      completeOnboarding,
      updateTodayEnergy,
      completePlanItem,
      updateHabitActivation,
    }),
    [
      snapshot,
      isLoading,
      errorMessage,
      completeOnboarding,
      updateTodayEnergy,
      completePlanItem,
      updateHabitActivation,
    ],
  );

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>;
}
