import { useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";

import type { NarratorLanguageCode } from "@/constants/narratorLanguages";
import { speak, stopSpeaking } from "@/services/speech";
import { useSettingsStore } from "@/stores/settingsStore";

export interface SpeakOnMountOptions {
  /** Screens that load data gate on readiness so the first read is the complete one. */
  enabled?: boolean;
  languageCode?: NarratorLanguageCode;
  /** Speak again when the text changes while the screen stays focused. */
  respeakOnChange?: boolean;
  delayMs?: number;
}

/**
 * Lets late-arriving data land before the read, and lets the push animation
 * finish so Android does not clip the first word.
 */
const DEFAULT_DELAY_MS = 350;

/**
 * Narrates a screen's instructions once it has settled, and stops narrating the
 * moment the screen loses focus.
 */
export function useSpeakOnMount(
  instructions: string,
  options?: SpeakOnMountOptions
): void {
  const {
    enabled = true,
    languageCode,
    respeakOnChange = false,
    delayMs = DEFAULT_DELAY_MS,
  } = options ?? {};

  const autoNarrate = useSettingsStore((state) => state.autoNarrateScreens);

  // Read through a ref, never a dependency. Depending on the text re-fired the
  // effect every time a screen's data arrived, so the screen interrupted itself
  // partway through its own first sentence.
  const textRef = useRef(instructions);
  textRef.current = instructions;

  const spokenTextRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const timer = setTimeout(() => {
        if (cancelled || !enabled || !autoNarrate) return;

        const text = textRef.current;
        // Empty means "not ready yet" — wait for the real instructions.
        if (!text) return;
        if (!respeakOnChange && spokenTextRef.current !== null) return;
        if (respeakOnChange && spokenTextRef.current === text) return;

        spokenTextRef.current = text;
        void speak(text, { languageCode, priority: "screen" });
      }, delayMs);

      return () => {
        cancelled = true;
        clearTimeout(timer);
        spokenTextRef.current = null;
        void stopSpeaking();
      };
    }, [enabled, autoNarrate, respeakOnChange, delayMs, languageCode])
  );
}
