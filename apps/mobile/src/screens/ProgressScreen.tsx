import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { listSessions } from "@/db/gameRepo";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { isOfflineError } from "@/services/api";
import { computeLocalMetrics } from "@/services/gameProgress";
import { fetchPatientProgress } from "@/services/progress";
import { useAuthStore } from "@/stores/authStore";
import type { ProgressMetrics } from "@/types/api";
import { goldThreadAccent, surfaceCard, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Progress">;

export function ProgressScreen({ navigation }: Props) {
  const patientId = useAuthStore((state) => state.patientId);
  const [metrics, setMetrics] = useState<ProgressMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const { t } = useTranslation();

  // Cache-first, like My World: the numbers from this device show at once,
  // then the server's (which also count sessions from other devices) replace
  // them. Offline, the local numbers simply stay.
  useEffect(() => {
    if (!patientId) return;
    let active = true;
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    void (async () => {
      let hasLocal = false;
      try {
        const local = computeLocalMetrics(await listSessions(patientId));
        if (active) {
          setMetrics(local);
          setIsLoading(false);
          hasLocal = true;
        }
      } catch {
        // No local history; wait for the server.
      }

      try {
        const data = await fetchPatientProgress();
        if (active) setMetrics(data);
      } catch (err) {
        if (!active) return;
        if (isOfflineError(err) && hasLocal) {
          setIsOffline(true);
        } else if (!hasLocal) {
          setError(t("progress.error"));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [patientId, t]);

  const summary = useMemo(() => {
    if (!metrics) return "";

    if (metrics.total_sessions > 0) {
      return metrics.total_sessions === 1
        ? t("progress.summaryPlayed", { count: metrics.total_sessions })
        : t("progress.summaryPlayedPlural", { count: metrics.total_sessions });
    }

    return t("progress.summaryNone");
  }, [metrics, t]);

  // Gated on the fetch so the narration is spoken once, with the numbers in it,
  // rather than starting on the instructions and cutting itself off when the
  // metrics land.
  useSpeakOnMount(`${summary} ${t("progress.instructions")}`.trim(), {
    enabled: !isLoading,
  });

  return (
    <ScreenLayout>
      <ScreenHeader
        title={t("progress.title")}
        subtitle={t("progress.subtitle")}
        onHomePress={() => navigation.navigate("Home")}
      />

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.loader}
          accessibilityLabel={t("progress.loading")}
        />
      ) : error ? (
        <View style={styles.card}>
          <Text style={styles.errorText} allowFontScaling accessibilityRole="alert">
            {error}
          </Text>
        </View>
      ) : metrics ? (
        <View style={styles.card}>
          <View style={styles.goldAccent} />
          {isOffline ? (
            <Text style={styles.offlineText} allowFontScaling accessibilityRole="alert">
              {t("progress.offlineBanner")}
            </Text>
          ) : null}
          <Text style={styles.celebration} allowFontScaling>
            {t("progress.wellDone")}
          </Text>
          <Text style={styles.summary} allowFontScaling>
            {summary}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue} allowFontScaling>
                {metrics.total_sessions}
              </Text>
              <Text style={styles.statLabel} allowFontScaling>
                {t("progress.sessions")}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue} allowFontScaling>
                {metrics.average_score}
              </Text>
              <Text style={styles.statLabel} allowFontScaling>
                {t("progress.avgScore")}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue} allowFontScaling>
                {metrics.streak_days}
              </Text>
              <Text style={styles.statLabel} allowFontScaling>
                {t("progress.dayStreak")}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  loader: {
    marginTop: theme.spacing.xl,
  },
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
  celebration: {
    ...theme.typography.label,
    color: theme.colors.gold,
    marginTop: theme.spacing.xs,
  },
  summary: {
    ...theme.typography.title,
    color: theme.colors.foreground,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.destructive,
  },
  offlineText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: theme.border.subtleWidth,
    borderTopColor: theme.colors.borderSubtle,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: theme.colors.borderSubtle,
  },
  statValue: {
    ...theme.typography.headline,
    color: theme.colors.primary,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
