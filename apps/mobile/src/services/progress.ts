import type { ProgressMetrics } from "@/types/api";

import { api } from "@/services/api";

export async function fetchPatientProgress(
  patientId?: string
): Promise<ProgressMetrics> {
  const path = patientId
    ? `/api/v1/progress/${patientId}`
    : "/api/v1/progress/me";
  const { data } = await api.get<ProgressMetrics>(path);
  return data;
}
