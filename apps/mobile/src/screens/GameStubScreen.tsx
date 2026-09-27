import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BigButton } from "@/components/BigButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { launchGame } from "@/services/games";
import { useAuthStore } from "@/stores/authStore";
import { goldThreadAccent, surfaceCard, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "GameStub">;

export function GameStubScreen({ navigation, route }: Props) {
  const { gameType } = route.params;
  const patientId = useAuthStore((state) => state.patientId);
  const { t, gameLabel } = useTranslation();
  const label = gameLabel(gameType);

  useSpeakOnMount(`${label}. ${t("gameStub.instructions")}`);

  useEffect(() => {
    if (patientId) {
      launchGame(gameType, patientId).catch((error) =>
        console.error("Failed to record game session", error)
      );
    }
  }, [gameType, patientId]);

  return (
    <ScreenLayout>
      <ScreenHeader
        title={label}
        subtitle={t("gameStub.subtitle")}
        onHomePress={() => navigation.navigate("Home")}
      />

      <View style={styles.card}>
        <View style={styles.goldAccent} />
        <Text style={styles.title} allowFontScaling>
          {t("gameStub.title")}
        </Text>
        <Text style={styles.body} allowFontScaling>
          {t("gameStub.body", { game: label })}
        </Text>

        <BigButton
          label={t("gameStub.back")}
          variant="outline"
          onPress={() => navigation.navigate("Play")}
          accessibilityHint={t("gameStub.backHint")}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaceCard({ warm: true }),
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.lg + 4,
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  goldAccent: {
    ...goldThreadAccent,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.foreground,
    marginTop: theme.spacing.xs,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
});
