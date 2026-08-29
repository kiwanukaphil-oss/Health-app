import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  type NotificationPermissionState,
  type PlannedReminder,
  type ReminderFamily,
} from '@/domain/models';

export const REMINDER_ACTIONS = {
  done: 'LITTLE_GAINS_DONE',
  later: 'LITTLE_GAINS_LATER',
  badTime: 'LITTLE_GAINS_BAD_TIME',
  notToday: 'LITTLE_GAINS_NOT_TODAY',
} as const;

export type ReminderNotificationResponse = {
  actionIdentifier: string;
  eventId: string | null;
  habitId: string | null;
  family: ReminderFamily | null;
  planItemId: string | null;
  title: string;
  body: string;
};

const REMINDER_CHANNEL_ID = 'little-gains-reminders';
const REMINDER_CATEGORY_ID = 'little_gains_actions';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.DEFAULT,
  }),
});

/** Creates the quiet Android channel and cross-platform actions before permission or scheduling. */
export async function initializeReminderNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Helpful reminders',
      description: 'Small workday movement and recovery prompts',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      enableVibrate: false,
      showBadge: false,
    });
  }
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
    { identifier: REMINDER_ACTIONS.done, buttonTitle: 'Done' },
    { identifier: REMINDER_ACTIONS.later, buttonTitle: 'Later' },
    { identifier: REMINDER_ACTIONS.badTime, buttonTitle: 'Bad time' },
    { identifier: REMINDER_ACTIONS.notToday, buttonTitle: 'Not today' },
  ]);
}

function mapPermissionState(
  settings: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState {
  if (
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return 'granted';
  }
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

export async function getReminderPermissionState() {
  return mapPermissionState(await Notifications.getPermissionsAsync());
}

export async function requestReminderPermission() {
  await initializeReminderNotifications();
  const settings = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  return mapPermissionState(settings);
}

export async function cancelScheduledReminderNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Schedules one date-based notification with enough local metadata to apply a chosen action. */
export async function schedulePlannedReminder(reminder: PlannedReminder) {
  return Notifications.scheduleNotificationAsync({
    identifier: reminder.eventId,
    content: {
      title: reminder.title,
      body: reminder.body,
      categoryIdentifier: REMINDER_CATEGORY_ID,
      sound: false,
      color: '#416B4B',
      data: {
        reminderEventId: reminder.eventId,
        habitId: reminder.habitId,
        reminderFamily: reminder.family,
        planItemId: reminder.planItemId,
        scheduledFor: reminder.scheduledFor,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(reminder.scheduledFor),
      channelId: REMINDER_CHANNEL_ID,
    },
  });
}

export async function getScheduledReminderSummary() {
  const requests = await Notifications.getAllScheduledNotificationsAsync();
  const dates = requests
    .map((request) => request.content.data?.scheduledFor)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((first, second) => first - second);
  return {
    count: requests.length,
    nextReminderAt: dates[0] ? new Date(dates[0]).toISOString() : null,
  };
}

function mapNotificationResponse(
  response: Notifications.NotificationResponse,
): ReminderNotificationResponse {
  const data = response.notification.request.content.data ?? {};
  return {
    actionIdentifier: response.actionIdentifier,
    eventId: typeof data.reminderEventId === 'string' ? data.reminderEventId : null,
    habitId: typeof data.habitId === 'string' ? data.habitId : null,
    family:
      data.reminderFamily === 'workday' ||
      data.reminderFamily === 'lunch' ||
      data.reminderFamily === 'afternoon'
        ? data.reminderFamily
        : null,
    planItemId: typeof data.planItemId === 'string' ? data.planItemId : null,
    title: response.notification.request.content.title ?? 'Little Gains',
    body: response.notification.request.content.body ?? 'A small action still counts.',
  };
}

export function addReminderResponseListener(
  listener: (response: ReminderNotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    listener(mapNotificationResponse(response));
  });
}

export function addReminderDeliveryListener(listener: (eventId: string) => void) {
  return Notifications.addNotificationReceivedListener((notification) => {
    const eventId = notification.request.content.data?.reminderEventId;
    if (typeof eventId === 'string') listener(eventId);
  });
}

export function getLastReminderResponse() {
  const response = Notifications.getLastNotificationResponse();
  return response ? mapNotificationResponse(response) : null;
}

export function clearLastReminderResponse() {
  Notifications.clearLastNotificationResponse();
}
