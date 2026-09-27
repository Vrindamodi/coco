import { getDatabase } from "@/db/database";
import { upsertServerSessions } from "@/db/gameRepo";
import { setLocalMediaPath, upsertItems } from "@/db/myWorldRepo";
import { fetchSyncPull } from "@/services/games";
import { ensureCached, evictBeyond } from "@/services/mediaCache";
import { fetchMyWorld } from "@/services/myWorldApi";
import { flush } from "@/services/syncQueue";
import type { MyWorldItem } from "@/types/api";

/**
 * The offline read path: pull server changes into SQLite, then download the
 * media those changes point at, so everything is on disk before the patient
 * next loses connectivity.
 */

function myWorldPulledKey(patientId: string): string {
  return `my_world_pulled_at:${patientId}`;
}

function gamesPulledKey(patientId: string): string {
  return `games_pulled_at:${patientId}`;
}

async function readMeta(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

async function writeMeta(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO sync_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export function lastPulledAt(patientId: string): Promise<string | null> {
  return readMeta(myWorldPulledKey(patientId));
}

/**
 * Drops local memories the caregiver has deleted.
 *
 * This is why the pull fetches the whole list rather than a delta: a delta
 * can say what changed, but not what disappeared, and a deleted memory must
 * not keep showing up on the patient's phone.
 */
async function removeDeleted(
  patientId: string,
  serverIds: string[]
): Promise<void> {
  const db = await getDatabase();

  if (serverIds.length === 0) {
    await db.runAsync("DELETE FROM my_world_items WHERE patient_id = ?", [
      patientId,
    ]);
    return;
  }

  const placeholders = serverIds.map(() => "?").join(", ");
  await db.runAsync(
    `DELETE FROM my_world_items
      WHERE patient_id = ? AND id NOT IN (${placeholders})`,
    [patientId, ...serverIds]
  );
}

/** Downloads photos, posters and media for the given memories. */
export async function prefetchMedia(items: MyWorldItem[]): Promise<void> {
  for (const item of items) {
    const stillImage = item.thumbnail_uri ?? item.photo_uri;

    if (stillImage) {
      const path = await ensureCached(stillImage);
      if (path) await setLocalMediaPath(item.id, "thumbnail", path);
    }

    if (item.media_uri) {
      const path = await ensureCached(item.media_uri);
      if (path) await setLocalMediaPath(item.id, "media", path);
    }
  }

  evictBeyond();
}

let pullInFlight: Promise<boolean> | null = null;

/**
 * Pulls everything changed since the last successful pull.
 *
 * Resolves false when the pull could not happen (offline, no session) — that
 * is expected, not an error: the local mirror simply stays as it is.
 */
export function pullAll(patientId: string): Promise<boolean> {
  if (pullInFlight) return pullInFlight;

  pullInFlight = (async () => {
    try {
      const items = await fetchMyWorld(patientId);

      await upsertItems(items);
      await removeDeleted(
        patientId,
        items.map((item) => item.id)
      );
      await writeMeta(myWorldPulledKey(patientId), new Date().toISOString());

      // Media download is the slow part; it must not hold up the UI, which
      // already has the metadata it needs to render.
      void prefetchMedia(items);

      return true;
    } catch {
      return false;
    } finally {
      pullInFlight = null;
    }
  })();

  return pullInFlight;
}

let gamesPullInFlight: Promise<boolean> | null = null;

/**
 * Pulls game sessions the server has seen since the last pull — sessions
 * from before a reinstall, or from another device.
 *
 * The watermark is the server's own clock (`server_time`), so a device with
 * a wrong clock still asks for exactly the right window. Sessions are
 * append-only, so a delta is enough here.
 */
export function pullGameSessions(patientId: string): Promise<boolean> {
  if (gamesPullInFlight) return gamesPullInFlight;

  gamesPullInFlight = (async () => {
    try {
      const since = await readMeta(gamesPulledKey(patientId));
      const data = await fetchSyncPull(patientId, since);

      await upsertServerSessions(data.game_sessions);
      await writeMeta(gamesPulledKey(patientId), data.server_time);

      return true;
    } catch {
      return false;
    } finally {
      gamesPullInFlight = null;
    }
  })();

  return gamesPullInFlight;
}

/** Push queued writes, then pull server changes. Safe to call on every wake-up. */
export async function syncNow(patientId: string): Promise<void> {
  await flush();
  await pullAll(patientId);
  await pullGameSessions(patientId);
}
