import { create } from "zustand";

import {
  applyLocalReaction,
  listItems,
  type Memory,
} from "@/db/myWorldRepo";
import { enqueue, flush } from "@/services/syncQueue";
import { pullAll } from "@/services/syncService";
import type { MyWorldReactionType } from "@/types/api";

interface MyWorldState {
  memories: Memory[];
  isLoading: boolean;
  /** True while a background pull is running — the list is already usable. */
  isSyncing: boolean;
  /** True once a pull has failed, so the UI can say "showing saved memories". */
  isOffline: boolean;
  error: string | null;

  load: (patientId: string) => Promise<void>;
  refresh: (patientId: string) => Promise<void>;
  react: (
    patientId: string,
    itemId: string,
    reaction: MyWorldReactionType
  ) => Promise<void>;
}

/**
 * Cache-first: the screen renders from SQLite immediately, then a pull runs in
 * the background. On a device with no connection the pull simply fails and the
 * saved memories stay on screen.
 */
export const useMyWorldStore = create<MyWorldState>((set, get) => ({
  memories: [],
  isLoading: false,
  isSyncing: false,
  isOffline: false,
  error: null,

  load: async (patientId) => {
    set({ isLoading: true, error: null });

    try {
      const cached = await listItems(patientId);
      set({ memories: cached, isLoading: false });
    } catch {
      set({
        isLoading: false,
        error: "Could not open your saved memories.",
        memories: [],
      });
      return;
    }

    await get().refresh(patientId);
  },

  refresh: async (patientId) => {
    set({ isSyncing: true });

    const pulled = await pullAll(patientId);

    try {
      const memories = await listItems(patientId);
      set({ memories, isSyncing: false, isOffline: !pulled });
    } catch {
      set({ isSyncing: false, isOffline: !pulled });
    }

    if (pulled) {
      void flush();
    }
  },

  react: async (patientId, itemId, reaction) => {
    const at = new Date().toISOString();

    // Update on-device first: the patient sees the response instantly, and
    // the reaction survives a force-quit before the network returns.
    await applyLocalReaction(itemId, reaction, at);

    set({
      memories: get().memories.map((memory) =>
        memory.id === itemId
          ? {
              ...memory,
              timesShown: memory.timesShown + 1,
              rememberedCount:
                memory.rememberedCount + (reaction === "remembered" ? 1 : 0),
            }
          : memory
      ),
    });

    await enqueue({
      patientId,
      type: "my_world_reaction",
      payload: { item_id: itemId, reaction },
      clientTimestamp: at,
    });

    void flush();
  },
}));
