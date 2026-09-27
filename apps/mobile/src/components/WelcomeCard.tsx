import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { AppIcon, type AppIconName } from "@/components/AppIcon";
import { useTranslation } from "@/i18n";
import { iconMedallion, theme } from "@/theme";

interface WelcomeCardProps {
  name: string;
  message?: string;
}

interface GreetingTheme {
  text: string;
  icon: AppIconName;
  ink: string;
  surface: string;
  wash: string;
}

export function WelcomeCard({ name, message }: WelcomeCardProps) {
  const { t } = useTranslation();
  const greeting = getGreetingTheme(t);

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[theme.colors.surfaceElevated, greeting.wash, greeting.surface]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orb} />

      <View style={styles.row}>
        <View style={iconMedallion(greeting.surface)}>
          <AppIcon
            name={greeting.icon}
            size={34}
            color={greeting.ink}
            weight="duotone"
          />
        </View>

        <View style={styles.content}>
          <View style={[styles.greetingPill, { backgroundColor: greeting.surface }]}>
            <Text style={[styles.greeting, { color: greeting.ink }]} allowFontScaling>
              {greeting.text}
            </Text>
          </View>

          <Text style={styles.name} allowFontScaling accessibilityRole="header">
            {name}
          </Text>

          {message ? (
            <Text style={styles.message} allowFontScaling>
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function getGreetingTheme(t: (path: string) => string): GreetingTheme {
  const hour = new Date().getHours();

  if (hour < 12) {
    return {
      text: t("home.greetingMorning"),
      icon: "SunHorizon",
      ink: theme.colors.tileReminders,
      surface: theme.colors.tileRemindersBg,
      wash: theme.colors.goldLight,
    };
  }

  if (hour < 17) {
    return {
      text: t("home.greetingAfternoon"),
      icon: "Sun",
      ink: theme.colors.tilePlay,
      surface: theme.colors.tilePlayBg,
      wash: theme.colors.tilePlayBg,
    };
  }

  return {
    text: t("home.greetingEvening"),
    icon: "MoonStars",
    ink: theme.colors.tileVoice,
    surface: theme.colors.tileVoiceBg,
    wash: theme.colors.tileVoiceBg,
  };
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.borderSubtle,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    overflow: "hidden",
    ...theme.elevation.sm,
  },
  orb: {
    position: "absolute",
    right: -28,
    bottom: -28,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "rgba(255, 255, 255, 0.45)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  greetingPill: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.borderSubtle,
  },
  greeting: {
    ...theme.typography.caption,
    fontFamily: "AtkinsonHyperlegible_700Bold",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  name: {
    ...theme.typography.display,
    color: theme.colors.foreground,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.muted,
    lineHeight: 26,
  },
});
