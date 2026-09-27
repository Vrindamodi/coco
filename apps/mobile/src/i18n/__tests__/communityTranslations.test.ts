import { getTranslations } from "@/i18n/translate";

describe("community translations", () => {
  it("provides localized section labels for the community screen", () => {
    expect(getTranslations("en").community.sections.updates).toBe("Community Updates");
    expect(getTranslations("hi").community.sections.updates).toBe("समुदाय अपडेट");
    expect(getTranslations("bn").community.sections.activities).toBe("স্থানীয় কার্যক্রম");
  });

  it("includes translation strings used by the community actions", () => {
    expect(getTranslations("as").community.viewDetails).toBe("বিস্তারিত চাওক ▼");
    expect(getTranslations("hi").community.showLess).toBe("कम दिखाएँ ▲");
    expect(getTranslations("en").community.demoCall).toBe("Demo call");
  });
});
