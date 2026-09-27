import type { NarratorLanguageCode } from "@/constants/narratorLanguages";

/**
 * Writing systems we can tell apart. `neutral` covers digits, punctuation and
 * whitespace — characters that carry no evidence about which voice should read
 * them, so they always ride along with whatever segment they sit in.
 */
export type ScriptId = "latin" | "devanagari" | "bengali" | "neutral";

export interface ScriptSegment {
  text: string;
  script: ScriptId;
  code: NarratorLanguageCode;
}

/** Assamese and Bengali share the Bengali block — the code point cannot tell them apart. */
function classifyCodePoint(cp: number): ScriptId {
  if (cp >= 0x0900 && cp <= 0x097f) return "devanagari";
  if (cp >= 0xa8e0 && cp <= 0xa8ff) return "devanagari"; // Devanagari Extended
  if (cp >= 0x0980 && cp <= 0x09ff) return "bengali";
  if (cp >= 0x0041 && cp <= 0x005a) return "latin";
  if (cp >= 0x0061 && cp <= 0x007a) return "latin";
  if (cp >= 0x00c0 && cp <= 0x024f) return "latin";
  return "neutral";
}

export function scriptForLanguage(code: NarratorLanguageCode): ScriptId {
  switch (code) {
    case "hi":
      return "devanagari";
    case "as":
    case "bn":
      return "bengali";
    default:
      return "latin";
  }
}

/**
 * Which language should read text in this script? Bengali script is ambiguous
 * between Assamese and Bengali, so the user's own preference breaks the tie.
 */
export function languageForScript(
  script: ScriptId,
  preferred: NarratorLanguageCode
): NarratorLanguageCode {
  switch (script) {
    case "devanagari":
      return "hi";
    case "bengali":
      return preferred === "as" ? "as" : "bn";
    case "latin":
      return "en";
    default:
      return preferred;
  }
}

/** Dominant script of a string, counting only characters that carry evidence. */
export function detectScript(text: string): ScriptId {
  let latin = 0;
  let devanagari = 0;
  let bengali = 0;

  for (const char of text) {
    switch (classifyCodePoint(char.codePointAt(0) ?? 0)) {
      case "latin":
        latin += 1;
        break;
      case "devanagari":
        devanagari += 1;
        break;
      case "bengali":
        bengali += 1;
        break;
      default:
        break;
    }
  }

  const total = latin + devanagari + bengali;
  if (total === 0) return "neutral";

  // Non-Latin wins on a minority share rather than a majority. The asymmetry is
  // deliberate and matches `isScriptCompatible`: an Indian voice reads embedded
  // English acceptably, while an English voice cannot read a single Indic word.
  // Mislabelling "গুৱাহাটী Medical College ত" as Latin would hand the Assamese
  // to an English engine.
  const indicShareThreshold = 0.3;
  const indic = Math.max(devanagari, bengali);
  if (indic > 0 && indic / total >= indicShareThreshold) {
    return devanagari >= bengali ? "devanagari" : "bengali";
  }

  if (latin >= indic) return "latin";
  return devanagari >= bengali ? "devanagari" : "bengali";
}

/**
 * Can a voice for `code` be trusted with text in `script`?
 *
 * The rule is deliberately asymmetric. Indian voices transliterate Latin text
 * acceptably, so English inside a Bengali sentence is fine. The reverse is not:
 * an English engine has no Bengali or Devanagari coverage and produces
 * spelled-out garbage or silence. Neutral text is safe with anything.
 */
export function isScriptCompatible(
  script: ScriptId,
  code: NarratorLanguageCode
): boolean {
  if (script === "neutral") return true;
  const voiceScript = scriptForLanguage(code);
  if (script === voiceScript) return true;
  // A non-Latin voice may read Latin text; a Latin voice may not read anything else.
  return script === "latin" && voiceScript !== "latin";
}

const DEFAULT_MIN_RUN_CHARS = 8;
/**
 * Switching *to* English needs far more evidence than switching away from it —
 * a single English proper noun inside a Bengali story should stay in the
 * Bengali voice rather than trigger two voice changes around one word.
 */
const LATIN_MIN_RUN_CHARS = 25;
const DEFAULT_MAX_SEGMENTS = 6;

interface RawRun {
  chars: string[];
  script: ScriptId;
  /** Characters that actually carry script evidence — neutrals do not count. */
  weight: number;
}

function pushChar(run: RawRun, char: string, script: ScriptId): void {
  run.chars.push(char);
  if (script !== "neutral") run.weight += 1;
}

function buildRuns(text: string): RawRun[] {
  const runs: RawRun[] = [];

  for (const char of text) {
    const script = classifyCodePoint(char.codePointAt(0) ?? 0);
    const current = runs[runs.length - 1];

    // Neutral characters never open a segment and never close one: they belong
    // to whichever side they were typed against, so `Ramesh (রমেশ)` does not
    // fragment on the parenthesis.
    if (!current) {
      runs.push({ chars: [char], script, weight: script === "neutral" ? 0 : 1 });
      continue;
    }

    if (script === "neutral" || script === current.script) {
      pushChar(current, char, script);
      continue;
    }

    if (current.script === "neutral") {
      current.script = script;
      pushChar(current, char, script);
      continue;
    }

    runs.push({ chars: [char], script, weight: 1 });
  }

  return runs;
}

function isWorthSwitching(run: RawRun, base: ScriptId, minRunChars: number): boolean {
  if (run.script === "neutral" || run.script === base) return false;
  const threshold = run.script === "latin" ? LATIN_MIN_RUN_CHARS : minRunChars;
  return run.weight >= threshold;
}

/**
 * Split mixed-script text so each part can be spoken by a voice that can
 * actually pronounce it. Runs too short to be worth a voice change are folded
 * back into their neighbour, and heavily code-mixed text collapses to a single
 * segment — switching voices every few words is more disorienting than a
 * slightly wrong accent.
 */
export function segmentByScript(
  text: string,
  baseCode: NarratorLanguageCode,
  opts?: { minRunChars?: number; maxSegments?: number }
): ScriptSegment[] {
  if (!text) return [];

  const minRunChars = opts?.minRunChars ?? DEFAULT_MIN_RUN_CHARS;
  const maxSegments = opts?.maxSegments ?? DEFAULT_MAX_SEGMENTS;
  const baseScript = scriptForLanguage(baseCode);

  const detected = detectScript(text);
  const wholeScript = detected === "neutral" ? baseScript : detected;
  const whole: ScriptSegment[] = [
    { text, script: wholeScript, code: languageForScript(wholeScript, baseCode) },
  ];

  const runs = buildRuns(text);
  if (runs.length <= 1) return whole;

  const merged: RawRun[] = [];
  for (const run of runs) {
    const previous = merged[merged.length - 1];

    if (!previous) {
      const script = isWorthSwitching(run, baseScript, minRunChars) ? run.script : baseScript;
      merged.push({ chars: [...run.chars], script, weight: run.weight });
      continue;
    }

    if (run.script === previous.script || !isWorthSwitching(run, baseScript, minRunChars)) {
      previous.chars.push(...run.chars);
      previous.weight += run.weight;
      continue;
    }

    merged.push({ chars: [...run.chars], script: run.script, weight: run.weight });
  }

  if (merged.length <= 1 || merged.length > maxSegments) return whole;

  return merged.map((run) => {
    const script = run.script === "neutral" ? baseScript : run.script;
    return {
      text: run.chars.join(""),
      script,
      code: languageForScript(script, baseCode),
    };
  });
}
