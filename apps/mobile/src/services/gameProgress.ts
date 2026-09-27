import type {
  GameResultPayload,
  GameType,
  ProgressMetrics,
} from "@/types/api";
import { MAX_LEVEL, MIN_LEVEL, type GameId, type StarRating } from "@/utils/types";

/**
 * The game-progress rules, kept free of I/O so they run identically offline
 * and in unit tests. Everything here takes plain data and returns plain data;
 * `gameStore` supplies the SQLite rows and the network state.
 */

export const GAME_TYPE_TO_ID: Record<GameType, GameId> = {
  memory_match: "memory",
  sequence_recall: "pattern",
  object_recognition: "naming",
};

/** The two facts about a past session the level rule needs. */
export interface SessionOutcome {
  difficultyLevel: number;
  stars: StarRating;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Adaptive difficulty rule, shared by all three games:
 *
 * - A 1-star session (struggled) eases difficulty down immediately by one
 *   level, so the person doesn't get stuck in a frustrating loop.
 * - Difficulty only goes UP after two consecutive 3-star sessions, so a
 *   single lucky round doesn't push someone into a level that's too hard.
 * - A 2-star session holds the current level steady.
 *
 * `recentDesc` is newest first. The level of the newest session is the
 * "current" level — it is the level that session was played at.
 */
export function computeNextLevel(
  recentDesc: SessionOutcome[],
  minLevel: number = MIN_LEVEL,
  maxLevel: number = MAX_LEVEL
): number {
  if (recentDesc.length === 0) return minLevel;

  const [last, previous] = recentDesc;
  const current = last.difficultyLevel;

  if (last.stars === 1) {
    return clamp(current - 1, minLevel, maxLevel);
  }

  if (previous && last.stars === 3 && previous.stars === 3) {
    return clamp(current + 1, minLevel, maxLevel);
  }

  return clamp(current, minLevel, maxLevel);
}

/**
 * Picks the level to start a session at.
 *
 * The server's suggestion comes from the coco_engine and is preferred — but
 * only when it has seen everything: any session still waiting in the outbox
 * means the server's view is stale, and the local rule over the full local
 * history is the better guess.
 */
export function chooseStartingLevel(args: {
  serverSuggestion: number | null;
  pendingGameOps: number;
  localNext: number;
}): number {
  const { serverSuggestion, pendingGameOps, localNext } = args;

  if (serverSuggestion !== null && pendingGameOps === 0) {
    return clamp(Math.round(serverSuggestion), MIN_LEVEL, MAX_LEVEL);
  }
  return clamp(localNext, MIN_LEVEL, MAX_LEVEL);
}

/**
 * Shapes a finished session for the `game_result` sync operation.
 *
 * `score` is the raw accuracy as a percentage, without the hint penalty —
 * `scoreToStars` applies the penalty, so stars can be rebuilt from
 * (score, hints_used) on any device.
 */
export function buildGameResultPayload(session: {
  id: string;
  gameType: GameType;
  accuracy: number;
  durationMs: number;
  level: number;
  hintsUsed: number;
}): GameResultPayload {
  return {
    session_id: session.id,
    game_type: session.gameType,
    score: Math.round(clamp(session.accuracy, 0, 1) * 100),
    duration_seconds: Math.max(0, Math.round(session.durationMs / 1000)),
    difficulty_level: clamp(session.level, MIN_LEVEL, MAX_LEVEL),
    hints_used: Math.max(0, session.hintsUsed),
  };
}

function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

function previousUtcDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * The same numbers `/api/v1/progress/me` returns, computed from local rows so
 * the Progress screen has something to show without a connection.
 *
 * Streak = consecutive UTC days with at least one session, ending today or
 * yesterday (a streak survives until a full day is missed) — mirrors the
 * backend's `_calculate_streak`.
 */
export function computeLocalMetrics(
  sessions: Array<{ patientId: string; score: number | null; playedAt: string }>,
  now: Date = new Date()
): ProgressMetrics {
  const patientId = sessions[0]?.patientId ?? "";

  const scored = sessions.filter((s) => s.score !== null);
  const averageScore =
    scored.length === 0
      ? 0
      : Math.round(
          (scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length) * 10
        ) / 10;

  const days = new Set(sessions.map((s) => utcDay(s.playedAt)));
  const today = now.toISOString().slice(0, 10);
  let cursor = days.has(today) ? today : previousUtcDay(today);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousUtcDay(cursor);
  }

  const lastActive = sessions.reduce<string | null>(
    (latest, s) => (latest === null || s.playedAt > latest ? s.playedAt : latest),
    null
  );

  return {
    patient_id: patientId,
    total_sessions: sessions.length,
    average_score: averageScore,
    streak_days: streak,
    last_active: lastActive,
  };
}
