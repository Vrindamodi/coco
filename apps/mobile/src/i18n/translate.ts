/**
 * Translation lookup with no React and no store behind it, so anything that
 * only needs words — including plain services — can use it without dragging in
 * the persisted auth store.
 */
import {
  normalizeNarratorLanguageCode,
  type NarratorLanguageCode,
} from "@/constants/narratorLanguages";
import { as } from "@/i18n/locales/as";
import { bn } from "@/i18n/locales/bn";
import { en } from "@/i18n/locales/en";
import { hi } from "@/i18n/locales/hi";
import type { Translations } from "@/i18n/types";

const LOCALES: Record<NarratorLanguageCode, Translations> = {
  en,
  hi,
  as,
  bn,
};

export type TranslationPath = {
  [K in keyof Translations]: {
    [P in keyof Translations[K]]: Translations[K][P] extends string
      ? `${K & string}.${P & string}`
      : never;
  }[keyof Translations[K]];
}[keyof Translations];

function getNestedValue(
  translations: Translations,
  path: string
): string | undefined {
  const parts = path.split(".");
  let current: unknown = translations;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;

  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(params[key] ?? "")
  );
}

export function getTranslations(
  code: string | null | undefined
): Translations {
  return LOCALES[normalizeNarratorLanguageCode(code)];
}

export function translate(
  code: string | null | undefined,
  path: string,
  params?: Record<string, string | number>
): string {
  const language = normalizeNarratorLanguageCode(code);
  const value =
    getNestedValue(LOCALES[language], path) ??
    getNestedValue(LOCALES.en, path) ??
    path;

  return interpolate(value, params);
}
