import type { ResolvedVoice } from "./voiceCatalog";

/**
 * Assamese spoken by a Bengali voice.
 *
 * iOS ships no Assamese voice, so `voiceCatalog` hands Assamese text to the
 * Bengali one (`matchTier: "substituteScript"`). The two scripts are the same
 * Unicode block, but Assamese has two letters Bengali orthography never uses,
 * and a Bengali synthesizer has no phoneme for them — it drops or garbles the
 * word. This rewrites *only what the synthesizer hears* into the nearest
 * Bengali spelling; on-screen text, screen-reader announcements and a real
 * Assamese voice (some Android engines) all get the authentic text.
 *
 * Deliberately not attempted: pronunciation differences (Assamese চ/ছ → /s/,
 * শ/ষ/স → /x/). Those are phonology, not spelling — respelling them would break
 * every word Assamese shares with Bengali. Conjuncts, ৎ, ড়/ঢ়/য় already exist
 * in Bengali, and digits are spelled out before this runs.
 */

export type BridgeInput = Pick<ResolvedVoice, "requestedCode" | "matchTier">;

/** True only for Assamese text about to be spoken by a Bengali voice. */
export function needsAssameseToBengaliBridge(resolved: BridgeInput): boolean {
  return resolved.requestedCode === "as" && resolved.matchTier === "substituteScript";
}

/**
 * In Assamese, a consonant followed by ’ (U+2019) is the /o/ vowel — the sound
 * Bengali writes with the vowel sign ো. Only a ’ *directly* after a consonant
 * is that vowel; after a vowel sign or at a word boundary it is a quote mark,
 * which the normalizer has already dealt with.
 */
const CONSONANT_THEN_O_MARK = /([ক-হড়-য়])’/g;

/** Rewrites Assamese-only code points into the nearest Bengali spelling. */
export function bridgeAssameseForBengaliVoice(text: string): string {
  return (
    text
      // ৰ (Assamese ra) → র: the same /r/.
      .replace(/ৰ/g, "র")
      // ৱ (Assamese wa) → ব: Bengali spells the shared words with ব
      // (পৃথিৱী → পৃথিবী), and its ব between vowels sounds close to /w/.
      // The independent vowel ও would read as its own syllable and cannot
      // carry the vowel signs that ৱ often does (ৱী, ৱা).
      .replace(/ৱ/g, "ব")
      // After the two above, so ৰ’ and ৱ’ are covered by র and ব in the class.
      .replace(CONSONANT_THEN_O_MARK, "$1ো")
  );
}

/** No-op unless Assamese is being read by a Bengali voice. */
export function bridgeForVoice(text: string, resolved: BridgeInput): string {
  return needsAssameseToBengaliBridge(resolved)
    ? bridgeAssameseForBengaliVoice(text)
    : text;
}
