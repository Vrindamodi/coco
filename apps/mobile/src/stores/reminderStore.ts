import { create } from "zustand";

import {
  fetchTodayReminders,
  markReminderDone,
} from "@/services/reminderApi";
import type { Reminder } from "@/types/api";

interface ReminderState {
  reminders: Reminder[];
  isLoading: boolean;
  error: string | null;
  loadTodayReminders: (patientId: string) => Promise<void>;
  toggleDone: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  isLoading: false,
  error: null,

  loadTodayReminders: async (patientId) => {
    set({ isLoading: true, error: null });
    try {
      const reminders = await fetchTodayReminders(patientId);
      set({ reminders, isLoading: false });
    } catch {
      set({
        isLoading: false,
        error: "Could not load reminders. Check your connection.",
        reminders: [],
      });
    }
  },

  toggleDone: async (id) => {
    const current = get().reminders.find((item) => item.id === id);
    if (!current) return;

    const nextDone = !current.is_done;

    try {
      const updated = await markReminderDone(id, nextDone);
      set({
        reminders: get().reminders.map((item) =>
          item.id === id ? updated : item
        ),
      });
    } catch {
      set({ error: "Could not update reminder." });
    }
  },
}));
