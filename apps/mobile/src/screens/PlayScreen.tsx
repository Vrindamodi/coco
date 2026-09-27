import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { IconTile } from "@/components/IconTile";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import type { GameType } from "@/types/api";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Play">;

const GAMES: {
  type: GameType;
  accent: string;
  bg: string;
}[] = [
  {
    type: "memory_match",
    accent: theme.colors.tilePlay,
    bg: theme.colors.tilePlayBg,
  },
  {
    type: "sequence_recall",
    accent: theme.colors.tileProgress,
    bg: theme.colors.tileProgressBg,
  },
  {
    type: "object_recognition",
    accent: theme.colors.tileVoice,
    bg: theme.colors.tileVoiceBg,
  },
];

const GAME_ICONS = {
  memory_match: "SquaresFour",
  sequence_recall: "ListNumbers",
  object_recognition: "Scan",
} as const;

export function PlayScreen({ navigation }: Props) {
  const { t, gameLabel } = useTranslation();

  useSpeakOnMount(t("play.instructions"));

  return (
    <ScreenLayout scrollable>
      <ScreenHeader
        title={t("play.title")}
        subtitle={t("play.subtitle")}
        onHomePress={() => navigation.navigate("Home")}
      />

      <View style={styles.list}>
        {GAMES.map((game) => (
          <IconTile
            key={game.type}
            label={gameLabel(game.type)}
            iconName={GAME_ICONS[game.type]}
            flex={0}
            accentColor={game.accent}
            backgroundColor={game.bg}
            onPress={() =>
              navigation.navigate("GameStub", { gameType: game.type })
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
});
