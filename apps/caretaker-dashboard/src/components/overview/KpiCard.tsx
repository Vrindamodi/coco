import type { LucideIcon } from "lucide-react";
import { cn } from "@coco/ui";

type KpiCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: {
    label: string;
    tone?: "up" | "down" | "neutral";
  };
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  trend,
}: KpiCardProps) {
  return (
    <article
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-[var(--color-ink)]">
            {value}
          </p>
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-[var(--color-primary)]"
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {trend ? (
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
              trend.tone === "up" &&
                "bg-[color-mix(in_srgb,var(--color-sage)_14%,white)] text-[var(--color-sage)]",
              trend.tone === "down" &&
                "bg-[color-mix(in_srgb,var(--color-destructive)_12%,white)] text-[var(--color-destructive)]",
              (!trend.tone || trend.tone === "neutral") &&
                "bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-[var(--color-primary)]"
            )}
          >
            {trend.label}
          </span>
        ) : null}
        {hint ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">{hint}</p>
        ) : null}
      </div>
    </article>
  );
}
