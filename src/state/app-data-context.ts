import { createContext, useContext } from 'react';

import {
  type AppSnapshot,
  type EnergyLevel,
  type OnboardingInput,
} from '@/domain/models';

export type HabitActivationResult = {
  updated: boolean;
  message?: string;
};

export type AppDataContextValue = AppSnapshot & {
  isLoading: boolean;
  errorMessage: string | null;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  updateTodayEnergy: (energyLevel: EnergyLevel) => Promise<void>;
  completePlanItem: (planItemId: string) => Promise<void>;
  updateHabitActivation: (
    habitId: string,
    shouldBeActive: boolean,
  ) => Promise<HabitActivationResult>;
};

export const AppDataContext = createContext<AppDataContextValue | null>(null);

export function useAppData() {
  const contextValue = useContext(AppDataContext);
  if (!contextValue) {
    throw new Error('useAppData must be used inside AppDataProvider.');
  }
  return contextValue;
}
