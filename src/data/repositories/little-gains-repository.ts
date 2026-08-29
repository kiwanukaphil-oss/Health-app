import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { createDailyPlanDraft, createRecentLocalDates, estimateCompletionMinutes, formatLocalDate, selectTargetLevelForEnergy } from '@/domain/daily-planner';
import { createHabitFromDefinition, findHabitDefinition, HABIT_LIBRARY, selectStarterHabits } from '@/domain/habit-library';
import {
  createAdaptationSuggestion,
  createJourneyInsights,
  getLocalWeekStart,
} from '@/domain/personalization';
import {
  type AdaptationDecision,
  type AdaptationSuggestion,
  type AppSnapshot,
  type DailyPlan,
  type EnergyLevel,
  type GoalId,
  type Habit,
  type MobilityPreference,
  type OnboardingInput,
  type PlannedReminder,
  type ProfileUpdateInput,
  type ProgressSummary,
  type PromptResponse,
  type ReminderFamily,
  type ReminderPreferences,
  type TargetLevel,
  type UserProfile,
  type WeeklyReflection,
  type WeeklyReflectionInput,
} from '@/domain/models';

type PreferenceRow = {
  onboarding_complete: number;
  user_name: string;
  priorities_json: string;
  mobility_preference: MobilityPreference;
  workdays_json: string;
  workday_start: string;
  workday_end: string;
  lunch_window_start: string;
  lunch_window_end: string;
  prompt_intensity: UserProfile['promptIntensity'];
};

type HabitStateRow = {
  id: string;
  is_active: number;
  position: number;
};

type PlanRow = {
  id: string;
  local_date: string;
  energy_level: EnergyLevel | null;
  status: DailyPlan['status'];
};

type PlanItemRow = {
  id: string;
  habit_id: string;
  position: number;
  target_level: TargetLevel;
  status: 'pending' | 'complete' | 'skipped';
  completed_at: string | null;
};

type CompletionRow = {
  habit_id: string | null;
  completion_level: TargetLevel;
  completed_at: string;
};

type ReminderPreferenceRow = {
  reminders_enabled: number;
  reminder_support_level: ReminderPreferences['supportLevel'];
  quiet_hours_start: string;
  quiet_hours_end: string;
  reminder_families_json: string;
  reminders_paused_until: string | null;
};

type WeeklyReflectionRow = {
  week_start: string;
  reminder_feedback: WeeklyReflection['helpfulness'];
  energy_rating: number;
  created_at: string;
  difficulty_rating: WeeklyReflection['difficulty'];
  adjustment_choice: WeeklyReflection['adjustment'];
  suggestion_code: AdaptationSuggestion['code'];
  suggestion_reason: string;
  suggestion_status: AdaptationSuggestion['status'];
};

export type StoredScheduledReminder = PlannedReminder & {
  notificationIdentifier: string;
};

const DEFAULT_PROFILE: UserProfile = {
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
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enabled: false,
  supportLevel: 'gentle',
  quietHoursStart: '20:30',
  quietHoursEnd: '08:00',
  pausedUntil: null,
  enabledFamilies: ['workday', 'lunch', 'afternoon'],
};

