export type DatabaseMigration = {
  version: number;
  description: string;
  statements: readonly string[];
};

export const databaseMigrations: readonly DatabaseMigration[] = [
  {
    version: 1,
    description: 'Create the local-first Little Gains foundation',
    statements: [
      `CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        workday_start TEXT NOT NULL DEFAULT '08:30',
        workday_end TEXT NOT NULL DEFAULT '17:30',
        lunch_window_start TEXT NOT NULL DEFAULT '12:30',
        lunch_window_end TEXT NOT NULL DEFAULT '14:00',
        prompt_intensity TEXT NOT NULL DEFAULT 'gentle'
          CHECK (prompt_intensity IN ('gentle', 'balanced', 'supportive', 'custom')),
        color_scheme TEXT NOT NULL DEFAULT 'system'
          CHECK (color_scheme IN ('system', 'light', 'dark')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        cue_type TEXT NOT NULL,
        cue_detail TEXT,
        minimum_target_value INTEGER NOT NULL CHECK (minimum_target_value > 0),
        standard_target_value INTEGER CHECK (standard_target_value > 0),
        bonus_target_value INTEGER CHECK (bonus_target_value > 0),
        target_unit TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS daily_plans (
        id TEXT PRIMARY KEY NOT NULL,
        local_date TEXT NOT NULL UNIQUE,
        energy_level TEXT CHECK (energy_level IN ('low', 'steady', 'strong', 'busy')),
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'complete', 'closed')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS daily_plan_items (
        id TEXT PRIMARY KEY NOT NULL,
        daily_plan_id TEXT NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
        habit_id TEXT REFERENCES habits(id) ON DELETE SET NULL,
        position INTEGER NOT NULL,
        target_level TEXT NOT NULL DEFAULT 'minimum'
          CHECK (target_level IN ('minimum', 'standard', 'bonus')),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'complete', 'skipped')),
        completed_at TEXT
      );`,
      `CREATE TABLE IF NOT EXISTS habit_completions (
        id TEXT PRIMARY KEY NOT NULL,
        habit_id TEXT REFERENCES habits(id) ON DELETE SET NULL,
        daily_plan_item_id TEXT REFERENCES daily_plan_items(id) ON DELETE SET NULL,
        completion_level TEXT NOT NULL
          CHECK (completion_level IN ('minimum', 'standard', 'bonus')),
        completed_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS prompt_events (
        id TEXT PRIMARY KEY NOT NULL,
        habit_id TEXT REFERENCES habits(id) ON DELETE SET NULL,
        scheduled_for TEXT NOT NULL,
        delivered_at TEXT,
        response TEXT CHECK (response IN ('done', 'later', 'not_today', 'bad_time', 'too_difficult')),
        calendar_aware INTEGER NOT NULL DEFAULT 0 CHECK (calendar_aware IN (0, 1)),
        created_at TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS calendar_busy_blocks (
        id TEXT PRIMARY KEY NOT NULL,
        provider_event_key TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        busy_status TEXT NOT NULL,
        synced_at TEXT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS calendar_busy_blocks_time_index
        ON calendar_busy_blocks(starts_at, ends_at);`,
      `CREATE TABLE IF NOT EXISTS weekly_reflections (
        week_start TEXT PRIMARY KEY NOT NULL,
        easiest_habit_id TEXT REFERENCES habits(id) ON DELETE SET NULL,
        reminder_feedback TEXT,
        energy_rating INTEGER CHECK (energy_rating BETWEEN 1 AND 5),
        created_at TEXT NOT NULL
      );`,
    ],
  },
  {
    version: 2,
    description: 'Add onboarding and personalization preferences',
    statements: [
      `ALTER TABLE user_preferences
        ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0
        CHECK (onboarding_complete IN (0, 1));`,
      `ALTER TABLE user_preferences
        ADD COLUMN user_name TEXT NOT NULL DEFAULT '';`,
      `ALTER TABLE user_preferences
        ADD COLUMN priorities_json TEXT NOT NULL DEFAULT '[]';`,
      `ALTER TABLE user_preferences
        ADD COLUMN mobility_preference TEXT NOT NULL DEFAULT 'seated_or_standing'
        CHECK (mobility_preference IN ('standing', 'seated_or_standing', 'seated'));`,
      `ALTER TABLE user_preferences
        ADD COLUMN workdays_json TEXT NOT NULL DEFAULT '[1,2,3,4,5]';`,
    ],
  },
  {
    version: 3,
    description: 'Add local reminder preferences and notification reconciliation metadata',
    statements: [
      `ALTER TABLE user_preferences
        ADD COLUMN reminders_enabled INTEGER NOT NULL DEFAULT 0
        CHECK (reminders_enabled IN (0, 1));`,
      `ALTER TABLE user_preferences
        ADD COLUMN reminder_support_level TEXT NOT NULL DEFAULT 'gentle'
        CHECK (reminder_support_level IN ('gentle', 'balanced', 'supportive'));`,
      `ALTER TABLE user_preferences
        ADD COLUMN quiet_hours_start TEXT NOT NULL DEFAULT '20:30';`,
      `ALTER TABLE user_preferences
        ADD COLUMN quiet_hours_end TEXT NOT NULL DEFAULT '08:00';`,
      `ALTER TABLE user_preferences
        ADD COLUMN reminder_families_json TEXT NOT NULL DEFAULT '["workday","lunch","afternoon"]';`,
      `ALTER TABLE user_preferences
        ADD COLUMN reminders_paused_until TEXT;`,
      `ALTER TABLE prompt_events ADD COLUMN notification_identifier TEXT;`,
      `ALTER TABLE prompt_events ADD COLUMN family TEXT
        CHECK (family IN ('workday', 'lunch', 'afternoon'));`,
      `ALTER TABLE prompt_events ADD COLUMN daily_plan_item_id TEXT
        REFERENCES daily_plan_items(id) ON DELETE SET NULL;`,
      `CREATE INDEX IF NOT EXISTS prompt_events_schedule_index
        ON prompt_events(scheduled_for, response);`,
    ],
  },
  {
    version: 4,
    description: 'Add explainable weekly reflection and adaptation metadata',
    statements: [
      `ALTER TABLE weekly_reflections ADD COLUMN difficulty_rating TEXT
        CHECK (difficulty_rating IN ('comfortable', 'manageable', 'hard'));`,
      `ALTER TABLE weekly_reflections ADD COLUMN adjustment_choice TEXT
        CHECK (adjustment_choice IN ('keep', 'less_support', 'more_support', 'different_habit'));`,
      `ALTER TABLE weekly_reflections ADD COLUMN suggestion_code TEXT
        CHECK (suggestion_code IN ('gentle', 'balanced', 'supportive', 'review_habits', 'keep_steady'));`,
      `ALTER TABLE weekly_reflections ADD COLUMN suggestion_reason TEXT;`,
      `ALTER TABLE weekly_reflections ADD COLUMN suggestion_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (suggestion_status IN ('pending', 'accepted', 'modified', 'dismissed'));`,
      `ALTER TABLE weekly_reflections ADD COLUMN updated_at TEXT;`,
    ],
  },
] as const;
