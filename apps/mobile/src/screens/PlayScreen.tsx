import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { IconTile } from "@/components/IconTile";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import type { GameType } from "@/types/api";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useNetworkStatus } from "@/stores/networkStore";
import { theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Play">;

type GameRoute = "Memory" | "Pattern" | "Naming";

const GAMES: {
  type: GameType;
  accent: string;
  bg: string;
  route: GameRoute;
}[] = [
  {
    type: "memory_match",
    accent: theme.colors.tilePlay,
    bg: theme.colors.tilePlayBg,
    route: "Memory",
  },
  {
    type: "sequence_recall",
    accent: theme.colors.tileProgress,
    bg: theme.colors.tileProgressBg,
    route: "Pattern",
  },
  {
    type: "object_recognition",
    accent: theme.colors.tileVoice,
    bg: theme.colors.tileVoiceBg,
    route: "Naming",
  },
];

const GAME_ICONS = {
  memory_match: "SquaresFour",
  sequence_recall: "ListNumbers",
  object_recognition: "Scan",
} as const;

export function PlayScreen({ navigation }: Props) {
  const { t, gameLabel } = useTranslation();
  const patientId = useAuthStore((state) => state.patientId);
  const summary = useGameStore((state) => state.summary);
  const pendingSyncCount = useGameStore((state) => state.pendingSyncCount);
  const loadSummary = useGameStore((state) => state.loadSummary);
  const isConnected = useNetworkStatus();

  // Re-read on every focus: a game just finished may have moved a level.
  useFocusEffect(
    useCallback(() => {
      void loadSummary(patientId);
    }, [loadSummary, patientId])
  );

  useSpeakOnMount(t("play.instructions"));

  return (
    <ScreenLayout scrollable>
      <ScreenHeader
        title={t("play.title")}
        subtitle={t("play.subtitle")}
        onHomePress={() => navigation.navigate("Home")}
      />

      {!isConnected ? (
        <View style={styles.banner} accessibilityRole="alert">
          <Text style={styles.bannerText} allowFontScaling>
            {t("play.offlineBanner")}
          </Text>
        </View>
      ) : pendingSyncCount > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText} allowFontScaling>
            {t("play.pendingSync", { count: pendingSyncCount })}
          </Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {GAMES.map((game) => (
          <IconTile
            key={game.type}
            label={gameLabel(game.type)}
            iconName={GAME_ICONS[game.type]}
            flex={0}
            accentColor={game.accent}
            backgroundColor={game.bg}
            gameLayout
            level={summary[game.type]?.nextLevel}
            stars={summary[game.type]?.bestStars}
            onPress={() =>
              navigation.navigate(game.route, { gameType: game.type })
            }
            accessibilityHint={t("play.gameHint", { game: gameLabel(game.type) })}
          />
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.touch.gap,
  },
  banner: {
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.goldLight,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.goldBorder,
  },
  bannerText: {
    ...theme.typography.caption,
    color: theme.colors.foreground,
  },
});
