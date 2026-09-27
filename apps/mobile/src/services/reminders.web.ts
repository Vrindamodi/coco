// Web build of the reminders service (Metro picks *.web.ts on web).
// expo-notifications does not support scheduling on web, and importing it at
// all triggers push-token warnings, so this build is a no-op.

export interface ScheduleReminderInput {
  id: string;
  title: string;
  body?: string;
  scheduledAt: Date;
}

export async function scheduleReminder(
  _input: ScheduleReminderInput
): Promise<string | null> {
  return null;
}

export async function cancelReminder(_notificationId: string): Promise<void> {
  // no-op on web
}
