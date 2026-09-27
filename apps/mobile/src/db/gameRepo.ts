import { getDatabase } from "@/db/database";
import type { GameSessionRow } from "@/db/schema";
import { computeNextLevel } from "@/services/gameProgress";
import type { GameSession, GameType } from "@/types/api";
import { scoreToStars } from "@/utils/difficulty";
import type { StarRating } from "@/utils/types";

/**
 * The on-device store for game history.
 *
 * Every finished session lands here first; the adaptive level, the Play
 * screen tiles and the offline Progress screen all read from this table, so
 * the games behave the same with or without a connection.
 */

export interface LocalGameSession {
  id: string;
  patientId: string;
  gameType: GameType;
  score: number | null;
  durationSeconds: number | null;
  difficultyLevel: number;
  hintsUsed: number;
  stars: StarRating;
  playedAt: string;
  /** True once a pull has confirmed the server holds this session. */
  synced: boolean;
}

export interface GameSummary {
  nextLevel: number;
  bestStars: StarRating | 0;
  total: number;
}

const GAME_TYPES: GameType[] = [
  "memory_match",
  "sequence_recall",
  "object_recognition",
];

function toSession(row: GameSessionRow): LocalGameSession {
  const hintsUsed = row.hints_used ?? 0;
  return {
    id: row.id,
    patientId: row.patient_id,
    gameType: row.game_type,
    score: row.score,
    durationSeconds: row.duration_seconds,
    difficultyLevel: row.difficulty_level,
    hintsUsed,
    stars: scoreToStars((row.score ?? 0) / 100, hintsUsed),
    playedAt: row.played_at,
    synced: row.synced === 1,
  };
}

/** Records a session the patient just finished on this device. */
export async function insertLocalSession(session: {
  id: string;
  patientId: string;
  gameType: GameType;
  score: number;
  durationSeconds: number;
  difficultyLevel: number;
  hintsUsed: number;
  playedAt: string;
}): Promise<void> {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO game_sessions
       (id, patient_id, game_type, score, duration_seconds, difficulty_level,
        hints_used, played_at, synced, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      session.id,
      session.patientId,
      session.gameType,
      session.score,
      session.durationSeconds,
      session.difficultyLevel,
      session.hintsUsed,
      session.playedAt,
      new Date().toISOString(),
    ]
  );
}

/**
 * Merges sessions pulled from the server.
 *
 * A session this device played arrives back under the same id (the device
 * chose it), so the upsert simply marks it synced. `hints_used` falls back to
 * the local value because older server rows may not carry it.
 */
export async function upsertServerSessions(
  items: GameSession[]
): Promise<void> {
  if (items.length === 0) return;

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO game_sessions
           (id, patient_id, game_type, score, duration_seconds, difficulty_level,
            hints_used, played_at, synced, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
         ON CONFLICT(id) DO UPDATE SET
           score = excluded.score,
           duration_seconds = excluded.duration_seconds,
           difficulty_level = excluded.difficulty_level,
           hints_used = COALESCE(excluded.hints_used, game_sessions.hints_used),
           played_at = excluded.played_at,
           synced = 1`,
        [
          item.id,
          item.patient_id,
          item.game_type,
          item.score ?? null,
          item.duration_seconds ?? null,
          item.difficulty_level,
          item.hints_used ?? null,
          item.played_at,
          item.created_at ?? now,
        ]
      );
    }
  });
}

/** Newest first. */
export async function listSessions(
  patientId: string,
  gameType?: GameType
): Promise<LocalGameSession[]> {
  const db = await getDatabase();

  const rows = gameType
    ? await db.getAllAsync<GameSessionRow>(
        `SELECT * FROM game_sessions
          WHERE patient_id = ? AND game_type = ?
          ORDER BY played_at DESC`,
        [patientId, gameType]
      )
    : await db.getAllAsync<GameSessionRow>(
        `SELECT * FROM game_sessions
          WHERE patient_id = ?
          ORDER BY played_at DESC`,
        [patientId]
      );

  return rows.map(toSession);
}

/** The most recent `limit` sessions of one game, newest first. */
export async function recentSessions(
  patientId: string,
  gameType: GameType,
  limit: number
): Promise<LocalGameSession[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<GameSessionRow>(
    `SELECT * FROM game_sessions
      WHERE patient_id = ? AND game_type = ?
      ORDER BY played_at DESC
      LIMIT ?`,
    [patientId, gameType, limit]
  );

  return rows.map(toSession);
}

/** What the Play screen shows per game: next level, best stars, play count. */
export async function sessionSummary(
  patientId: string
): Promise<Record<GameType, GameSummary>> {
  const summary = {} as Record<GameType, GameSummary>;

  for (const gameType of GAME_TYPES) {
    const sessions = await listSessions(patientId, gameType);
    const bestStars = sessions.reduce<StarRating | 0>(
      (best, s) => (s.stars > best ? s.stars : best),
      0
    );

    summary[gameType] = {
      nextLevel: computeNextLevel(sessions.slice(0, 2)),
      bestStars,
      total: sessions.length,
    };
  }

  return summary;
}
