import {
  type DailyPlan,
  type Habit,
  type PlannedReminder,
  type ReminderFamily,
  type ReminderPreferences,
  type UserProfile,
} from '@/domain/models';

export type ReminderTimingFeedback = Partial<Record<ReminderFamily, number>>;

type ReminderCandidate = Omit<PlannedReminder, 'eventId' | 'scheduledFor'> & {
  date: Date;
  slot: string;
};

const DAILY_SUPPORT_CAP: Readonly<Record<ReminderPreferences['supportLevel'], number>> = {
  gentle: 2,
  balanced: 3,
  supportive: 4,
};

const MAX_PLATFORM_DELIVERY_DRIFT_MINUTES = 60;

function parseClockMinutes(clockTime: string) {
  const [hour = 0, minute = 0] = clockTime.split(':').map(Number);
  return hour * 60 + minute;
}

function createDateAtMinutes(localDate: Date, minutesAfterMidnight: number) {
  const date = new Date(localDate);
  date.setHours(Math.floor(minutesAfterMidnight / 60), minutesAfterMidnight % 60, 0, 0);
  return date;
}

function formatEventDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function occursDuringQuietHours(date: Date, preferences: ReminderPreferences) {
  const currentMinute = date.getHours() * 60 + date.getMinutes();
  const quietStart = parseClockMinutes(preferences.quietHoursStart);
  const quietEnd = parseClockMinutes(preferences.quietHoursEnd);
  if (quietStart === quietEnd) return false;
  return quietStart < quietEnd
    ? currentMinute >= quietStart && currentMinute < quietEnd
    : currentMinute >= quietStart || currentMinute < quietEnd;
}

export function createDeferredReminderDate({
  now,
  delayMinutes,
  profile,
  preferences,
}: {
  now: Date;
  delayMinutes: number;
  profile: UserProfile;
  preferences: ReminderPreferences;
}) {
  const deferredDate = new Date(now.getTime() + delayMinutes * 60 * 1000);
  const latestDeliveryDate = new Date(
    deferredDate.getTime() + MAX_PLATFORM_DELIVERY_DRIFT_MINUTES * 60 * 1000,
  );
  const deferredMinute = deferredDate.getHours() * 60 + deferredDate.getMinutes();
  const latestDeliveryMinute = latestDeliveryDate.getHours() * 60 + latestDeliveryDate.getMinutes();
  const pausedUntil = preferences.pausedUntil ? new Date(preferences.pausedUntil).getTime() : 0;
  if (!profile.workdays.includes(deferredDate.getDay())) return null;
  if (
    deferredDate.getTime() <= pausedUntil ||
    occursDuringQuietHours(deferredDate, preferences) ||
    occursDuringQuietHours(latestDeliveryDate, preferences)
  ) {
    return null;
  }
  if (
    deferredMinute < parseClockMinutes(profile.workdayStart) ||
    deferredMinute > parseClockMinutes(profile.workdayEnd) ||
    latestDeliveryMinute > parseClockMinutes(profile.workdayEnd)
  ) {
    return null;
  }
  return deferredDate;
}

function findActiveHabit(habits: readonly Habit[], cueType: string) {
  return habits.find((habit) => habit.isActive && habit.cueType === cueType);
}

function createCandidate(
  localDate: Date,
  minutesAfterMidnight: number,
  family: ReminderFamily,
  habit: Habit,
  slot: string,
  body: string,
  todayPlan: DailyPlan | null,
): ReminderCandidate {
  const planItemId = todayPlan?.localDate === formatEventDate(localDate).replace(
    /^(\d{4})(\d{2})(\d{2})$/,
    '$1-$2-$3',
  )
    ? todayPlan.items.find((item) => item.habit.id === habit.id)?.id ?? null
    : null;

  return {
    date: createDateAtMinutes(localDate, minutesAfterMidnight),
    slot,
    family,
    habitId: habit.id,
    planItemId,
    title: habit.title,
    body,
  };
}

