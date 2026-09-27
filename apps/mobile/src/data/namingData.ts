/**
 * Picture-naming vocabulary — simple, concrete, everyday nouns with visually
 * and phonetically distinct labels (avoiding near-homophones or visually
 * similar emoji) so a wrong answer is a genuine recall miss, not a UI
 * ambiguity. This mirrors the picture-naming tasks used in real cognitive
 * assessments for language/semantic memory.
 */
export const NAMING_CARD_POOL: { emoji: string; label: string }[] = [
  { emoji: '🐘', label: 'Elephant' },
  { emoji: '🍌', label: 'Banana' },
  { emoji: '🌂', label: 'Umbrella' },
  { emoji: '🔑', label: 'Key' },
  { emoji: '🐟', label: 'Fish' },
  { emoji: '🚲', label: 'Bicycle' },
  { emoji: '🌙', label: 'Moon' },
  { emoji: '🐄', label: 'Cow' },
  { emoji: '⏰', label: 'Clock' },
  { emoji: '🌻', label: 'Sunflower' },
  { emoji: '🦋', label: 'Butterfly' },
  { emoji: '🚗', label: 'Car' },
  { emoji: '🏠', label: 'House' },
  { emoji: '🍵', label: 'Tea' },
  { emoji: '📖', label: 'Book' },
  { emoji: '🐦', label: 'Bird' },
];

export interface NamingLevelConfig {
  optionCount: number;
}

export const NAMING_LEVEL_CONFIG: Record<number, NamingLevelConfig> = {
  1: { optionCount: 3 },
  2: { optionCount: 3 },
  3: { optionCount: 4 },
  4: { optionCount: 4 },
  5: { optionCount: 5 },
};

export const NAMING_ITEMS_PER_SESSION = 8;
export const NAMING_MAX_HINTS = 3;
