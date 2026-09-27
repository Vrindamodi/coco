import type { Reminder } from "@/types/api";

import { api } from "@/services/api";

export async function fetchTodayReminders(
  patientId: string
): Promise<Reminder[]> {
  const { data } = await api.get<Reminder[]>("/api/v1/reminders/", {
    params: { patient_id: patientId },
  });
  return data;
}

export async function markReminderDone(
  reminderId: string,
  isDone: boolean
): Promise<Reminder> {
  const { data } = await api.patch<Reminder>(
    `/api/v1/reminders/${reminderId}`,
    { is_done: isDone }
  );
  return data;
}
