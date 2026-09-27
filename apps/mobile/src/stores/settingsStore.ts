import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SpeechRatePreset = "slow" | "normal" | "fast";

/**
 * Android's TTS runs audibly faster than iOS at the same nominal rate, so the
 * presets are per-platform rather than one shared number. "normal" reproduces
 * the rate the app used before this setting existed.
 */
const RATE_VALUES: Record<SpeechRatePreset, number> =
  Platform.OS === "ios"
    ? { slow: 0.72, normal: 0.88, fast: 1.05 }
    : { slow: 0.8, normal: 0.95, fast: 1.15 };

interface SettingsState {
  /** Master switch: turns off every spoken word the app produces itself. */
  narrationEnabled: boolean;
  /** Auto-narration of screens on focus. Off still leaves Listen buttons working. */
  autoNarrateScreens: boolean;
  speechRate: SpeechRatePreset;
  hasHydrated: boolean;

  setNarrationEnabled: (value: boolean) => void;
  setAutoNarrateScreens: (value: boolean) => void;
  setSpeechRate: (value: SpeechRatePreset) => void;
  setHasHydrated: (value: boolean) => void;
}

/**
 * Kept separate from the auth store on purpose: `signOut()` clears session
 * fields, and a patient who signs out must not lose "slow speech" along with
 * their token.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      narrationEnabled: true,
      autoNarrateScreens: true,
      speechRate: "normal",
      hasHydrated: false,

      setNarrationEnabled: (value) => set({ narrationEnabled: value }),
      setAutoNarrateScreens: (value) => set({ autoNarrateScreens: value }),
      setSpeechRate: (value) => set({ speechRate: value }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "coco-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        narrationEnabled: state.narrationEnabled,
        autoNarrateScreens: state.autoNarrateScreens,
        speechRate: state.speechRate,
      }),
      // Flip the flag even when storage fails to read: the app gates on it
      // and must never be stuck on the splash spinner.
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hasHydrated: true });
      },
    }
  )
);

export function rateValueFor(preset: SpeechRatePreset): number {
  return RATE_VALUES[preset];
}

/** Non-hook read for the speech engine, which runs outside React. */
export function getNarrationSettings(): {
  enabled: boolean;
  autoScreens: boolean;
  rate: number;
} {
  const state = useSettingsStore.getState();
  return {
    enabled: state.narrationEnabled,
    autoScreens: state.autoNarrateScreens,
    rate: rateValueFor(state.speechRate),
  };
}