function parseStoredArray<T>(storedValue: string, fallback: T[]) {
  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? (parsedValue as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export async function loadUserProfile(database: SQLiteDatabase): Promise<UserProfile> {
  const row = await database.getFirstAsync<PreferenceRow>(
    `SELECT onboarding_complete, user_name, priorities_json, mobility_preference,
      workdays_json, workday_start, workday_end, lunch_window_start, lunch_window_end,
      prompt_intensity
    FROM user_preferences WHERE id = 1;`,
  );

  if (!row) return DEFAULT_PROFILE;

  return {
    onboardingComplete: row.onboarding_complete === 1,
    name: row.user_name,
    priorities: parseStoredArray<GoalId>(row.priorities_json, []),
    mobilityPreference: row.mobility_preference,
    workdays: parseStoredArray<number>(row.workdays_json, DEFAULT_PROFILE.workdays),
    workdayStart: row.workday_start,
    workdayEnd: row.workday_end,
    lunchWindowStart: row.lunch_window_start,
    lunchWindowEnd: row.lunch_window_end,
    promptIntensity: row.prompt_intensity,
  };
}

export async function loadReminderPreferences(
  database: SQLiteDatabase,
): Promise<ReminderPreferences> {
  const row = await database.getFirstAsync<ReminderPreferenceRow>(
    `SELECT reminders_enabled, reminder_support_level, quiet_hours_start,
      quiet_hours_end, reminder_families_json, reminders_paused_until
    FROM user_preferences WHERE id = 1;`,
  );
  if (!row) return DEFAULT_REMINDER_PREFERENCES;

  return {
    enabled: row.reminders_enabled === 1,
    supportLevel: row.reminder_support_level,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    pausedUntil: row.reminders_paused_until,
    enabledFamilies: parseStoredArray<ReminderFamily>(
      row.reminder_families_json,
      DEFAULT_REMINDER_PREFERENCES.enabledFamilies,
    ),
  };
}

/** Persists the complete reminder contract together so scheduling never observes a partial update. */
export async function updateStoredReminderPreferences(
  database: SQLiteDatabase,
  preferences: ReminderPreferences,
) {
  await database.runAsync(
    `UPDATE user_preferences SET reminders_enabled = ?, reminder_support_level = ?,
      quiet_hours_start = ?, quiet_hours_end = ?, reminder_families_json = ?,
      reminders_paused_until = ?, updated_at = ? WHERE id = 1;`,
    preferences.enabled ? 1 : 0,
    preferences.supportLevel,
    preferences.quietHoursStart,
    preferences.quietHoursEnd,
    JSON.stringify(preferences.enabledFamilies),
    preferences.pausedUntil,
    new Date().toISOString(),
  );
}

export async function loadBadTimeCounts(database: SQLiteDatabase) {
  const rows = await database.getAllAsync<{ family: ReminderFamily; response_count: number }>(
    `SELECT family, COUNT(*) AS response_count FROM prompt_events
      WHERE response = 'bad_time' AND family IS NOT NULL
        AND scheduled_for >= datetime('now', '-14 days') GROUP BY family;`,
  );
  return Object.fromEntries(rows.map((row) => [row.family, row.response_count]));
}

/** Replaces only pending future metadata while preserving delivered prompts as neutral history. */
export async function replaceStoredReminderSchedule(
  database: SQLiteDatabase,
  reminders: readonly StoredScheduledReminder[],
) {
  const now = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `DELETE FROM prompt_events
        WHERE delivered_at IS NULL AND response IS NULL AND scheduled_for >= ?;`,
      now,
    );
    for (const reminder of reminders) {
      await database.runAsync(
        `INSERT INTO prompt_events (
          id, habit_id, scheduled_for, calendar_aware, created_at,
          notification_identifier, family, daily_plan_item_id
        ) VALUES (?, ?, ?, 0, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET scheduled_for = excluded.scheduled_for,
          notification_identifier = excluded.notification_identifier,
          daily_plan_item_id = excluded.daily_plan_item_id;`,
        reminder.eventId,
        reminder.habitId,
        reminder.scheduledFor,
        now,
        reminder.notificationIdentifier,
        reminder.family,
        reminder.planItemId,
      );
    }
  });
}

export async function storeScheduledReminder(
  database: SQLiteDatabase,
  reminder: StoredScheduledReminder,
) {
  await database.runAsync(
    `INSERT INTO prompt_events (
      id, habit_id, scheduled_for, calendar_aware, created_at,
      notification_identifier, family, daily_plan_item_id
    ) VALUES (?, ?, ?, 0, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET scheduled_for = excluded.scheduled_for,
      notification_identifier = excluded.notification_identifier;`,
    reminder.eventId,
    reminder.habitId,
    reminder.scheduledFor,
    new Date().toISOString(),
    reminder.notificationIdentifier,
    reminder.family,
    reminder.planItemId,
  );
}

export async function recordStoredPromptDelivery(database: SQLiteDatabase, eventId: string) {
  await database.runAsync(
    'UPDATE prompt_events SET delivered_at = COALESCE(delivered_at, ?) WHERE id = ?;',
    new Date().toISOString(),
    eventId,
  );
}

export async function recordStoredPromptResponse(
  database: SQLiteDatabase,
  eventId: string,
  response: PromptResponse,
) {
  await database.runAsync(
    `UPDATE prompt_events SET response = ?, delivered_at = COALESCE(delivered_at, ?)
      WHERE id = ?;`,
    response,
    new Date().toISOString(),
    eventId,
  );
}

