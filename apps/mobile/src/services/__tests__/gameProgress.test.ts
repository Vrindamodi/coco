import {
  buildGameResultPayload,
  chooseStartingLevel,
  computeLocalMetrics,
  computeNextLevel,
} from "@/services/gameProgress";
import { scoreToStars } from "@/utils/difficulty";

describe("computeNextLevel", () => {
  it("starts a brand-new player at level 1", () => {
    expect(computeNextLevel([])).toBe(1);
  });

  it("eases down one level immediately after a 1-star session", () => {
    expect(computeNextLevel([{ difficultyLevel: 3, stars: 1 }])).toBe(2);
  });

  it("goes up only after two 3-star sessions in a row", () => {
    // Newest first.
    expect(
      computeNextLevel([
        { difficultyLevel: 2, stars: 3 },
        { difficultyLevel: 2, stars: 3 },
      ])
    ).toBe(3);
  });

  it("holds after a single lucky 3-star round", () => {
    expect(
      computeNextLevel([
        { difficultyLevel: 2, stars: 3 },
        { difficultyLevel: 2, stars: 2 },
      ])
    ).toBe(2);
    expect(computeNextLevel([{ difficultyLevel: 2, stars: 3 }])).toBe(2);
  });

  it("holds after a 2-star session", () => {
    expect(
      computeNextLevel([
        { difficultyLevel: 4, stars: 2 },
        { difficultyLevel: 4, stars: 3 },
      ])
    ).toBe(4);
  });

  it("uses the newest session's level as the current level", () => {
    // The previous session was at level 3; the level the player is *at*
    // is the one the newest session was played at.
    expect(
      computeNextLevel([
        { difficultyLevel: 2, stars: 3 },
        { difficultyLevel: 3, stars: 3 },
      ])
    ).toBe(3);
  });

  it("never leaves the 1..5 range", () => {
    expect(computeNextLevel([{ difficultyLevel: 1, stars: 1 }])).toBe(1);
    expect(
      computeNextLevel([
        { difficultyLevel: 5, stars: 3 },
        { difficultyLevel: 5, stars: 3 },
      ])
    ).toBe(5);
  });
});

describe("chooseStartingLevel", () => {
  it("prefers the server when it has seen every session", () => {
    expect(
      chooseStartingLevel({ serverSuggestion: 4, pendingGameOps: 0, localNext: 2 })
    ).toBe(4);
  });

  it("ignores a stale server view while sessions are still queued", () => {
    expect(
      chooseStartingLevel({ serverSuggestion: 4, pendingGameOps: 1, localNext: 2 })
    ).toBe(2);
  });

  it("falls back to the local rule offline", () => {
    expect(
      chooseStartingLevel({ serverSuggestion: null, pendingGameOps: 0, localNext: 3 })
    ).toBe(3);
  });

  it("clamps whatever it picks into 1..5", () => {
    expect(
      chooseStartingLevel({ serverSuggestion: 9, pendingGameOps: 0, localNext: 1 })
    ).toBe(5);
    expect(
      chooseStartingLevel({ serverSuggestion: null, pendingGameOps: 0, localNext: 0 })
    ).toBe(1);
  });
});

describe("buildGameResultPayload", () => {
  it("shapes a session for the game_result sync operation", () => {
    expect(
      buildGameResultPayload({
        id: "abc",
        gameType: "memory_match",
        accuracy: 0.856,
        durationMs: 61_400,
        level: 3,
        hintsUsed: 1,
      })
    ).toEqual({
      session_id: "abc",
      game_type: "memory_match",
      score: 86,
      duration_seconds: 61,
      difficulty_level: 3,
      hints_used: 1,
    });
  });

  it("clamps accuracy and level into their valid ranges", () => {
    const payload = buildGameResultPayload({
      id: "x",
      gameType: "sequence_recall",
      accuracy: 1.4,
      durationMs: -5,
      level: 7,
      hintsUsed: -1,
    });
    expect(payload.score).toBe(100);
    expect(payload.duration_seconds).toBe(0);
    expect(payload.difficulty_level).toBe(5);
    expect(payload.hints_used).toBe(0);
  });
});

describe("stars derived from (score, hints_used)", () => {
  // Stars are never stored: the server holds score (0-100, no hint penalty)
  // and hints_used, and every device rebuilds stars from those two. This
  // guards that rounding accuracy to a whole percent cannot flip a star.
  it("matches the stars shown at the end of the game", () => {
    for (let pct = 0; pct <= 100; pct += 1) {
      for (let hints = 0; hints <= 4; hints += 1) {
        const accuracy = pct / 100;
        const stored = Math.round(accuracy * 100);
        expect(scoreToStars(stored / 100, hints)).toBe(
          scoreToStars(accuracy, hints)
        );
      }
    }
  });
});

describe("computeLocalMetrics", () => {
  const now = new Date("2026-09-11T10:00:00Z");
  const session = (playedAt: string, score: number | null = 80) => ({
    patientId: "p1",
    score,
    playedAt,
  });

  it("returns zeros for a patient with no history", () => {
    expect(computeLocalMetrics([], now)).toEqual({
      patient_id: "",
      total_sessions: 0,
      average_score: 0,
      streak_days: 0,
      last_active: null,
    });
  });

  it("counts a streak of consecutive days ending today", () => {
    const metrics = computeLocalMetrics(
      [
        session("2026-09-11T08:00:00Z"),
        session("2026-09-10T08:00:00Z"),
        session("2026-09-09T08:00:00Z"),
      ],
      now
    );
    expect(metrics.streak_days).toBe(3);
    expect(metrics.total_sessions).toBe(3);
  });

  it("keeps yesterday's streak alive until a full day is missed", () => {
    expect(
      computeLocalMetrics([session("2026-09-10T08:00:00Z")], now).streak_days
    ).toBe(1);
    expect(
      computeLocalMetrics([session("2026-09-09T08:00:00Z")], now).streak_days
    ).toBe(0);
  });

  it("breaks the streak at a gap", () => {
    expect(
      computeLocalMetrics(
        [session("2026-09-11T08:00:00Z"), session("2026-09-09T08:00:00Z")],
        now
      ).streak_days
    ).toBe(1);
  });

  it("averages only scored sessions, to one decimal", () => {
    const metrics = computeLocalMetrics(
      [
        session("2026-09-11T08:00:00Z", 90),
        session("2026-09-11T09:00:00Z", 71),
        session("2026-09-11T09:30:00Z", null),
      ],
      now
    );
    expect(metrics.average_score).toBe(80.5);
    expect(metrics.total_sessions).toBe(3);
    expect(metrics.last_active).toBe("2026-09-11T09:30:00Z");
  });
});
