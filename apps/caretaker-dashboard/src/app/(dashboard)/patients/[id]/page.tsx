import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@coco/ui";
import { ArrowLeft } from "lucide-react";

import { AddMemoryForm } from "@/components/AddMemoryForm";
import { AiInsightPanel } from "@/components/AiInsightPanel";
import { MemoryGallery } from "@/components/MemoryGallery";
import { MetricTile, PatientAlertsCard } from "@/components/PatientCard";
import { ReminderList } from "@/components/ReminderList";
import { SessionTable } from "@/components/SessionTable";
import {
  getAiSummary,
  getPatient,
  getProgress,
  listAlerts,
  listMyWorld,
  listReminders,
  listSessions,
} from "@/server/caregiver-api";
import { formatDate } from "@/lib/format-date";
import { ApiError } from "@/server/server-api";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PatientDetailPage({ params }: Props) {
  const { id } = await params;

  let patient;
  try {
    patient = await getPatient(id);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      notFound();
    }
    throw err;
  }

  const [progress, ai, reminders, sessions, alerts, memories] =
    await Promise.all([
      getProgress(id).catch(() => null),
      getAiSummary(id).catch(() => null),
      listReminders(id).catch(() => []),
      listSessions(id).catch(() => []),
      listAlerts({ patientId: id, status: "active" }).catch(() => []),
      listMyWorld(id).catch(() => []),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link
          href="/patients"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All patients
        </Link>
        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              {patient.full_name}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {patient.region ?? "North East India"} · Language{" "}
              {patient.preferred_language}
              {progress?.last_active
                ? ` · Last active ${formatDate(progress.last_active) ?? ""}`
                : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="accent">Level {patient.cognitive_level}</Badge>
            {alerts.length > 0 ? (
              <Badge variant="warning">
                {alerts.length} alert{alerts.length === 1 ? "" : "s"}
              </Badge>
            ) : ai?.analytics.decline_alert ? (
              <Badge variant="warning">Decline alert</Badge>
            ) : null}
          </div>
        </header>
      </div>

      <section
        aria-label="Progress metrics"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <MetricTile
          label="Total sessions"
          value={progress?.total_sessions ?? "—"}
        />
        <MetricTile
          label="Average score"
          value={progress ? Math.round(progress.average_score) : "—"}
        />
        <MetricTile
          label="Day streak"
          value={progress ? progress.streak_days : "—"}
        />
        <MetricTile
          label="Suggested difficulty"
          value={ai ? `${ai.difficulty.recommended_level}/5` : "—"}
          hint={ai?.difficulty.decision}
        />
      </section>

      <PatientAlertsCard alerts={alerts} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AiInsightPanel ai={ai} />
        <ReminderList patientId={id} reminders={reminders} />
      </div>

      <section aria-label="My World memory journal" className="space-y-6">
        <MemoryGallery patientId={id} items={memories} />
        <AddMemoryForm patientId={id} />
      </section>

      <SessionTable sessions={sessions} />

      {patient.notes ? (
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Notes
          </h2>
          <p className="mt-2 text-sm text-[var(--color-foreground)]">
            {patient.notes}
          </p>
        </section>
      ) : null}
    </div>
  );
}
