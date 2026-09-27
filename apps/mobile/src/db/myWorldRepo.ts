import { getDatabase } from "@/db/database";
import type { MyWorldRow } from "@/db/schema";
import type { MyWorldItem, MyWorldReactionType } from "@/types/api";

/**
 * The on-device store for My World.
 *
 * The UI reads only from here, never from the network, so the gallery renders
 * the same with or without a connection.
 */

export interface Memory {
  id: string;
  patientId: string;
  category: MyWorldRow["category"];
  name: string;
  description: string | null;
  story: string | null;
  mediaType: MyWorldRow["media_type"];
  /** Remote URL of the main media (video/audio), if any. */
  mediaUri: string | null;
  /** Remote URL of the still image / poster frame. */
  imageUri: string | null;
  /** Cached file:// path for the main media, once downloaded. */
  localMediaPath: string | null;
  /** Cached file:// path for the still image, once downloaded. */
  localImagePath: string | null;
  memoryDate: string | null;
  people: string[];
  tags: string[];
  isFavourite: boolean;
  timesShown: number;
  rememberedCount: number;
}

function parseList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toMemory(row: MyWorldRow): Memory {
  return {
    id: row.id,
    patientId: row.patient_id,
    category: row.category,
    name: row.name,
    description: row.description,
    story: row.story,
    mediaType: row.media_type,
    mediaUri: row.media_uri,
    imageUri: row.thumbnail_uri ?? row.photo_uri,
    localMediaPath: row.local_media_path,
    localImagePath: row.local_thumbnail_path,
    memoryDate: row.memory_date,
    people: parseList(row.people),
    tags: parseList(row.tags),
    isFavourite: row.is_favourite === 1,
    timesShown: row.times_shown,
    rememberedCount: row.remembered_count,
  };
}

/**
 * Writes server items into the local mirror.
 *
 * Cached media paths are preserved with COALESCE on the existing row, so a
 * pull never throws away files already on disk.
 */
export async function upsertItems(items: MyWorldItem[]): Promise<void> {
  if (items.length === 0) return;

  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO my_world_items (
           id, patient_id, category, name, relationship, description,
           photo_uri, media_type, media_uri, thumbnail_uri, media_bytes,
           story, memory_date, people, tags, is_favourite, sort_order,
           times_shown, remembered_count, last_viewed_at, updated_at,
           local_media_path, local_thumbnail_path
         ) VALUES (
           ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
           (SELECT local_media_path FROM my_world_items WHERE id = ?),
           (SELECT local_thumbnail_path FROM my_world_items WHERE id = ?)
         )
         ON CONFLICT(id) DO UPDATE SET
           category = excluded.category,
           name = excluded.name,
           relationship = excluded.relationship,
           description = excluded.description,
           photo_uri = excluded.photo_uri,
           media_type = excluded.media_type,
           media_uri = excluded.media_uri,
           thumbnail_uri = excluded.thumbnail_uri,
           media_bytes = excluded.media_bytes,
           story = excluded.story,
           memory_date = excluded.memory_date,
           people = excluded.people,
           tags = excluded.tags,
           is_favourite = excluded.is_favourite,
           sort_order = excluded.sort_order,
           times_shown = MAX(times_shown, excluded.times_shown),
           remembered_count = MAX(remembered_count, excluded.remembered_count),
           last_viewed_at = excluded.last_viewed_at,
           updated_at = excluded.updated_at`,
        [
          item.id,
          item.patient_id,
          item.category,
          item.name,
          item.relationship ?? null,
          item.description ?? null,
          item.photo_uri ?? null,
          item.media_type,
          item.media_uri ?? null,
          item.thumbnail_uri ?? null,
          item.media_bytes ?? null,
          item.story ?? null,
          item.memory_date ?? null,
          JSON.stringify(item.people ?? []),
          JSON.stringify(item.tags ?? []),
          item.is_favourite ? 1 : 0,
          item.sort_order ?? 0,
          item.times_shown ?? 0,
          item.remembered_count ?? 0,
          item.last_viewed_at ?? null,
          item.updated_at,
          item.id,
          item.id,
        ]
      );
    }
  });
}

export async function listItems(patientId: string): Promise<Memory[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MyWorldRow>(
    `SELECT * FROM my_world_items
      WHERE patient_id = ?
      ORDER BY is_favourite DESC, sort_order ASC,
               COALESCE(memory_date, '') DESC, updated_at DESC`,
    [patientId]
  );
  return rows.map(toMemory);
}

export async function getItem(id: string): Promise<Memory | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MyWorldRow>(
    "SELECT * FROM my_world_items WHERE id = ?",
    [id]
  );
  return row ? toMemory(row) : null;
}

export async function setLocalMediaPath(
  id: string,
  kind: "media" | "thumbnail",
  path: string | null
): Promise<void> {
  const db = await getDatabase();
  const column =
    kind === "media" ? "local_media_path" : "local_thumbnail_path";
  await db.runAsync(
    `UPDATE my_world_items SET ${column} = ? WHERE id = ?`,
    [path, id]
  );
}

/** Applies a reaction locally so the UI updates before the network catches up. */
export async function applyLocalReaction(
  id: string,
  reaction: MyWorldReactionType,
  at: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE my_world_items
        SET times_shown = times_shown + 1,
            remembered_count = remembered_count + ?,
            last_viewed_at = ?
      WHERE id = ?`,
    [reaction === "remembered" ? 1 : 0, at, id]
  );
}