/** Completes today's matching plan item when a reminder action represents a finished small win. */
export async function completeStoredHabitFromPrompt(
  database: SQLiteDatabase,
  habitId: string,
) {
  const localDate = formatLocalDate(new Date());
  const row = await database.getFirstAsync<{ id: string }>(
    `SELECT daily_plan_items.id FROM daily_plan_items
      INNER JOIN daily_plans ON daily_plans.id = daily_plan_items.daily_plan_id
      WHERE daily_plans.local_date = ? AND daily_plan_items.habit_id = ?
        AND daily_plan_items.status = 'pending' LIMIT 1;`,
    localDate,
    habitId,
  );
  if (row) await completeStoredPlanItem(database, row.id);
}

/** Persists onboarding once and seeds the three selected habits without replacing later user history. */
export async function completeStoredOnboarding(
  database: SQLiteDatabase,
  onboardingInput: OnboardingInput,
) {
  const now = new Date().toISOString();
  const starterHabits = selectStarterHabits(onboardingInput.priorities);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO user_preferences (
        id, workday_start, workday_end, lunch_window_start, lunch_window_end,
        prompt_intensity, color_scheme, created_at, updated_at, onboarding_complete,
        user_name, priorities_json, mobility_preference, workdays_json
      ) VALUES (1, ?, ?, ?, ?, 'gentle', 'system', ?, ?, 1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        workday_start = excluded.workday_start,
        workday_end = excluded.workday_end,
        lunch_window_start = excluded.lunch_window_start,
        lunch_window_end = excluded.lunch_window_end,
        updated_at = excluded.updated_at,
        onboarding_complete = 1,
        user_name = excluded.user_name,
        priorities_json = excluded.priorities_json,
        mobility_preference = excluded.mobility_preference,
        workdays_json = excluded.workdays_json;`,
      onboardingInput.workdayStart,
      onboardingInput.workdayEnd,
      onboardingInput.lunchWindowStart,
      onboardingInput.lunchWindowEnd,
      now,
      now,
      onboardingInput.name.trim(),
      JSON.stringify(onboardingInput.priorities),
      onboardingInput.mobilityPreference,
      JSON.stringify(onboardingInput.workdays),
    );

    for (const [position, habit] of starterHabits.entries()) {
      await database.runAsync(
        `INSERT INTO habits (
          id, title, category, cue_type, cue_detail, minimum_target_value,
          standard_target_value, bonus_target_value, target_unit, is_active,
          position, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET is_active = 1, position = excluded.position,
          updated_at = excluded.updated_at;`,
        habit.id,
        habit.title,
        habit.category,
        habit.cueType,
        habit.cueLabel,
        habit.minimumTargetValue,
        habit.standardTargetValue,
        habit.bonusTargetValue,
        habit.targetUnit,
        position,
        now,
        now,
      );
    }
  });
}

/** Saves editable routine choices atomically and optionally restores starter habits without touching history. */
export async function updateStoredProfileAndRoutine(
  database: SQLiteDatabase,
  input: ProfileUpdateInput,
  supportLevel: ReminderPreferences['supportLevel'],
  resetStarterPlan: boolean,
) {
  const now = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `UPDATE user_preferences SET user_name = ?, priorities_json = ?, mobility_preference = ?,
        workdays_json = ?, workday_start = ?, workday_end = ?, lunch_window_start = ?,
        lunch_window_end = ?, prompt_intensity = ?, reminder_support_level = ?, updated_at = ?
        WHERE id = 1;`,
      input.name.trim(),
      JSON.stringify(input.priorities),
      input.mobilityPreference,
      JSON.stringify(input.workdays),
      input.workdayStart,
      input.workdayEnd,
      input.lunchWindowStart,
      input.lunchWindowEnd,
      supportLevel,
      supportLevel,
      now,
    );
    if (!resetStarterPlan) return;

    await database.runAsync('UPDATE habits SET is_active = 0, updated_at = ?;', now);
    const starterHabits = selectStarterHabits(input.priorities);
    for (const [position, habit] of starterHabits.entries()) {
      await database.runAsync(
        `INSERT INTO habits (
          id, title, category, cue_type, cue_detail, minimum_target_value,
          standard_target_value, bonus_target_value, target_unit, is_active,
          position, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET is_active = 1, position = excluded.position,
          updated_at = excluded.updated_at;`,
        habit.id,
        habit.title,
        habit.category,
        habit.cueType,
        habit.cueLabel,
        habit.minimumTargetValue,
        habit.standardTargetValue,
        habit.bonusTargetValue,
        habit.targetUnit,
        position,
        now,
        now,
      );
    }
  });
}

/** Stores one reflection per local week and generates a visible recommendation from explicit answers. */
export async function saveStoredWeeklyReflection(
  database: SQLiteDatabase,
  input: WeeklyReflectionInput,
  currentSupportLevel: ReminderPreferences['supportLevel'],
) {
  const weekStart = getLocalWeekStart(new Date());
  const suggestion = createAdaptationSuggestion(weekStart, input, currentSupportLevel);
  const now = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO weekly_reflections (
      week_start, reminder_feedback, energy_rating, created_at, difficulty_rating,
      adjustment_choice, suggestion_code, suggestion_reason, suggestion_status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    ON CONFLICT(week_start) DO UPDATE SET reminder_feedback = excluded.reminder_feedback,
      energy_rating = excluded.energy_rating, difficulty_rating = excluded.difficulty_rating,
      adjustment_choice = excluded.adjustment_choice, suggestion_code = excluded.suggestion_code,
      suggestion_reason = excluded.suggestion_reason, suggestion_status = 'pending',
      updated_at = excluded.updated_at;`,
    weekStart,
    input.helpfulness,
    input.energyRating,
    now,
    input.difficulty,
    input.adjustment,
    suggestion.code,
    suggestion.reason,
    now,
  );
}

function createSuggestionTitle(code: AdaptationSuggestion['code']) {
  if (code === 'review_habits') return 'Try a different small win';
  if (code === 'keep_steady') return 'Keep the plan steady';
  if (code === 'gentle') return 'Use gentle reminder support';
  if (code === 'balanced') return 'Use balanced reminder support';
  return 'Use supportive reminders';
}

/** Loads the most recent reflection and its recommendation as one coherent, explainable state. */
export async function loadLatestWeeklyReflection(database: SQLiteDatabase) {
  const row = await database.getFirstAsync<WeeklyReflectionRow>(
    `SELECT week_start, reminder_feedback, energy_rating, created_at, difficulty_rating,
      adjustment_choice, suggestion_code, suggestion_reason, suggestion_status
      FROM weekly_reflections ORDER BY week_start DESC LIMIT 1;`,
  );
  if (!row || !row.reminder_feedback || !row.difficulty_rating || !row.adjustment_choice) {
    return { reflection: null, suggestion: null };
  }
  return {
    reflection: {
      weekStart: row.week_start,
      helpfulness: row.reminder_feedback,
      difficulty: row.difficulty_rating,
      energyRating: row.energy_rating,
      adjustment: row.adjustment_choice,
      createdAt: row.created_at,
    } satisfies WeeklyReflection,
    suggestion: row.suggestion_code && row.suggestion_reason
      ? {
          weekStart: row.week_start,
          code: row.suggestion_code,
          title: createSuggestionTitle(row.suggestion_code),
          reason: row.suggestion_reason,
          status: row.suggestion_status,
        } satisfies AdaptationSuggestion
      : null,
  };
}

/** Records the user's adaptation decision and applies only an explicitly accepted reminder level. */
export async function resolveStoredAdaptation(
  database: SQLiteDatabase,
  weekStart: string,
  decision: AdaptationDecision,
) {
  const row = await database.getFirstAsync<{ suggestion_code: AdaptationSuggestion['code'] }>(
    'SELECT suggestion_code FROM weekly_reflections WHERE week_start = ?;',
    weekStart,
  );
  await database.withTransactionAsync(async () => {
    if (
      decision === 'accepted' &&
      row &&
      ['gentle', 'balanced', 'supportive'].includes(row.suggestion_code)
    ) {
      await database.runAsync(
        `UPDATE user_preferences SET reminder_support_level = ?, prompt_intensity = ?, updated_at = ?
          WHERE id = 1;`,
        row.suggestion_code,
        row.suggestion_code,
        new Date().toISOString(),
      );
    }
    await database.runAsync(
      'UPDATE weekly_reflections SET suggestion_status = ?, updated_at = ? WHERE week_start = ?;',
      decision,
      new Date().toISOString(),
      weekStart,
    );
  });
}

/** Merges persisted activation state into the curated library so inactive choices remain discoverable. */
export async function loadHabitLibraryState(database: SQLiteDatabase) {
  const storedStates = await database.getAllAsync<HabitStateRow>(
    'SELECT id, is_active, position FROM habits ORDER BY position ASC;',
  );
  const statesByHabitId = new Map(storedStates.map((row) => [row.id, row]));

  return HABIT_LIBRARY.map((definition, libraryPosition) => {
    const storedState = statesByHabitId.get(definition.id);
    return createHabitFromDefinition(
      definition,
      storedState?.is_active === 1,
      storedState?.position ?? libraryPosition,
    );
  });
}

/** Enables or pauses one library habit while enforcing the intentionally small three-habit limit. */
export async function updateStoredHabitActivation(
  database: SQLiteDatabase,
  habitId: string,
  shouldBeActive: boolean,
) {
  const definition = findHabitDefinition(habitId);
  if (!definition) return false;

  const activeCountRow = await database.getFirstAsync<{ active_count: number }>(
    'SELECT COUNT(*) AS active_count FROM habits WHERE is_active = 1;',
  );
  if (shouldBeActive && (activeCountRow?.active_count ?? 0) >= 3) return false;

  const positionRow = await database.getFirstAsync<{ next_position: number }>(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM habits WHERE is_active = 1;',
  );
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO habits (
      id, title, category, cue_type, cue_detail, minimum_target_value,
      standard_target_value, bonus_target_value, target_unit, is_active,
      position, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET is_active = excluded.is_active,
      position = CASE WHEN excluded.is_active = 1 THEN excluded.position ELSE habits.position END,
      updated_at = excluded.updated_at;`,
    definition.id,
    definition.title,
    definition.category,
    definition.cueType,
    definition.cueLabel,
    definition.minimumTargetValue,
    definition.standardTargetValue,
    definition.bonusTargetValue,
    definition.targetUnit,
    shouldBeActive ? 1 : 0,
    positionRow?.next_position ?? 0,
    now,
    now,
  );

  return true;
}

/** Hydrates a stored plan with current library instructions while preserving its historical status. */
async function loadDailyPlanForDate(
  database: SQLiteDatabase,
  localDate: string,
  habits: readonly Habit[],
): Promise<DailyPlan | null> {
  const planRow = await database.getFirstAsync<PlanRow>(
    'SELECT id, local_date, energy_level, status FROM daily_plans WHERE local_date = ?;',
    localDate,
  );
  if (!planRow) return null;

  const itemRows = await database.getAllAsync<PlanItemRow>(
    `SELECT id, habit_id, position, target_level, status, completed_at
      FROM daily_plan_items WHERE daily_plan_id = ? ORDER BY position ASC;`,
    planRow.id,
  );
  const habitsById = new Map(habits.map((habit) => [habit.id, habit]));

  return {
    id: planRow.id,
    localDate: planRow.local_date,
    energyLevel: planRow.energy_level ?? 'steady',
    status: planRow.status,
    items: itemRows.flatMap((itemRow) => {
      const habit = habitsById.get(itemRow.habit_id);
      if (!habit) return [];
      return [{
        id: itemRow.id,
        habit,
        targetLevel: itemRow.target_level,
        status: itemRow.status,
        completedAt: itemRow.completed_at,
      }];
    }),
  };
}

/** Creates today's plan exactly once, keeping repeat app launches stable and free from duplicate items. */
export async function loadOrCreateTodayPlan(
  database: SQLiteDatabase,
  habits: readonly Habit[],
): Promise<DailyPlan> {
  const localDate = formatLocalDate(new Date());
  const existingPlan = await loadDailyPlanForDate(database, localDate, habits);
  if (existingPlan) return existingPlan;

  const energyLevel: EnergyLevel = 'steady';
  const planId = Crypto.randomUUID();
  const planDraft = createDailyPlanDraft(habits, energyLevel);
  const now = new Date().toISOString();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO daily_plans (id, local_date, energy_level, status, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?);`,
      planId,
      localDate,
      energyLevel,
      now,
      now,
    );
    for (const planItem of planDraft) {
      await database.runAsync(
        `INSERT INTO daily_plan_items
          (id, daily_plan_id, habit_id, position, target_level, status)
          VALUES (?, ?, ?, ?, ?, 'pending');`,
        Crypto.randomUUID(),
        planId,
        planItem.habitId,
        planItem.position,
        planItem.targetLevel,
      );
    }
  });

  const createdPlan = await loadDailyPlanForDate(database, localDate, habits);
  if (!createdPlan) throw new Error('Today plan was not available after creation.');
  return createdPlan;
}

