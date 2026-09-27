import { Badge, Card, CardContent, CardHeader, CardTitle } from "@coco/ui";

import type { AISummaryResponse } from "@coco/shared-types";

export function AiInsightPanel({ ai }: { ai: AISummaryResponse | null }) {
  if (!ai) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Not enough session data yet for recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { difficulty, personalization, analytics } = ai;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-base">AI insights</CardTitle>
        {analytics.decline_alert ? (
          <Badge variant="warning">Decline alert</Badge>
        ) : (
          <Badge variant="success">{analytics.overall_trend}</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Difficulty
          </p>
          <p className="mt-1 text-sm text-[var(--color-foreground)]">
            Suggested level {difficulty.recommended_level}/5 · {difficulty.decision}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {difficulty.reason}
          </p>
        </div>
        <div className="h-px bg-[var(--color-border)]" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Personalization
          </p>
          <p className="mt-1 text-sm text-[var(--color-foreground)]">
            Focus: {personalization.recommended_domain.replace(/_/g, " ")} ·{" "}
            {personalization.theme_label}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {personalization.reason}
          </p>
        </div>
        <div className="h-px bg-[var(--color-border)]" />
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="7-day sessions" value={analytics.sessions_last_7_days} />
          <Stat label="Total sessions" value={analytics.total_sessions} />
          <Stat
            label="Strongest"
            value={analytics.strongest_domain?.replace(/_/g, " ") ?? "—"}
          />
          <Stat
            label="Weakest"
            value={analytics.weakest_domain?.replace(/_/g, " ") ?? "—"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-0.5 font-medium capitalize text-[var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}
