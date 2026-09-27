import { useCallback } from "react";

import { normalizeNarratorLanguageCode } from "@/constants/narratorLanguages";
import { getTranslations, translate } from "@/i18n/translate";
import type { GameType, ReminderType } from "@/types/api";
import { useAuthStore } from "@/stores/authStore";

export { getTranslations, translate, type TranslationPath } from "@/i18n/translate";

export function useTranslation() {
  const language = useAuthStore((state) =>
    normalizeNarratorLanguageCode(state.preferredLanguage)
  );

  const t = useCallback(
    (path: string, params?: Record<string, string | number>) =>
      translate(language, path, params),
    [language]
  );

  const gameLabel = useCallback(
    (gameType: GameType) => getTranslations(language).games[gameType],
    [language]
  );

  const reminderTypeLabel = useCallback(
    (reminderType: ReminderType) =>
      getTranslations(language).reminderTypes[reminderType],
    [language]
  );

  return {
    t,
    language,
    gameLabel,
    reminderTypeLabel,
    translations: getTranslations(language),
  };
}
