import { resolveApiUrl } from "@/services/resolveApiUrl";

describe("resolveApiUrl", () => {
  it("keeps an explicit LAN or remote URL on every platform", () => {
    expect(
      resolveApiUrl({
        envUrl: "http://192.168.1.20:8000",
        platform: "android",
        packagerHost: "10.0.2.2",
      })
    ).toBe("http://192.168.1.20:8000");
  });

  it("rewrites localhost to 10.0.2.2 on Android so the emulator can reach Docker on the host", () => {
    expect(
      resolveApiUrl({
        envUrl: "http://localhost:8000",
        platform: "android",
        packagerHost: null,
      })
    ).toBe("http://10.0.2.2:8000");
  });

  it("prefers the Expo packager host so a physical device talks to the same PC as Metro", () => {
    expect(
      resolveApiUrl({
        envUrl: "http://localhost:8000",
        platform: "android",
        packagerHost: "192.168.1.20",
      })
    ).toBe("http://192.168.1.20:8000");
  });

  it("does not treat an Expo tunnel hostname as the API", () => {
    expect(
      resolveApiUrl({
        envUrl: "http://localhost:8000",
        platform: "android",
        packagerHost: "abc.exp.direct",
      })
    ).toBe("http://10.0.2.2:8000");
  });

  it("leaves localhost alone on iOS and web", () => {
    expect(
      resolveApiUrl({
        envUrl: "http://localhost:8000",
        platform: "ios",
        packagerHost: "localhost",
      })
    ).toBe("http://localhost:8000");
  });
});