/** Re-sizes only pending actions, so completed work remains an accurate record of what the user did. */
export async function updateStoredTodayEnergy(
  database: SQLiteDatabase,
  energyLevel: EnergyLevel,
) {
  const localDate = formatLocalDate(new Date());
  const targetLevel = selectTargetLevelForEnergy(energyLevel);
  const now = new Date().toISOString();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      'UPDATE daily_plans SET energy_level = ?, updated_at = ? WHERE local_date = ?;',
      energyLevel,
      now,
      localDate,
    );
    await database.runAsync(
      `UPDATE daily_plan_items SET target_level = ?
        WHERE daily_plan_id = (SELECT id FROM daily_plans WHERE local_date = ?)
          AND status = 'pending';`,
      targetLevel,
      localDate,
    );
  });
}

/** Records completion idempotently and closes the day when all minimum actions are finished. */
export async function completeStoredPlanItem(database: SQLiteDatabase, planItemId: string) {
  const itemRow = await database.getFirstAsync<{
    habit_id: string;
    target_level: TargetLevel;
    daily_plan_id: string;
    status: string;
  }>(
    `SELECT habit_id, target_level, daily_plan_id, status
      FROM daily_plan_items WHERE id = ?;`,
    planItemId,
  );
  if (!itemRow || itemRow.status === 'complete') return;

  const completedAt = new Date().toISOString();
  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `UPDATE daily_plan_items SET status = 'complete', completed_at = ? WHERE id = ?;`,
      completedAt,
      planItemId,
    );
    await database.runAsync(
      `INSERT OR IGNORE INTO habit_completions
        (id, habit_id, daily_plan_item_id, completion_level, completed_at)
        VALUES (?, ?, ?, ?, ?);`,
      `completion-${planItemId}`,
      itemRow.habit_id,
      planItemId,
      itemRow.target_level,
      completedAt,
    );
    await database.runAsync(
      `UPDATE daily_plans SET status = 'complete', updated_at = ?
        WHERE id = ? AND NOT EXISTS (
          SELECT 1 FROM daily_plan_items WHERE daily_plan_id = ? AND status = 'pending'
        );`,
      completedAt,
      itemRow.daily_plan_id,
      itemRow.daily_plan_id,
    );
  });
}

