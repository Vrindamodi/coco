import { theme } from '@/theme/index';

/**
 * Four distinct, saturated panel colors for the Simon-Says-style sequence.
 * These intentionally break from the app's warm palette (adding a cool
 * periwinkle as the fourth) because a sequence game benefits from four
 * maximally distinguishable colors, the way classic pattern-memory toys do.
 */
export const PATTERN_PANEL_COLORS = [
  theme.colors.tilePlay,       // memory: #2D6B6B
  theme.colors.tileReminders,  // pattern: #8B7340
  theme.colors.tileProgress,   // naming: #4A7A55
  theme.colors.tileVoice,      // fourth color: #6B5B96
] as const;

export interface PatternLevelConfig {
  startLength: number;
  flashDurationMs: number;
  gapDurationMs: number;
}

export const PATTERN_LEVEL_CONFIG: Record<number, PatternLevelConfig> = {
  1: { startLength: 3, flashDurationMs: 700, gapDurationMs: 320 },
  2: { startLength: 4, flashDurationMs: 620, gapDurationMs: 280 },
  3: { startLength: 5, flashDurationMs: 550, gapDurationMs: 250 },
  4: { startLength: 6, flashDurationMs: 480, gapDurationMs: 220 },
  5: { startLength: 7, flashDurationMs: 420, gapDurationMs: 200 },
};

/** Each successful full repeat appends one step; session ends after this many rounds. */
export const PATTERN_MAX_ROUNDS = 6;
/** Wrong taps allowed on a single round before the session ends early. */
export const PATTERN_MAX_MISTAKES_PER_ROUND = 2;
export const PATTERN_MAX_HINTS = 3;
