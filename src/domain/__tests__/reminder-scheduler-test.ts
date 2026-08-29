import { describe, expect, it } from '@jest/globals';

import { createDeferredReminderDate, createReminderSchedule } from '@/domain/reminder-scheduler';
import { createHabitFromDefinition, HABIT_LIBRARY } from '@/domain/habit-library';
import { type ReminderPreferences, type UserProfile } from '@/domain/models';

const profile: UserProfile = {
  onboardingComplete: true,
  name: 'Sam',
  priorities: ['sit_less', 'move_more'],
  mobilityPreference: 'seated_or_standing',
  workdays: [1, 2, 3, 4, 5],
  workdayStart: '08:30',
  workdayEnd: '17:30',
  lunchWindowStart: '12:30',
  lunchWindowEnd: '14:00',
  promptIntensity: 'gentle',
};

const activeHabits = HABIT_LIBRARY.map((definition, position) =>
  createHabitFromDefinition(definition, true, position),
);

const preferences: ReminderPreferences = {
  enabled: true,
  supportLevel: 'gentle',
  quietHoursStart: '20:30',
  quietHoursEnd: '08:00',
  pausedUntil: null,
  enabledFamilies: ['workday', 'lunch', 'afternoon'],
};

describe('createReminderSchedule', () => {
  it('enforces a gentle daily cap and keeps meeting cues manual', () => {
    const reminders = createReminderSchedule({
      now: new Date(2026, 7, 31, 7, 0),
      profile,
      habits: activeHabits,
      todayPlan: null,
      preferences,
      horizonDays: 1,
    });

    expect(reminders).toHaveLength(2);
    expect(reminders.map((reminder) => reminder.habitId)).not.toContain('meeting-reset');
    expect(reminders.map((reminder) => reminder.habitId)).not.toContain('close-work-strength');
  });

  it('shifts a reminder family after repeated bad-time feedback', () => {
    const baseline = createReminderSchedule({
      now: new Date(2026, 7, 31, 7, 0),
      profile,
      habits: activeHabits,
      todayPlan: null,
      preferences,
      horizonDays: 1,
    });
    const shifted = createReminderSchedule({
      now: new Date(2026, 7, 31, 7, 0),
      profile,
      habits: activeHabits,
      todayPlan: null,
      preferences,
      badTimeCounts: { workday: 2 },
      horizonDays: 1,
    });

    expect(new Date(shifted[0].scheduledFor).getTime()).toBe(
      new Date(baseline[0].scheduledFor).getTime() + 30 * 60 * 1000,
    );
  });

  it('does not schedule while reminders are paused', () => {
    const reminders = createReminderSchedule({
      now: new Date(2026, 7, 31, 7, 0),
      profile,
      habits: activeHabits,
      todayPlan: null,
      preferences: { ...preferences, pausedUntil: new Date(2026, 8, 1, 0, 0).toISOString() },
      horizonDays: 1,
    });

    expect(reminders).toEqual([]);
  });
});

describe('createDeferredReminderDate', () => {
  it('keeps later actions inside the work and quiet-hour boundaries', () => {
    expect(createDeferredReminderDate({
      now: new Date(2026, 7, 31, 16, 0),
      delayMinutes: 30,
      profile,
      preferences,
    })?.getHours()).toBe(16);

    expect(createDeferredReminderDate({
      now: new Date(2026, 7, 31, 17, 15),
      delayMinutes: 30,
      profile,
      preferences,
    })).toBeNull();
  });
});
