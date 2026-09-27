import { useCallback, useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Audio, ResizeMode, Video } from "expo-av";

import { AppIcon } from "@/components/AppIcon";
import { BigButton } from "@/components/BigButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { getItem, type Memory } from "@/db/myWorldRepo";
import { useNarration } from "@/hooks/useNarration";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { joinForSpeech } from "@/services/speech";
import { useAuthStore } from "@/stores/authStore";
import { useMyWorldStore } from "@/stores/myWorldStore";
import { surfaceCard, theme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "MemoryDetail">;

export function MemoryDetailScreen({ navigation, route }: Props) {
  const { itemId } = route.params;
  const patientId = useAuthStore((state) => state.patientId);
  const { t, language } = useTranslation();
  const { speak, stop, isSpeaking, isAvailable } = useNarration();

  const react = useMyWorldStore((state) => state.react);

  const [memory, setMemory] = useState<Memory | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getItem(itemId).then((found) => {
      if (cancelled) return;
      if (found) setMemory(found);
      else setNotFound(true);
    });

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  // Opening a memory is itself a signal the caregiver wants to see.
  useEffect(() => {
    if (memory && patientId) {
      void react(patientId, memory.id, "viewed");
    }
    // Only on first open of a given memory.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory?.id, patientId]);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  // Wait for the memory before speaking, so the narration includes its name.
  const story = memory?.story ?? memory?.description ?? "";
  const people = memory?.people.length
    ? `${t("memoryDetail.people")}. ${joinForSpeech(memory.people, language)}.`
    : "";
  const spoken = memory ? `${memory.name}. ${story} ${people}`.trim() : "";

  useSpeakOnMount(spoken, { enabled: Boolean(memory) });

  const onListen = useCallback(() => {
    if (isSpeaking) {
      stop();
      return;
    }
    // Caregivers write these stories freehand, so the script is whatever they
    // typed rather than whatever the interface language happens to be.
    if (spoken) void speak(spoken, { priority: "user", userGenerated: true });
  }, [isSpeaking, speak, spoken, stop]);

  const onPlayAudio = useCallback(async () => {
    const source = memory?.localMediaPath ?? memory?.mediaUri;
    if (!source) return;

    // The recording and the narration would otherwise play over each other.
    stop();

    try {
      await soundRef.current?.unloadAsync();
      const { sound } = await Audio.Sound.createAsync(
        { uri: source },
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch {
      // A missing or corrupt file should not crash the screen; the story text
      // is still on display.
    }
  }, [memory, stop]);

  const onRemember = useCallback(() => {
    if (!memory || !patientId) return;
    setAcknowledged(true);
    void react(patientId, memory.id, "remembered");
    void speak(t("memoryDetail.remembered"), { priority: "user" });
  }, [memory, patientId, react, speak, t]);

  if (notFound) {
    return (
      <ScreenLayout>
        <ScreenHeader
          title={t("memoryDetail.title")}
          onHomePress={() => navigation.navigate("Home")}
        />
        <Text style={styles.body} accessibilityRole="alert" allowFontScaling>
          {t("memoryDetail.notFound")}
        </Text>
      </ScreenLayout>
    );
  }

  if (!memory) {
    return (
      <ScreenLayout>
        <ScreenHeader
          title={t("memoryDetail.title")}
          onHomePress={() => navigation.navigate("Home")}
        />
      </ScreenLayout>
    );
  }

  const image = memory.localImagePath ?? memory.imageUri;
  const media = memory.localMediaPath ?? memory.mediaUri;
  const isCached = Boolean(memory.localImagePath ?? memory.localMediaPath);

  return (
    <ScreenLayout scrollable>
      <ScreenHeader
        title={memory.name}
        subtitle={memory.description ?? undefined}
        onHomePress={() => navigation.navigate("Home")}
      />

      <View style={styles.mediaCard}>
        {memory.mediaType === "video" && media ? (
          <Video
            source={{ uri: media }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            isLooping={false}
          />
        ) : image ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
            accessibilityLabel={memory.name}
          />
        ) : (
          <View style={styles.mediaPlaceholder}>
            <AppIcon
              name={memory.mediaType === "audio" ? "SpeakerHigh" : "FileText"}
              size={56}
              color={theme.colors.tileMyWorld}
              weight="duotone"
            />
          </View>
        )}
      </View>

      {memory.mediaType === "audio" && media ? (
        <BigButton
          label={t("memoryDetail.play")}
          onPress={() => void onPlayAudio()}
          variant="accent"
          accessibilityHint={t("memoryDetail.playHint")}
          style={styles.button}
        />
      ) : null}

      {memory.story ? (
        <ScrollView style={styles.storyCard} nestedScrollEnabled>
          <Text style={styles.story} allowFontScaling>
            {memory.story}
          </Text>
        </ScrollView>
      ) : null}

      {memory.people.length > 0 ? (
        <View style={styles.peopleBlock}>
          <Text style={styles.peopleLabel} allowFontScaling>
            {t("memoryDetail.people")}
          </Text>
          <Text style={styles.body} allowFontScaling>
            {memory.people.join(", ")}
          </Text>
        </View>
      ) : null}

      <BigButton
        label={isSpeaking ? t("memoryDetail.stopListening") : t("memoryDetail.listen")}
        onPress={onListen}
        variant="outline"
        accessibilityHint={
          isSpeaking
            ? t("memoryDetail.stopListeningHint")
            : t("memoryDetail.listenHint")
        }
        style={styles.button}
      />

      {!isAvailable ? (
        <Text style={styles.caption} allowFontScaling accessibilityRole="alert">
          {t("memoryDetail.voiceUnavailable")}
        </Text>
      ) : null}

      <BigButton
        label={t("memoryDetail.remember")}
        onPress={onRemember}
        variant="primary"
        disabled={acknowledged}
        accessibilityHint={t("memoryDetail.rememberHint")}
        style={styles.button}
      />

      {acknowledged ? (
        <Text style={styles.confirmation} accessibilityRole="alert" allowFontScaling>
          {t("memoryDetail.remembered")}
        </Text>
      ) : null}

      <BigButton
        label={t("memoryDetail.tellMeMore")}
        onPress={() =>
          navigation.navigate("Voice", {
            seedPrompt: `${memory.name}${
              memory.story ? ` — ${memory.story}` : ""
            }`,
          })
        }
        variant="outline"
        accessibilityHint={t("memoryDetail.tellMeMoreHint")}
        style={styles.button}
      />

      {isCached ? (
        <Text style={styles.caption} allowFontScaling>
          {t("memoryDetail.savedOffline")}
        </Text>
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  mediaCard: {
    ...surfaceCard(),
    height: 240,
    marginBottom: theme.spacing.sm,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.foreground,
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.tileMyWorldBg,
  },
  storyCard: {
    ...surfaceCard({ warm: true }),
    maxHeight: 260,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  story: {
    ...theme.typography.body,
    color: theme.colors.foreground,
  },
  peopleBlock: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  peopleLabel: {
    ...theme.typography.overline,
    color: theme.colors.muted,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.foreground,
  },
  caption: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  confirmation: {
    ...theme.typography.body,
    color: theme.colors.accent,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  button: {
    marginBottom: theme.spacing.sm,
  },
});
