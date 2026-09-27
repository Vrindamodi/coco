import type { NarratorLanguageCode } from "@/constants/narratorLanguages";

import { NUMBER_WORDS, numberToWords, timeToWords, toAsciiDigits } from "./numberFormats";

export interface NormalizeOptions {
  language: NarratorLanguageCode;
  /** Off only for tests that want to inspect an earlier stage. */
  expandNumbers?: boolean;
}

const LINK_WORD: Record<NarratorLanguageCode, string> = {
  en: "a link",
  hi: "एक लिंक",
  as: "এটা লিংক",
  bn: "একটি লিংক",
};

const AND_WORD: Record<NarratorLanguageCode, string> = {
  en: "and",
  hi: "और",
  as: "আৰু",
  bn: "এবং",
};

const PERCENT_WORD: Record<NarratorLanguageCode, string> = {
  en: "percent",
  hi: "प्रतिशत",
  as: "শতাংশ",
  bn: "শতাংশ",
};

const RUPEES_WORD: Record<NarratorLanguageCode, string> = {
  en: "rupees",
  hi: "रुपये",
  as: "টকা",
  bn: "টাকা",
};

/**
 * A five-entry stand-in for a pronunciation lexicon. The app name is spoken on
 * the splash screen in every language, so getting just these right buys most of
 * what a real lexicon would at a fraction of the cost.
 */
const PRONUNCIATION_OVERRIDES: Record<NarratorLanguageCode, Array<[RegExp, string]>> = {
  en: [[/\bPIN\b/g, "pin"]],
  hi: [
    [/\bCoco\b/gi, "कोको"],
    [/\bMy World\b/gi, "मेरी दुनिया"],
    [/\bPIN\b/g, "पिन"],
  ],
  as: [
    [/\bCoco\b/gi, "ক’ক’"],
    [/\bMy World\b/gi, "মোৰ পৃথিৱী"],
    [/\bPIN\b/g, "পিন"],
  ],
  bn: [
    [/\bCoco\b/gi, "কোকো"],
    [/\bMy World\b/gi, "আমার পৃথিবী"],
    [/\bPIN\b/g, "পিন"],
  ],
};

/**
 * Paragraph breaks become sentence breaks and single newlines become pauses.
 * This has to happen before whitespace is collapsed — caregiver-written stories
 * are typed with line breaks, which are the only prosody signal they carry.
 */
export function normalizeLineBreaks(input: string): string {
  return input.replace(/\r\n?/g, "\n").replace(/\n{2,}/g, ". ").replace(/\n/g, ", ");
}

/** The voice assistant replies in markdown, which is otherwise read as "asterisk asterisk". */
export function stripMarkdown(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, ", ")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*([-*_])\s*\1\s*\1[\s\S]*?$/gm, " ");
}

/**
 * Explicit code point ranges rather than `\p{Extended_Pictographic}` — Hermes'
 * support for Unicode property escapes varies by build, and this is not worth a
 * runtime surprise on a patient's phone.
 */
const EMOJI_PATTERN =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}\u{FE0F}]/gu;

export function stripEmoji(input: string): string {
  return input.replace(EMOJI_PATTERN, " ");
}

/** Reading a URL character by character is the worst thing a screen reader can do. */
export function expandUrls(input: string, lang: NarratorLanguageCode): string {
  const link = LINK_WORD[lang];
  return input
    .replace(/https?:\/\/\S+/gi, link)
    .replace(/\bwww\.\S+/gi, link)
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, link);
}

/**
 * In Assamese a consonant followed by ’ is a vowel (ক’ক’ is the app's own
 * name), not a quote. Only that ’ survives; every other curly quote goes.
 */
const ASSAMESE_O_CARRIER = /[\u0995-\u09B9\u09DC-\u09DF\u09F0\u09F1]/;

function stripCurlyQuotes(input: string): string {
  // Offset-based rather than a lookbehind — Hermes support for lookbehind
  // varies by build, and adjacent quotes must all be removed.
  return input.replace(/[‘’“”]/g, (quote: string, offset: number, whole: string) =>
    quote === "’" && ASSAMESE_O_CARRIER.test(whole[offset - 1] ?? "") ? quote : ""
  );
}

