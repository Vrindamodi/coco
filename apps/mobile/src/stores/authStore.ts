import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { NarratorLanguageCode } from "@/constants/narratorLanguages";
import { normalizeNarratorLanguageCode } from "@/constants/narratorLanguages";

interface AuthState {
  role: "patient" | "caregiver" | null;
  patientId: string | null;
  patientName: string | null;
  loginUsername: string | null;
  preferredLanguage: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;

  setSession: (params: {
    accessToken: string;
    patientId: string;
    patientName: string;
    loginUsername: string;
    role?: "patient" | "caregiver";
    preferredLanguage?: string | null;
  }) => void;
  setPreferredLanguage: (code: NarratorLanguageCode) => void;
  /** Clear token only — keeps saved username for re-login after expiry */
  clearSession: () => void;
  /** Full sign-out — clears saved login */
  signOut: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      role: null,
      patientId: null,
      patientName: null,
      loginUsername: null,
      preferredLanguage: null,
      accessToken: null,
      isAuthenticated: false,
      hasHydrated: false,

      setSession: ({
        accessToken,
        patientId,
        patientName,
        loginUsername,
        role = "patient",
        preferredLanguage,
      }) =>
        set({
          role,
          accessToken,
          patientId,
          patientName,
          loginUsername,
          preferredLanguage: normalizeNarratorLanguageCode(preferredLanguage),
          isAuthenticated: true,
        }),

      setPreferredLanguage: (code) =>
        set({ preferredLanguage: normalizeNarratorLanguageCode(code) }),

      clearSession: () =>
        set({
          accessToken: null,
          isAuthenticated: false,
        }),

      signOut: () =>
        set({
          accessToken: null,
          isAuthenticated: false,
          patientId: null,
          patientName: null,
          loginUsername: null,
          role: null,
        }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "coco-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        patientId: state.patientId,
        patientName: state.patientName,
        loginUsername: state.loginUsername,
        role: state.role,
        preferredLanguage: state.preferredLanguage,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/** @deprecated Use patientId from auth store */
export function useActiveProfileId(): string | null {
  return useAuthStore((s) => s.patientId);
}

export function getPreferredNarratorLanguage(): NarratorLanguageCode {
  return normalizeNarratorLanguageCode(
    useAuthStore.getState().preferredLanguage
  );
}
