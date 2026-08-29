import { createContext, useContext } from 'react';

import {
  type AppSnapshot,
  type EnergyLevel,
  type NotificationPermissionState,
  type OnboardingInput,
  type ReminderPreferences,
} from '@/domain/models';

export type HabitActivationResult = {
  updated: boolean;
  message?: string;
};

export type AppDataContextValue = AppSnapshot & {
  isLoading: boolean;
  errorMessage: string | null;
  notificationPermissionState: NotificationPermissionState;
  scheduledReminderCount: number;
  nextReminderAt: string | null;
  isReminderSyncing: boolean;
  reminderErrorMessage: string | null;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  updateTodayEnergy: (energyLevel: EnergyLevel) => Promise<void>;
  completePlanItem: (planItemId: string) => Promise<void>;
  updateHabitActivation: (
    habitId: string,
    shouldBeActive: boolean,
  ) => Promise<HabitActivationResult>;
  requestReminderPermissionAndEnable: () => Promise<NotificationPermissionState>;
  saveReminderPreferences: (preferences: ReminderPreferences) => Promise<void>;
  pauseRemindersForToday: () => Promise<void>;
  setRemindersEnabled: (enabled: boolean) => Promise<void>;
};

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData() {
  const contextValue = useContext(AppDataContext);
  if (!contextValue) {
    throw new Error('useAppData must be used inside AppDataProvider.');
  }
  return contextValue;
}
