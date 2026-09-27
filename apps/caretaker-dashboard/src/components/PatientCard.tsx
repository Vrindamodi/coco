import Link from "next/link";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@coco/ui";
import { AlertTriangle, Bell } from "lucide-react";

import type { Alert } from "@coco/shared-types";

import type { PatientOverview } from "@/server/caregiver-api";

const TYPE_LABELS: Record<string, string> = {
  cognitive_decline: "Decline",
  inactivity: "Inactivity",
  missed_reminder: "Reminder",
};

export function AlertStrip({ alerts }: { alerts: Alert[] }) {
  const active = alerts.filter((a) => a.status === "active").slice(0, 5);
  if (active.length === 0) return null;

  return (
    <section
      aria-label="Active alerts"
      className="rounded-xl border border-[color-mix(in_srgb,var(--color-warning)_35%,white)] bg-[color-mix(in_srgb,var(--color-warning)_8%,white)] px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <Bell
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--color-warning)]">
              Attention needed
            </p>
            <Link
              href="/alerts"
              className="text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              View all alerts
            </Link>
          </div>
          <ul className="mt-2 space-y-1.5">
            {active.map((alert) => (
              <li key={alert.id} className="text-sm text-[var(--color-ink)]">
                <Link
                  href={`/patients/${alert.patient_id}`}
                  className="font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  {alert.patient_name ?? "Patient"}
                </Link>
                <span className="text-[var(--color-muted-foreground)]">
                  {" "}
                  — {alert.title}
                  {TYPE_LABELS[alert.alert_type]
                    ? ` · ${TYPE_LABELS[alert.alert_type]}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <span role="status" aria-atomic="true" className="sr-only">
          {active.length} active alert{active.length === 1 ? "" : "s"}
        </span>
      </div>
    </section>
  );
}

export function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-mist)] px-4 py-3">
      <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-ink)]">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function PatientCard({ item }: { item: PatientOverview }) {
  const { patient, progress, ai, activeAlertCount } = item;
  const hasAlerts = activeAlertCount > 0;

  return (
    <Link href={`/patients/${patient.id}`} className="group block">
      <Card className="h-full transition-shadow duration-200 group-hover:shadow-md group-focus-within:ring-2 group-focus-within:ring-[var(--color-ring)]">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{patient.full_name}</CardTitle>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {patient.region ?? "North East India"} · Level{" "}
              {patient.cognitive_level}
            </p>
          </div>
          {hasAlerts ? (
            <Badge variant="warning">
              {activeAlertCount} alert{activeAlertCount === 1 ? "" : "s"}
            </Badge>
          ) : (
            <Badge variant="success">Stable</Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <MetricTile
              label="Sessions"
              value={progress?.total_sessions ?? "—"}
            />
            <MetricTile
              label="Avg score"
              value={progress ? Math.round(progress.average_score) : "—"}
            />
            <MetricTile
              label="Streak"
              value={progress ? `${progress.streak_days}d` : "—"}
            />
          </div>
          {ai?.difficulty.reason ? (
            <p className="mt-4 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
              {ai.difficulty.reason}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

export function PatientAlertsCard({ alerts }: { alerts: Alert[] }) {
  const active = alerts.filter((a) => a.status === "active");
  if (active.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle
            className="h-4 w-4 text-[var(--color-warning)]"
            aria-hidden
          />
          Active alerts
        </CardTitle>
        <Link
          href="/alerts"
          className="text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
        >
          Manage
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {active.map((alert) => (
            <li
              key={alert.id}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    alert.severity === "high"
                      ? "danger"
                      : alert.severity === "medium"
                        ? "warning"
                        : "default"
                  }
                >
                  {alert.severity}
                </Badge>
                <span className="font-medium text-[var(--color-ink)]">
                  {alert.title}
                </span>
              </div>
              <p className="mt-1 text-[var(--color-muted-foreground)]">
                {alert.message}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
