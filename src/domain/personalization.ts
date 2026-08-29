import {
  type AdaptationSuggestion,
  type JourneyInsight,
  type ProfileUpdateInput,
  type ProgressSummary,
  type ReminderSupportLevel,
  type UserProfile,
  type WeeklyReflection,
  type WeeklyReflectionInput,
} from '@/domain/models';

export type ProfileChangePreview = {
  today: string[];
  tomorrow: string[];
};

const supportOrder: readonly ReminderSupportLevel[] = ['gentle', 'balanced', 'supportive'];

export function isValidClockTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Validates routine boundaries together so a saved profile cannot create impossible prompt windows. */
export function validateProfileUpdate(input: ProfileUpdateInput) {
  if (input.priorities.length === 0) return 'Choose at least one priority.';
  if (input.priorities.length > 3) return 'Choose no more than three priorities.';
  if (input.workdays.length === 0) return 'Choose at least one usual workday.';
  const times = [input.workdayStart, input.workdayEnd, input.lunchWindowStart, input.lunchWindowEnd];
  if (!times.every(isValidClockTime)) return 'Use 24-hour times such as 08:30.';
  if (input.workdayStart >= input.workdayEnd) return 'Work must end after it starts.';
  if (input.lunchWindowStart >= input.lunchWindowEnd) return 'Lunch must end after it starts.';
  if (input.lunchWindowStart < input.workdayStart || input.lunchWindowEnd > input.workdayEnd) {
    return 'Keep the lunch window inside the usual workday.';
  }
  return null;
}

/** Describes timing effects before saving, keeping today's plan stable while reminders refresh immediately. */
export function createProfileChangePreview(
  currentProfile: UserProfile,
  draft: ProfileUpdateInput,
  currentSupportLevel: ReminderSupportLevel,
  draftSupportLevel: ReminderSupportLevel,
  resetStarterPlan: boolean,
): ProfileChangePreview {
  const routineChanged = currentProfile.workdayStart !== draft.workdayStart ||
    currentProfile.workdayEnd !== draft.workdayEnd ||
    currentProfile.lunchWindowStart !== draft.lunchWindowStart ||
    currentProfile.lunchWindowEnd !== draft.lunchWindowEnd ||
    currentProfile.workdays.join(',') !== draft.workdays.join(',');
  const prioritiesChanged = currentProfile.priorities.join(',') !== draft.priorities.join(',');
  const today = ['Today\'s habit plan and completed wins stay unchanged.'];
  const tomorrow = [];
  if (routineChanged || currentSupportLevel !== draftSupportLevel) {
    today.push('Future reminder times refresh after saving; quiet hours still apply.');
  }
  if (resetStarterPlan) {
    tomorrow.push('Tomorrow uses a fresh three-habit starter plan based on your priorities.');
  } else if (prioritiesChanged) {
    tomorrow.push('Priorities update, but active habits stay unchanged until you choose them in Habits.');
  } else {
    tomorrow.push('Your active habits continue unchanged.');
  }
  tomorrow.push('Your updated routine guides new daily plans and reminder windows.');
  return { today, tomorrow };
}

export function getLocalWeekStart(referenceDate: Date) {
  const weekStart = new Date(referenceDate);
  const dayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dayOffset);
  const year = weekStart.getFullYear();
  const month = String(weekStart.getMonth() + 1).padStart(2, '0');
  const day = String(weekStart.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Turns explicit reflection choices into one explainable suggestion without hidden scoring. */
export function createAdaptationSuggestion(
  weekStart: string,
  reflection: WeeklyReflectionInput,
  currentSupportLevel: ReminderSupportLevel,
): AdaptationSuggestion {
  const currentIndex = supportOrder.indexOf(currentSupportLevel);
  if (reflection.adjustment === 'different_habit') {
    return {
      weekStart,
      code: 'review_habits',
      title: 'Try a different small win',
      reason: 'You explicitly asked for a different habit. Your current plan stays until you choose a replacement.',
      status: 'pending',
    };
  }
  if (reflection.adjustment === 'less_support' || reflection.helpfulness === 'not_helpful') {
    const nextLevel = supportOrder[Math.max(0, currentIndex - 1)];
    return {
      weekStart,
      code: nextLevel,
      title: nextLevel === currentSupportLevel ? 'Keep reminders gentle' : 'Use fewer reminders',
      reason: 'You asked for less support or said reminders were not helpful this week.',
      status: 'pending',
    };
  }
  if (reflection.adjustment === 'more_support') {
    const nextLevel = supportOrder[Math.min(supportOrder.length - 1, currentIndex + 1)];
    return {
      weekStart,
      code: nextLevel,
      title: nextLevel === currentSupportLevel ? 'Keep the current support level' : 'Try one more prompt window',
      reason: 'You explicitly asked for more support. Daily caps and quiet hours still apply.',
      status: 'pending',
    };
  }
  return {
    weekStart,
    code: 'keep_steady',
    title: 'Keep the plan steady',
    reason: 'You chose to keep things as they are, so nothing changes automatically.',
    status: 'pending',
  };
}

/** Produces cumulative, non-ranking insight cards from visible counts and the user's latest reflection. */
export function createJourneyInsights(
  progress: ProgressSummary,
  latestReflection: WeeklyReflection | null,
): JourneyInsight[] {
  const activeDays = progress.recentDays.filter((day) => day.completionCount > 0).length;
  const insights: JourneyInsight[] = [{
    id: 'active-days',
    eyebrow: 'YOUR RHYTHM',
    title: activeDays === 0 ? 'A fresh week is ready' : `${activeDays} day${activeDays === 1 ? '' : 's'} held a small win`,
    body: 'There is no streak to protect. Each completed action remains part of your total.',
  }];
  if (progress.sittingBreaks > 0) {
    insights.push({
      id: 'sitting-breaks',
      eyebrow: 'CUMULATIVE GAIN',
      title: `${progress.sittingBreaks} sitting break${progress.sittingBreaks === 1 ? '' : 's'} collected`,
      body: 'Short interruptions to sitting still count, even on low-energy days.',
    });
  }
  if (latestReflection) {
    insights.push({
      id: 'reflection',
      eyebrow: 'YOU SAID',
      title: latestReflection.difficulty === 'hard' ? 'This week felt difficult' : 'Your reflection is shaping the plan',
      body: 'Suggestions use only the choices you made and can always be changed or dismissed.',
    });
  }
  return insights.slice(0, 3);
}
