import { Directory, File, Paths } from "expo-file-system";

/**
 * Downloads My World media so photos and videos still open with no network.
 *
 * Files live in the document directory (not the cache directory) because the
 * OS is free to purge the cache directory under storage pressure — which on a
 * remote-area device could be exactly when the patient has no connection to
 * re-fetch. Eviction is ours to manage instead, via `evictBeyond`.
 */

const CACHE_DIR_NAME = "my-world";

/** Roughly a few dozen photos plus a handful of short videos. */
export const DEFAULT_CACHE_BUDGET_BYTES = 300 * 1024 * 1024;

function cacheDirectory(): Directory {
  const dir = new Directory(Paths.document, CACHE_DIR_NAME);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/** Stable, filesystem-safe filename for a remote URL (FNV-1a + extension). */
function fileNameFor(url: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < url.length; i += 1) {
    hash ^= url.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  const withoutQuery = url.split("?")[0] ?? url;
  const match = /\.([a-zA-Z0-9]{1,5})$/.exec(withoutQuery);
  const extension = match ? `.${match[1].toLowerCase()}` : "";

  return `${hash.toString(16)}${extension}`;
}

/**
 * Returns a local `file://` URI for `remoteUrl`, downloading it once.
 *
 * Returns null when the download fails (offline, server down) so callers can
 * fall back to the remote URL rather than showing nothing.
 */
export async function ensureCached(remoteUrl: string): Promise<string | null> {
  if (!remoteUrl || remoteUrl.startsWith("file://")) {
    return remoteUrl || null;
  }

  try {
    const target = new File(cacheDirectory(), fileNameFor(remoteUrl));

    if (target.exists) {
      return target.uri;
    }

    await File.downloadFileAsync(remoteUrl, target, { idempotent: true });

    return target.exists ? target.uri : null;
  } catch {
    return null;
  }
}

/** True when the URL already has a local copy, without touching the network. */
export function cachedPathFor(remoteUrl: string): string | null {
  try {
    const target = new File(cacheDirectory(), fileNameFor(remoteUrl));
    return target.exists ? target.uri : null;
  } catch {
    return null;
  }
}

export function cacheSizeBytes(): number {
  try {
    return cacheDirectory().size ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Deletes least-recently-modified files until the cache fits the budget.
 *
 * Without this the device fills up: a caregiver can keep adding videos and
 * the app would keep every one of them forever.
 */
export function evictBeyond(
  budgetBytes: number = DEFAULT_CACHE_BUDGET_BYTES
): number {
  try {
    const dir = cacheDirectory();

    const files = dir
      .list()
      .filter((entry): entry is File => entry instanceof File)
      .map((file) => {
        const info = file.info();
        return {
          file,
          size: info.size ?? 0,
          modifiedAt: info.modificationTime ?? 0,
        };
      });

    let total = files.reduce((sum, entry) => sum + entry.size, 0);
    if (total <= budgetBytes) return 0;

    files.sort((a, b) => a.modifiedAt - b.modifiedAt);

    let freed = 0;
    for (const entry of files) {
      if (total <= budgetBytes) break;
      try {
        entry.file.delete();
        total -= entry.size;
        freed += entry.size;
      } catch {
        // A file we cannot delete should not stop us evicting the rest.
      }
    }

    return freed;
  } catch {
    return 0;
  }
}
