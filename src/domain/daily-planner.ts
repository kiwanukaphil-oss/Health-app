import {
  type EnergyLevel,
  type Habit,
  type TargetLevel,
  type TargetUnit,
} from '@/domain/models';

export type DailyPlanDraftItem = {
  habitId: string;
  position: number;
  targetLevel: TargetLevel;
};

export function selectTargetLevelForEnergy(energyLevel: EnergyLevel): TargetLevel {
  return energyLevel === 'low' || energyLevel === 'busy' ? 'minimum' : 'standard';
}

export function resolveHabitTargetValue(habit: Habit, targetLevel: TargetLevel) {
  if (targetLevel === 'bonus') return habit.bonusTargetValue;
  if (targetLevel === 'standard') return habit.standardTargetValue;
  return habit.minimumTargetValue;
}

export function formatTargetUnit(targetValue: number, targetUnit: TargetUnit) {
  if (targetValue !== 1) return targetUnit;
  if (targetUnit === 'minutes') return 'minute';
  if (targetUnit === 'repetitions') return 'repetition';
  return 'breath';
}

export function formatTargetMeasurement(targetValue: number, targetUnit: TargetUnit) {
  return `${targetValue} ${formatTargetUnit(targetValue, targetUnit)}`;
}

export function estimateCompletionMinutes(habit: Habit, targetLevel: TargetLevel) {
  const targetValue = resolveHabitTargetValue(habit, targetLevel);
  if (habit.targetUnit === 'minutes') return targetValue;
  if (habit.targetUnit === 'repetitions') return Math.max(1, Math.ceil(targetValue / 5));
  return Math.max(1, Math.ceil(targetValue / 5));
}

/** Creates a predictable three-item plan while respecting user-selected active order and energy. */
export function createDailyPlanDraft(activeHabits: readonly Habit[], energyLevel: EnergyLevel) {
  const targetLevel = selectTargetLevelForEnergy(energyLevel);

  return activeHabits
    .filter((habit) => habit.isActive)
    .sort((leftHabit, rightHabit) => leftHabit.position - rightHabit.position)
    .slice(0, 3)
    .map<DailyPlanDraftItem>((habit, position) => ({
      habitId: habit.id,
      position,
      targetLevel,
    }));
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createRecentLocalDates(referenceDate: Date, dayCount = 7) {
  return Array.from({ length: dayCount }, (_, index) => {
    const localDate = new Date(referenceDate);
    localDate.setDate(referenceDate.getDate() - (dayCount - index - 1));
    return formatLocalDate(localDate);
  });
}
