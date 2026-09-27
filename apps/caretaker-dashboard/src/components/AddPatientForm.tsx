"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label } from "@coco/ui";

import { createPatientAction } from "@/server/actions";

export function AddPatientForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [region, setRegion] = useState("");
  const [language, setLanguage] = useState("en");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const patient = await createPatientAction({
        full_name: fullName.trim(),
        region: region.trim() || null,
        preferred_language: language,
        pin: pin.trim() || null,
      });
      onDone?.();
      router.push(`/patients/${patient.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create patient");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Patient name"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Input
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Assam"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="as">Assamese</option>
            <option value="bn">Bengali</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pin">App PIN (optional)</Label>
        <Input
          id="pin"
          type="password"
          inputMode="numeric"
          minLength={4}
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="4–8 digits"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={loading || !fullName.trim()}>
        {loading ? "Saving…" : "Add patient"}
      </Button>
    </form>
  );
}
