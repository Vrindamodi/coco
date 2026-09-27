import { useCallback, useSyncExternalStore } from "react";

import {
  getNarrationState,
  speak,
  stopSpeaking,
  subscribeSpeaking,
  waitForSpeechRelease,
  type SpeakOptions,
  type SpeakOutcome,
} from "@/services/speech";

export interface Narration {
  speak: (text: string, options?: SpeakOptions) => Promise<SpeakOutcome>;
  stop: () => void;
  /**
   * Stops narration and waits for the synthesizer to release the audio
   * session, for callers that open the microphone next.
   */
  stopAsync: () => Promise<void>;
  isSpeaking: boolean;
  /** False when the device has no usable voice for the last thing we tried to say. */
  isAvailable: boolean;
}

/** Manual narration control for screens with their own Listen or Stop affordances. */
export function useNarration(): Narration {
  const state = useSyncExternalStore(
    subscribeSpeaking,
    getNarrationState,
    getNarrationState
  );

  const stop = useCallback(() => {
    void stopSpeaking();
  }, []);

  const stopAsync = useCallback(async () => {
    await stopSpeaking();
    await waitForSpeechRelease();
  }, []);

  return {
    speak,
    stop,
    stopAsync,
    isSpeaking: state.isSpeaking,
    isAvailable: !state.unavailable,
  };
}