export function normalizePunctuation(input: string, lang: NarratorLanguageCode): string {
  return (
    stripCurlyQuotes(input)
      .replace(/…|\.{3,}/g, ". ")
      // Whitespace-delimited only, so "e-mail" and "post-op" survive intact.
      .replace(/\s+[—–-]\s+/g, ", ")
      .replace(/[·•|]/g, ", ")
      .replace(/([!?])\1+/g, "$1")
      .replace(/\s*&\s*/g, ` ${AND_WORD[lang]} `)
      .replace(/(\d)\s*%/g, `$1 ${PERCENT_WORD[lang]}`)
      .replace(/(?:₹|\bRs\.?)\s*(\d[\d,]*)/gi, `$1 ${RUPEES_WORD[lang]}`)
      .replace(/\s*,\s*(?=[,.])/g, "")
  );
}

const ABBREVIATIONS_EN: Array<[RegExp, string]> = [
  [/\bDr\./g, "Doctor"],
  [/\bMr\./g, "Mister"],
  [/\bMrs\./g, "Missus"],
  [/\bMs\./g, "Miss"],
  [/\bSt\./g, "Saint"],
  [/\bNo\.\s*(?=\d)/g, "number "],
];

export function expandAbbreviations(input: string, lang: NarratorLanguageCode): string {
  if (lang !== "en") return input;
  return ABBREVIATIONS_EN.reduce((text, [pattern, word]) => text.replace(pattern, word), input);
}

/**
 * Digits are the single biggest accuracy problem for the Indic voices: ASCII
 * numerals embedded in Devanagari or Bengali text are read out in English, or
 * skipped entirely. Spelling them out in-script is what fixes it.
 */
export function expandNumbersAndTimes(input: string, lang: NarratorLanguageCode): string {
  const ascii = toAsciiDigits(input);

  return (
    ascii
      // Times first — otherwise the hour and minute are expanded as two numbers.
      .replace(
        /\b(\d{1,2}):(\d{2})\s*(a\.?m|p\.?m)?(\.)?/gi,
        (
          match: string,
          rawHour: string,
          rawMinute: string,
          meridiem: string | undefined,
          trailingDot: string | undefined,
          offset: number,
          whole: string
        ) => {
          let hour = Number(rawHour);
          const minute = Number(rawMinute);
          if (hour > 23 || minute > 59) return match;

          if (meridiem) {
            const isPm = /^p/i.test(meridiem);
            if (hour === 12) hour = isPm ? 12 : 0;
            else if (isPm) hour += 12;
          }

          const words = timeToWords(hour, minute, lang);
          if (!trailingDot) return words;

          // The dot after "AM" is either the abbreviation's own or the end of
          // the sentence. Keep it only when what follows looks like a new
          // sentence, so "8:30 A.M. today" does not gain a false full stop.
          const rest = whole.slice(offset + match.length);
          const endsSentence = /^\s*$/.test(rest) || /^\s+[^a-z]/.test(rest);
          return endsSentence ? `${words}.` : words;
        }
      )
      // Strip Western and Indian digit grouping alike (250,000 and 2,50,000).
      .replace(/(\d),(?=\d)/g, "$1")
      .replace(/\b\d+\b/g, (digits) => {
        const value = Number(digits);
        return value <= 999 ? numberToWords(value, lang) : digits;
      })
  );
}

export function applyPronunciationOverrides(
  input: string,
  lang: NarratorLanguageCode
): string {
  return PRONUNCIATION_OVERRIDES[lang].reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    input
  );
}

export function collapseWhitespace(input: string): string {
  return (
    input
      .replace(/\s+/g, " ")
      // Stripping an emoji or a URL leaves a gap before the punctuation that
      // followed it, which some engines read as a stray pause.
      .replace(/\s+([,.!?;:।॥])/g, "$1")
      .trim()
  );
}

/**
 * Turns text written to be *read* into text worth *hearing*. Order matters
 * throughout — see the individual steps.
 *
 * Deliberately does not insert pauses as punctuation: expo-speech has no SSML
 * and the extra-period trick behaves differently on every engine. Real pauses
 * are timed gaps between chunks, handled by the engine.
 */
export function normalizeForSpeech(input: string, options: NormalizeOptions): string {
  const { language, expandNumbers = true } = options;
  if (!input) return "";

  let text = normalizeLineBreaks(input);
  text = stripMarkdown(text);
  text = stripEmoji(text);
  text = expandUrls(text, language);
  text = normalizePunctuation(text, language);
  text = expandAbbreviations(text, language);
  if (expandNumbers) text = expandNumbersAndTimes(text, language);
  text = applyPronunciationOverrides(text, language);
  return collapseWhitespace(text);
}

/** Joins names the way a person would: "Ravi, Meera and Anil". */
export function joinForSpeech(items: string[], lang: NarratorLanguageCode): string {
  const parts = items.map((item) => item.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const and = AND_WORD[lang];
  return `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1]}`;
}

export { NUMBER_WORDS };
