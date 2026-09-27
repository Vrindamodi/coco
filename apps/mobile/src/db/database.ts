import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";

import {
  CREATE_GAME_SESSIONS_INDEX,
  CREATE_GAME_SESSIONS_TABLE,
  CREATE_MY_WORLD_ITEMS_TABLE,
  CREATE_MY_WORLD_PATIENT_INDEX,
  CREATE_PATIENT_PROFILES_TABLE,
  CREATE_REMINDERS_TABLE,
  CREATE_SYNC_META_TABLE,
  CREATE_SYNC_OUTBOX_TABLE,
  SCHEMA_VERSION,
} from "@/db/schema";

const DB_NAME = "coco.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DB_NAME);
  }
  return databasePromise;
}

async function hasColumn(
  db: SQLiteDatabase,
  table: string,
  column: string
): Promise<boolean> {
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`
  );
  return rows.some((row) => row.name === column);
}

/**
 * One entry per schema version, run in order on an install that is behind.
 * `CREATE TABLE IF NOT EXISTS` alone cannot change a table that already
 * exists, so anything beyond a brand-new table goes here.
 */
const MIGRATIONS: Array<(db: SQLiteDatabase) => Promise<void>> = [
  // v0 -> v1: game sessions move on-device; the outbox learns to back off.
  async (db) => {
    // The old game_sessions table was never written to, so there is nothing
    // to carry across — recreating it is simpler than altering column by column.
    await db.execAsync("DROP TABLE IF EXISTS game_sessions;");
    await db.execAsync(CREATE_GAME_SESSIONS_TABLE);
    await db.execAsync(CREATE_GAME_SESSIONS_INDEX);

    // The outbox may hold real pending writes, so it is altered in place.
    if (!(await hasColumn(db, "sync_outbox", "next_attempt_at"))) {
      await db.execAsync(
        "ALTER TABLE sync_outbox ADD COLUMN next_attempt_at TEXT;"
      );
    }
  },
];

/**
 * Creates the local tables, then brings an older install up to date.
 *
 * The UI reads My World and game history only from here, never from the
 * network, and `sync_outbox` holds patient writes until the network comes back.
 */
export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execAsync(CREATE_PATIENT_PROFILES_TABLE);
  await db.execAsync(CREATE_REMINDERS_TABLE);
  await db.execAsync(CREATE_GAME_SESSIONS_TABLE);
  await db.execAsync(CREATE_GAME_SESSIONS_INDEX);
  await db.execAsync(CREATE_MY_WORLD_ITEMS_TABLE);
  await db.execAsync(CREATE_MY_WORLD_PATIENT_INDEX);
  await db.execAsync(CREATE_SYNC_OUTBOX_TABLE);
  await db.execAsync(CREATE_SYNC_META_TABLE);

  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const current = versionRow?.user_version ?? 0;

  for (let version = current; version < SCHEMA_VERSION; version++) {
    await db.withTransactionAsync(() => MIGRATIONS[version](db));
    // PRAGMA writes are not transactional on every SQLite build, so the
    // version is stamped only once the migration has committed.
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}
