// Native (iOS/Android) reminder scheduling — web uses reminders.web.ts.
import * as Notifications from "expo-notifications";

export interface ScheduleReminderInput {
  id: string;
  title: string;
  body?: string;
  scheduledAt: Date;
}

// TODO: [reminders teammate] implement full notification scheduling and sync
export async function scheduleReminder(
  input: ScheduleReminderInput
): Promise<string | null> {
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body ?? "Time for your reminder",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.scheduledAt,
    },
  });

  return notificationId;
}

// TODO: [reminders teammate] cancel scheduled notification by id
export async function cancelReminder(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
