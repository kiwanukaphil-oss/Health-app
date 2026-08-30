import { type SQLiteDatabase, useSQLiteContext } from 'expo-sqlite';
import { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  completeStoredHabitFromPrompt,
  completeStoredOnboarding,
  completeStoredPlanItem,
  DEFAULT_REMINDER_PREFERENCES,
  deleteStoredLocalData,
  loadBadTimeCounts,
  loadAppSnapshot,
  loadPortableDataExport,
  recordStoredPromptDelivery,
  recordStoredPromptResponse,
  replaceStoredReminderSchedule,
  resolveStoredAdaptation,
  saveStoredWeeklyReflection,
  storeScheduledReminder,
  updateStoredHabitActivation,
  updateStoredProfileAndRoutine,
  updateStoredReminderPreferences,
  updateStoredTodayEnergy,
} from '@/data/repositories/little-gains-repository';
import { createDeferredReminderDate, createReminderSchedule } from '@/domain/reminder-scheduler';
import {
  type AdaptationDecision,
  type AppSnapshot,
  type EnergyLevel,
  type NotificationPermissionState,
  type OnboardingInput,
  type PlannedReminder,
  type ProfileUpdateInput,
  type ReminderPreferences,
  type ReminderSupportLevel,
  type WeeklyReflectionInput,
} from '@/domain/models';
import {
  getPromptResponseForReminderAction,
  opensReminderMoreChoices,
  REMINDER_ACTIONS,
  type ReminderMoreDecision,
} from '@/domain/reminder-actions';
import {
  addReminderDeliveryListener,
  addReminderResponseListener,
  cancelScheduledReminderNotifications,
  clearLastReminderResponse,
  dismissPresentedReminderNotification,
  getLastReminderResponse,
  getReminderPermissionState,
  getScheduledReminderSummary,
  initializeReminderNotifications,
  type ReminderNotificationResponse,
  requestReminderPermission,
  schedulePlannedReminder,
} from '@/services/reminder-notifications';
import { sharePortableLocalData } from '@/services/local-data-portability';
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
  reminderPreferences: DEFAULT_REMINDER_PREFERENCES,
  latestWeeklyReflection: null,
  adaptationSuggestion: null,
  journeyInsights: [],
};

type ReminderRuntimeState = {
  permissionState: NotificationPermissionState;
  scheduledCount: number;
  nextReminderAt: string | null;
  isSyncing: boolean;
  errorMessage: string | null;
};

const INITIAL_REMINDER_RUNTIME: ReminderRuntimeState = {
  permissionState: 'undetermined',
  scheduledCount: 0,
  nextReminderAt: null,
  isSyncing: false,
  errorMessage: null,
};

/** Reconciles the operating-system queue from encrypted preferences instead of trusting stale identifiers. */
async function reconcileNativeReminderSchedule(
  database: SQLiteDatabase,
  snapshot: AppSnapshot,
) {
  const permissionState = await getReminderPermissionState();
  if (!snapshot.reminderPreferences.enabled || permissionState !== 'granted') {
    await cancelScheduledReminderNotifications();
    await replaceStoredReminderSchedule(database, []);
    return { permissionState, scheduledCount: 0, nextReminderAt: null };
  }

  await initializeReminderNotifications();
  const badTimeCounts = await loadBadTimeCounts(database);
  const plannedReminders = createReminderSchedule({
    now: new Date(),
    profile: snapshot.profile,
    habits: snapshot.habits,
    todayPlan: snapshot.todayPlan,
    preferences: snapshot.reminderPreferences,
    badTimeCounts,
  });
  await cancelScheduledReminderNotifications();

  try {
    const storedReminders = [];
    for (const reminder of plannedReminders) {
      const notificationIdentifier = await schedulePlannedReminder(reminder);
      storedReminders.push({ ...reminder, notificationIdentifier });
    }
    await replaceStoredReminderSchedule(database, storedReminders);
    const summary = await getScheduledReminderSummary();
    return { permissionState, scheduledCount: summary.count, nextReminderAt: summary.nextReminderAt };
  } catch (error) {
    await cancelScheduledReminderNotifications();
    await replaceStoredReminderSchedule(database, []);
    throw error;
  }
}

