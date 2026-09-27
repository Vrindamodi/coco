export type NarratorLanguageCode = "en" | "hi" | "as" | "bn";

export interface NarratorLanguage {
  code: NarratorLanguageCode;
  label: string;
  nativeLabel: string;
  speechLocale: string;
}

export const NARRATOR_LANGUAGES: NarratorLanguage[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    speechLocale: "en-IN",
  },
  {
    code: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    speechLocale: "hi-IN",
  },
  {
    code: "as",
    label: "Assamese",
    nativeLabel: "অসমীয়া",
    speechLocale: "as-IN",
  },
  {
    code: "bn",
    label: "Bengali",
    nativeLabel: "বাংলা",
    speechLocale: "bn-IN",
  },
];

const LANGUAGE_BY_CODE = Object.fromEntries(
  NARRATOR_LANGUAGES.map((lang) => [lang.code, lang])
) as Record<NarratorLanguageCode, NarratorLanguage>;

export function normalizeNarratorLanguageCode(
  value: string | null | undefined
): NarratorLanguageCode {
  if (value && value in LANGUAGE_BY_CODE) {
    return value as NarratorLanguageCode;
  }
  return "en";
}

export function getNarratorLanguage(
  code: string | null | undefined
): NarratorLanguage {
  return LANGUAGE_BY_CODE[normalizeNarratorLanguageCode(code)];
}

export function getSpeechLocale(code: string | null | undefined): string {
  return getNarratorLanguage(code).speechLocale;
}
