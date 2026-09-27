import { backoffDelayMs, nextAttemptAt } from "@/services/syncBackoff";

describe("backoffDelayMs", () => {
  it("doubles from one minute", () => {
    expect(backoffDelayMs(1)).toBe(60_000);
    expect(backoffDelayMs(2)).toBe(120_000);
    expect(backoffDelayMs(3)).toBe(240_000);
    expect(backoffDelayMs(4)).toBe(480_000);
  });

  it("caps at six hours so a long-rejected row still gets a look each day", () => {
    expect(backoffDelayMs(20)).toBe(6 * 60 * 60 * 1000);
  });

  it("treats a nonsensical attempt count as the first retry", () => {
    expect(backoffDelayMs(0)).toBe(60_000);
  });
});

describe("nextAttemptAt", () => {
  it("adds the delay to the given clock", () => {
    const now = new Date("2026-09-11T10:00:00.000Z");
    expect(nextAttemptAt(2, now)).toBe("2026-09-11T10:02:00.000Z");
  });
});
