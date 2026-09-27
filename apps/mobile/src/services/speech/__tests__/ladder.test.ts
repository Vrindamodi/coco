import { buildLadder } from "../ladder";
import type { ResolvedVoice } from "../voiceCatalog";

function resolved(partial: Partial<ResolvedVoice> & Pick<ResolvedVoice, "requestedCode">): ResolvedVoice {
  return {
    isEnhanced: false,
    matchTier: "exact",
    spokenCode: partial.requestedCode,
    alternatives: [],
    ...partial,
  };
}

describe("buildLadder", () => {
  it("never lets Assamese degrade to a bare tag or the system default", () => {
    // A bare "bn" or no language at all makes iOS pick its default voice,
    // usually en-US, which reads Bengali script as garbage.
    const ladder = buildLadder(
      resolved({
        requestedCode: "as",
        spokenCode: "as",
        matchTier: "substituteScript",
        languageTag: "bn-IN",
        voiceId: "com.apple.voice.compact.bn-IN.Isha",
      })
    );

    expect(ladder).toEqual([
      { language: "bn-IN", voice: "com.apple.voice.compact.bn-IN.Isha" },
      { language: "bn-IN", voice: undefined },
    ]);
    expect(ladder.some((rung) => rung.language === "bn")).toBe(false);
    expect(ladder.some((rung) => rung.language === undefined)).toBe(false);
  });

  it("still lets English fall all the way back to the system default", () => {
    const ladder = buildLadder(
      resolved({ requestedCode: "en", languageTag: "en-US", voiceId: "com.apple.voice.compact.en-US.Samantha" })
    );

    expect(ladder.map((rung) => rung.language)).toEqual(["en-US", "en-US", "en", undefined]);
  });

  it("prefers a local alternative over a network one", () => {
    const ladder = buildLadder(
      resolved({
        requestedCode: "bn",
        languageTag: "bn-IN",
        voiceId: "bn-in-x-abc-network",
        alternatives: [
          resolved({ requestedCode: "bn", languageTag: "bn-IN", voiceId: "bn-in-x-def-network" }),
          resolved({ requestedCode: "bn", languageTag: "bn-IN", voiceId: "bn-in-x-def-local" }),
        ],
      })
    );

    expect(ladder[2]).toEqual({ language: "bn-IN", voice: "bn-in-x-def-local" });
  });
});
