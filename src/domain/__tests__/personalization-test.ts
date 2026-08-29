import { describe, expect, it } from '@jest/globals';

import {
  createAdaptationSuggestion,
  createJourneyInsights,
  createProfileChangePreview,
  getLocalWeekStart,
  validateProfileUpdate,
} from '@/domain/personalization';
import { type ProfileUpdateInput, type UserProfile } from '@/domain/models';

const profile: UserProfile = {
  onboardingComplete: true,
  name: 'Sam',
  priorities: ['sit_less'],
  mobilityPreference: 'seated_or_standing',
  workdays: [1, 2, 3, 4, 5],
  workdayStart: '08:30',
  workdayEnd: '17:30',
  lunchWindowStart: '12:30',
  lunchWindowEnd: '14:00',
  promptIntensity: 'gentle',
};

const draft: ProfileUpdateInput = { ...profile };

describe('personalization', () => {
  it('rejects impossible routine windows', () => {
    expect(validateProfileUpdate({ ...draft, lunchWindowEnd: '18:00' })).toBe(
      'Keep the lunch window inside the usual workday.',
    );
  });

  it('previews immediate reminders while preserving today habits', () => {
    expect(createProfileChangePreview(profile, { ...draft, workdayStart: '09:00' }, 'gentle', 'balanced', false)).toEqual({
      today: [
        "Today's habit plan and completed wins stay unchanged.",
        'Future reminder times refresh after saving; quiet hours still apply.',
      ],
      tomorrow: [
        'Your active habits continue unchanged.',
        'Your updated routine guides new daily plans and reminder windows.',
      ],
    });
  });

  it('uses explicit reflection choices for explainable suggestions', () => {
    const suggestion = createAdaptationSuggestion('2026-08-24', {
      helpfulness: 'mixed',
      difficulty: 'hard',
      energyRating: 2,
      adjustment: 'less_support',
    }, 'balanced');
    expect(suggestion.code).toBe('gentle');
    expect(suggestion.reason).toContain('asked for less support');
  });

  it('uses Monday as the local week boundary', () => {
    expect(getLocalWeekStart(new Date(2026, 7, 29, 12))).toBe('2026-08-24');
  });

  it('creates neutral cumulative insight cards', () => {
    const insights = createJourneyInsights({
      activeMinutes: 5,
      sittingBreaks: 2,
      totalCompletions: 3,
      recentDays: [
        { localDate: '2026-08-28', completionCount: 0 },
        { localDate: '2026-08-29', completionCount: 3 },
      ],
    }, null);
    expect(insights.map((insight) => insight.id)).toEqual(['active-days', 'sitting-breaks']);
    expect(insights[0].body).toContain('no streak');
  });
});
