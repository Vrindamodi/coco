"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@coco/ui";

export type PatientRow = {
  id: string;
  name: string;
  region: string;
  level: number;
  sessions: number;
  avgScore: number | null;
  alertCount: number;
  status: "attention" | "stable";
};

type SortKey = "name" | "sessions" | "avgScore" | "alertCount" | "level";

type RecentPatientsTableProps = {
  rows: PatientRow[];
};

export function RecentPatientsTable({ rows }: RecentPatientsTableProps) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("alertCount");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.region.toLowerCase().includes(q)
        )
      : [...rows];

    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "sessions") return b.sessions - a.sessions;
      if (sortBy === "avgScore")
        return (b.avgScore ?? -1) - (a.avgScore ?? -1);
      if (sortBy === "level") return b.level - a.level;
      return b.alertCount - a.alertCount || a.name.localeCompare(b.name);
    });
    return list;
  }, [rows, query, sortBy]);

  return (
    <section
      className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]"
      aria-label="Patient activity"
    >
      <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">
          Patient activity
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <label htmlFor="table-search" className="sr-only">
              Search table
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
            <input
              id="table-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:w-48"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
            <span className="whitespace-nowrap">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-10 cursor-pointer rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-[var(--color-foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            >
              <option value="alertCount">Alerts</option>
              <option value="name">Name</option>
              <option value="sessions">Sessions</option>
              <option value="avgScore">Avg score</option>
              <option value="level">Level</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
          No patients match this search.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-xs font-semibold tracking-wide text-[var(--color-muted-foreground)] uppercase">
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-5 py-3 font-semibold">Region</th>
                <th className="px-5 py-3 font-semibold">Level</th>
                <th className="px-5 py-3 font-semibold">Sessions</th>
                <th className="px-5 py-3 font-semibold">Avg score</th>
                <th className="px-5 py-3 font-semibold">Alerts</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--color-border)] last:border-0"
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/patients/${row.id}`}
                      className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-muted-foreground)]">
                    {row.region}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-[var(--color-ink)]">
                    {row.level}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-[var(--color-ink)]">
                    {row.sessions}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-[var(--color-ink)]">
                    {row.avgScore == null ? "—" : Math.round(row.avgScore)}
                  </td>
                  <td className="px-5 py-3.5 tabular-nums text-[var(--color-ink)]">
                    {row.alertCount}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        row.status === "attention"
                          ? "bg-[color-mix(in_srgb,var(--color-warning)_16%,white)] text-[var(--color-warning)]"
                          : "bg-[color-mix(in_srgb,var(--color-sage)_14%,white)] text-[var(--color-sage)]"
                      )}
                    >
                      {row.status === "attention" ? "Attention" : "Stable"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
