// Web build: the browser's own HTTP cache handles this, and expo-file-system's
// document directory has no meaningful web equivalent. Callers fall back to
// the remote URL when these return null.

export const DEFAULT_CACHE_BUDGET_BYTES = 0;

export async function ensureCached(): Promise<string | null> {
  return null;
}

export function cachedPathFor(): string | null {
  return null;
}

export function cacheSizeBytes(): number {
  return 0;
}

export function evictBeyond(): number {
  return 0;
}
