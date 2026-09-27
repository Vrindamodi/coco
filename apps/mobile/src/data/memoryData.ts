/**
 * Universally recognizable emoji used as "picture" cards — chosen for
 * clarity at a glance (no ambiguous or small-detail emoji) rather than for
 * theming, since recognizability matters most for a cognitive memory task.
 */
export const MEMORY_CARD_POOL: { emoji: string; label: string }[] = [
  { emoji: '🍎', label: 'apple' },
  { emoji: '🍌', label: 'banana' },
  { emoji: '🍇', label: 'grapes' },
  { emoji: '🥥', label: 'coconut' },
  { emoji: '🐘', label: 'elephant' },
  { emoji: '🐒', label: 'monkey' },
  { emoji: '🦋', label: 'butterfly' },
  { emoji: '🌸', label: 'flower' },
  { emoji: '🌙', label: 'moon' },
  { emoji: '⭐', label: 'star' },
  { emoji: '🎈', label: 'balloon' },
  { emoji: '🌻', label: 'sunflower' },
  { emoji: '🐦', label: 'bird' },
  { emoji: '🍉', label: 'watermelon' },
];

export interface MemoryLevelConfig {
  pairs: number;
  columns: number;
}

/** Difficulty level (1-5) -> grid shape. Grows from a gentle 3-pair start
 * up to a challenging 12-pair grid. */
export const MEMORY_LEVEL_CONFIG: Record<number, MemoryLevelConfig> = {
  1: { pairs: 3, columns: 3 }, // 3x2 grid
  2: { pairs: 4, columns: 4 }, // 4x2 grid
  3: { pairs: 6, columns: 4 }, // 4x3 grid
  4: { pairs: 8, columns: 4 }, // 4x4 grid
  5: { pairs: 12, columns: 4 }, // 4x6 grid
};

export const MEMORY_MAX_HINTS = 3;
