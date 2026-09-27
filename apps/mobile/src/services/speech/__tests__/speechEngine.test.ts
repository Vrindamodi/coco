import * as Speech from "expo-speech";

import { speak, stopSpeaking, waitForSpeechRelease } from "../speechEngine";

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  VoiceQuality: { Default: "Default", Enhanced: "Enhanced" },
}));
jest.mock("@/stores/settingsStore", () => ({
  getNarrationSettings: () => ({ enabled: true, autoScreens: true, rate: 1 }),
}));
jest.mock("@/stores/authStore", () => ({
  getPreferredNarratorLanguage: () => "en",
}));
jest.mock("../screenReader", () => ({
  readyPromise: Promise.resolve(),
  isScreenReaderOn: () => false,
  announce: jest.fn(),
}));
jest.mock("../voiceCatalog", () => ({
  resolveVoice: async () => ({
    languageTag: "en-IN",
    voiceId: "com.apple.ttsbundle.Rishi-compact",
    isEnhanced: false,
    matchTier: "exact",
    requestedCode: "en",
    spokenCode: "en",
    alternatives: [],
  }),
  isSpeakable: () => true,
  invalidateVoiceCatalog: jest.fn(),
}));

type SpeakCallbacks = {
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
};

const speakMock = Speech.speak as unknown as jest.Mock;

/** Drain resolved promises without advancing the fake clock. */
async function flush(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

/** Begins an utterance and hands back its callbacks, as the synthesizer would. */
async function startUtterance(): Promise<SpeakCallbacks> {
  let callbacks: SpeakCallbacks = {};
  speakMock.mockImplementation((_text: string, opts: SpeakCallbacks) => {
    callbacks = opts;
  });
  void speak("Hello there, how are you today?");
  await flush();
  callbacks.onStart?.();
  await flush();
  return callbacks;
}

beforeEach(() => {
  jest.useFakeTimers();
  speakMock.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("stopSpeaking", () => {
  it("waits for the synthesizer to acknowledge the stop", async () => {
    // Speech.stop() returns before AVSpeechSynthesizer has actually cancelled;
    // opening the microphone in that window loses it to the synthesizer's
    // session teardown.
    const callbacks = await startUtterance();

    let stopped = false;
    void stopSpeaking().then(() => {
      stopped = true;
    });
    await flush();
    expect(stopped).toBe(false);

    callbacks.onStopped?.();
    await flush();
    expect(stopped).toBe(true);
  });

  it("gives up waiting on an engine that never reports back", async () => {
    await startUtterance();

    let stopped = false;
    void stopSpeaking().then(() => {
      stopped = true;
    });
    await flush();
    jest.advanceTimersByTime(1000);
    await flush();

    expect(stopped).toBe(true);
  });
});

describe("waitForSpeechRelease", () => {
  it("holds the microphone back for half a second after the last word", async () => {
    const callbacks = await startUtterance();
    callbacks.onDone?.();
    await flush();

    let released = false;
    void waitForSpeechRelease().then(() => {
      released = true;
    });
    jest.advanceTimersByTime(499);
    await flush();
    expect(released).toBe(false);

    jest.advanceTimersByTime(1);
    await flush();
    expect(released).toBe(true);
  });

  it("does not wait when nothing has spoken recently", async () => {
    const callbacks = await startUtterance();
    callbacks.onDone?.();
    await flush();
    jest.advanceTimersByTime(5000);

    let released = false;
    void waitForSpeechRelease().then(() => {
      released = true;
    });
    await flush();

    expect(released).toBe(true);
  });
});
