import { api } from "@/services/api";
import type { MyWorldItem, MyWorldReactionType } from "@/types/api";

export async function fetchMyWorld(
  patientId: string,
  since?: string | null
): Promise<MyWorldItem[]> {
  const { data } = await api.get<MyWorldItem[]>(
    `/api/v1/my-world/${patientId}`,
    since ? { params: { since } } : undefined
  );
  return data;
}

/**
 * Direct (online) reaction. The app normally goes through the outbox in
 * `syncQueue` instead, so a reaction made offline is not lost.
 */
export async function postReaction(
  patientId: string,
  itemId: string,
  reaction: MyWorldReactionType,
  clientTimestamp?: string
): Promise<MyWorldItem> {
  const { data } = await api.post<MyWorldItem>(
    `/api/v1/my-world/${patientId}/${itemId}/reaction`,
    { reaction, client_timestamp: clientTimestamp ?? new Date().toISOString() }
  );
  return data;
}
