import {
  collapseWhitespace,
  expandNumbersAndTimes,
  expandUrls,
  joinForSpeech,
  normalizeForSpeech,
  normalizeLineBreaks,
  stripEmoji,
  stripMarkdown,
} from "../textNormalizer";

describe("normalizeLineBreaks", () => {
  it("turns paragraph breaks into sentence breaks and line breaks into pauses", () => {
    // Caregivers type stories with line breaks, which are the only prosody
    // signal the text carries.
    expect(normalizeLineBreaks("One\n\nTwo\nThree")).toBe("One. Two, Three");
  });
});

describe("stripMarkdown", () => {
  it("removes the syntax the voice assistant replies in", () => {
    expect(stripMarkdown("**Hello** _there_")).toBe("Hello there");
    expect(stripMarkdown("# Heading")).toBe("Heading");
    expect(stripMarkdown("[the hills](https://example.com)")).toBe("the hills");
  });
});

describe("stripEmoji", () => {
  it("removes pictographs without touching Indic text", () => {
    expect(collapseWhitespace(stripEmoji("Lovely 😊🎉"))).toBe("Lovely");
    expect(stripEmoji("এই আমাদের গল্প")).toBe("এই আমাদের গল্প");
  });
});

describe("expandUrls", () => {
  it("never lets a URL be read character by character", () => {
    expect(expandUrls("See https://example.com/x?y=1 now", "en")).toBe(
      "See a link now"
    );
    expect(expandUrls("mail me at ravi@example.com", "en")).toBe("mail me at a link");
  });
});

describe("expandNumbersAndTimes", () => {
  it("reads a clock time the way a person would", () => {
    expect(expandNumbersAndTimes("8:30 AM", "en")).toBe(
      "half past eight in the morning"
    );
    expect(expandNumbersAndTimes("09:00 PM", "en")).toBe("nine o'clock at night");
    expect(expandNumbersAndTimes("9:05 AM", "en")).toBe("nine oh five in the morning");
    expect(expandNumbersAndTimes("8:45 AM", "en")).toBe(
      "quarter to nine in the morning"
    );
  });

  it("spells numbers out in script, so Indic voices do not read them in English", () => {
    expect(expandNumbersAndTimes("8:30", "hi")).toBe("सुबह साढ़े आठ बजे");
    expect(expandNumbersAndTimes("8:30", "bn")).toBe("সকালে সাড়ে আটটা");
    expect(expandNumbersAndTimes("12", "hi")).toBe("बारह");
  });

  it("understands Devanagari and Bengali digits", () => {
    expect(expandNumbersAndTimes("५", "hi")).toBe("पाँच");
    expect(expandNumbersAndTimes("৭", "bn")).toBe("সাত");
  });

  it("strips both Western and Indian digit grouping", () => {
    expect(expandNumbersAndTimes("2,50,000", "en")).toBe("250000");
  });

  it("leaves numbers it cannot say naturally alone", () => {
    expect(expandNumbersAndTimes("4321", "en")).toBe("4321");
  });
});

describe("normalizeForSpeech", () => {
  it("cleans a caregiver-written story end to end", () => {
    const input = "We went to Shillong 🎉\n\n**Every** summer — at 8:30 AM.";
    expect(normalizeForSpeech(input, { language: "en" })).toBe(
      "We went to Shillong. Every summer, at half past eight in the morning."
    );
  });

  it("keeps hyphenated words intact while turning spaced dashes into pauses", () => {
    // A blanket dash rule would mangle "e-mail" and "post-op".
    expect(normalizeForSpeech("Her e-mail — the old one", { language: "en" })).toBe(
      "Her e-mail, the old one"
    );
  });

  it("expands English abbreviations", () => {
    expect(normalizeForSpeech("Dr. Bora called", { language: "en" })).toBe(
      "Doctor Bora called"
    );
  });

  it("pronounces the app name in script", () => {
    expect(normalizeForSpeech("Coco", { language: "bn" })).toBe("কোকো");
  });

  it("returns empty for empty input", () => {
    expect(normalizeForSpeech("", { language: "en" })).toBe("");
  });
});

describe("joinForSpeech", () => {
  it("joins names the way a person would say them", () => {
    expect(joinForSpeech(["Ravi", "Meera", "Anil"], "en")).toBe("Ravi, Meera and Anil");
    expect(joinForSpeech(["Ravi"], "en")).toBe("Ravi");
    expect(joinForSpeech([], "en")).toBe("");
  });
});
