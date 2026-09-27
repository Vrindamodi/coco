"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Badge, Button } from "@coco/ui";

import type { Alert, AlertStatus } from "@coco/shared-types";

import { EmptyState } from "@/components/EmptyState";
import { formatDateTime } from "@/lib/format-date";
import { updateAlertAction } from "@/server/actions";

const TYPE_LABELS: Record<string, string> = {
  cognitive_decline: "Cognitive decline",
  inactivity: "Inactivity",
  missed_reminder: "Missed reminder",
};

const FILTERS: { id: "all" | "active" | "acknowledged"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "acknowledged", label: "Acknowledged" },
];

function severityVariant(severity: string) {
  if (severity === "high") return "danger" as const;
  if (severity === "medium") return "warning" as const;
  return "default" as const;
}

export function AlertsClient({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "active" | "acknowledged">("active");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return alerts.filter((a) => a.status !== "resolved");
    }
    return alerts.filter((a) => a.status === filter);
  }, [alerts, filter]);

  function onUpdate(id: string, status: Extract<AlertStatus, "acknowledged" | "resolved">) {
    setError(null);
    startTransition(async () => {
      try {
        await updateAlertAction(id, { status });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update alert");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Alert filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`inline-flex min-h-[40px] cursor-pointer items-center rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
              filter === item.id
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No alerts here"
          description="When cognitive decline, inactivity, or missed reminders are detected, they will appear in this feed."
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((alert) => (
            <li
              key={alert.id}
              className="rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityVariant(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <Badge variant="default">
                      {TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                    </Badge>
                    <Badge variant="accent">{alert.status}</Badge>
                  </div>
                  <p className="font-semibold text-[var(--color-ink)]">
                    {alert.title}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {alert.message}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    <Link
                      href={`/patients/${alert.patient_id}`}
                      className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
                    >
                      {alert.patient_name ?? "Patient"}
                    </Link>
                    {" · "}
                    {formatDateTime(alert.created_at)}
                  </p>
                </div>
                {alert.status === "active" ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => onUpdate(alert.id, "acknowledged")}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      onClick={() => onUpdate(alert.id, "resolved")}
                    >
                      Resolve
                    </Button>
                  </div>
                ) : alert.status === "acknowledged" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => onUpdate(alert.id, "resolved")}
                  >
                    Resolve
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
