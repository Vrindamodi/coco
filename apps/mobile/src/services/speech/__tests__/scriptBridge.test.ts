import { numberToWords, timeToWords } from "../numberFormats";
import {
  bridgeAssameseForBengaliVoice,
  bridgeForVoice,
  needsAssameseToBengaliBridge,
} from "../scriptBridge";

const ASSAMESE_ONLY = /[ৰৱ]/;

describe("bridgeAssameseForBengaliVoice", () => {
  it("respells the two letters a Bengali voice has no sound for", () => {
    // ৰ and ৱ are the whole reason Assamese sounds wrong through the Bengali
    // voice: it simply has no phoneme for them.
    expect(bridgeAssameseForBengaliVoice("ব্যৱহাৰ")).toBe("ব্যবহার");
    expect(bridgeAssameseForBengaliVoice("পৃথিৱী")).toBe("পৃথিবী");
    expect(bridgeAssameseForBengaliVoice("ঘৰ")).toBe("ঘর");
  });

  it("turns the Assamese o-mark after a consonant into the Bengali vowel sign", () => {
    // ক’ক’ is the app's own name; "koko", not "kok".
    expect(bridgeAssameseForBengaliVoice("ক’ক’")).toBe("কোকো");
  });

  it("covers ৰ’ and ৱ’ because the letter mapping runs first", () => {
    expect(bridgeAssameseForBengaliVoice("ৰ’")).toBe("রো");
  });

  it("leaves a ’ that is not after a consonant alone", () => {
    // After a vowel sign or at a boundary it is a quote mark, not a vowel.
    expect(bridgeAssameseForBengaliVoice("কা’")).toBe("কা’");
    expect(bridgeAssameseForBengaliVoice("’হয়’")).toBe("’হয়’");
  });

  it("is idempotent", () => {
    const once = bridgeAssameseForBengaliVoice("পৰৱৰ্তী ক’ক’");
    expect(bridgeAssameseForBengaliVoice(once)).toBe(once);
    expect(once).not.toMatch(ASSAMESE_ONLY);
  });

  it("does not touch Latin or Devanagari runs", () => {
    expect(bridgeAssameseForBengaliVoice("Settings then Voices")).toBe("Settings then Voices");
    expect(bridgeAssameseForBengaliVoice("मेरी दुनिया")).toBe("मेरी दुनिया");
  });

  it("cleans up every number and time word the Assamese tables generate", () => {
    // The tables deliberately use authentic Assamese spelling (ৰাতিপুৱা, চাৰি);
    // the bridge is what makes them safe for the substitute voice.
    expect(bridgeAssameseForBengaliVoice(timeToWords(8, 30, "as"))).not.toMatch(ASSAMESE_ONLY);
    expect(bridgeAssameseForBengaliVoice(numberToWords(74, "as"))).not.toMatch(ASSAMESE_ONLY);
    expect(bridgeAssameseForBengaliVoice(timeToWords(8, 30, "as"))).toBe(
      "রাতিপুবা সাঢ়ে আঠ বজাত"
    );
  });
});

describe("bridgeForVoice", () => {
  it("applies only when Assamese is spoken by a substitute voice", () => {
    expect(needsAssameseToBengaliBridge({ requestedCode: "as", matchTier: "substituteScript" })).toBe(true);
    expect(bridgeForVoice("ঘৰ", { requestedCode: "as", matchTier: "substituteScript" })).toBe("ঘর");
  });

  it("hands a real Assamese voice the authentic spelling", () => {
    expect(bridgeForVoice("ঘৰ", { requestedCode: "as", matchTier: "exact" })).toBe("ঘৰ");
    expect(bridgeForVoice("ঘৰ", { requestedCode: "as", matchTier: "none" })).toBe("ঘৰ");
  });

  it("never rewrites Bengali, even through a substitute tier", () => {
    expect(bridgeForVoice("ক’", { requestedCode: "bn", matchTier: "substituteScript" })).toBe("ক’");
  });
});
