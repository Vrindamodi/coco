import type { NarratorLanguageCode } from "@/constants/narratorLanguages";
import { getTranslations, translate } from "@/i18n/translate";
// Straight from the pure formatter rather than the speech barrel, which
// would pull the engine and its persisted settings in behind it.
import { timeToWords } from "@/services/speech/numberFormats";
import type { Reminder } from "@/types/api";

type SpeakableReminder = Pick<
  Reminder,
  "title" | "reminder_type" | "scheduled_at" | "is_done"
>;

/**
 * The clock time in words.
 *
 * Deliberately not `toLocaleTimeString`: that follows the *device* locale
 * rather than the app language, and Hermes on Android ships a reduced `Intl`
 * that can ignore the options object outright.
 */
export function formatReminderTime(
  scheduledAt: string,
  lang: NarratorLanguageCode
): string {
  const date = new Date(scheduledAt);
  if (Number.isNaN(date.getTime())) return "";
  return timeToWords(date.getHours(), date.getMinutes(), lang);
}

/**
 * What a reminder sounds like when read aloud, e.g.
 * "Medicine. Metformin. At half past eight in the morning."
 */
export function buildReminderUtterance(
  reminder: SpeakableReminder,
  lang: NarratorLanguageCode
): string {
  const typeLabel = getTranslations(lang).reminderTypes[reminder.reminder_type];
  const time = formatReminderTime(reminder.scheduled_at, lang);

  const parts = [typeLabel, reminder.title];
  if (time) parts.push(translate(lang, "reminders.atTime", { time }));
  if (reminder.is_done) parts.push(translate(lang, "reminders.alreadyDone"));

  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (/[.।!?]$/.test(part) ? part : `${part}.`))
    .join(" ");
}
