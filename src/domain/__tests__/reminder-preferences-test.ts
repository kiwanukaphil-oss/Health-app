import { describe, expect, it } from '@jest/globals';

import { preserveLiveReminderControls } from '@/domain/reminder-preferences';
import { type ReminderPreferences } from '@/domain/models';

const livePreferences: ReminderPreferences = {
  enabled: true,
  supportLevel: 'gentle',
  enabledFamilies: ['workday', 'lunch', 'afternoon'],
  quietHoursStart: '20:30',
  quietHoursEnd: '08:00',
  pausedUntil: '2026-08-30T20:59:59.999Z',
};

describe('preserveLiveReminderControls', () => {
  it('applies editable choices without restoring stale enabled or pause values', () => {
    const staleDraft: ReminderPreferences = {
      ...livePreferences,
      enabled: false,
      quietHoursStart: '00:00',
      quietHoursEnd: '23:59',
      pausedUntil: null,
    };

    expect(preserveLiveReminderControls(staleDraft, livePreferences)).toEqual({
      ...staleDraft,
      enabled: true,
      pausedUntil: livePreferences.pausedUntil,
    });
  });
});
