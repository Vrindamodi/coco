import {
  detectScript,
  isScriptCompatible,
  scriptForLanguage,
  segmentByScript,
} from "../scriptDetect";

describe("detectScript", () => {
  it("identifies each script the app supports", () => {
    expect(detectScript("Good morning")).toBe("latin");
    expect(detectScript("कोको में आपका स्वागत है")).toBe("devanagari");
    expect(detectScript("ক’ক’লৈ স্বাগতম")).toBe("bengali");
  });

  it("returns neutral when nothing carries script evidence", () => {
    expect(detectScript("8:30 — !!")).toBe("neutral");
  });

  it("picks the dominant script in mixed text", () => {
    expect(detectScript("গুৱাহাটী Medical College ত")).toBe("bengali");
  });
});

describe("isScriptCompatible", () => {
  it("lets Indian voices read embedded English", () => {
    expect(isScriptCompatible("latin", "bn")).toBe(true);
    expect(isScriptCompatible("latin", "hi")).toBe(true);
  });

  it("never lets an English voice read Indic script", () => {
    // The rule is asymmetric on purpose: an English engine has no coverage for
    // these scripts and produces spelled-out garbage.
    expect(isScriptCompatible("bengali", "en")).toBe(false);
    expect(isScriptCompatible("devanagari", "en")).toBe(false);
  });

  it("keeps Devanagari and Bengali apart", () => {
    expect(isScriptCompatible("bengali", "hi")).toBe(false);
    expect(isScriptCompatible("devanagari", "bn")).toBe(false);
  });

  it("treats Assamese and Bengali as the same script", () => {
    expect(isScriptCompatible("bengali", "as")).toBe(true);
    expect(scriptForLanguage("as")).toBe(scriptForLanguage("bn"));
  });
});

describe("segmentByScript", () => {
  it("keeps a short embedded English name in the surrounding voice", () => {
    const segments = segmentByScript("গুৱাহাটীত Ramesh আছিল", "bn");
    expect(segments).toHaveLength(1);
    expect(segments[0].code).toBe("bn");
  });

  it("splits out a long enough run of a different script", () => {
    const segments = segmentByScript(
      "এই আমাদের গল্প। We travelled to the hills every summer for years.",
      "bn"
    );
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.map((segment) => segment.code)).toContain("en");
  });

  it("routes a Hindi story inside an English interface to the Hindi voice", () => {
    const segments = segmentByScript(
      "यह मेरी माँ की कहानी है और वह बहुत सुंदर थी।",
      "en"
    );
    expect(segments[0].code).toBe("hi");
  });

  it("resolves Bengali script to the user's own language", () => {
    expect(segmentByScript("এই আমাৰ কাহিনী", "as")[0].code).toBe("as");
    expect(segmentByScript("এই আমাদের গল্প", "bn")[0].code).toBe("bn");
  });

  it("keeps punctuation with the text it was typed against", () => {
    const segments = segmentByScript("Ramesh (রমেশ)", "en");
    expect(segments.map((segment) => segment.text).join("")).toBe("Ramesh (রমেশ)");
  });

  it("preserves the original text exactly across segments", () => {
    const input = "এই আমাদের গল্প। We travelled to the hills every summer.";
    expect(segmentByScript(input, "bn").map((s) => s.text).join("")).toBe(input);
  });
});
