import { createContext, useContext } from 'react';

import {
  type AdaptationDecision,
  type AppSnapshot,
  type EnergyLevel,
  type NotificationPermissionState,
  type OnboardingInput,
  type ProfileUpdateInput,
  type ReminderPreferences,
  type ReminderSupportLevel,
  type WeeklyReflectionInput,
} from '@/domain/models';
import { type ReminderMoreDecision } from '@/domain/reminder-actions';

export type HabitActivationResult = {
  updated: boolean;
  message?: string;
};

export type PendingReminderMoreChoice = {
  title: string;
  body: string;
};

export type AppDataContextValue = AppSnapshot & {
  isLoading: boolean;
  errorMessage: string | null;
  notificationPermissionState: NotificationPermissionState;
  scheduledReminderCount: number;
  nextReminderAt: string | null;
  isReminderSyncing: boolean;
  reminderErrorMessage: string | null;
  pendingReminderMoreChoice: PendingReminderMoreChoice | null;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  updateTodayEnergy: (energyLevel: EnergyLevel) => Promise<void>;
  completePlanItem: (planItemId: string) => Promise<void>;
  updateHabitActivation: (
    habitId: string,
    shouldBeActive: boolean,
  ) => Promise<HabitActivationResult>;
  saveProfileChanges: (
    input: ProfileUpdateInput,
    supportLevel: ReminderSupportLevel,
    resetStarterPlan: boolean,
  ) => Promise<void>;
  saveWeeklyReflection: (input: WeeklyReflectionInput) => Promise<void>;
  resolveAdaptation: (decision: AdaptationDecision) => Promise<void>;
  requestReminderPermissionAndEnable: () => Promise<NotificationPermissionState>;
  saveReminderPreferences: (preferences: ReminderPreferences) => Promise<void>;
  pauseRemindersForToday: () => Promise<void>;
  setRemindersEnabled: (enabled: boolean) => Promise<void>;
  resolvePendingReminderMoreChoice: (decision: ReminderMoreDecision) => Promise<void>;
  dismissPendingReminderMoreChoice: () => void;
  exportLocalData: () => Promise<boolean>;
  deleteAllLocalData: () => Promise<void>;
};

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData() {
  const contextValue = useContext(AppDataContext);
  if (!contextValue) {
    throw new Error('useAppData must be used inside AppDataProvider.');
  }
  return contextValue;
}
