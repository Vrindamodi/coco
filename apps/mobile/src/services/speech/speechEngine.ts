import { Platform } from "react-native";
import * as Speech from "expo-speech";

import type { NarratorLanguageCode } from "@/constants/narratorLanguages";
import { getNarrationSettings } from "@/stores/settingsStore";
import { getPreferredNarratorLanguage } from "@/stores/authStore";

import { chunkForSpeech, type SpeechChunk } from "./chunk";
import { buildLadder, type Attempt } from "./ladder";
import { bridgeForVoice } from "./scriptBridge";
import { normalizeForSpeech } from "./textNormalizer";
import {
  detectScript,
  isScriptCompatible,
  scriptForLanguage,
  segmentByScript,
  type ScriptSegment,
} from "./scriptDetect";
import { announce, isScreenReaderOn, readyPromise } from "./screenReader";
import {
  invalidateVoiceCatalog,
  isSpeakable,
  resolveVoice,
  type ResolvedVoice,
} from "./voiceCatalog";

export type SpeakOutcome = "done" | "cancelled" | "unavailable" | "error" | "suppressed";

export interface SpeakOptions {
  languageCode?: NarratorLanguageCode;
  /** `"screen"` is ambient narration; `"user"` was explicitly asked for. */
  priority?: "screen" | "user";
  /** Caregiver-written or model-written text, whose script we cannot assume. */
  userGenerated?: boolean;
  /** Speak through the screen reader instead when narration is suppressed. */
  announceWhenSuppressed?: boolean;
  /** Bypasses the enabled/screen-reader gates — for the Settings voice test. */
  force?: boolean;
  onUnavailable?: (resolved: ResolvedVoice) => void;
}

export interface NarrationState {
  isSpeaking: boolean;
  requestId: number;
  languageCode: NarratorLanguageCode | null;
  unavailable: boolean;
}

/**
 * A single slot, not a queue: the newest request always wins. Screen A's
 * instructions must never sit waiting behind screen B's.
 */
let currentToken = 0;
let lastDiagnostic: ResolvedVoice | null = null;

/** The utterance the engine is waiting on, so stop() can wait for it too. */
let inFlightUtterance: Promise<ChunkOutcome> | null = null;
/** When the synthesizer last reported an utterance over (done, stopped or failed). */
let speechIdleSince = 0;

/** An engine that never acknowledges stop() must not wedge the microphone. */
const STOP_ACK_TIMEOUT_MS = 1000;
/**
 * How long the synthesizer keeps the audio session after its last word.
 *
 * expo-speech runs AVSpeechSynthesizer on its own session (see the
 * `useApplicationAudioSession: false` in speakOnce), which it deactivates on
 * its own schedule after an utterance ends — including one we cancelled. A
 * recorder opened before that lands is torn down with it and captures
 * silence, which the patient meets as "I did not understand" a moment later.
 */
const SESSION_RELEASE_MS = 500;

let state: NarrationState = {
  isSpeaking: false,
  requestId: 0,
  languageCode: null,
  unavailable: false,
};

const listeners = new Set<(state: NarrationState) => void>();

function publish(patch: Partial<NarrationState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener(state));
}

export function getNarrationState(): NarrationState {
  return state;
}

