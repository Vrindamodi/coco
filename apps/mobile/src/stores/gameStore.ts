import { uuid } from "expo-modules-core";
import { create } from "zustand";

import {
  insertLocalSession,
  recentSessions,
  sessionSummary,
  type GameSummary,
} from "@/db/gameRepo";
import {
  buildGameResultPayload,
  chooseStartingLevel,
  computeNextLevel,
} from "@/services/gameProgress";
import { getGameDifficulty } from "@/services/games";
import { enqueue, flush, pendingCount } from "@/services/syncQueue";
import { useNetworkStore } from "@/stores/networkStore";
import type { GameType } from "@/types/api";
import { scoreToStars } from "@/utils/difficulty";
import type { StarRating } from "@/utils/types";

/**
 * Everything the three game screens share: which level to start at, how to
 * record a finished session, and what the Play screen shows per game.
 *
 * Offline-first, the same way My World is: a finished session is written to
 * SQLite and queued for the server before the results modal even appears,
 * so a force-quit or a dead network never loses it.
 */

/** Rows for a patient who has never logged in are kept under this id. */
const LOCAL_PATIENT = "local";

/** A slow link must not hold the game up — the local rule is a fine fallback. */
const DIFFICULTY_TIMEOUT_MS = 4000;

interface FinishInput {
  patientId: string | null;
  gameType: GameType;
  /** 0-1, the game's own measure of how well it went. */
  accuracy: number;
  hintsUsed: number;
  durationMs: number;
  /** The level the session was played at. */
  level: number;
}

interface GameState {
  summary: Partial<Record<GameType, GameSummary>>;
  /** Sessions still waiting in the outbox. */
  pendingSyncCount: number;

  loadSummary: (patientId: string | null) => Promise<void>;
  startLevelFor: (patientId: string | null, gameType: GameType) => Promise<number>;
  finishSession: (
    input: FinishInput
  ) => Promise<{ stars: StarRating; nextLevel: number }>;
  refreshPendingCount: () => Promise<void>;
}

function localPatientId(patientId: string | null): string {
  return patientId ?? LOCAL_PATIENT;
}

export const useGameStore = create<GameState>((set, get) => ({
  summary: {},
  pendingSyncCount: 0,

  loadSummary: async (patientId) => {
    try {
      const summary = await sessionSummary(localPatientId(patientId));
      set({ summary });
    } catch {
      // Leave the last known summary on screen.
    }
    await get().refreshPendingCount();
  },

  startLevelFor: async (patientId, gameType) => {
    const localNext = computeNextLevel(
      await recentSessions(localPatientId(patientId), gameType, 2)
    );

    let serverSuggestion: number | null = null;
    if (patientId && useNetworkStore.getState().isConnected) {
      try {
        const difficulty = await getGameDifficulty(patientId, {
          timeoutMs: DIFFICULTY_TIMEOUT_MS,
        });
        serverSuggestion = difficulty.suggested_difficulty;
      } catch {
        // Offline, slow, or signed out — the local rule decides.
      }
    }

    return chooseStartingLevel({
      serverSuggestion,
      pendingGameOps: await pendingCount("game_result"),
      localNext,
    });
  },

  finishSession: async (input) => {
    const { patientId, gameType } = input;
    const id = uuid.v4();
    const playedAt = new Date().toISOString();
    const payload = buildGameResultPayload({ id, ...input });

    await insertLocalSession({
      id,
      patientId: localPatientId(patientId),
      gameType,
      score: payload.score,
      durationSeconds: payload.duration_seconds,
      difficultyLevel: payload.difficulty_level,
      hintsUsed: payload.hints_used,
      playedAt,
    });

    const stars = scoreToStars(input.accuracy, input.hintsUsed);
    const nextLevel = computeNextLevel(
      await recentSessions(localPatientId(patientId), gameType, 2)
    );

    set((state) => {
      const previous = state.summary[gameType];
      return {
        summary: {
          ...state.summary,
          [gameType]: {
            nextLevel,
            bestStars: Math.max(previous?.bestStars ?? 0, stars) as StarRating,
            total: (previous?.total ?? 0) + 1,
          },
        },
      };
    });

    if (patientId) {
      await enqueue({
        patientId,
        type: "game_result",
        payload: { ...payload },
        clientTimestamp: playedAt,
      });
      set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 }));

      void flush().then(() => get().refreshPendingCount());
    }

    return { stars, nextLevel };
  },

  refreshPendingCount: async () => {
    try {
      set({ pendingSyncCount: await pendingCount("game_result") });
    } catch {
      // Count is cosmetic; leave it.
    }
  },
}));
