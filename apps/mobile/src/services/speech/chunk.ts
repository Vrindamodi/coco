import * as Speech from "expo-speech";

export interface SpeechChunk {
  text: string;
  /** True when this chunk ends a sentence, so the engine can insert a real pause. */
  endsSentence: boolean;
}

/**
 * Our own cap, well below any platform limit. Short chunks buy three things a
 * single long utterance cannot: cancellation checkpoints inside a long story, a
 * tight duration estimate for the stall watchdog, and somewhere to put real
 * pauses between sentences.
 */
const SAFE_CAP = 220;
const MIN_CAP = 80;

export function getMaxChunkLength(): number {
  const platformLimit = Speech.maxSpeechInputLength;
  // iOS does not define this and expo-speech falls back to Number.MAX_VALUE,
  // which passes Number.isFinite — so the bound has to be checked explicitly.
  const usable =
    typeof platformLimit === "number" && platformLimit > 0 && platformLimit < 10_000
      ? platformLimit - 1
      : SAFE_CAP;
  return Math.max(MIN_CAP, Math.min(usable, SAFE_CAP));
}

/** Danda and double danda end sentences in Devanagari and Bengali script. */
const SENTENCE_ENDERS = new Set([".", "?", "!", "।", "॥"]);
const ABBREVIATIONS = ["dr", "mr", "mrs", "ms", "st", "no", "etc", "vs", "fig"];

function endsWithAbbreviation(buffer: string): boolean {
  const match = /([A-Za-z]+)\.$/.exec(buffer);
  if (!match) return false;
  return ABBREVIATIONS.includes(match[1].toLowerCase());
}

/**
 * A hand-written scanner rather than a lookbehind regex: Hermes' lookbehind
 * support varies by React Native and Android build, and a regex that silently
 * fails to compile on one device is not worth the brevity.
 */
function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let buffer = "";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    buffer += char;

    if (!SENTENCE_ENDERS.has(char)) continue;

    // Swallow runs like "?!" and any closing quote or bracket.
    let j = i + 1;
    while (j < text.length && (SENTENCE_ENDERS.has(text[j]) || /["')\]]/.test(text[j]))) {
      buffer += text[j];
      j += 1;
    }

    const next = text.slice(j).match(/\S/)?.[0];
    const isBoundary = j >= text.length || /\s/.test(text[j] ?? " ");
    // A decimal point ("3.5") or a mid-sentence abbreviation is not a boundary.
    const looksLikeContinuation = next != null && (/[a-z0-9]/.test(next) || endsWithAbbreviation(buffer));

    i = j - 1;

    if (isBoundary && !looksLikeContinuation) {
      sentences.push(buffer.trim());
      buffer = "";
    }
  }

  if (buffer.trim()) sentences.push(buffer.trim());
  return sentences;
}

/**
 * Break an over-long sentence at the latest safe point. Splitting is always at a
 * separator or a space — never mid-word, and never by code unit, which would
 * cut a Bengali conjunct apart from its joiner.
 */
function splitLongSentence(sentence: string, maxLen: number): string[] {
  const pieces: string[] = [];
  let rest = sentence;

  while (rest.length > maxLen) {
    const window = rest.slice(0, maxLen + 1);
    const cut =
      Math.max(window.lastIndexOf("।"), window.lastIndexOf("; "), window.lastIndexOf(", ")) + 1 ||
      window.lastIndexOf(" ");

    if (cut <= 0) {
      // A single unbroken token longer than the cap: emit it whole rather than
      // slicing a word (or a grapheme cluster) in half.
      const space = rest.indexOf(" ");
      if (space === -1) break;
      pieces.push(rest.slice(0, space).trim());
      rest = rest.slice(space + 1);
      continue;
    }

    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  if (rest.trim()) pieces.push(rest.trim());
  return pieces.filter(Boolean);
}

const HAS_CONTENT = /[\p{L}\p{N}]/u;

function hasSpeakableContent(text: string): boolean {
  try {
    return HAS_CONTENT.test(text);
  } catch {
    // Property escapes are unavailable on this engine — fall back to "not blank".
    return /\S/.test(text);
  }
}

/**
 * Splits text into utterances the engine can speak without truncation, packing
 * whole sentences together where they fit.
 */
export function chunkForSpeech(text: string, maxLen: number = getMaxChunkLength()): SpeechChunk[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks: SpeechChunk[] = [];
  let buffer = "";

  const flush = (endsSentence: boolean) => {
    const value = buffer.trim();
    buffer = "";
    if (value && hasSpeakableContent(value)) chunks.push({ text: value, endsSentence });
  };

  for (const sentence of splitSentences(trimmed)) {
    if (sentence.length > maxLen) {
      flush(true);
      const pieces = splitLongSentence(sentence, maxLen);
      pieces.forEach((piece, index) => {
        buffer = piece;
        flush(index === pieces.length - 1);
      });
      continue;
    }

    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length > maxLen) {
      flush(true);
      buffer = sentence;
    } else {
      buffer = candidate;
    }
  }

  flush(true);
  return chunks;
}
