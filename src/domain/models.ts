export type EnergyLevel = 'low' | 'steady' | 'strong' | 'busy';
export type TargetLevel = 'minimum' | 'standard' | 'bonus';
export type PlanItemStatus = 'pending' | 'complete' | 'skipped';
export type GoalId = 'sit_less' | 'move_more' | 'mobility' | 'strength' | 'energy';
export type MobilityPreference = 'standing' | 'seated_or_standing' | 'seated';
export type HabitCategory = 'sitting' | 'walking' | 'mobility' | 'strength' | 'recovery';
export type TargetUnit = 'minutes' | 'repetitions' | 'breaths';
export type ReminderSupportLevel = 'gentle' | 'balanced' | 'supportive';
export type ReminderFamily = 'workday' | 'lunch' | 'afternoon';
export type NotificationPermissionState = 'undetermined' | 'granted' | 'denied' | 'unavailable';
export type PromptResponse = 'done' | 'later' | 'not_today' | 'bad_time';
export type ReflectionHelpfulness = 'helpful' | 'mixed' | 'not_helpful';
export type ReflectionDifficulty = 'comfortable' | 'manageable' | 'hard';
export type ReflectionAdjustment = 'keep' | 'less_support' | 'more_support' | 'different_habit';
export type AdaptationDecision = 'accepted' | 'modified' | 'dismissed';
export type AdaptationSuggestionCode = ReminderSupportLevel | 'review_habits' | 'keep_steady';

export type HabitDefinition = {
  id: string;
  title: string;
  category: HabitCategory;
  cueType: string;
  cueLabel: string;
  minimumTargetValue: number;
  standardTargetValue: number;
  bonusTargetValue: number;
  targetUnit: TargetUnit;
  instructions: readonly string[];
  seatedAlternative?: readonly string[];
  safetyNote: string;
};

export type Habit = HabitDefinition & {
  isActive: boolean;
  position: number;
};

export type DailyPlanItem = {
  id: string;
  habit: Habit;
  targetLevel: TargetLevel;
  status: PlanItemStatus;
  completedAt: string | null;
};

export type DailyPlan = {
  id: string;
  localDate: string;
  energyLevel: EnergyLevel;
  status: 'active' | 'complete' | 'closed';
  items: DailyPlanItem[];
};

export type UserProfile = {
  onboardingComplete: boolean;
  name: string;
  priorities: GoalId[];
  mobilityPreference: MobilityPreference;
  workdays: number[];
  workdayStart: string;
  workdayEnd: string;
  lunchWindowStart: string;
  lunchWindowEnd: string;
  promptIntensity: 'gentle' | 'balanced' | 'supportive' | 'custom';
};

export type OnboardingInput = Omit<UserProfile, 'onboardingComplete' | 'promptIntensity'>;

export type ProfileUpdateInput = Omit<UserProfile, 'onboardingComplete' | 'promptIntensity'>;

export type ProgressDay = {
  localDate: string;
  completionCount: number;
};

export type ProgressSummary = {
  activeMinutes: number;
  sittingBreaks: number;
  totalCompletions: number;
  recentDays: ProgressDay[];
};

export type WeeklyReflectionInput = {
  helpfulness: ReflectionHelpfulness;
  difficulty: ReflectionDifficulty;
  energyRating: number;
  adjustment: ReflectionAdjustment;
};

export type WeeklyReflection = WeeklyReflectionInput & {
  weekStart: string;
  createdAt: string;
};

export type AdaptationSuggestion = {
  weekStart: string;
  code: AdaptationSuggestionCode;
  title: string;
  reason: string;
  status: 'pending' | AdaptationDecision;
};

export type JourneyInsight = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
};

export type ReminderPreferences = {
  enabled: boolean;
  supportLevel: ReminderSupportLevel;
  quietHoursStart: string;
  quietHoursEnd: string;
  pausedUntil: string | null;
  enabledFamilies: ReminderFamily[];
};

export type PlannedReminder = {
  eventId: string;
  family: ReminderFamily;
  habitId: string;
  planItemId: string | null;
  scheduledFor: string;
  title: string;
  body: string;
};

export type AppSnapshot = {
  profile: UserProfile;
  habits: Habit[];
  todayPlan: DailyPlan | null;
  progress: ProgressSummary;
  reminderPreferences: ReminderPreferences;
  latestWeeklyReflection: WeeklyReflection | null;
  adaptationSuggestion: AdaptationSuggestion | null;
  journeyInsights: JourneyInsight[];
};
