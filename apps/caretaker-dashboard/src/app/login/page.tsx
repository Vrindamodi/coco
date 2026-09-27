import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@coco/ui";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--color-background)] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--color-primary)_12%,transparent),_transparent_55%)]"
      />
      <Card className="relative w-full max-w-md border-[var(--color-border)] shadow-[var(--shadow-card)]">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-[var(--color-on-primary)]"
              aria-hidden
            >
              C
            </span>
            <p className="text-sm font-semibold tracking-tight text-[var(--color-ink)]">
              Coco
            </p>
          </div>
          <CardTitle className="text-2xl">Caregiver sign in</CardTitle>
          <CardDescription>
            Monitor cognitive activity and reminders for patients in your care.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm text-[var(--color-muted-foreground)]">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
