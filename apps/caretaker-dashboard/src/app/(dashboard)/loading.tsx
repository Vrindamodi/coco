export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-[var(--color-muted)]" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-[var(--color-muted)]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl bg-[var(--color-muted)]"
          />
        ))}
      </div>
    </div>
  );
}
