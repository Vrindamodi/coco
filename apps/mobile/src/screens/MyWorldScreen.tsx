import { useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppIcon, type AppIconName } from "@/components/AppIcon";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import type { Memory } from "@/db/myWorldRepo";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { useAuthStore } from "@/stores/authStore";
import { useMyWorldStore } from "@/stores/myWorldStore";
import { surfaceCard, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "MyWorld">;

const MEDIA_ICONS: Record<Memory["mediaType"], AppIconName | null> = {
  photo: null,
  video: "Play",
  audio: "SpeakerHigh",
  note: "FileText",
};

function MemoryTile({
  memory,
  badgeLabel,
  openHint,
  onPress,
}: {
  memory: Memory;
  badgeLabel: string | null;
  openHint: string;
  onPress: () => void;
}) {
  // The cached copy comes first: it is the one that still works offline.
  const source = memory.localImagePath ?? memory.imageUri;
  const icon = MEDIA_ICONS[memory.mediaType];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={memory.name}
      accessibilityHint={openHint}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.thumb}>
        {source ? (
          <Image
            source={{ uri: source }}
            style={styles.thumbImage}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <AppIcon
            name={icon ?? "Images"}
            size={44}
            color={theme.colors.tileMyWorld}
            weight="duotone"
          />
        )}

        {badgeLabel ? (
          <View style={styles.badge}>
            {icon ? (
              <AppIcon name={icon} size={16} color={theme.colors.onPrimary} />
            ) : null}
            <Text style={styles.badgeText} allowFontScaling>
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.tileLabel} numberOfLines={2} allowFontScaling>
        {memory.name}
      </Text>
    </Pressable>
  );
}

export function MyWorldScreen({ navigation }: Props) {
  const patientId = useAuthStore((state) => state.patientId);
  const { t } = useTranslation();

  const memories = useMyWorldStore((state) => state.memories);
  const isLoading = useMyWorldStore((state) => state.isLoading);
  const isOffline = useMyWorldStore((state) => state.isOffline);
  const error = useMyWorldStore((state) => state.error);
  const load = useMyWorldStore((state) => state.load);

  useSpeakOnMount(t("myWorld.instructions"));

  useFocusEffect(
    useCallback(() => {
      if (patientId) {
        void load(patientId);
      }
    }, [patientId, load])
  );

  function badgeFor(memory: Memory): string | null {
    if (memory.mediaType === "video") return t("myWorld.videoBadge");
    if (memory.mediaType === "audio") return t("myWorld.audioBadge");
    if (memory.mediaType === "note") return t("myWorld.noteBadge");
    return null;
  }

  return (
    <ScreenLayout scrollable>
      <ScreenHeader
        title={t("myWorld.title")}
        subtitle={t("myWorld.subtitle")}
        onHomePress={() => navigation.navigate("Home")}
      />

      {isOffline && memories.length > 0 ? (
        <View style={styles.offlineBanner} accessibilityRole="alert">
          <AppIcon
            name="CloudSlash"
            size={22}
            color={theme.colors.warning}
            weight="regular"
          />
          <Text style={styles.offlineText} allowFontScaling>
            {t("myWorld.offlineBanner")}
          </Text>
        </View>
      ) : null}

      {isLoading && memories.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.message} allowFontScaling>
            {t("myWorld.loading")}
          </Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.centered}>
          <Text style={styles.message} accessibilityRole="alert" allowFontScaling>
            {error}
          </Text>
        </View>
      ) : null}

      {!isLoading && !error && memories.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.message} allowFontScaling>
            {t("myWorld.empty")}
          </Text>
        </View>
      ) : null}

      <View style={styles.grid}>
        {memories.map((memory) => (
          <MemoryTile
            key={memory.id}
            memory={memory}
            badgeLabel={badgeFor(memory)}
            openHint={t("myWorld.openHint")}
            onPress={() =>
              navigation.navigate("MemoryDetail", { itemId: memory.id })
            }
          />
        ))}
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.touch.gap,
  },
  tile: {
    ...surfaceCard(),
    width: "47%",
    flexGrow: 1,
    minHeight: theme.touch.tileMinHeight,
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  tilePressed: {
    opacity: 0.94,
  },
  thumb: {
    height: 128,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.tileMyWorldBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    bottom: theme.spacing.xs,
    left: theme.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(30, 45, 36, 0.72)",
  },
  badgeText: {
    ...theme.typography.caption,
    fontSize: 16,
    color: theme.colors.onPrimary,
  },
  tileLabel: {
    ...theme.typography.label,
    fontSize: 20,
    color: theme.colors.foreground,
    paddingHorizontal: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.goldLight,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.goldBorder,
  },
  offlineText: {
    ...theme.typography.caption,
    flex: 1,
    color: theme.colors.foreground,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xl,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
