import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold text-[var(--color-ink)]">
        Patient not found
      </h1>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
        This patient may have been removed or you do not have access.
      </p>
      <Link
        href="/patients"
        className="mt-6 inline-flex h-11 items-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-on-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
      >
        Back to patients
      </Link>
    </div>
  );
}
