/**
 * Gentle, non-judgemental phrase banks.
 *
 * Design rule: never use alarm language ("Wrong!", "Incorrect", "Fail") and
 * never use a red/error color for these — see theme/colors.ts `gentle`
 * token, which is a warm dusty coral, not red. The goal is a low-pressure,
 * low-frustration experience.
 */

export const gentleRetryPhrases = [
  "That's okay — try again.",
  'Almost there!',
  'Good try — one more go.',
  "No worries, let's keep going.",
  "You're doing fine — try again.",
  'Close! Give it another go.',
  'Take your time, no rush.',
];

export const celebrationPhrases = [
  'Wonderful!',
  'Well done!',
  "That's it!",
  'Lovely work!',
  'Perfect!',
  'You got it!',
  'Beautifully done!',
];

export const sessionEndPhrasesByStars: Record<1 | 2 | 3, string[]> = {
  1: [
    'You finished — that matters most.',
    'Well played. Every round helps your mind stay sharp.',
    'Nicely done for completing it.',
  ],
  2: [
    'Great effort — you\u2019re getting sharper!',
    'Well done — good focus today.',
    'Nice work — steady and clear.',
  ],
  3: [
    "Outstanding! You're on fire today!",
    'Amazing round — three stars!',
    'Fantastic focus — perfectly played!',
  ],
};

export function randomFrom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}
