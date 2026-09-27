import { AppState, type AppStateStatus } from "react-native";
import * as Speech from "expo-speech";

import type { NarratorLanguageCode } from "@/constants/narratorLanguages";

import { scriptForLanguage } from "./scriptDetect";

export type MatchTier =
  /** A voice for exactly this locale. */
  | "exact"
  /** Right language, different region — en-GB for en-IN. */
  | "regionFamily"
  /** Right base language, tag shape differs. */
  | "base"
  /** A different language that shares the script — Bengali reading Assamese. */
  | "substituteScript"
  /** The device has no usable voice for this language. */
  | "none"
  /** The catalog could not be read yet; not the same as "nothing exists". */
  | "unknown";

export interface ResolvedVoice {
  languageTag?: string;
  voiceId?: string;
  voiceName?: string;
  isEnhanced: boolean;
  matchTier: MatchTier;
  requestedCode: NarratorLanguageCode;
  /** The language actually doing the speaking — "as" may be spoken by "bn". */
  spokenCode: NarratorLanguageCode;
  /** Ranked runners-up, used by the engine's degradation ladder. */
  alternatives: ResolvedVoice[];
}

/**
 * Candidate locales per language, best first.
 *
 * Assamese stops at Bengali on purpose. The two share a script and almost all
 * their phonemes, so a Bengali voice reads Assamese acceptably. Hindi and
 * English do not: those engines have no Bengali glyph coverage and produce
 * spelled-out garbage or silence, which is worse than saying nothing.
 */
const LOCALE_CANDIDATES: Record<NarratorLanguageCode, string[]> = {
  en: ["en-IN", "en-GB", "en-US", "en"],
  hi: ["hi-IN", "hi"],
  as: ["as-IN", "as", "asm-IN", "asm", "bn-IN", "bn", "bn-BD"],
  bn: ["bn-IN", "bn", "bn-BD"],
};

/** Which candidates count as "a different language that happens to fit". */
const SUBSTITUTE_FROM_INDEX: Partial<Record<NarratorLanguageCode, number>> = {
  as: 4, // everything from "bn-IN" onward
};

/**
 * A bare language tag with no voice id is only ever a guess. For English that
 * is harmless — every device has one. For an Indic language the system quietly
 * substitutes its default voice, which is usually en-US, and that is exactly
 * the failure this module exists to prevent.
 */
const ALLOW_BARE_LOCALE: Record<NarratorLanguageCode, boolean> = {
  en: true,
  hi: false,
  as: false,
  bn: false,
};

/** iOS MacinTalk novelty voices — real speech synthesis, comically unusable here. */
const NOVELTY_VOICE_PATTERN =
  /com\.apple\.speech\.synthesis\.voice\.(Albert|BadNews|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|GoodNews|Good News|Hysterical|Jester|Organ|Superstar|Trinoids|Whisper|Zarvox|Wobble|Princess|Junior|Ralph|Kathy|Fred|Bruce|Agnes|Vicki|Victoria)/i;

/** Google's Android voices come in `-local` and `-network` pairs. */
const NETWORK_VOICE_PATTERN = /-network$/i;

function normalizeLocale(locale: string): string {
  return locale.toLowerCase().replace(/_/g, "-");
}

function baseLanguage(locale: string): string {
  return normalizeLocale(locale).split("-")[0];
}

/**
 * How well a voice's locale matches a candidate: 0 exact, 1 region family,
 * 2 same base language, null no relation.
 *
 * Both prefix directions are checked. Matching only one way is why a device
 * voice tagged plain "bn" never matched the candidate "bn-IN".
 */
function tierFor(voiceLocale: string, candidate: string): 0 | 1 | 2 | null {
  const voice = normalizeLocale(voiceLocale);
  const target = normalizeLocale(candidate);

  if (voice === target) return 0;
  if (voice.startsWith(`${target}-`) || target.startsWith(`${voice}-`)) return 1;
  if (baseLanguage(voice) === baseLanguage(target)) return 2;
  return null;
}

interface ScoredVoice {
  voice: Speech.Voice;
  tier: 0 | 1 | 2;
  candidateIndex: number;
  networkPenalty: 0 | 1;
  noveltyPenalty: 0 | 1;
  qualityRank: 0 | 1;
  catalogIndex: number;
}

function compareScored(a: ScoredVoice, b: ScoredVoice): number {
  return (
    a.tier - b.tier ||
    a.candidateIndex - b.candidateIndex ||
    // A network-only voice is worse than a lower-quality local one: this app has
    // to work in airplane mode, and a network voice simply never starts there.
    a.networkPenalty - b.networkPenalty ||
    a.noveltyPenalty - b.noveltyPenalty ||
    a.qualityRank - b.qualityRank ||
    a.catalogIndex - b.catalogIndex
  );
}

function matchTierFor(
  scored: ScoredVoice,
  code: NarratorLanguageCode
): Exclude<MatchTier, "none" | "unknown"> {
  const substituteFrom = SUBSTITUTE_FROM_INDEX[code];
  if (substituteFrom != null && scored.candidateIndex >= substituteFrom) {
    return "substituteScript";
  }
  if (scored.tier === 0) return "exact";
  if (scored.tier === 1) return "regionFamily";
  return "base";
}

function spokenCodeFor(languageTag: string, requested: NarratorLanguageCode): NarratorLanguageCode {
  const base = baseLanguage(languageTag);
  if (base === "hi") return "hi";
  if (base === "as" || base === "asm") return "as";
  if (base === "bn") return requested === "as" ? "as" : "bn";
  return "en";
}

