import { useCallback, useEffect, useState } from "react";

import type { NarratorLanguageCode } from "@/constants/narratorLanguages";
import {
  resolveVoice,
  subscribeVoiceCatalog,
  invalidateVoiceCatalog,
  isSpeakable,
} from "@/services/speech";

export interface VoiceStatus {
  /**
   * `ok` a real voice for this language · `substitute` a different language that
   * shares the script · `missing` nothing usable on this device · `unknown` the
   * catalog could not be read yet.
   */
  state: "loading" | "ok" | "substitute" | "missing" | "unknown";
  voiceName?: string;
  languageTag?: string;
  isEnhanced: boolean;
  recheck: () => void;
}

/**
 * The real, per-device answer to "can this phone read Assamese aloud?" — as
 * opposed to the fixed warning the settings screen used to show whether or not
 * it applied.
 */
export function useVoiceStatus(code: NarratorLanguageCode): VoiceStatus {
  const [status, setStatus] = useState<Omit<VoiceStatus, "recheck">>({
    state: "loading",
    isEnhanced: false,
  });

  const load = useCallback(() => {
    let cancelled = false;

    void resolveVoice(code).then((resolved) => {
      if (cancelled) return;

      const state: VoiceStatus["state"] =
        resolved.matchTier === "unknown"
          ? "unknown"
          : resolved.matchTier === "none" || !isSpeakable(resolved)
            ? "missing"
            : resolved.matchTier === "substituteScript"
              ? "substitute"
              : "ok";

      setStatus({
        state,
        voiceName: resolved.voiceName,
        languageTag: resolved.languageTag,
        isEnhanced: resolved.isEnhanced,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => load(), [load]);

  // A voice installed in the OS settings should show up here without a restart.
  useEffect(() => subscribeVoiceCatalog(() => load()), [load]);

  const recheck = useCallback(() => {
    setStatus((previous) => ({ ...previous, state: "loading" }));
    invalidateVoiceCatalog();
  }, []);

  return { ...status, recheck };
}
