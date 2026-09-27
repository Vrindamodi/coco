import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/AppIcon";
import type { ReminderType } from "@/types/api";
import { useTranslation } from "@/i18n";
import { buildReminderUtterance, formatReminderTime } from "@/services/reminderSpeech";
import { surfaceCard, theme } from "@/theme";

interface ReminderCardProps {
  title: string;
  reminderType: ReminderType;
  scheduledAt: string;
  isDone: boolean;
  onToggleDone: () => void;
  onSpeak: () => void;
}

export function ReminderCard({
  title,
  reminderType,
  scheduledAt,
  isDone,
  onToggleDone,
  onSpeak,
}: ReminderCardProps) {
  const { t, language, reminderTypeLabel } = useTranslation();

  // The same words on screen and in the ear. `toLocaleTimeString` followed the
  // device locale instead of the app language, so a Bengali interface still
  // showed Latin digits.
  const timeLabel = formatReminderTime(scheduledAt, language);
  const spoken = buildReminderUtterance(
    { title, reminder_type: reminderType, scheduled_at: scheduledAt, is_done: isDone },
    language
  );

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onSpeak}
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint={t("reminders.speakHint")}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText} allowFontScaling>
            {reminderTypeLabel(reminderType)}
          </Text>
        </View>
        <Text
          style={[styles.title, isDone && styles.titleDone]}
          allowFontScaling
        >
          {title}
        </Text>
        <View style={styles.timeRow}>
          <Text style={styles.time} allowFontScaling>
            {timeLabel}
          </Text>
          {/* Visible, not discovered: the affordance has to be seen to be used. */}
          <AppIcon
            name="SpeakerHigh"
            size={28}
            color={theme.colors.primary}
            weight="regular"
          />
        </View>
      </Pressable>

      <Pressable
        onPress={onToggleDone}
        accessibilityRole="checkbox"
        accessibilityLabel={
          isDone
            ? t("reminders.markNotDone", { title })
            : t("reminders.markDone", { title })
        }
        accessibilityState={{ checked: isDone }}
        style={({ pressed }) => [
          styles.checkButton,
          isDone && styles.checkButtonDone,
          pressed && styles.pressed,
        ]}
      >
        <AppIcon
          name={isDone ? "CheckCircle" : "CircleDashed"}
          size={40}
          color={isDone ? theme.colors.onAccent : theme.colors.primaryDark}
          weight={isDone ? "fill" : "regular"}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaceCard(),
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  content: {
    flex: 1,
    gap: theme.spacing.xs,
    minHeight: theme.touch.minTarget,
    justifyContent: "center",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.goldLight,
    borderRadius: theme.radius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  badgeText: {
    ...theme.typography.caption,
    color: theme.colors.tileReminders,
    fontFamily: "AtkinsonHyperlegible_700Bold",
    fontWeight: "600",
  },
  title: {
    ...theme.typography.label,
    color: theme.colors.foreground,
  },
  titleDone: {
    textDecorationLine: "line-through",
    color: theme.colors.muted,
  },
  time: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  checkButton: {
    minWidth: theme.touch.minTarget,
    minHeight: theme.touch.minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
    ...theme.elevation.sm,
  },
  checkButtonDone: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  pressed: {
    opacity: 0.92,
  },
});
