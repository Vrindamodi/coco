import { StyleSheet, Text, View, Pressable, Platform } from "react-native";

import type { NarratorLanguage } from "@/constants/narratorLanguages";
import { useVoiceStatus } from "@/hooks/useVoiceStatus";
import { useTranslation } from "@/i18n";
import { theme } from "@/theme";

interface VoiceStatusNoteProps {
  language: NarratorLanguage;
}

/**
 * Reports what this phone can actually do with this language.
 *
 * Replaces a fixed "Assamese may fall back to Bengali" warning that was shown
 * whether or not it was true, and never mentioned the other three languages.
 */
export function VoiceStatusNote({ language }: VoiceStatusNoteProps) {
  const { t } = useTranslation();
  const status = useVoiceStatus(language.code);

  if (status.state === "loading") return null;

  if (status.state === "ok") {
    const name = status.voiceName ?? status.languageTag ?? language.label;
    return (
      <View style={styles.row}>
        <Text style={styles.note} allowFontScaling>
          {t("settings.voiceStatusOk", { voice: name })}
        </Text>
        {status.isEnhanced ? (
          <Text style={styles.badge} allowFontScaling>
            {t("settings.voiceStatusEnhanced")}
          </Text>
        ) : null}
      </View>
    );
  }

  if (status.state === "substitute") {
    return (
      <Text style={styles.note} allowFontScaling>
        {t("settings.voiceStatusSubstitute", { language: language.label })}
      </Text>
    );
  }

  if (status.state === "unknown") {
    return (
      <Pressable
        onPress={status.recheck}
        accessibilityRole="button"
        accessibilityLabel={t("settings.checkAgain")}
        accessibilityHint={t("settings.checkAgainHint")}
        style={styles.recheck}
      >
        <Text style={styles.link} allowFontScaling>
          {t("settings.checkAgain")}
        </Text>
      </Pressable>
    );
  }

  return (
    <View>
      <Text style={styles.warning} allowFontScaling>
        {t("settings.voiceStatusMissing", { language: language.label })}
      </Text>
      <Text style={styles.note} allowFontScaling>
        {Platform.OS === "ios"
          ? t("settings.installVoiceIos")
          : t("settings.installVoiceAndroid")}
      </Text>
      <Pressable
        onPress={status.recheck}
        accessibilityRole="button"
        accessibilityHint={t("settings.checkAgainHint")}
        style={styles.recheck}
      >
        <Text style={styles.link} allowFontScaling>
          {t("settings.checkAgain")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    marginTop: 2,
  },
  note: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  warning: {
    ...theme.typography.caption,
    color: theme.colors.destructive,
    marginTop: 2,
  },
  badge: {
    ...theme.typography.caption,
    color: theme.colors.tilePlay,
  },
  link: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    textDecorationLine: "underline",
  },
  recheck: {
    minHeight: 44,
    justifyContent: "center",
  },
});
