import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BigButton } from "@/components/BigButton";
import { CocoMark } from "@/components/CocoMark";
import { PinPad } from "@/components/PinPad";
import { ScreenLayout } from "@/components/ScreenLayout";
import {
  NARRATOR_LANGUAGES,
  normalizeNarratorLanguageCode,
} from "@/constants/narratorLanguages";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { API_URL, isOfflineError } from "@/services/api";
import { fetchAuthMe, patientLogin } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { theme, logoPedestal } from "@/theme";

type LoginStep = "username" | "pin";

type Props = NativeStackScreenProps<RootStackParamList, "LoginPin">;

export function LoginPinScreen({ navigation }: Props) {
  const savedUsername = useAuthStore((state) => state.loginUsername);
  const savedPatientName = useAuthStore((state) => state.patientName);
  const setSession = useAuthStore((state) => state.setSession);
  const setPreferredLanguage = useAuthStore((state) => state.setPreferredLanguage);
  const selectedLanguage = normalizeNarratorLanguageCode(
    useAuthStore((state) => state.preferredLanguage)
  );
  const { t } = useTranslation();

  const [step, setStep] = useState<LoginStep>("username");
  const [username, setUsername] = useState(
    savedUsername ?? savedPatientName ?? ""
  );
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const prefill = savedUsername ?? savedPatientName;
    if (prefill) {
      setUsername(prefill);
    }
  }, [savedUsername, savedPatientName]);

  // The one screen that genuinely changes what it has to say while it stays
  // focused: moving from the name step to the PIN step needs a fresh read.
  useSpeakOnMount(
    step === "username"
      ? t("login.usernameInstructions")
      : `${t("login.pinFor", { name: username.trim() })} ${t("login.pinInstructions")}`,
    { respeakOnChange: true }
  );

  const handleContinue = () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setErrorMessage(t("login.nameRequired"));
      return;
    }

    setErrorMessage(null);
    setStep("pin");
  };

  const handleBackToUsername = () => {
    setStep("username");
    setPin("");
    setErrorMessage(null);
  };

  const handleComplete = async (enteredPin: string) => {
    const trimmed = username.trim();
    if (!trimmed) {
      setStep("username");
      setErrorMessage(t("login.nameRequired"));
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = await patientLogin({
        full_name: trimmed,
        pin: enteredPin,
      });

      useAuthStore.setState({ accessToken: token.access_token });

      const me = await fetchAuthMe();
      const patient = me.patient;

      if (!patient) {
        throw new Error("Patient profile not found");
      }

      setSession({
        accessToken: token.access_token,
        patientId: patient.id,
        patientName: patient.full_name,
        loginUsername: trimmed,
        role: me.role === "caregiver" ? "caregiver" : "patient",
        preferredLanguage: patient.preferred_language,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } catch (error) {
      if (isOfflineError(error)) {
        const hint = __DEV__ ? ` (${API_URL})` : "";
        setErrorMessage(`${t("login.networkError")}${hint}`);
      } else {
        setErrorMessage(t("login.loginError"));
      }
      setPin("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenLayout>
      <View style={styles.hero}>
        <View style={styles.logoPedestal}>
          <CocoMark size="sm" />
        </View>
        <Text style={styles.tagline} allowFontScaling>
          {t("login.tagline")}
        </Text>
      </View>

      <View style={styles.container}>
        {step === "username" ? (
          <>
            <Text style={styles.title} allowFontScaling accessibilityRole="header">
              {t("login.signIn")}
            </Text>
            <Text style={styles.subtitle} allowFontScaling>
              {t("login.enterNameSubtitle")}
            </Text>

            {errorMessage ? (
              <Text
                style={styles.error}
                allowFontScaling
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {errorMessage}
              </Text>
            ) : null}

            <TextInput
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={t("login.namePlaceholder")}
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              accessibilityLabel={t("login.namePlaceholder")}
              accessibilityHint={t("login.nameAccessibilityHint")}
              style={styles.nameInput}
              allowFontScaling
            />

            <BigButton
              label={t("common.continue")}
              onPress={handleContinue}
              accessibilityHint={t("login.continueHint")}
            />

            <View style={styles.languageSection}>
              <Text style={styles.languageLabel} allowFontScaling>
                {t("settings.languageTitle")}
              </Text>
              <View style={styles.languageRow}>
                {NARRATOR_LANGUAGES.map((language) => {
                  const isSelected = selectedLanguage === language.code;
                  return (
                    <Pressable
                      key={language.code}
                      onPress={() => setPreferredLanguage(language.code)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={language.nativeLabel}
                      style={[
                        styles.languageChip,
                        isSelected && styles.languageChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.languageChipText,
                          isSelected && styles.languageChipTextSelected,
                        ]}
                        allowFontScaling
                      >
                        {language.nativeLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title} allowFontScaling accessibilityRole="header">
              {t("login.enterPin")}
            </Text>
            <Text style={styles.subtitle} allowFontScaling>
              {username.trim()}
            </Text>

            <Pressable
              onPress={handleBackToUsername}
              accessibilityRole="button"
              accessibilityLabel={t("login.changeNameAccessibility")}
              style={styles.changeNameButton}
            >
              <Text style={styles.changeNameText} allowFontScaling>
                {t("login.changeName")}
              </Text>
            </Pressable>

            {errorMessage ? (
              <Text
                style={styles.error}
                allowFontScaling
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {errorMessage}
              </Text>
            ) : null}

            {isSubmitting ? (
              <ActivityIndicator
                size="large"
                color={theme.colors.primary}
                accessibilityLabel={t("login.signingIn")}
                style={styles.loader}
              />
            ) : (
              <PinPad
                value={pin}
                onChange={setPin}
                onComplete={handleComplete}
              />
            )}
          </>
        )}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  logoPedestal: {
    ...logoPedestal,
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  tagline: {
    ...theme.typography.overline,
    color: theme.colors.primary,
    fontSize: 14,
    letterSpacing: 1.5,
  },
  container: {
    flex: 1,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  title: {
    ...theme.typography.headline,
    color: theme.colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: "center",
  },
  nameInput: {
    ...theme.typography.body,
    minHeight: theme.touch.minTarget,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.sm,
    color: theme.colors.foreground,
    textAlign: "center",
    ...theme.elevation.sm,
  },
  changeNameButton: {
    alignSelf: "center",
    minHeight: theme.touch.minTarget,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
  },
  changeNameText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    fontFamily: "AtkinsonHyperlegible_700Bold",
    fontWeight: "600",
    textAlign: "center",
  },
  error: {
    ...theme.typography.body,
    color: theme.colors.destructive,
    textAlign: "center",
    fontWeight: "600",
  },
  loader: {
    marginTop: theme.spacing.xl,
  },
  languageSection: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  languageLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textAlign: "center",
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  languageChip: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated,
    justifyContent: "center",
  },
  languageChipSelected: {
    backgroundColor: theme.colors.tilePlayBg,
    borderColor: theme.colors.tilePlay,
  },
  languageChipText: {
    ...theme.typography.caption,
    color: theme.colors.foreground,
  },
  languageChipTextSelected: {
    fontFamily: "AtkinsonHyperlegible_700Bold",
    fontWeight: "600",
    color: theme.colors.tilePlay,
  },
});