function toResolved(scored: ScoredVoice, code: NarratorLanguageCode): ResolvedVoice {
  return {
    languageTag: scored.voice.language,
    voiceId: scored.voice.identifier,
    voiceName: scored.voice.name,
    isEnhanced: scored.voice.quality === Speech.VoiceQuality.Enhanced,
    matchTier: matchTierFor(scored, code),
    requestedCode: code,
    // Assamese text read by a Bengali voice is still Assamese as far as number
    // words and script checks are concerned — the script is the same.
    spokenCode: spokenCodeFor(scored.voice.language, code),
    alternatives: [],
  };
}

function unresolved(code: NarratorLanguageCode, tier: "none" | "unknown"): ResolvedVoice {
  const canGuess = tier === "unknown" || ALLOW_BARE_LOCALE[code];
  return {
    languageTag: canGuess ? LOCALE_CANDIDATES[code][0] : undefined,
    voiceId: undefined,
    voiceName: undefined,
    isEnhanced: false,
    matchTier: tier,
    requestedCode: code,
    spokenCode: code,
    alternatives: [],
  };
}

/**
 * Pure ranking over a voice catalog. Every voice is scored against every
 * candidate and the best wins — as opposed to taking the first voice that
 * loosely matches, which made the candidate order meaningless and let an en-AU
 * voice beat en-IN purely by its position in the device's list.
 */
export function rankVoices(
  voices: Speech.Voice[],
  code: NarratorLanguageCode
): ResolvedVoice {
  // An empty catalog means "could not ask" — on Android `getAvailableVoicesAsync`
  // returns [] while the TTS engine is still starting up. Reporting that as
  // "no voice exists" would make the app mute on cold start.
  if (!voices || voices.length === 0) return unresolved(code, "unknown");

  const candidates = LOCALE_CANDIDATES[code];
  const scored: ScoredVoice[] = [];

  voices.forEach((voice, catalogIndex) => {
    if (!voice?.language) return;

    let best: { tier: 0 | 1 | 2; candidateIndex: number } | null = null;
    candidates.forEach((candidate, candidateIndex) => {
      const tier = tierFor(voice.language, candidate);
      if (tier == null) return;
      if (!best || tier < best.tier || (tier === best.tier && candidateIndex < best.candidateIndex)) {
        best = { tier, candidateIndex };
      }
    });

    if (!best) return;
    const { tier, candidateIndex } = best as { tier: 0 | 1 | 2; candidateIndex: number };
    const identifier = voice.identifier ?? "";

    scored.push({
      voice,
      tier,
      candidateIndex,
      networkPenalty: NETWORK_VOICE_PATTERN.test(identifier) ? 1 : 0,
      noveltyPenalty: NOVELTY_VOICE_PATTERN.test(identifier) ? 1 : 0,
      qualityRank: voice.quality === Speech.VoiceQuality.Enhanced ? 0 : 1,
      catalogIndex,
    });
  });

  if (scored.length === 0) return unresolved(code, "none");

  scored.sort(compareScored);
  const [winner, ...rest] = scored;
  const resolved = toResolved(winner, code);
  resolved.alternatives = rest.slice(0, 4).map((entry) => toResolved(entry, code));
  return resolved;
}

/**
 * Whether this resolution is safe to speak.
 *
 * A real voice id always is. Without one we are relying on the system to pick a
 * voice from a bare language tag, which is only safe for Latin script — for an
 * Indic tag the system falls back to its default voice, almost always en-US,
 * and reads the text as garbage.
 */
export function isSpeakable(resolved: ResolvedVoice): boolean {
  if (resolved.voiceId) return true;
  return (
    Boolean(resolved.languageTag) &&
    scriptForLanguage(resolved.requestedCode) === "latin"
  );
}

const CACHE_TTL_MS = 5 * 60_000;
const EMPTY_RETRY_BACKOFF_MS = 2_000;

let cache: { voices: Speech.Voice[]; at: number } | null = null;
let inFlight: Promise<Speech.Voice[]> | null = null;
let lastEmptyAt = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeVoiceCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function invalidateVoiceCatalog(): void {
  cache = null;
  notify();
}

export async function getDeviceVoices(opts?: { force?: boolean }): Promise<Speech.Voice[]> {
  const fresh = cache && Date.now() - cache.at < CACHE_TTL_MS;
  if (!opts?.force && fresh) return cache!.voices;

  // Back off briefly after an empty read so a cold TTS engine is not hammered.
  if (!opts?.force && Date.now() - lastEmptyAt < EMPTY_RETRY_BACKOFF_MS) {
    return cache?.voices ?? [];
  }

  if (inFlight) return inFlight;

  inFlight = Speech.getAvailableVoicesAsync()
    .then((voices) => {
      // Never cache an empty catalog — it usually means "not ready", and caching
      // it would keep the app silent for the whole TTL.
      if (voices && voices.length > 0) {
        cache = { voices, at: Date.now() };
        notify();
      } else {
        lastEmptyAt = Date.now();
      }
      return voices ?? [];
    })
    .catch(() => {
      lastEmptyAt = Date.now();
      return cache?.voices ?? [];
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export async function resolveVoice(code: NarratorLanguageCode): Promise<ResolvedVoice> {
  return rankVoices(await getDeviceVoices(), code);
}

/**
 * Refreshes the catalog whenever the app comes back to the foreground — the
 * user may have just installed a voice in the OS settings, and they should not
 * have to restart the app to hear it.
 */
export function installVoiceCatalogLifecycle(): () => void {
  const onChange = (state: AppStateStatus) => {
    if (state === "active") {
      invalidateVoiceCatalog();
      void getDeviceVoices({ force: true });
    }
  };

  const subscription = AppState.addEventListener("change", onChange);
  void getDeviceVoices({ force: true });
  return () => subscription.remove();
}
