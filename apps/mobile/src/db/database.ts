import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import {
  CREATE_GAME_SESSIONS_TABLE,
  CREATE_MY_WORLD_ITEMS_TABLE,
  CREATE_MY_WORLD_PATIENT_INDEX,
  CREATE_PATIENT_PROFILES_TABLE,
  CREATE_REMINDERS_TABLE,
  CREATE_SYNC_META_TABLE,
  CREATE_SYNC_OUTBOX_TABLE,
} from "@/db/schema";

const DB_NAME = "coco.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DB_NAME);
  }
  return databasePromise;
}

/**
 * Creates the local tables.
 *
 * My World is offline-first: `my_world_items` is the read path the UI uses,
 * and `sync_outbox` holds patient reactions until the network comes back.
 */
export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(CREATE_PATIENT_PROFILES_TABLE);
  await db.execAsync(CREATE_REMINDERS_TABLE);
  await db.execAsync(CREATE_GAME_SESSIONS_TABLE);
  await db.execAsync(CREATE_MY_WORLD_ITEMS_TABLE);
  await db.execAsync(CREATE_MY_WORLD_PATIENT_INDEX);
  await db.execAsync(CREATE_SYNC_OUTBOX_TABLE);
  await db.execAsync(CREATE_SYNC_META_TABLE);
}
