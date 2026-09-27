import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { CocoMark } from "@/components/CocoMark";
import { ScreenLayout } from "@/components/ScreenLayout";
import { TopAccent } from "@/components/TopAccent";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { isOfflineError } from "@/services/api";
import { fetchAuthMe } from "@/services/auth";
import { useAuthStore } from "@/stores/authStore";
import { theme, logoPedestal } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export function SplashScreen({ navigation }: Props) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const { t } = useTranslation();

  useSpeakOnMount(t("splash.instructions"));

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;

    async function bootstrap() {
      await new Promise((resolve) => setTimeout(resolve, 1400));

      if (cancelled) return;

      const { isAuthenticated, accessToken, setSession, clearSession } =
        useAuthStore.getState();

      if (isAuthenticated && accessToken) {
        try {
          const me = await fetchAuthMe();
          const patient = me.patient;

          if (patient) {
            setSession({
              accessToken,
              patientId: patient.id,
              patientName: patient.full_name,
              loginUsername: patient.full_name,
              role: me.role === "caregiver" ? "caregiver" : "patient",
              preferredLanguage: patient.preferred_language,
            });
            navigation.replace("Home");
            return;
          }
        } catch (error) {
          // No connection is not an expired session. Sending the patient to
          // the PIN screen here would put their reminders and My World
          // memories out of reach in exactly the low-connectivity areas this
          // app is built for — and they are all cached on the device.
          //
          // A token that really has expired is caught by the 401 handler in
          // services/api as soon as a request gets through.
          if (isOfflineError(error)) {
            navigation.replace("Home");
            return;
          }

          clearSession();
        }
      }

      navigation.replace("LoginPin");
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, navigation]);

  return (
    <ScreenLayout decorated={false}>
      <TopAccent />
      <View style={styles.container}>
        <View style={styles.logoPedestal}>
          <CocoMark size="lg" />
        </View>
        <Text style={styles.badge} allowFontScaling>
          {t("splash.badge")}
        </Text>
        <Text style={styles.title} allowFontScaling accessibilityRole="header">
          {t("splash.title")}
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          {t("splash.subtitle")}
        </Text>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.loader}
          accessibilityLabel={t("splash.loading")}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  logoPedestal: {
    ...logoPedestal,
    width: 112,
    height: 112,
    borderRadius: 56,
    marginBottom: theme.spacing.sm,
  },
  badge: {
    ...theme.typography.overline,
    color: theme.colors.gold,
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
    maxWidth: 340,
  },
  loader: {
    marginTop: theme.spacing.lg,
  },
});
