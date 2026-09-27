"use client";

import { useId, useState } from "react";

export type ActivityBar = {
  id: string;
  label: string;
  value: number;
};

type ActivityBarChartProps = {
  title?: string;
  data: ActivityBar[];
};

export function ActivityBarChart({
  title = "Session activity",
  data,
}: ActivityBarChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const [activeId, setActiveId] = useState<string | null>(
    data.length > 0
      ? data.reduce((best, item) => (item.value > best.value ? item : best)).id
      : null
  );

  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 640;
  const height = 260;
  const padX = 28;
  const padY = 24;
  const chartH = height - padY * 2;
  const chartW = width - padX * 2;
  const gap = 12;
  const barW =
    data.length === 0
      ? 0
      : Math.min(48, (chartW - gap * (data.length - 1)) / data.length);

  const active = data.find((d) => d.id === activeId) ?? null;

  return (
    <section
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
      aria-label={title}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">
          {title}
        </h2>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Sessions by patient
        </p>
      </div>

      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--color-muted-foreground)]">
          No session data yet.
        </p>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-[220px] w-full"
            role="img"
            aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
              <pattern
                id={`${gradientId}-stripe`}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill="#93c5fd" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke="#2563eb"
                  strokeWidth="2"
                />
              </pattern>
            </defs>

            {[0.25, 0.5, 0.75, 1].map((t) => {
              const y = padY + chartH * (1 - t);
              return (
                <line
                  key={t}
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                />
              );
            })}

            {data.map((item, i) => {
              const h = (item.value / max) * chartH;
              const x = padX + i * (barW + gap);
              const y = padY + chartH - h;
              const isActive = item.id === activeId;
              return (
                <g key={item.id}>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, 4)}
                    rx={8}
                    fill={
                      isActive
                        ? `url(#${gradientId})`
                        : `url(#${gradientId}-stripe)`
                    }
                    opacity={isActive ? 1 : 0.85}
                    className="cursor-pointer transition-opacity"
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.label}: ${item.value} sessions`}
                    onMouseEnter={() => setActiveId(item.id)}
                    onFocus={() => setActiveId(item.id)}
                    onClick={() => setActiveId(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveId(item.id);
                      }
                    }}
                  />
                  <text
                    x={x + barW / 2}
                    y={height - 6}
                    textAnchor="middle"
                    className="fill-[var(--color-muted-foreground)] text-[10px]"
                  >
                    {item.label.length > 8
                      ? `${item.label.slice(0, 7)}…`
                      : item.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {active ? (
            <div
              className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary)] shadow-md"
              aria-live="polite"
            >
              {active.label}: {active.value} sessions
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
