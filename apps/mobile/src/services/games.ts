import type { DifficultyResponse, SyncPullResponse } from "@/types/api";

import { api } from "@/services/api";

/**
 * Asks the coco_engine what level the patient should play next.
 *
 * Called on the way into a game, so the timeout is short: a slow link must
 * not keep the patient waiting when the local rule is a fine fallback.
 */
export async function getGameDifficulty(
  patientId: string,
  options: { timeoutMs?: number } = {}
): Promise<DifficultyResponse> {
  const { data } = await api.get<DifficultyResponse>(
    `/api/v1/games/difficulty/${patientId}`,
    { timeout: options.timeoutMs }
  );

  return data;
}

/** Everything the server changed for this patient since `since` (all, if null). */
export async function fetchSyncPull(
  patientId: string,
  since: string | null
): Promise<SyncPullResponse> {
  const { data } = await api.get<SyncPullResponse>(
    `/api/v1/sync/pull/${patientId}`,
    { params: since ? { since } : undefined }
  );

  return data;
}
