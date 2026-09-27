import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BigButton } from "@/components/BigButton";
import { IconTile } from "@/components/IconTile";
import { ScreenLayout } from "@/components/ScreenLayout";
import { WelcomeCard } from "@/components/WelcomeCard";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/stores/authStore";
import { theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const patientName = useAuthStore((state) => state.patientName);
  const { t } = useTranslation();

  const spokenInstructions = patientName
    ? `${t("home.welcomeBack", { name: patientName })} ${t("home.instructions")}`
    : t("home.instructions");

  useSpeakOnMount(spokenInstructions);

  return (
    <ScreenLayout>
      <WelcomeCard
        name={patientName ?? t("common.friend")}
        message={t("home.welcomeMessage")}
      />

      <View style={styles.grid}>
        <View style={styles.row}>
          <IconTile
            label={t("home.play")}
            iconName="GameController"
            accentColor={theme.colors.tilePlay}
            backgroundColor={theme.colors.tilePlayBg}
            onPress={() => navigation.navigate("Play")}
            accessibilityHint={t("home.playHint")}
          />
          <IconTile
            label={t("home.reminders")}
            iconName="Bell"
            accentColor={theme.colors.tileReminders}
            backgroundColor={theme.colors.tileRemindersBg}
            onPress={() => navigation.navigate("Reminders")}
            accessibilityHint={t("home.remindersHint")}
          />
        </View>
        <View style={styles.row}>
          <IconTile
            label={t("home.progress")}
            iconName="ChartLineUp"
            accentColor={theme.colors.tileProgress}
            backgroundColor={theme.colors.tileProgressBg}
            onPress={() => navigation.navigate("Progress")}
            accessibilityHint={t("home.progressHint")}
          />
          <IconTile
            label={t("home.voice")}
            iconName="Microphone"
            accentColor={theme.colors.tileVoice}
            backgroundColor={theme.colors.tileVoiceBg}
            onPress={() => navigation.navigate("Voice")}
            accessibilityHint={t("home.voiceHint")}
          />
        </View>
        <View style={styles.row}>
          <IconTile
            label={t("home.myWorld")}
            iconName="Heart"
            accentColor={theme.colors.tileMyWorld}
            backgroundColor={theme.colors.tileMyWorldBg}
            onPress={() => navigation.navigate("MyWorld")}
            accessibilityHint={t("home.myWorldHint")}
          />
          <IconTile
            label={t("home.community")}
            iconName="UsersThree"
            accentColor={theme.colors.tileProgress}
            backgroundColor={theme.colors.tileProgressBg}
            onPress={() => navigation.navigate("Community")}
            accessibilityHint={t("home.communityHint")}
          />
        </View>
      </View>

      <BigButton
        label={t("common.settings")}
        onPress={() => navigation.navigate("Settings")}
        variant="outline"
        accessibilityHint={t("home.settingsHint")}
        style={styles.settingsButton}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  grid: {
    flex: 1,
    gap: theme.touch.gap,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: theme.touch.gap,
  },
  settingsButton: {
    marginTop: theme.spacing.sm,
  },
});
