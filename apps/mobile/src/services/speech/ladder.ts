import { scriptForLanguage } from "./scriptDetect";
import type { ResolvedVoice } from "./voiceCatalog";

/** One way of asking the engine to say a chunk. */
export interface Attempt {
  language?: string;
  voice?: string;
}

/**
 * Progressively simpler ways to say the same chunk.
 *
 * Both rungs that name no voice — a bare base language, and no language at
 * all — are gated on Latin script. For an Indic language the device answers
 * either with its default voice, almost always en-US, and handing Bengali text
 * to an English engine is the exact failure this module exists to prevent.
 *
 * Pure, so the engine's retry order can be tested without a device.
 */
export function buildLadder(resolved: ResolvedVoice): Attempt[] {
  const ladder: Attempt[] = [{ language: resolved.languageTag, voice: resolved.voiceId }];

  if (resolved.voiceId) {
    ladder.push({ language: resolved.languageTag, voice: undefined });
  }

  const localAlternative = resolved.alternatives.find(
    (alternative) => alternative.voiceId && !/-network$/i.test(alternative.voiceId)
  );
  if (localAlternative) {
    ladder.push({ language: localAlternative.languageTag, voice: localAlternative.voiceId });
  }

  const latin = scriptForLanguage(resolved.requestedCode) === "latin";

  const base = resolved.languageTag?.split("-")[0];
  if (latin && base && base !== resolved.languageTag) {
    ladder.push({ language: base, voice: undefined });
  }

  if (latin) {
    ladder.push({ language: undefined, voice: undefined });
  }

  return ladder;
}
