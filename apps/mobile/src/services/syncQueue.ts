import AsyncStorage from "@react-native-async-storage/async-storage";

import { getDatabase } from "@/db/database";
import type { SyncOperationType, SyncOutboxRow } from "@/db/schema";
import { api } from "@/services/api";
import type { SyncResponse } from "@/types/api";

/**
 * The offline write path.
 *
 * Every patient-side mutation lands in `sync_outbox` first and is pushed when
 * the network allows. The server dedupes on (device_id, operation_id), so a
 * flush interrupted mid-request is safe to repeat — a replayed operation comes
 * back as "duplicate", which we treat exactly like "synced".
 */

const DEVICE_ID_KEY = "coco-device-id";
const MAX_BATCH = 100;
/** Give up pushing an operation the server keeps rejecting. */
const MAX_ATTEMPTS = 5;

let deviceIdPromise: Promise<string> | null = null;
let flushInFlight: Promise<number> | null = null;

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceId(): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (existing) return existing;

      const created = randomId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, created);
      return created;
    })();
  }
  return deviceIdPromise;
}

export async function enqueue(operation: {
  patientId: string;
  type: SyncOperationType;
  payload: Record<string, unknown>;
  clientTimestamp?: string;
}): Promise<string> {
  const db = await getDatabase();
  const operationId = randomId();

  await db.runAsync(
    `INSERT INTO sync_outbox
       (operation_id, patient_id, operation_type, payload, client_timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [
      operationId,
      operation.patientId,
      operation.type,
      JSON.stringify(operation.payload),
      operation.clientTimestamp ?? new Date().toISOString(),
    ]
  );

  return operationId;
}

export async function pendingCount(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM sync_outbox"
  );
  return row?.count ?? 0;
}

async function pushBatch(): Promise<{ settled: number; fetched: number }> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<SyncOutboxRow>(
    `SELECT * FROM sync_outbox
      WHERE attempts < ?
      ORDER BY client_timestamp
      LIMIT ?`,
    [MAX_ATTEMPTS, MAX_BATCH]
  );

  if (rows.length === 0) return { settled: 0, fetched: 0 };

  const deviceId = await getDeviceId();

  const { data } = await api.post<SyncResponse>("/api/v1/sync", {
    operations: rows.map((row) => ({
      operation_id: row.operation_id,
      device_id: deviceId,
      patient_id: row.patient_id,
      operation_type: row.operation_type,
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      client_timestamp: row.client_timestamp,
    })),
  });

  const settled = data.results
    .filter((r) => r.status === "synced" || r.status === "duplicate")
    .map((r) => r.operation_id);

  const rejected = data.results.filter((r) => r.status === "failed");

  await db.withTransactionAsync(async () => {
    for (const operationId of settled) {
      await db.runAsync("DELETE FROM sync_outbox WHERE operation_id = ?", [
        operationId,
      ]);
    }
    for (const result of rejected) {
      await db.runAsync(
        `UPDATE sync_outbox
            SET attempts = attempts + 1, last_error = ?
          WHERE operation_id = ?`,
        [result.error ?? "Unknown error", result.operation_id]
      );
    }
  });

  return { settled: settled.length, fetched: rows.length };
}

/**
 * Pushes everything queued. Safe to call from several triggers at once — the
 * in-flight promise is shared so overlapping calls do not double-send.
 */
export function flush(): Promise<number> {
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    let total = 0;
    try {
      // Loop so an outbox that built up over days drains in one go. Stop
      // on a partial batch (nothing left) or on a batch where nothing stuck —
      // those rows now carry a failure count and will age out of the queue.
      for (;;) {
        const { settled, fetched } = await pushBatch();
        total += settled;
        if (fetched < MAX_BATCH || settled === 0) break;
      }
    } catch {
      // Still offline, or the server is down. The rows stay queued.
    } finally {
      flushInFlight = null;
    }
    return total;
  })();

  return flushInFlight;
}
