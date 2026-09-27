import type { NarratorLanguageCode } from "@/constants/narratorLanguages";

export type Daypart = "morning" | "afternoon" | "evening" | "night";

export interface NumberWords {
  /** 0..19 spelled out. */
  ones: string[];
  /** Index 2..9 -> twenty..ninety. Indices 0 and 1 are unused. */
  tens: string[];
  hundred: string;
  /** Joins hundreds with the remainder: "one hundred *and* five". */
  and: string;
  dayparts: Record<Daypart, string>;
  /** Builds the clock phrase from a 12-hour clock reading. */
  buildTime: (hour12: number, minute: number, words: NumberWords) => string;
}

const EN_ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

const HI_ONES = [
  "शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ",
  "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस",
];
const HI_TENS = ["", "", "बीस", "तीस", "चालीस", "पचास", "साठ", "सत्तर", "अस्सी", "नब्बे"];

const BN_ONES = [
  "শূন্য", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়",
  "দশ", "এগারো", "বারো", "তেরো", "চোদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ",
];
const BN_TENS = ["", "", "বিশ", "ত্রিশ", "চল্লিশ", "পঞ্চাশ", "ষাট", "সত্তর", "আশি", "নব্বই"];

const AS_ONES = [
  "শূন্য", "এক", "দুই", "তিনি", "চাৰি", "পাঁচ", "ছয়", "সাত", "আঠ", "ন",
  "দহ", "এঘাৰ", "বাৰ", "তেৰ", "চৈধ্য", "পোন্ধৰ", "ষোল্ল", "সোতৰ", "আঠাৰ", "ঊনৈশ",
];
const AS_TENS = ["", "", "বিশ", "ত্ৰিশ", "চল্লিশ", "পঞ্চাশ", "ষাঠি", "সত্তৰ", "আশী", "নব্বৈ"];

/**
 * English clock phrasing follows Indian-English convention — "half past eight
 * in the morning" rather than a digital "eight thirty AM", which is also what
 * dementia-care guidance recommends.
 */
function buildTimeEn(hour12: number, minute: number, words: NumberWords): string {
  const hourWord = words.ones[hour12];
  const nextHourWord = words.ones[hour12 === 12 ? 1 : hour12 + 1];

  if (minute === 0) return `${hourWord} o'clock`;
  if (minute === 15) return `quarter past ${hourWord}`;
  if (minute === 30) return `half past ${hourWord}`;
  if (minute === 45) return `quarter to ${nextHourWord}`;
  if (minute < 10) return `${hourWord} oh ${words.ones[minute]}`;
  return `${hourWord} ${numberToWordsWith(minute, words)}`;
}

/** Hindi uses dedicated quarter words: सवा / साढ़े / पौने. */
function buildTimeHi(hour12: number, minute: number, words: NumberWords): string {
  const hourWord = words.ones[hour12];
  const nextHourWord = words.ones[hour12 === 12 ? 1 : hour12 + 1];

  if (minute === 0) return `${hourWord} बजे`;
  if (minute === 15) return `सवा ${hourWord} बजे`;
  if (minute === 30) return `साढ़े ${hourWord} बजे`;
  if (minute === 45) return `पौने ${nextHourWord} बजे`;
  return `${hourWord} बजकर ${numberToWordsWith(minute, words)} मिनट`;
}

function buildTimeBn(hour12: number, minute: number, words: NumberWords): string {
  const hourWord = words.ones[hour12];
  const nextHourWord = words.ones[hour12 === 12 ? 1 : hour12 + 1];

  if (minute === 0) return `${hourWord}টা`;
  if (minute === 15) return `সোয়া ${hourWord}টা`;
  if (minute === 30) return `সাড়ে ${hourWord}টা`;
  if (minute === 45) return `পৌনে ${nextHourWord}টা`;
  return `${hourWord}টা ${numberToWordsWith(minute, words)} মিনিট`;
}

function buildTimeAs(hour12: number, minute: number, words: NumberWords): string {
  const hourWord = words.ones[hour12];
  const nextHourWord = words.ones[hour12 === 12 ? 1 : hour12 + 1];

  if (minute === 0) return `${hourWord} বজাত`;
  if (minute === 15) return `সোৱা ${hourWord} বজাত`;
  if (minute === 30) return `সাঢ়ে ${hourWord} বজাত`;
  if (minute === 45) return `পোৱা ${nextHourWord} বজাত`;
  return `${hourWord} বাজি ${numberToWordsWith(minute, words)} মিনিট`;
}

