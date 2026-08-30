import { type PromptResponse } from '@/domain/models';

export const REMINDER_ACTIONS = {
  done: 'LITTLE_GAINS_DONE',
  later: 'LITTLE_GAINS_LATER',
  more: 'LITTLE_GAINS_MORE',
  badTime: 'LITTLE_GAINS_BAD_TIME',
  notToday: 'LITTLE_GAINS_NOT_TODAY',
} as const;

export type ReminderMoreDecision = Extract<PromptResponse, 'bad_time' | 'not_today'>;

const promptResponseByAction: Readonly<Record<string, PromptResponse | undefined>> = {
  [REMINDER_ACTIONS.done]: 'done',
  [REMINDER_ACTIONS.later]: 'later',
  [REMINDER_ACTIONS.badTime]: 'bad_time',
  [REMINDER_ACTIONS.notToday]: 'not_today',
};

export function getPromptResponseForReminderAction(actionIdentifier: string) {
  return promptResponseByAction[actionIdentifier];
}

export function opensReminderMoreChoices(actionIdentifier: string) {
  return actionIdentifier === REMINDER_ACTIONS.more;
}
