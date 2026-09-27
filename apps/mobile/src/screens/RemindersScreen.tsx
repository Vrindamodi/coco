import { useCallback } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { ReminderCard } from "@/components/ReminderCard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useNarration } from "@/hooks/useNarration";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import { buildReminderUtterance } from "@/services/reminderSpeech";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/stores/authStore";
import { useReminderStore } from "@/stores/reminderStore";
import { theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Reminders">;

export function RemindersScreen({ navigation }: Props) {
  const patientId = useAuthStore((state) => state.patientId);
  const reminders = useReminderStore((state) => state.reminders);
  const isLoading = useReminderStore((state) => state.isLoading);
  const error = useReminderStore((state) => state.error);
  const loadTodayReminders = useReminderStore(
    (state) => state.loadTodayReminders
  );
  const toggleDone = useReminderStore((state) => state.toggleDone);
  const { t, language } = useTranslation();
  const { speak } = useNarration();

  useSpeakOnMount(t("reminders.instructions"));

  useFocusEffect(
    useCallback(() => {
      if (patientId) {
        loadTodayReminders(patientId);
      }
    }, [patientId, loadTodayReminders])
  );

  return (
    <ScreenLayout scrollable>
      <ScreenHeader
        title={t("reminders.title")}
        subtitle={t("reminders.subtitle")}
        onHomePress={() => navigation.navigate("Home")}
      />

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.loader}
          accessibilityLabel={t("reminders.loading")}
        />
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.errorText} allowFontScaling accessibilityRole="alert">
            {error}
          </Text>
        </View>
      ) : reminders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText} allowFontScaling>
            {t("reminders.empty")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <ReminderCard
              title={item.title}
              reminderType={item.reminder_type}
              scheduledAt={item.scheduled_at}
              isDone={item.is_done}
              onToggleDone={() => toggleDone(item.id)}
              onSpeak={() =>
                void speak(buildReminderUtterance(item, language), { priority: "user" })
              }
            />
          )}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: theme.spacing.xl,
  },
  empty: {
    ...theme.typography.body,
    padding: theme.spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: "center",
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.destructive,
    textAlign: "center",
  },
});
