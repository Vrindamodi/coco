import type {
  AISummaryResponse,
  Alert,
  AlertSummary,
  AlertUpdate,
  GameSession,
  MyWorldItem,
  MyWorldItemCreate,
  MyWorldItemUpdate,
  Patient,
  PatientCreate,
  ProgressMetrics,
  Reminder,
  ReminderCreate,
  ReminderUpdate,
  UploadResourceType,
  UploadSignature,
  UserResponse,
} from "@coco/shared-types";

import { apiFetch } from "./server-api";

export function getCaregiverMe() {
  return apiFetch<UserResponse>("/api/v1/caregivers/me");
}

export function listPatients() {
  return apiFetch<Patient[]>("/api/v1/patients/");
}

export function getPatient(id: string) {
  return apiFetch<Patient>(`/api/v1/patients/${id}`);
}

export function createPatient(payload: PatientCreate) {
  return apiFetch<Patient>("/api/v1/patients/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getProgress(patientId: string) {
  return apiFetch<ProgressMetrics>(`/api/v1/progress/${patientId}`);
}

export function getAiSummary(patientId: string) {
  return apiFetch<AISummaryResponse>(`/api/v1/games/ai-summary/${patientId}`);
}

export function listSessions(patientId: string) {
  return apiFetch<GameSession[]>(
    `/api/v1/games/sessions?patient_id=${encodeURIComponent(patientId)}`
  );
}

export function listReminders(patientId: string) {
  return apiFetch<Reminder[]>(
    `/api/v1/reminders/?patient_id=${encodeURIComponent(patientId)}`
  );
}

export function createReminder(payload: ReminderCreate) {
  return apiFetch<Reminder>("/api/v1/reminders/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateReminder(id: string, payload: ReminderUpdate) {
  return apiFetch<Reminder>(`/api/v1/reminders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteReminder(id: string) {
  return apiFetch<void>(`/api/v1/reminders/${id}`, {
    method: "DELETE",
  });
}

export function listAlerts(params?: {
  status?: string;
  patientId?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.patientId) search.set("patient_id", params.patientId);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  return apiFetch<Alert[]>(`/api/v1/alerts/${qs ? `?${qs}` : ""}`);
}

export function getAlertsSummary() {
  return apiFetch<AlertSummary>("/api/v1/alerts/summary");
}

export function updateAlert(id: string, payload: AlertUpdate) {
  return apiFetch<Alert>(`/api/v1/alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type PatientOverview = {
  patient: Patient;
  progress: ProgressMetrics | null;
  ai: AISummaryResponse | null;
  activeAlertCount: number;
};

export async function loadPatientOverviews(): Promise<PatientOverview[]> {
  const [patients, alerts] = await Promise.all([
    listPatients(),
    listAlerts({ status: "active" }).catch(() => [] as Alert[]),
  ]);

  const countByPatient = new Map<string, number>();
  for (const alert of alerts) {
    countByPatient.set(
      alert.patient_id,
      (countByPatient.get(alert.patient_id) ?? 0) + 1
    );
  }

  return Promise.all(
    patients.map(async (patient) => {
      const [progress, ai] = await Promise.all([
        getProgress(patient.id).catch(() => null),
        getAiSummary(patient.id).catch(() => null),
      ]);
      return {
        patient,
        progress,
        ai,
        activeAlertCount: countByPatient.get(patient.id) ?? 0,
      };
    })
  );
}

// --- My World -------------------------------------------------------------

export function listMyWorld(
  patientId: string,
  params?: { category?: string; mediaType?: string; since?: string }
) {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.mediaType) search.set("media_type", params.mediaType);
  if (params?.since) search.set("since", params.since);
  const qs = search.toString();
  return apiFetch<MyWorldItem[]>(
    `/api/v1/my-world/${encodeURIComponent(patientId)}${qs ? `?${qs}` : ""}`
  );
}

export function createMyWorldItem(
  patientId: string,
  payload: MyWorldItemCreate
) {
  return apiFetch<MyWorldItem>(
    `/api/v1/my-world/${encodeURIComponent(patientId)}`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

export function updateMyWorldItem(
  patientId: string,
  itemId: string,
  payload: MyWorldItemUpdate
) {
  return apiFetch<MyWorldItem>(
    `/api/v1/my-world/${encodeURIComponent(patientId)}/${encodeURIComponent(itemId)}`,
    { method: "PATCH", body: JSON.stringify(payload) }
  );
}

export function deleteMyWorldItem(patientId: string, itemId: string) {
  return apiFetch<void>(
    `/api/v1/my-world/${encodeURIComponent(patientId)}/${encodeURIComponent(itemId)}`,
    { method: "DELETE" }
  );
}

export function getUploadSignature(
  patientId: string,
  resourceType: UploadResourceType,
  filename?: string
) {
  return apiFetch<UploadSignature>("/api/v1/media/upload-signature", {
    method: "POST",
    body: JSON.stringify({
      patient_id: patientId,
      resource_type: resourceType,
      filename,
    }),
  });
}
