import { type ReminderPreferences } from '@/domain/models';

/** Keeps runtime controls authoritative while applying user-edited scheduling choices. */
export function preserveLiveReminderControls(
  draftPreferences: ReminderPreferences,
  livePreferences: ReminderPreferences,
): ReminderPreferences {
  return {
    ...draftPreferences,
    enabled: livePreferences.enabled,
    pausedUntil: livePreferences.pausedUntil,
  };
}
