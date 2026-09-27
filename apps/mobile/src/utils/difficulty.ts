// The adaptive level rule lives in `@/services/gameProgress` (computeNextLevel);
// this file keeps only the star curve.

/**
 * Turns raw session performance into a 1-3 star rating. Each game computes
 * its own "accuracy" and "speedFactor" inputs (0-1 each; speedFactor is
 * omitted — pass 1 — for games where speed shouldn't be scored), then this
 * shared curve converts it to stars so the star meaning stays consistent
 * across games. Hints reduce the effective accuracy slightly so stars still
 * reward independent play without ever going to a punishing zero.
 */
export function scoreToStars(
  accuracy: number, // 0-1
  hintsUsed: number
): 1 | 2 | 3 {
  const hintPenalty = Math.min(0.15, hintsUsed * 0.05);
  const adjusted = Math.max(0, Math.min(1, accuracy - hintPenalty));

  if (adjusted >= 0.85) return 3;
  if (adjusted >= 0.6) return 2;
  return 1;
}
