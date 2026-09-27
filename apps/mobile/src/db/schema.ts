import type { GameType } from "@/types/api";

export type ReminderType = "medicine" | "hydration" | "appointment";

/**
 * Bump when a migration in `database.ts` is added. Stored in
 * `PRAGMA user_version` so an upgraded install only runs what it is missing.
 */
export const SCHEMA_VERSION = 1;

export interface PatientProfile {
  id: string;
  display_name: string;
  photo_uri: string | null;
  pin: string | null;
  caregiver_id: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  patient_id: string;
  title: string;
  reminder_type: ReminderType;
  scheduled_at: string;
  is_done: number;
  completed_at: string | null;
}

/** A completed game as stored on-device. Stars are derived from score + hints. */
export interface GameSessionRow {
  id: string;
  patient_id: string;
  game_type: GameType;
  score: number | null;
  duration_seconds: number | null;
  difficulty_level: number;
  hints_used: number | null;
  /** ISO, device clock — the moment the game finished. */
  played_at: string;
  /** 1 once the server has confirmed it (via a pull), 0 while local-only. */
  synced: number;
  created_at: string;
}

export const CREATE_PATIENT_PROFILES_TABLE = `
  CREATE TABLE IF NOT EXISTS patient_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL,
    photo_uri TEXT,
    pin TEXT,
    caregiver_id TEXT,
    created_at TEXT NOT NULL
  );
`;

export const CREATE_REMINDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL,
    title TEXT NOT NULL,
    reminder_type TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    is_done INTEGER DEFAULT 0,
    completed_at TEXT
  );
`;

export const CREATE_GAME_SESSIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL,
    game_type TEXT NOT NULL,
    score INTEGER,
    duration_seconds INTEGER,
    difficulty_level INTEGER NOT NULL DEFAULT 1,
    hints_used INTEGER,
    played_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`;

export const CREATE_GAME_SESSIONS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_game_sessions_patient_game
    ON game_sessions (patient_id, game_type, played_at);
`;

export type MyWorldCategory =
  | "person"
  | "place"
  | "object"
  | "event"
  | "moment";

export type MediaType = "photo" | "video" | "audio" | "note";

export type MyWorldReactionType = "viewed" | "remembered" | "unsure";

/** A memory as stored on-device. `people`/`tags` are JSON text; SQLite has no arrays. */
export interface MyWorldRow {
  id: string;
  patient_id: string;
  category: MyWorldCategory;
  name: string;
  relationship: string | null;
  description: string | null;
  photo_uri: string | null;
  media_type: MediaType;
  media_uri: string | null;
  thumbnail_uri: string | null;
  media_bytes: number | null;
  story: string | null;
  memory_date: string | null;
  people: string;
  tags: string;
  is_favourite: number;
  sort_order: number;
  times_shown: number;
  remembered_count: number;
  last_viewed_at: string | null;
  updated_at: string;
  /** file:// path of the downloaded media, once cached. Local only. */
  local_media_path: string | null;
  /** file:// path of the downloaded poster/thumbnail. Local only. */
  local_thumbnail_path: string | null;
}

export type SyncOperationType =
  | "game_result"
  | "reminder_update"
  | "my_world_reaction";

/** One pending write, waiting for the network. */
export interface SyncOutboxRow {
  operation_id: string;
  patient_id: string;
  operation_type: SyncOperationType;
  payload: string;
  client_timestamp: string;
  attempts: number;
  last_error: string | null;
  /** ISO; the row is skipped by a push until this moment. Null = ready. */
  next_attempt_at: string | null;
}

export const CREATE_MY_WORLD_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS my_world_items (
    id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT,
    description TEXT,
    photo_uri TEXT,
    media_type TEXT NOT NULL DEFAULT 'photo',
    media_uri TEXT,
    thumbnail_uri TEXT,
    media_bytes INTEGER,
    story TEXT,
    memory_date TEXT,
    people TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    is_favourite INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    times_shown INTEGER NOT NULL DEFAULT 0,
    remembered_count INTEGER NOT NULL DEFAULT 0,
    last_viewed_at TEXT,
    updated_at TEXT NOT NULL,
    local_media_path TEXT,
    local_thumbnail_path TEXT
  );
`;

export const CREATE_MY_WORLD_PATIENT_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_my_world_patient
    ON my_world_items (patient_id);
`;

export const CREATE_SYNC_OUTBOX_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_outbox (
    operation_id TEXT PRIMARY KEY NOT NULL,
    patient_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    client_timestamp TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    next_attempt_at TEXT
  );
`;

/** Key/value scratch space - the per-patient pull watermarks live here. */
export const CREATE_SYNC_META_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;
