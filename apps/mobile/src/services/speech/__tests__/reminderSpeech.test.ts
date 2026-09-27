import { buildReminderUtterance, formatReminderTime } from "@/services/reminderSpeech";

const AT_0830 = new Date(2026, 0, 15, 8, 30).toISOString();

describe("formatReminderTime", () => {
  it("formats from the app language, not the device locale", () => {
    expect(formatReminderTime(AT_0830, "en")).toBe("half past eight in the morning");
    expect(formatReminderTime(AT_0830, "bn")).toBe("সকালে সাড়ে আটটা");
  });

  it("returns nothing for an unparseable timestamp", () => {
    expect(formatReminderTime("not a date", "en")).toBe("");
  });
});

describe("buildReminderUtterance", () => {
  it("reads the type, the title and the time", () => {
    expect(
      buildReminderUtterance(
        {
          title: "Metformin",
          reminder_type: "medicine",
          scheduled_at: AT_0830,
          is_done: false,
        },
        "en"
      )
    ).toBe("Medicine. Metformin. At half past eight in the morning.");
  });

  it("says so when the reminder is already done", () => {
    expect(
      buildReminderUtterance(
        {
          title: "Metformin",
          reminder_type: "medicine",
          scheduled_at: AT_0830,
          is_done: true,
        },
        "en"
      )
    ).toContain("already done");
  });

  it("does not double up punctuation the title already has", () => {
    const spoken = buildReminderUtterance(
      {
        title: "Drink water!",
        reminder_type: "hydration",
        scheduled_at: AT_0830,
        is_done: false,
      },
      "en"
    );
    expect(spoken).not.toContain("!.");
  });
});
