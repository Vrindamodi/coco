import Link from "next/link";
import { Activity, Bell, Sparkles, Users } from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { AlertStrip, PatientCard } from "@/components/PatientCard";
import { ActivityBarChart } from "@/components/overview/ActivityBarChart";
import { BreakdownChart } from "@/components/overview/BreakdownChart";
import { KpiCard } from "@/components/overview/KpiCard";
import { RecentPatientsTable } from "@/components/overview/RecentPatientsTable";
import {
  getAlertsSummary,
  listAlerts,
  loadPatientOverviews,
} from "@/server/caregiver-api";

const TYPE_LABELS: Record<string, string> = {
  cognitive_decline: "Decline",
  inactivity: "Inactivity",
  missed_reminder: "Reminders",
};

const TYPE_TONES = ["primary", "ink", "warning"] as const;

export default async function OverviewPage() {
  const [items, alerts, summary] = await Promise.all([
    loadPatientOverviews(),
    listAlerts({ status: "active", limit: 10 }).catch(() => []),
    getAlertsSummary().catch(() => null),
  ]);

  const totalSessions = items.reduce(
    (sum, item) => sum + (item.progress?.total_sessions ?? 0),
    0
  );
  const scored = items.filter((item) => item.progress != null);
  const avgScore =
    scored.length === 0
      ? null
      : scored.reduce((sum, item) => sum + (item.progress?.average_score ?? 0), 0) /
        scored.length;
  const activeAlerts = summary?.active_count ?? alerts.length;
  const highAlerts = summary?.high_count ?? 0;
  const patientsWithAlerts = items.filter((i) => i.activeAlertCount > 0).length;

  const activityData = items
    .map((item) => ({
      id: item.patient.id,
      label: item.patient.full_name.split(" ")[0] ?? item.patient.full_name,
      value: item.progress?.total_sessions ?? 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const byType = summary?.by_type ?? {};
  const breakdownItems = (["cognitive_decline", "inactivity", "missed_reminder"] as const).map(
    (type, index) => ({
      id: type,
      label: TYPE_LABELS[type] ?? type,
      value: byType[type] ?? 0,
      tone: TYPE_TONES[index] ?? ("sage" as const),
    })
  );

  const tableRows = items.map((item) => ({
    id: item.patient.id,
    name: item.patient.full_name,
    region: item.patient.region ?? "North East India",
    level: item.patient.cognitive_level,
    sessions: item.progress?.total_sessions ?? 0,
    avgScore: item.progress?.average_score ?? null,
    alertCount: item.activeAlertCount,
    status: (item.activeAlertCount > 0 ? "attention" : "stable") as
      | "attention"
      | "stable",
  }));

  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Care overview
          </h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Cognitive activity, alerts, and patient status at a glance.
          </p>
        </div>
        <p className="inline-flex h-10 items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-muted-foreground)] shadow-sm">
          {todayLabel}
        </p>
      </header>

      <AlertStrip alerts={alerts} />

      {items.length === 0 ? (
        <EmptyState
          title="No patients yet"
          description="Add a patient to start tracking games, reminders, and cognitive progress."
          action={
            <Link
              href="/patients"
              className="inline-flex h-11 min-h-[44px] cursor-pointer items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-on-primary)] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              Go to patients
            </Link>
          }
        />
      ) : (
        <>
          <section
            aria-label="Key metrics"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <KpiCard
              label="Active patients"
              value={items.length}
              icon={Users}
              hint="Under your care"
              trend={
                patientsWithAlerts > 0
                  ? {
                      label: `${patientsWithAlerts} need attention`,
                      tone: "neutral",
                    }
                  : { label: "All stable", tone: "up" }
              }
            />
            <KpiCard
              label="Active alerts"
              value={activeAlerts}
              icon={Bell}
              hint={highAlerts > 0 ? `${highAlerts} high severity` : "Open items"}
              trend={
                activeAlerts > 0
                  ? { label: "Needs review", tone: "down" }
                  : { label: "Clear", tone: "up" }
              }
            />
            <KpiCard
              label="Total sessions"
              value={totalSessions}
              icon={Activity}
              hint="Across all patients"
            />
            <KpiCard
              label="Avg score"
              value={avgScore == null ? "—" : Math.round(avgScore)}
              icon={Sparkles}
              hint={scored.length > 0 ? `From ${scored.length} patients` : "No scores yet"}
              trend={
                avgScore != null && avgScore >= 70
                  ? { label: "Strong", tone: "up" }
                  : avgScore != null
                    ? { label: "Monitor", tone: "neutral" }
                    : undefined
              }
            />
          </section>

          <section
            aria-label="Analytics"
            className="grid gap-4 lg:grid-cols-3"
          >
            <div className="lg:col-span-2">
              <ActivityBarChart data={activityData} />
            </div>
            <BreakdownChart items={breakdownItems} />
          </section>

          <RecentPatientsTable rows={tableRows} />

          <section aria-label="Patients">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-ink)]">
                Patient cards
              </h2>
              <Link
                href="/patients"
                className="text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                View all
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <PatientCard key={item.patient.id} item={item} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
