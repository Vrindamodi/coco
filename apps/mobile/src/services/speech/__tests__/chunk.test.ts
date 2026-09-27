import * as Speech from "expo-speech";

import { chunkForSpeech, getMaxChunkLength } from "../chunk";

describe("getMaxChunkLength", () => {
  it("ignores the platform's sentinel value", () => {
    // iOS defines no limit, so expo-speech reports Number.MAX_VALUE — which
    // passes Number.isFinite and would otherwise become a 1.7e308 cap.
    expect(Speech.maxSpeechInputLength).toBeGreaterThan(0);
    const max = getMaxChunkLength();
    expect(max).toBeGreaterThanOrEqual(80);
    expect(max).toBeLessThanOrEqual(220);
  });
});

describe("chunkForSpeech", () => {
  it("returns nothing for blank input", () => {
    expect(chunkForSpeech("   ")).toEqual([]);
  });

  it("keeps a short passage as one utterance", () => {
    const chunks = chunkForSpeech("Good morning. It is time for your medicine.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].endsSentence).toBe(true);
  });

  it("never exceeds the limit", () => {
    const text = "This is a sentence about the hills. ".repeat(30);
    for (const chunk of chunkForSpeech(text, 100)) {
      expect(chunk.text.length).toBeLessThanOrEqual(100);
    }
  });

  it("loses no words when splitting", () => {
    const text = "One two three. Four five six. Seven eight nine. Ten eleven twelve.";
    const rejoined = chunkForSpeech(text, 30)
      .map((chunk) => chunk.text)
      .join(" ");
    expect(rejoined.replace(/\s+/g, " ")).toBe(text);
  });

  it("does not treat a decimal point as a sentence end", () => {
    expect(chunkForSpeech("You scored 3.5 today.")).toHaveLength(1);
  });

  it("does not break after an abbreviation", () => {
    expect(chunkForSpeech("Dr. Bora is visiting today.")).toHaveLength(1);
  });

  it("splits on the Devanagari danda", () => {
    const chunks = chunkForSpeech("यह पहला वाक्य है। यह दूसरा वाक्य है।", 22);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].endsSentence).toBe(true);
  });

  it("splits an over-long sentence at a separator, never mid-word", () => {
    const text =
      "We travelled to Shillong, then to Cherrapunji, then home again by the evening bus";
    const chunks = chunkForSpeech(text, 40);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.trim()).toBe(chunk.text);
      expect(chunk.text.length).toBeLessThanOrEqual(40);
    }
    expect(chunks.map((c) => c.text).join(" ").replace(/\s+/g, " ")).toBe(text);
  });

  it("keeps Bengali conjuncts intact", () => {
    const text = "গুৱাহাটীত আমাৰ ঘৰ আছিল। সেই দিনবোৰ ভাল আছিল।";
    const chunks = chunkForSpeech(text, 30);
    expect(chunks.map((c) => c.text).join(" ").replace(/\s+/g, " ")).toBe(text);
    // A code-unit slice would strand a joiner at a chunk boundary.
    for (const chunk of chunks) {
      expect(chunk.text.startsWith("‍")).toBe(false);
      expect(chunk.text.endsWith("‍")).toBe(false);
    }
  });

  it("drops chunks with nothing to say", () => {
    expect(chunkForSpeech("...")).toEqual([]);
  });
});
