import { listAlerts } from "@/server/caregiver-api";

import { AlertsClient } from "./alerts-client";

export default async function AlertsPage() {
  const alerts = await listAlerts({ limit: 100 }).catch(() => []);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          Alerts
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Cognitive decline, inactivity, and missed reminders across patients in
          your care.
        </p>
      </header>

      <AlertsClient alerts={alerts} />
    </div>
  );
}
