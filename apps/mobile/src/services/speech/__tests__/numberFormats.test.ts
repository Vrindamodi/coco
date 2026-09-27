import { daypartForHour, numberToWords, timeToWords } from "../numberFormats";

describe("numberToWords", () => {
  it("spells out the range the app actually speaks", () => {
    expect(numberToWords(0, "en")).toBe("zero");
    expect(numberToWords(7, "en")).toBe("seven");
    expect(numberToWords(42, "en")).toBe("forty two");
    expect(numberToWords(105, "en")).toBe("one hundred and five");
  });

  it("spells out in script for the Indic languages", () => {
    expect(numberToWords(3, "hi")).toBe("तीन");
    expect(numberToWords(3, "bn")).toBe("তিন");
    expect(numberToWords(3, "as")).toBe("তিনি");
  });

  it("passes larger numbers through rather than guessing", () => {
    // Nothing in this app speaks above 999, and Indian numbering is not worth
    // encoding for a case that never happens.
    expect(numberToWords(1000, "en")).toBe("1000");
    expect(numberToWords(-1, "en")).toBe("-1");
    expect(numberToWords(2.5, "en")).toBe("2.5");
  });
});

describe("daypartForHour", () => {
  it("covers the whole clock", () => {
    expect(daypartForHour(2)).toBe("night");
    expect(daypartForHour(8)).toBe("morning");
    expect(daypartForHour(14)).toBe("afternoon");
    expect(daypartForHour(19)).toBe("evening");
    expect(daypartForHour(22)).toBe("night");
  });
});

describe("timeToWords", () => {
  it("uses Indian-English clock idiom", () => {
    expect(timeToWords(8, 0, "en")).toBe("eight o'clock in the morning");
    expect(timeToWords(8, 15, "en")).toBe("quarter past eight in the morning");
    expect(timeToWords(8, 30, "en")).toBe("half past eight in the morning");
    expect(timeToWords(8, 45, "en")).toBe("quarter to nine in the morning");
    expect(timeToWords(8, 42, "en")).toBe("eight forty two in the morning");
  });

  it("uses each language's own quarter words", () => {
    expect(timeToWords(8, 30, "hi")).toBe("सुबह साढ़े आठ बजे");
    expect(timeToWords(8, 15, "hi")).toBe("सुबह सवा आठ बजे");
    expect(timeToWords(8, 45, "hi")).toBe("सुबह पौने नौ बजे");
    expect(timeToWords(8, 30, "bn")).toBe("সকালে সাড়ে আটটা");
    expect(timeToWords(8, 30, "as")).toBe("ৰাতিপুৱা সাঢ়ে আঠ বজাত");
  });

  it("handles midnight and noon on the 12-hour clock", () => {
    expect(timeToWords(0, 0, "en")).toBe("twelve o'clock at night");
    expect(timeToWords(12, 0, "en")).toBe("twelve o'clock in the afternoon");
  });

  it("clamps nonsense input instead of producing undefined words", () => {
    // 25:99 wraps to 01:59 rather than indexing past the end of the word table.
    expect(timeToWords(25, 99, "en")).toBe("one fifty nine at night");
    expect(timeToWords(-1, -5, "en")).not.toContain("undefined");
  });
});
