import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppIcon } from "@/components/AppIcon";
import { BigButton } from "@/components/BigButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { VoiceStatusNote } from "@/components/VoiceStatusNote";
import {
  NARRATOR_LANGUAGES,
  type NarratorLanguage,
  normalizeNarratorLanguageCode,
} from "@/constants/narratorLanguages";
import { useNarration } from "@/hooks/useNarration";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { isScreenReaderOn } from "@/services/speech";
import { useAuthStore } from "@/stores/authStore";
import { useSettingsStore, type SpeechRatePreset } from "@/stores/settingsStore";
import { surfaceCard, theme } from "@/theme";

const RATE_PRESETS: SpeechRatePreset[] = ["slow", "normal", "fast"];

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const selectedCode = normalizeNarratorLanguageCode(
    useAuthStore((state) => state.preferredLanguage)
  );
  const setPreferredLanguage = useAuthStore((state) => state.setPreferredLanguage);
  const signOut = useAuthStore((state) => state.signOut);

  const narrationEnabled = useSettingsStore((state) => state.narrationEnabled);
  const setNarrationEnabled = useSettingsStore((state) => state.setNarrationEnabled);
  const speechRate = useSettingsStore((state) => state.speechRate);
  const setSpeechRate = useSettingsStore((state) => state.setSpeechRate);

  const { speak } = useNarration();

  useSpeakOnMount(t("settings.instructions"));

  const handleSelectLanguage = (language: NarratorLanguage) => {
    setPreferredLanguage(language.code);
    void speak(t("settings.languageSet"), {
      languageCode: language.code,
      priority: "user",
    });
  };

  const handleToggleNarration = () => {
    const next = !narrationEnabled;
    setNarrationEnabled(next);
    // Confirm out loud only when turning it on — the confirmation for turning it
    // off would be the very thing the user just asked to stop.
    if (next) void speak(t("settings.voiceSample"), { priority: "user" });
  };

  const handleSelectRate = (rate: SpeechRatePreset) => {
    setSpeechRate(rate);
    // Speak the sample at the new speed so the choice is heard, not guessed.
    void speak(t("settings.voiceSample"), { priority: "user", force: true });
  };

  const handleSignOut = () => {
    signOut();
    navigation.reset({
      index: 0,
      routes: [{ name: "LoginPin" }],
    });
  };

  return (
    <ScreenLayout scrollable>
      <ScreenHeader
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        onHomePress={() => navigation.navigate("Home")}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle} allowFontScaling accessibilityRole="header">
          {t("settings.voiceSectionTitle")}
        </Text>
        <Text style={styles.sectionHint} allowFontScaling>
          {t("settings.voiceSectionHint")}
        </Text>

        {isScreenReaderOn() ? (
          <Text style={styles.sectionHint} allowFontScaling accessibilityRole="alert">
            {t("settings.screenReaderActive")}
          </Text>
        ) : null}

        <Pressable
          onPress={handleToggleNarration}
          accessibilityRole="switch"
          accessibilityState={{ checked: narrationEnabled }}
          accessibilityLabel={t("settings.narrationToggle")}
          accessibilityHint={t("settings.narrationHint")}
          style={({ pressed }) => [
            styles.languageRow,
            narrationEnabled && styles.languageRowSelected,
            pressed && styles.languageRowPressed,
          ]}
        >
          <View style={styles.languageText}>
            <Text style={styles.languageLabel} allowFontScaling>
              {t("settings.narrationToggle")}
            </Text>
            <Text style={styles.fallbackNote} allowFontScaling>
              {t("settings.narrationHint")}
            </Text>
          </View>
          <AppIcon
            name={narrationEnabled ? "CheckCircle" : "CircleDashed"}
            size={32}
            color={narrationEnabled ? theme.colors.tilePlay : theme.colors.borderSubtle}
            weight={narrationEnabled ? "fill" : "regular"}
          />
        </Pressable>

        <Text style={styles.sectionTitle} allowFontScaling accessibilityRole="header">
          {t("settings.rateTitle")}
        </Text>
        <View style={styles.rateRow}>
          {RATE_PRESETS.map((preset) => {
            const isSelected = speechRate === preset;
            const label = t(`settings.rate${preset[0].toUpperCase()}${preset.slice(1)}`);

            return (
              <Pressable
                key={preset}
                onPress={() => handleSelectRate(preset)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={label}
                style={({ pressed }) => [
                  styles.rateOption,
                  isSelected && styles.languageRowSelected,
                  pressed && styles.languageRowPressed,
                ]}
              >
                <Text style={styles.languageLabel} allowFontScaling>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <BigButton
          label={t("settings.testVoice")}
          onPress={() => void speak(t("settings.voiceSample"), { priority: "user", force: true })}
          variant="outline"
          accessibilityHint={t("settings.testVoiceHint")}
        />

        {Platform.OS === "ios" ? (
          <Text style={styles.fallbackNote} allowFontScaling>
            {t("settings.silentSwitchNote")}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} allowFontScaling accessibilityRole="header">
          {t("settings.languageTitle")}
        </Text>
        <Text style={styles.sectionHint} allowFontScaling>
          {t("settings.languageHint")}
        </Text>

        <View style={styles.languageList}>
          {NARRATOR_LANGUAGES.map((language) => {
            const isSelected = selectedCode === language.code;

            return (
              <Pressable
                key={language.code}
                onPress={() => handleSelectLanguage(language)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${language.label}, ${language.nativeLabel}`}
                style={({ pressed }) => [
                  styles.languageRow,
                  isSelected && styles.languageRowSelected,
                  pressed && styles.languageRowPressed,
                ]}
              >
                <View style={styles.languageText}>
                  <Text style={styles.languageLabel} allowFontScaling>
                    {language.label}
                  </Text>
                  <Text style={styles.languageNative} allowFontScaling>
                    {language.nativeLabel}
                  </Text>
                  <VoiceStatusNote language={language} />
                </View>

                {isSelected ? (
                  <AppIcon
                    name="CheckCircle"
                    size={32}
                    color={theme.colors.tilePlay}
                    weight="fill"
                  />
                ) : (
                  <View style={styles.unselectedMarker} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <BigButton
        label={t("common.signOut")}
        onPress={handleSignOut}
        variant="outline"
        accessibilityHint={t("settings.signOutHint")}
        style={styles.signOutButton}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.label,
    color: theme.colors.foreground,
  },
  sectionHint: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  languageList: {
    gap: theme.touch.gap,
    marginTop: theme.spacing.xs,
  },
  rateRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  rateOption: {
    ...surfaceCard({ elevated: false }),
    flex: 1,
    minHeight: theme.touch.minTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xs,
    borderColor: theme.colors.borderSubtle,
  },
  languageRow: {
    ...surfaceCard({ elevated: false }),
    minHeight: theme.touch.minTarget,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
    borderColor: theme.colors.borderSubtle,
  },
  languageRowSelected: {
    backgroundColor: theme.colors.tilePlayBg,
    borderColor: theme.colors.tilePlay,
  },
  languageRowPressed: {
    opacity: 0.94,
  },
  languageText: {
    flex: 1,
    gap: 4,
  },
  languageLabel: {
    ...theme.typography.label,
    color: theme.colors.foreground,
  },
  languageNative: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  fallbackNote: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  unselectedMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: theme.border.subtleWidth + 1,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated,
  },
  signOutButton: {
    marginBottom: theme.spacing.md,
  },
});
