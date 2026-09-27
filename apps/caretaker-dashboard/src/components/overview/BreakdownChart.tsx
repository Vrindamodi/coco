"use client";

export type BreakdownItem = {
  id: string;
  label: string;
  value: number;
  tone: "primary" | "ink" | "warning" | "sage";
};

type BreakdownChartProps = {
  title?: string;
  items: BreakdownItem[];
};

const TONE_FILL: Record<BreakdownItem["tone"], string> = {
  primary: "#2563eb",
  ink: "#1e293b",
  warning: "#d97706",
  sage: "#059669",
};

export function BreakdownChart({
  title = "Alert mix",
  items,
}: BreakdownChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const total = items.reduce((sum, i) => sum + i.value, 0);

  return (
    <section
      className="flex h-full flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
      aria-label={title}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">
          {title}
        </h2>
        <ul className="flex flex-wrap justify-end gap-3 text-[11px] text-[var(--color-muted-foreground)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-sm"
                style={{ background: TONE_FILL[item.tone] }}
                aria-hidden
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {total === 0 ? (
        <p className="flex flex-1 items-center justify-center py-12 text-center text-sm text-[var(--color-muted-foreground)]">
          No alerts in this period.
        </p>
      ) : (
        <>
          <div
            className="flex flex-1 items-end justify-between gap-3 px-1 pt-4"
            role="img"
            aria-label={items.map((i) => `${i.label} ${i.value}`).join(", ")}
          >
            {items.map((item) => {
              const h = Math.max(12, (item.value / max) * 160);
              return (
                <div
                  key={item.id}
                  className="flex flex-1 flex-col items-center gap-2"
                >
                  <span className="text-xs font-semibold tabular-nums text-[var(--color-ink)]">
                    {item.value}
                  </span>
                  <div
                    className="w-full max-w-[48px] rounded-t-lg"
                    style={{
                      height: h,
                      background:
                        item.tone === "primary"
                          ? `repeating-linear-gradient(
                              -45deg,
                              #2563eb,
                              #2563eb 4px,
                              #60a5fa 4px,
                              #60a5fa 8px
                            )`
                          : TONE_FILL[item.tone],
                    }}
                    title={`${item.label}: ${item.value}`}
                  />
                  <span className="text-center text-[10px] text-[var(--color-muted-foreground)]">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-[var(--color-muted-foreground)]">
            {total} total alert{total === 1 ? "" : "s"} by type
          </p>
        </>
      )}
    </section>
  );
}
