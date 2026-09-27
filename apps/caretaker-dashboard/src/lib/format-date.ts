/**
 * Locale- and timezone-stable date formatting.
 *
 * `toLocaleDateString` / `toLocaleTimeString` resolve the locale and timezone
 * from their environment: the server's during SSR, the viewer's in the
 * browser. When those differ (an en-GB viewer against an en-US server, say)
 * React reports a hydration mismatch and drops interactivity for the entire
 * subtree — every button on the page silently stops working.
 *
 * Pinning both to the deployment's own locale and timezone makes server and
 * client render the same string, and keeps the times meaningful to the
 * caregivers actually using this dashboard.
 */

const LOCALE = "en-GB";
const TIME_ZONE = process.env.NEXT_PUBLIC_DISPLAY_TIME_ZONE ?? "Asia/Kolkata";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * "14 Apr 1998".
 *
 * A date-only value (`memory_date`) carries no time, so it is read straight
 * out of the string — running it through a timezone would shift it by a day.
 */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const label = MONTHS[Number(month) - 1];
    return label ? `${Number(day)} ${label} ${year}` : null;
  }

  const parsed = parse(value);
  return parsed ? dateFormat.format(parsed) : null;
}

/** "09:30" — 24-hour, so there is no AM/PM locale difference. */
export function formatTime(value: string | null | undefined): string | null {
  const parsed = parse(value);
  return parsed ? timeFormat.format(parsed) : null;
}

/** "14 Apr 1998, 09:30" */
export function formatDateTime(value: string | null | undefined): string | null {
  const parsed = parse(value);
  if (!parsed) return null;
  return `${dateFormat.format(parsed)}, ${timeFormat.format(parsed)}`;
}
