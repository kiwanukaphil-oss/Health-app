import { describe, expect, it } from '@jest/globals';

import {
  createDailyPlanDraft,
  createRecentLocalDates,
  estimateCompletionMinutes,
  formatTargetMeasurement,
  formatLocalDate,
  resolveHabitTargetValue,
  selectTargetLevelForEnergy,
} from '@/domain/daily-planner';
import { createHabitFromDefinition, HABIT_LIBRARY } from '@/domain/habit-library';

describe('daily planner', () => {
  it('maps low-capacity days to minimums and other days to standard actions', () => {
    expect(selectTargetLevelForEnergy('low')).toBe('minimum');
    expect(selectTargetLevelForEnergy('busy')).toBe('minimum');
    expect(selectTargetLevelForEnergy('steady')).toBe('standard');
    expect(selectTargetLevelForEnergy('strong')).toBe('standard');
  });

  it('orders active habits, limits the plan to three, and ignores inactive habits', () => {
    const activeHabits = HABIT_LIBRARY.map((definition, index) =>
      createHabitFromDefinition(definition, index !== 1, 10 - index),
    );

    expect(createDailyPlanDraft(activeHabits, 'busy')).toEqual([
      { habitId: 'afternoon-breathing', position: 0, targetLevel: 'minimum' },
      { habitId: 'close-work-strength', position: 1, targetLevel: 'minimum' },
      { habitId: 'meeting-reset', position: 2, targetLevel: 'minimum' },
    ]);
  });

  it('resolves effort values and converts non-minute activities conservatively', () => {
    const strengthHabit = createHabitFromDefinition(HABIT_LIBRARY[3], true, 0);
    expect(resolveHabitTargetValue(strengthHabit, 'standard')).toBe(10);
    expect(estimateCompletionMinutes(strengthHabit, 'standard')).toBe(2);
  });

  it('uses singular target labels when the value is one', () => {
    expect(formatTargetMeasurement(1, 'minutes')).toBe('1 minute');
    expect(formatTargetMeasurement(2, 'minutes')).toBe('2 minutes');
    expect(formatTargetMeasurement(1, 'breaths')).toBe('1 breath');
  });

  it('uses local calendar dates and returns an inclusive seven-day sequence', () => {
    const referenceDate = new Date(2026, 7, 28, 12, 0, 0);
    expect(formatLocalDate(referenceDate)).toBe('2026-08-28');
    expect(createRecentLocalDates(referenceDate)).toEqual([
      '2026-08-22',
      '2026-08-23',
      '2026-08-24',
      '2026-08-25',
      '2026-08-26',
      '2026-08-27',
      '2026-08-28',
    ]);
  });
});
