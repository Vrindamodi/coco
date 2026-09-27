"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, cn } from "@coco/ui";
import {
  Bell,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Users,
  X,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/alerts", label: "Alerts", icon: Bell },
];

export type SearchablePatient = {
  id: string;
  full_name: string;
};

type AppShellProps = {
  caregiverName: string;
  activeAlertCount?: number;
  patients?: SearchablePatient[];
  children: React.ReactNode;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AppShell({
  caregiverName,
  activeAlertCount = 0,
  patients = [],
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return patients
      .filter((p) => p.full_name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [patients, query]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goToPatient(id: string) {
    setQuery("");
    setSearchOpen(false);
    setOpen(false);
    router.push(`/patients/${id}`);
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
        Menu
      </p>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        const showBadge = href === "/alerts" && activeAlertCount > 0;
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-200",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{label}</span>
            {showBadge ? (
              <span
                className={cn(
                  "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-[var(--color-destructive)] text-[var(--color-on-destructive)]"
                )}
                aria-label={`${activeAlertCount} active alerts`}
              >
                {activeAlertCount > 99 ? "99+" : activeAlertCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const searchField = (
    <div ref={searchRef} className="relative w-full max-w-xl">
      <label htmlFor="shell-search" className="sr-only">
        Search patients
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
        aria-hidden
      />
      <input
        ref={searchInputRef}
        id="shell-search"
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSearchOpen(true);
        }}
        onFocus={() => setSearchOpen(true)}
        placeholder="Search patients…"
        className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] pr-16 pl-10 text-sm text-[var(--color-foreground)] shadow-sm outline-none transition-shadow placeholder:text-[var(--color-muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        autoComplete="off"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-muted-foreground)] sm:inline-flex">
        ⌘K
      </kbd>
      {searchOpen && (query.trim() || matches.length > 0) ? (
        <div
          role="listbox"
          aria-label="Patient search results"
          className="absolute top-[calc(100%+0.5rem)] left-0 z-40 w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]"
        >
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
              {query.trim()
                ? "No patients match that name."
                : "Type a patient name to search."}
            </p>
          ) : (
            <ul>
              {matches.map((patient) => (
                <li key={patient.id}>
                  <button
                    type="button"
                    role="option"
                    className="flex min-h-[44px] w-full cursor-pointer items-center px-4 text-left text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)] focus-visible:bg-[var(--color-muted)] focus-visible:outline-none"
                    onClick={() => goToPatient(patient.id)}
                  >
                    {patient.full_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-[var(--color-border)] px-4 py-2">
            <Link
              href="/patients"
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
                setOpen(false);
              }}
              className="text-xs font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
            >
              View all patients
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--color-background)]">
      <aside className="hidden h-full w-60 shrink-0 flex-col overflow-y-auto border-r border-[var(--color-border)] bg-[var(--color-sidebar)] px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-[var(--color-on-primary)]"
            aria-hidden
          >
            C
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-[var(--color-ink)]">
              Coco
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Caregiver
            </p>
          </div>
        </div>
        {nav}
        <div className="mt-auto pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start rounded-xl bg-[color-mix(in_srgb,var(--color-destructive)_8%,white)] text-[var(--color-destructive)] hover:bg-[color-mix(in_srgb,var(--color-destructive)_14%,white)] hover:text-[var(--color-destructive)]"
            onClick={signOut}
            disabled={signingOut}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {signingOut ? "Signing out…" : "Log out"}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-30 flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)]/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="outline"
              size="icon"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? (
                <X className="h-5 w-5" aria-hidden />
              ) : (
                <Menu className="h-5 w-5" aria-hidden />
              )}
            </Button>
          </div>

          <div className="hidden flex-1 justify-center md:flex">{searchField}</div>
          <div className="flex flex-1 md:hidden">{searchField}</div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/alerts"
              className="relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              aria-label={
                activeAlertCount > 0
                  ? `Alerts, ${activeAlertCount} active`
                  : "Alerts"
              }
            >
              <Bell className="h-5 w-5" aria-hidden />
              {activeAlertCount > 0 ? (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-destructive)]" />
              ) : null}
            </Link>
            <a
              href="mailto:support@coco-demo.io"
              className="hidden h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:inline-flex"
              aria-label="Help"
            >
              <CircleHelp className="h-5 w-5" aria-hidden />
            </a>
            <div className="ml-1 flex items-center gap-2.5 rounded-xl py-1 pr-1 pl-1 sm:pl-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_14%,white)] text-xs font-semibold text-[var(--color-primary)]"
                aria-hidden
              >
                {initials(caregiverName)}
              </span>
              <div className="hidden min-w-0 lg:block">
                <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                  {caregiverName}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">
                  Caregiver
                </p>
              </div>
            </div>
          </div>
        </header>

        {open ? (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-sidebar)] px-3 py-4 md:hidden">
            {nav}
            <Button
              variant="ghost"
              className="mt-3 w-full justify-start rounded-xl bg-[color-mix(in_srgb,var(--color-destructive)_8%,white)] text-[var(--color-destructive)]"
              onClick={signOut}
              disabled={signingOut}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Log out
            </Button>
          </div>
        ) : null}

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