/** Aggregates only completed actions, keeping missed days neutral and never subtracting prior progress. */
export async function loadProgressSummary(database: SQLiteDatabase): Promise<ProgressSummary> {
  const completionRows = await database.getAllAsync<CompletionRow>(
    `SELECT habit_id, completion_level, completed_at
      FROM habit_completions ORDER BY completed_at ASC;`,
  );
  const recentLocalDates = createRecentLocalDates(new Date());
  const completionCounts = new Map(recentLocalDates.map((localDate) => [localDate, 0]));
  let activeMinutes = 0;
  let sittingBreaks = 0;

  for (const completion of completionRows) {
    const habitDefinition = completion.habit_id
      ? findHabitDefinition(completion.habit_id)
      : undefined;
    if (habitDefinition) {
      const habit = createHabitFromDefinition(habitDefinition, true, 0);
      activeMinutes += estimateCompletionMinutes(habit, completion.completion_level);
      if (habit.category === 'sitting' || habit.category === 'mobility') sittingBreaks += 1;
    }
    const localDate = formatLocalDate(new Date(completion.completed_at));
    if (completionCounts.has(localDate)) {
      completionCounts.set(localDate, (completionCounts.get(localDate) ?? 0) + 1);
    }
  }

  return {
    activeMinutes,
    sittingBreaks,
    totalCompletions: completionRows.length,
    recentDays: recentLocalDates.map((localDate) => ({
      localDate,
      completionCount: completionCounts.get(localDate) ?? 0,
    })),
  };
}

/** Loads the complete offline application state and creates a plan only after onboarding is complete. */
export async function loadAppSnapshot(database: SQLiteDatabase): Promise<AppSnapshot> {
  const profile = await loadUserProfile(database);
  const habits = await loadHabitLibraryState(database);
  const todayPlan = profile.onboardingComplete
    ? await loadOrCreateTodayPlan(database, habits)
    : null;
  const progress = await loadProgressSummary(database);
  const reminderPreferences = await loadReminderPreferences(database);
  const weeklyState = await loadLatestWeeklyReflection(database);
  const journeyInsights = createJourneyInsights(progress, weeklyState.reflection);

  return {
    profile,
    habits,
    todayPlan,
    progress,
    reminderPreferences,
    latestWeeklyReflection: weeklyState.reflection,
    adaptationSuggestion: weeklyState.suggestion,
    journeyInsights,
  };
}
