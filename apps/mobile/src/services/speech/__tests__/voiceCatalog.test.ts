import * as Speech from "expo-speech";

import { isSpeakable, rankVoices } from "../voiceCatalog";

function voice(
  language: string,
  identifier: string,
  quality: Speech.VoiceQuality = Speech.VoiceQuality.Default,
  name = identifier
): Speech.Voice {
  return { language, identifier, name, quality };
}

const EN_US = voice("en-US", "com.apple.ttsbundle.Samantha-compact");
const EN_IN = voice("en-IN", "com.apple.ttsbundle.Rishi-compact");
const EN_AU = voice("en-AU", "com.apple.ttsbundle.Karen-compact");
const HI_IN = voice("hi-IN", "com.apple.ttsbundle.Lekha-compact");
const BN_IN = voice("bn-IN", "com.apple.voice.compact.bn-IN.Isha");

describe("rankVoices", () => {
  it("treats an empty catalog as unread rather than empty", () => {
    // Android returns [] while its TTS engine warms up. Reading that as "no
    // voice exists" would leave the app mute for the whole cache window.
    expect(rankVoices([], "en").matchTier).toBe("unknown");
  });

  it("prefers en-IN over other English regions regardless of catalog order", () => {
    const resolved = rankVoices([EN_AU, EN_US, EN_IN], "en");
    expect(resolved.voiceId).toBe(EN_IN.identifier);
    expect(resolved.matchTier).toBe("exact");
  });

  it("prefers an Enhanced voice at the same locale", () => {
    const enhanced = voice(
      "en-IN",
      "com.apple.voice.enhanced.en-IN.Rishi",
      Speech.VoiceQuality.Enhanced
    );
    expect(rankVoices([EN_IN, enhanced], "en").voiceId).toBe(enhanced.identifier);
  });

  it("prefers a local Android voice over a network-only one", () => {
    // The network voice never starts in airplane mode, so it loses even to a
    // lower-quality local voice.
    const network = voice(
      "hi-IN",
      "hi-in-x-hie-network",
      Speech.VoiceQuality.Enhanced
    );
    const local = voice("hi-IN", "hi-in-x-hie-local");
    expect(rankVoices([network, local], "hi").voiceId).toBe(local.identifier);
  });

  it("matches a bare 'bn' device tag against the bn-IN candidate", () => {
    const bare = voice("bn", "bn-default");
    expect(rankVoices([bare], "bn").voiceId).toBe(bare.identifier);
  });

  it("falls back from Assamese to Bengali, which shares the script", () => {
    const resolved = rankVoices([EN_US, HI_IN, BN_IN], "as");
    expect(resolved.voiceId).toBe(BN_IN.identifier);
    expect(resolved.matchTier).toBe("substituteScript");
  });

  it("refuses to hand Assamese to an English or Hindi voice", () => {
    // The headline bug: a Hindi or English engine has no Bengali coverage and
    // reads the script as garbage or silence.
    const resolved = rankVoices([EN_US, EN_IN, HI_IN], "as");
    expect(resolved.matchTier).toBe("none");
    expect(resolved.voiceId).toBeUndefined();
    expect(isSpeakable(resolved)).toBe(false);
  });

  it("never emits a bare Indic locale that the system would resolve to English", () => {
    const resolved = rankVoices([EN_US], "bn");
    expect(resolved.languageTag).toBeUndefined();
    expect(isSpeakable(resolved)).toBe(false);
  });

  it("still allows a bare English tag, which every device can honour", () => {
    const resolved = rankVoices([HI_IN], "en");
    expect(resolved.matchTier).toBe("none");
    expect(isSpeakable(resolved)).toBe(true);
  });

  it("deprioritises iOS novelty voices", () => {
    const novelty = voice(
      "en-US",
      "com.apple.speech.synthesis.voice.Zarvox",
      Speech.VoiceQuality.Enhanced
    );
    expect(rankVoices([novelty, EN_US], "en").voiceId).toBe(EN_US.identifier);
  });

  it("reports Assamese as the spoken language when a Bengali voice reads it", () => {
    expect(rankVoices([BN_IN], "as").spokenCode).toBe("as");
    expect(rankVoices([BN_IN], "bn").spokenCode).toBe("bn");
  });
});