/** Bridges screens to encrypted repositories and reloads a coherent snapshot after every write. */
export function AppDataProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const [snapshot, setSnapshot] = useState<AppSnapshot>(INITIAL_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reminderRuntime, setReminderRuntime] = useState(INITIAL_REMINDER_RUNTIME);
  const [pendingReminderResponse, setPendingReminderResponse] =
    useState<ReminderNotificationResponse | null>(null);
  const handledResponseKeys = useRef(new Set<string>());

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

  const reminderScheduleKey = useMemo(
    () => JSON.stringify({
      profile: snapshot.profile,
      activeHabitIds: snapshot.habits.filter((habit) => habit.isActive).map((habit) => habit.id),
      preferences: snapshot.reminderPreferences,
    }),
    [snapshot.profile, snapshot.habits, snapshot.reminderPreferences],
  );

  /** Keeps the native queue aligned after launch, preference changes, restarts, or timezone refreshes. */
  useEffect(() => {
    if (isLoading) return;
    let isMounted = true;
    Promise.resolve()
      .then(() => {
        if (isMounted) {
          setReminderRuntime((current) => ({ ...current, isSyncing: true, errorMessage: null }));
        }
        return reconcileNativeReminderSchedule(database, snapshot);
      })
      .then((result) => {
        if (isMounted) setReminderRuntime({ ...result, isSyncing: false, errorMessage: null });
      })
      .catch((error: unknown) => {
        console.error('Little Gains could not reconcile local reminders.', error);
        if (isMounted) {
          setReminderRuntime((current) => ({
            ...current,
            isSyncing: false,
            errorMessage: 'Reminders could not be prepared. Your habit plan is still available.',
          }));
        }
      });
    return () => {
      isMounted = false;
    };
  }, [database, isLoading, reminderScheduleKey, snapshot]);

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

  const saveProfileChanges = useCallback(
    async (
      input: ProfileUpdateInput,
      supportLevel: ReminderSupportLevel,
      resetStarterPlan: boolean,
    ) => {
      await updateStoredProfileAndRoutine(database, input, supportLevel, resetStarterPlan);
      await refreshAppSnapshot();
    },
    [database, refreshAppSnapshot],
  );

  const saveWeeklyReflection = useCallback(
    async (input: WeeklyReflectionInput) => {
      await saveStoredWeeklyReflection(database, input, snapshot.reminderPreferences.supportLevel);
      await refreshAppSnapshot();
    },
    [database, refreshAppSnapshot, snapshot.reminderPreferences.supportLevel],
  );

  const resolveAdaptation = useCallback(
    async (decision: AdaptationDecision) => {
      if (!snapshot.adaptationSuggestion) return;
      await resolveStoredAdaptation(database, snapshot.adaptationSuggestion.weekStart, decision);
      await refreshAppSnapshot();
    },
    [database, refreshAppSnapshot, snapshot.adaptationSuggestion],
  );

  const requestReminderPermissionAndEnable = useCallback(async () => {
    const permissionState = await requestReminderPermission();
    setReminderRuntime((current) => ({ ...current, permissionState }));
    if (permissionState === 'granted') {
      await updateStoredReminderPreferences(database, {
        ...snapshot.reminderPreferences,
        enabled: true,
        pausedUntil: null,
      });
      await refreshAppSnapshot();
    }
    return permissionState;
  }, [database, refreshAppSnapshot, snapshot.reminderPreferences]);

  const saveReminderPreferences = useCallback(
    async (preferences: ReminderPreferences) => {
      await updateStoredReminderPreferences(database, preferences);
      await refreshAppSnapshot();
    },
    [database, refreshAppSnapshot],
  );

  const pauseRemindersForToday = useCallback(async () => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    await updateStoredReminderPreferences(database, {
      ...snapshot.reminderPreferences,
      pausedUntil: endOfToday.toISOString(),
    });
    await refreshAppSnapshot();
  }, [database, refreshAppSnapshot, snapshot.reminderPreferences]);

  const setRemindersEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled && reminderRuntime.permissionState !== 'granted') {
        await requestReminderPermissionAndEnable();
        return;
      }
      await updateStoredReminderPreferences(database, {
        ...snapshot.reminderPreferences,
        enabled,
        pausedUntil: enabled ? null : snapshot.reminderPreferences.pausedUntil,
      });
      await refreshAppSnapshot();
    },
    [
      database,
      refreshAppSnapshot,
      reminderRuntime.permissionState,
      requestReminderPermissionAndEnable,
      snapshot.reminderPreferences,
    ],
  );

  const exportLocalData = useCallback(async () => {
    const portableData = await loadPortableDataExport(database);
    return sharePortableLocalData(JSON.stringify(portableData, null, 2));
  }, [database]);

  /** Removes all user-owned rows only after the in-app confirmation and resets every runtime cache. */
  const deleteAllLocalData = useCallback(async () => {
    await cancelScheduledReminderNotifications();
    await deleteStoredLocalData(database);
    handledResponseKeys.current.clear();
    setPendingReminderResponse(null);
    setReminderRuntime({
      ...INITIAL_REMINDER_RUNTIME,
      permissionState: await getReminderPermissionState(),
    });
    await refreshAppSnapshot();
  }, [database, refreshAppSnapshot]);

  /** Applies one-tap notification choices idempotently and keeps deferred prompts inside allowed hours. */
  const applyReminderResponse = useCallback(async (response: ReminderNotificationResponse) => {
    if (!response.eventId) return;
    if (opensReminderMoreChoices(response.actionIdentifier)) {
      await dismissPresentedReminderNotification(response.eventId).catch(() => undefined);
      setPendingReminderResponse(response);
      return;
    }
    const promptResponse = getPromptResponseForReminderAction(response.actionIdentifier);
    if (!promptResponse) return;
    const responseKey = `${response.eventId}:${response.actionIdentifier}`;
    if (handledResponseKeys.current.has(responseKey)) return;
    handledResponseKeys.current.add(responseKey);

    await recordStoredPromptResponse(database, response.eventId, promptResponse);
    if (promptResponse === 'done' && response.habitId) {
      await completeStoredHabitFromPrompt(database, response.habitId);
      await refreshAppSnapshot();
    }
    if (
      (promptResponse === 'later' || promptResponse === 'bad_time') &&
      response.habitId &&
      response.family
    ) {
      const deferredDate = createDeferredReminderDate({
        now: new Date(),
        delayMinutes: promptResponse === 'later' ? 30 : 60,
        profile: snapshot.profile,
        preferences: snapshot.reminderPreferences,
      });
      if (deferredDate) {
        const deferredReminder: PlannedReminder = {
          eventId: `${response.eventId}_${promptResponse}_${deferredDate.getTime()}`,
          family: response.family,
          habitId: response.habitId,
          planItemId: response.planItemId,
          scheduledFor: deferredDate.toISOString(),
          title: response.title,
          body: promptResponse === 'later' ? 'Ready for the small version now?' : 'Trying a calmer time for this small win.',
        };
        const notificationIdentifier = await schedulePlannedReminder(deferredReminder);
        await storeScheduledReminder(database, { ...deferredReminder, notificationIdentifier });
      }
    }
    await dismissPresentedReminderNotification(response.eventId).catch(() => undefined);
    const summary = await getScheduledReminderSummary();
    setReminderRuntime((current) => ({
      ...current,
      scheduledCount: summary.count,
      nextReminderAt: summary.nextReminderAt,
    }));
  }, [database, refreshAppSnapshot, snapshot.profile, snapshot.reminderPreferences]);

  /** Converts the in-app follow-up choice back into the same idempotent response pipeline. */
  const resolvePendingReminderMoreChoice = useCallback(async (decision: ReminderMoreDecision) => {
    if (!pendingReminderResponse) return;
    const response = pendingReminderResponse;
    await applyReminderResponse({
      ...response,
      actionIdentifier:
        decision === 'bad_time' ? REMINDER_ACTIONS.badTime : REMINDER_ACTIONS.notToday,
    });
    setPendingReminderResponse(null);
  }, [applyReminderResponse, pendingReminderResponse]);

  const dismissPendingReminderMoreChoice = useCallback(() => {
    setPendingReminderResponse(null);
  }, []);

  /** Registers foreground delivery, live actions, and the most recent cold-start response once per snapshot. */
  useEffect(() => {
    const deliverySubscription = addReminderDeliveryListener((eventId) => {
      void recordStoredPromptDelivery(database, eventId);
    });
    const responseSubscription = addReminderResponseListener((response) => {
      void Promise.resolve()
        .then(() => applyReminderResponse(response))
        .finally(clearLastReminderResponse);
    });
    const lastResponse = getLastReminderResponse();
    if (lastResponse) {
      void Promise.resolve()
        .then(() => applyReminderResponse(lastResponse))
        .finally(clearLastReminderResponse);
    }
    return () => {
      deliverySubscription.remove();
      responseSubscription.remove();
    };
  }, [applyReminderResponse, database]);

  const contextValue = useMemo(
    () => ({
      ...snapshot,
      isLoading,
      errorMessage,
      notificationPermissionState: reminderRuntime.permissionState,
      scheduledReminderCount: reminderRuntime.scheduledCount,
      nextReminderAt: reminderRuntime.nextReminderAt,
      isReminderSyncing: reminderRuntime.isSyncing,
      reminderErrorMessage: reminderRuntime.errorMessage,
      pendingReminderMoreChoice: pendingReminderResponse
        ? { title: pendingReminderResponse.title, body: pendingReminderResponse.body }
        : null,
      completeOnboarding,
      updateTodayEnergy,
      completePlanItem,
      updateHabitActivation,
      saveProfileChanges,
      saveWeeklyReflection,
      resolveAdaptation,
      requestReminderPermissionAndEnable,
      saveReminderPreferences,
      pauseRemindersForToday,
      setRemindersEnabled,
      resolvePendingReminderMoreChoice,
      dismissPendingReminderMoreChoice,
      exportLocalData,
      deleteAllLocalData,
    }),
    [
      snapshot,
      isLoading,
      errorMessage,
      completeOnboarding,
      updateTodayEnergy,
      completePlanItem,
      updateHabitActivation,
      saveProfileChanges,
      saveWeeklyReflection,
      resolveAdaptation,
      reminderRuntime,
      pendingReminderResponse,
      requestReminderPermissionAndEnable,
      saveReminderPreferences,
      pauseRemindersForToday,
      setRemindersEnabled,
      resolvePendingReminderMoreChoice,
      dismissPendingReminderMoreChoice,
      exportLocalData,
      deleteAllLocalData,
    ],
  );

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>;
}
