"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardContent, Input } from "@coco/ui";
import { Plus, Search } from "lucide-react";

import type { Patient } from "@coco/shared-types";

import { AddPatientForm } from "@/components/AddPatientForm";

export function PatientsClient({ patients }: { patients: Patient[] }) {
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.region ?? "").toLowerCase().includes(q)
    );
  }, [patients, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients"
            aria-label="Search patients"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {showForm ? "Close form" : "Add patient"}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardContent className="pt-6">
            <AddPatientForm onDone={() => setShowForm(false)} />
          </CardContent>
        </Card>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No patients match your search.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
          {filtered.map((patient) => (
            <li key={patient.id}>
              <Link
                href={`/patients/${patient.id}`}
                className="flex min-h-[56px] items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--color-ink)]">
                    {patient.full_name}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {patient.region ?? "—"} · {patient.preferred_language}
                  </p>
                </div>
                <Badge variant="accent">Level {patient.cognitive_level}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