/** Builds a small set of explainable candidates from routine windows; meeting cues remain manual. */
function createDailyCandidates(
  localDate: Date,
  profile: UserProfile,
  habits: readonly Habit[],
  todayPlan: DailyPlan | null,
) {
  const candidates: ReminderCandidate[] = [];
  const workStart = parseClockMinutes(profile.workdayStart);
  const workEnd = parseClockMinutes(profile.workdayEnd);
  const lunchStart = parseClockMinutes(profile.lunchWindowStart);
  const lunchEnd = parseClockMinutes(profile.lunchWindowEnd);
  const startHabit = findActiveHabit(habits, 'work_start');
  const lunchHabit = findActiveHabit(habits, 'after_lunch');
  const afternoonHabit = findActiveHabit(habits, 'afternoon_pause');
  const closeHabit = findActiveHabit(habits, 'work_end');

  if (startHabit) {
    candidates.push(createCandidate(
      localDate,
      workStart + 10,
      'workday',
      startHabit,
      'start',
      'A one-minute stand is enough to begin gently.',
      todayPlan,
    ));
    candidates.push(createCandidate(
      localDate,
      Math.round((workStart + lunchStart) / 2),
      'workday',
      startHabit,
      'midmorning',
      'A brief stand can break up this sitting block.',
      todayPlan,
    ));
  }
  if (lunchHabit) {
    candidates.push(createCandidate(
      localDate,
      lunchEnd,
      'lunch',
      lunchHabit,
      'lunch',
      'If lunch is finished, a short walk counts completely.',
      todayPlan,
    ));
  }
  if (afternoonHabit) {
    candidates.push(createCandidate(
      localDate,
      Math.round((lunchEnd + workEnd) / 2),
      'afternoon',
      afternoonHabit,
      'afternoon',
      'Take a few unforced breaths before the next work block.',
      todayPlan,
    ));
  }
  if (closeHabit) {
    candidates.push(createCandidate(
      localDate,
      workEnd,
      'workday',
      closeHabit,
      'close',
      'Close the workday with the smallest strength option.',
      todayPlan,
    ));
  }

  return candidates;
}

/** Plans seven days of local prompts while enforcing workdays, pauses, quiet hours, and daily caps. */
export function createReminderSchedule({
  now,
  profile,
  habits,
  todayPlan,
  preferences,
  badTimeCounts = {},
  horizonDays = 7,
}: {
  now: Date;
  profile: UserProfile;
  habits: readonly Habit[];
  todayPlan: DailyPlan | null;
  preferences: ReminderPreferences;
  badTimeCounts?: ReminderTimingFeedback;
  horizonDays?: number;
}): PlannedReminder[] {
  if (!preferences.enabled || !profile.onboardingComplete) return [];
  const minimumFutureTime = now.getTime() + 5 * 60 * 1000;
  const pausedUntil = preferences.pausedUntil ? new Date(preferences.pausedUntil).getTime() : 0;
  const enabledFamilies = new Set(preferences.enabledFamilies);
  const dailyCap = DAILY_SUPPORT_CAP[preferences.supportLevel];
  const workStart = parseClockMinutes(profile.workdayStart);
  const workEnd = parseClockMinutes(profile.workdayEnd);
  const reminders: PlannedReminder[] = [];

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const localDate = new Date(now);
    localDate.setDate(now.getDate() + dayOffset);
    localDate.setHours(0, 0, 0, 0);
    if (!profile.workdays.includes(localDate.getDay())) continue;

    const eligibleCandidates = createDailyCandidates(localDate, profile, habits, todayPlan)
      .filter((candidate) => enabledFamilies.has(candidate.family))
      .map((candidate) => ({
        ...candidate,
        date: new Date(
          candidate.date.getTime() + ((badTimeCounts[candidate.family] ?? 0) >= 2 ? 30 * 60 * 1000 : 0),
        ),
      }))
      .filter((candidate) => candidate.date.getTime() > Math.max(minimumFutureTime, pausedUntil))
      .filter((candidate) => !occursDuringQuietHours(candidate.date, preferences))
      .filter((candidate) => {
        const candidateMinute = candidate.date.getHours() * 60 + candidate.date.getMinutes();
        const latestDeliveryDate = new Date(
          candidate.date.getTime() + MAX_PLATFORM_DELIVERY_DRIFT_MINUTES * 60 * 1000,
        );
        const latestDeliveryMinute = latestDeliveryDate.getHours() * 60 + latestDeliveryDate.getMinutes();
        return candidateMinute >= workStart &&
          latestDeliveryMinute <= workEnd &&
          !occursDuringQuietHours(latestDeliveryDate, preferences);
      })
      .sort((first, second) => first.date.getTime() - second.date.getTime());
    const seenHabitIds = new Set<string>();
    const primaryCandidates: ReminderCandidate[] = [];
    const additionalCandidates: ReminderCandidate[] = [];
    for (const candidate of eligibleCandidates) {
      if (seenHabitIds.has(candidate.habitId)) additionalCandidates.push(candidate);
      else {
        seenHabitIds.add(candidate.habitId);
        primaryCandidates.push(candidate);
      }
    }
    const dailyCandidates = [...primaryCandidates, ...additionalCandidates]
      .slice(0, dailyCap)
      .sort((first, second) => first.date.getTime() - second.date.getTime());

    for (const candidate of dailyCandidates) {
      const eventDate = formatEventDate(candidate.date);
      reminders.push({
        eventId: `reminder_${eventDate}_${candidate.family}_${candidate.habitId}_${candidate.slot}`,
        family: candidate.family,
        habitId: candidate.habitId,
        planItemId: candidate.planItemId,
        scheduledFor: candidate.date.toISOString(),
        title: candidate.title,
        body: candidate.body,
      });
    }
  }

  return reminders;
}