export const NUMBER_WORDS: Record<NarratorLanguageCode, NumberWords> = {
  en: {
    ones: EN_ONES,
    tens: EN_TENS,
    hundred: "hundred",
    and: "and",
    dayparts: {
      morning: "in the morning",
      afternoon: "in the afternoon",
      evening: "in the evening",
      night: "at night",
    },
    buildTime: buildTimeEn,
  },
  hi: {
    ones: HI_ONES,
    tens: HI_TENS,
    hundred: "सौ",
    and: "",
    dayparts: { morning: "सुबह", afternoon: "दोपहर", evening: "शाम", night: "रात" },
    buildTime: buildTimeHi,
  },
  as: {
    ones: AS_ONES,
    tens: AS_TENS,
    hundred: "শ",
    and: "",
    dayparts: { morning: "ৰাতিপুৱা", afternoon: "দুপৰীয়া", evening: "গধূলি", night: "ৰাতি" },
    buildTime: buildTimeAs,
  },
  bn: {
    ones: BN_ONES,
    tens: BN_TENS,
    hundred: "শো",
    and: "",
    dayparts: { morning: "সকালে", afternoon: "দুপুরে", evening: "সন্ধ্যায়", night: "রাতে" },
    buildTime: buildTimeBn,
  },
};

function numberToWordsWith(n: number, words: NumberWords): string {
  if (n < 20) return words.ones[n];
  if (n < 100) {
    const tens = words.tens[Math.floor(n / 10)];
    const rest = n % 10;
    return rest === 0 ? tens : `${tens} ${words.ones[rest]}`;
  }

  const hundreds = `${words.ones[Math.floor(n / 100)]} ${words.hundred}`;
  const rest = n % 100;
  if (rest === 0) return hundreds;
  const joiner = words.and ? ` ${words.and} ` : " ";
  return `${hundreds}${joiner}${numberToWordsWith(rest, words)}`;
}

/**
 * Spells out 0–999. Larger values pass through unchanged: no screen in this app
 * speaks one, and Indian numbering (lakh/crore) is not worth encoding for a
 * case that never happens.
 */
export function numberToWords(n: number, lang: NarratorLanguageCode): string {
  if (!Number.isInteger(n) || n < 0 || n > 999) return String(n);
  return numberToWordsWith(n, NUMBER_WORDS[lang]);
}

export function daypartForHour(hour24: number): Daypart {
  if (hour24 <= 4) return "night";
  if (hour24 <= 11) return "morning";
  if (hour24 <= 16) return "afternoon";
  if (hour24 <= 20) return "evening";
  return "night";
}

/**
 * A 24-hour clock reading as spoken words, with the part of day appended so
 * "eight thirty" is never ambiguous.
 */
export function timeToWords(
  hour24: number,
  minute: number,
  lang: NarratorLanguageCode
): string {
  const words = NUMBER_WORDS[lang];
  const safeHour = ((Math.trunc(hour24) % 24) + 24) % 24;
  const safeMinute = Math.min(59, Math.max(0, Math.trunc(minute)));
  const hour12 = safeHour % 12 === 0 ? 12 : safeHour % 12;
  const daypart = words.dayparts[daypartForHour(safeHour)];

  const clock = words.buildTime(hour12, safeMinute, words);
  // Indic languages lead with the part of day; English trails it.
  return lang === "en" ? `${clock} ${daypart}` : `${daypart} ${clock}`;
}

const DEVANAGARI_ZERO = 0x0966;
const BENGALI_ZERO = 0x09e6;

/** Converts Devanagari and Bengali digits to ASCII so one parser handles them all. */
export function toAsciiDigits(input: string): string {
  let out = "";
  for (const char of input) {
    const cp = char.codePointAt(0) ?? 0;
    if (cp >= DEVANAGARI_ZERO && cp <= DEVANAGARI_ZERO + 9) {
      out += String(cp - DEVANAGARI_ZERO);
    } else if (cp >= BENGALI_ZERO && cp <= BENGALI_ZERO + 9) {
      out += String(cp - BENGALI_ZERO);
    } else {
      out += char;
    }
  }
  return out;
}
