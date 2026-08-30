import {
  type NotificationPermissionState,
  type PlannedReminder,
  type ReminderFamily,
} from '@/domain/models';

export type ReminderNotificationResponse = {
  actionIdentifier: string;
  eventId: string | null;
  habitId: string | null;
  family: ReminderFamily | null;
  planItemId: string | null;
  title: string;
  body: string;
};

const unavailablePermission: NotificationPermissionState = 'unavailable';
const emptySubscription = { remove: () => undefined };

export async function initializeReminderNotifications() {}
export async function getReminderPermissionState() { return unavailablePermission; }
export async function requestReminderPermission() { return unavailablePermission; }
export async function cancelScheduledReminderNotifications() {}
export async function dismissPresentedReminderNotification(_eventId: string) {}
export async function schedulePlannedReminder(_reminder: PlannedReminder) { return ''; }
export async function getScheduledReminderSummary() {
  return { count: 0, nextReminderAt: null };
}
export function addReminderResponseListener(
  _listener: (response: ReminderNotificationResponse) => void,
) { return emptySubscription; }
export function addReminderDeliveryListener(_listener: (eventId: string) => void) {
  return emptySubscription;
}
export function getLastReminderResponse() { return null; }
export function clearLastReminderResponse() {}
