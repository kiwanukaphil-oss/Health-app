import { describe, expect, it } from '@jest/globals';

import {
  getPromptResponseForReminderAction,
  opensReminderMoreChoices,
  REMINDER_ACTIONS,
} from '@/domain/reminder-actions';

describe('reminder notification actions', () => {
  it('maps direct actions to their stored responses', () => {
    expect(getPromptResponseForReminderAction(REMINDER_ACTIONS.done)).toBe('done');
    expect(getPromptResponseForReminderAction(REMINDER_ACTIONS.later)).toBe('later');
    expect(getPromptResponseForReminderAction(REMINDER_ACTIONS.badTime)).toBe('bad_time');
    expect(getPromptResponseForReminderAction(REMINDER_ACTIONS.notToday)).toBe('not_today');
  });

  it('reserves More for the in-app choice sheet', () => {
    expect(opensReminderMoreChoices(REMINDER_ACTIONS.more)).toBe(true);
    expect(getPromptResponseForReminderAction(REMINDER_ACTIONS.more)).toBeUndefined();
  });
});