export function subscribeSpeaking(listener: (state: NarrationState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLastNarrationDiagnostic(): ResolvedVoice | null {
  return lastDiagnostic;
}

export async function stopSpeaking(): Promise<void> {
  // Bump first: anything mid-flight bails at its next checkpoint.
  currentToken += 1;
  publish({ isSpeaking: false });
  try {
    await Speech.stop();
  } catch {
    // Nothing was speaking.
  }
  // Speech.stop() resolves before the synthesizer has actually cancelled; the
  // utterance's own onStopped is the real signal.
  if (inFlightUtterance) {
    await Promise.race([inFlightUtterance, delay(STOP_ACK_TIMEOUT_MS)]);
  }
}

/**
 * Resolves once the synthesizer has had time to let go of the audio session.
 * Call it between stopping narration and opening the microphone.
 */
export async function waitForSpeechRelease(): Promise<void> {
  const remaining = SESSION_RELEASE_MS - (Date.now() - speechIdleSince);
  if (remaining > 0) await delay(remaining);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** UI strings are in the UI language by construction; only free text needs scanning. */
function segmentForSpeech(
  text: string,
  code: NarratorLanguageCode,
  opts: SpeakOptions
): ScriptSegment[] {
  if (!opts.userGenerated) {
    return [{ text, script: scriptForLanguage(code), code }];
  }
  return segmentByScript(text, code);
}

type ChunkOutcome = "done" | "cancelled" | "silent" | "stalled" | "error";

/** Android engines take roughly 600 ms to warm up; iOS about 100 ms. */
const START_TIMEOUT_MS = 1200;
/** Rough speaking pace in words per second at rate 1.0. */
const WORDS_PER_SECOND = 2.6;
const SENTENCE_PAUSE_MS = 220;
const MAX_ATTEMPTS = 3;

function estimateMs(text: string, rate: number): number {
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  return (words / (WORDS_PER_SECOND * Math.max(rate, 0.1))) * 1000;
}

function speakOnce(
  chunk: SpeechChunk,
  attempt: Attempt,
  token: number,
  rate: number
): Promise<ChunkOutcome> {
  const utterance = new Promise<ChunkOutcome>((resolve) => {
    let settled = false;
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let stallTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = (outcome: ChunkOutcome) => {
      if (settled) return;
      settled = true;
      if (startTimer) clearTimeout(startTimer);
      if (stallTimer) clearTimeout(stallTimer);
      speechIdleSince = Date.now();
      resolve(outcome);
    };

    // Nothing came out of the speaker: an uninstalled voice, or a Google
    // network voice with no network.
    startTimer = setTimeout(() => settle("silent"), START_TIMEOUT_MS);

    Speech.speak(chunk.text, {
      language: attempt.language,
      voice: attempt.voice,
      rate,
      pitch: 1.0,
      // Let AVSpeechSynthesizer own its session rather than inheriting whatever
      // category expo-av last set — recording leaves it routed to the earpiece.
      ...(Platform.OS === "ios" ? { useApplicationAudioSession: false } : null),
      onStart: () => {
        if (startTimer) clearTimeout(startTimer);
        if (token === currentToken) publish({ isSpeaking: true });
        // Some Android engines start and then never report finishing — for
        // instance when a call comes in mid-utterance.
        stallTimer = setTimeout(() => settle("stalled"), estimateMs(chunk.text, rate) * 2.5 + 4000);
      },
      onDone: () => settle("done"),
      // Our own stop() also fires onStopped, so the token says which it was.
      onStopped: () => settle(token === currentToken ? "done" : "cancelled"),
      onError: () => settle("error"),
    });
  });
  inFlightUtterance = utterance;
  return utterance;
}

async function speakChunk(
  chunk: SpeechChunk,
  resolved: ResolvedVoice,
  token: number,
  rate: number
): Promise<ChunkOutcome> {
  const ladder = buildLadder(resolved);
  let invalidated = false;

  for (let attempt = 0; attempt < Math.min(MAX_ATTEMPTS, ladder.length); attempt += 1) {
    if (token !== currentToken) return "cancelled";

    const outcome = await speakOnce(chunk, ladder[attempt], token, rate);
    if (outcome === "done" || outcome === "cancelled") return outcome;

    // A stall means the patient already heard part of the sentence. Replaying it
    // would stutter, so only silent starts and hard errors are worth retrying.
    if (outcome === "stalled") return "stalled";

    if (!invalidated) {
      invalidateVoiceCatalog();
      invalidated = true;
    }
    try {
      await Speech.stop();
    } catch {
      // Already stopped.
    }
  }

  return "error";
}

function finishUnavailable(resolved: ResolvedVoice, opts: SpeakOptions): SpeakOutcome {
  lastDiagnostic = resolved;
  publish({ isSpeaking: false, unavailable: true });
  opts.onUnavailable?.(resolved);
  return "unavailable";
}

function maybeAnnounce(text: string, opts: SpeakOptions): void {
  const shouldAnnounce = opts.announceWhenSuppressed ?? opts.priority === "user";
  // Screen instructions are already read by the screen reader on focus;
  // announcing them again would be triple-talk.
  if (shouldAnnounce) announce(text);
}

/**
 * Speaks text with the best voice the device actually has for it, or stays
 * silent rather than mispronouncing it.
 */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<SpeakOutcome> {
  if (!text.trim()) return "done";

  const token = ++currentToken;
  const settings = getNarrationSettings();

  // Wait for the first screen-reader answer, which lands after first paint.
  await readyPromise;
  if (token !== currentToken) return "cancelled";

  if (!opts.force && (!settings.enabled || isScreenReaderOn())) {
    maybeAnnounce(text, opts);
    return "suppressed";
  }

  // Fire and forget: awaiting this before the token bump is where the old
  // implementation lost the race between two rapid calls.
  void Speech.stop();

  const code = opts.languageCode ?? getPreferredNarratorLanguage();
  publish({ languageCode: code, unavailable: false });

  for (const segment of segmentForSpeech(text, code, opts)) {
    const resolved = await resolveVoice(segment.code);
    if (token !== currentToken) return "cancelled";

    const script = opts.userGenerated ? detectScript(segment.text) : segment.script;
    if (!isScriptCompatible(script, resolved.spokenCode) || !isSpeakable(resolved)) {
      return finishUnavailable(resolved, opts);
    }

    lastDiagnostic = resolved;
    // Bridge after normalising so spelled-out numbers and times are covered
    // too, and before chunking so the lengths are the final ones.
    const spoken = bridgeForVoice(
      normalizeForSpeech(segment.text, { language: resolved.spokenCode }),
      resolved
    );
    const chunks = chunkForSpeech(spoken);

    for (let index = 0; index < chunks.length; index += 1) {
      if (token !== currentToken) return "cancelled";

      const outcome = await speakChunk(chunks[index], resolved, token, settings.rate);
      if (outcome === "cancelled") return "cancelled";
      if (outcome === "error") {
        publish({ isSpeaking: false });
        return "error";
      }

      // A real timed gap, since expo-speech has no SSML. Scaling it with the
      // rate means "slow" also means more breathing room.
      if (chunks[index].endsSentence && index < chunks.length - 1) {
        await delay(Math.round(SENTENCE_PAUSE_MS / settings.rate));
      }
    }
  }

  if (token === currentToken) publish({ isSpeaking: false });
  return "done";
}
