/**
 * Retry timing for outbox rows the server has rejected.
 *
 * Pure so it can be unit-tested without SQLite: `attempts` is the count
 * *after* the failure being scheduled, so the first retry waits one minute,
 * then two, four... capped at six hours.
 */

const BASE_DELAY_MS = 60_000;
const MAX_DELAY_MS = 6 * 60 * 60 * 1000;

export function backoffDelayMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(BASE_DELAY_MS * 2 ** exponent, MAX_DELAY_MS);
}

export function nextAttemptAt(attempts: number, now: Date = new Date()): string {
  return new Date(now.getTime() + backoffDelayMs(attempts)).toISOString();
}
