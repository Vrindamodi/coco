import type { GameSession, GameSessionCreate, GameType } from "@/types/api";

import { api } from "@/services/api";

export interface LaunchGameResult {
  started: boolean;
  message: string;
}

export async function createGameSession(
  payload: GameSessionCreate
): Promise<GameSession> {
  const { data } = await api.post<GameSession>(
    "/api/v1/games/sessions",
    payload
  );
  return data;
}

/** Stub launch — records a demo session to the backend when the game shell is used. */
export async function launchGame(
  gameType: GameType,
  patientId: string
): Promise<LaunchGameResult> {
  try {
    await createGameSession({
      patient_id: patientId,
      game_type: gameType,
      score: 75,
      duration_seconds: 120,
    });
    return {
      started: true,
      message: `Session recorded for ${gameType}`,
    };
  } catch {
    return {
      started: false,
      message: `Could not save session for ${gameType}`,
    };
  }
}
