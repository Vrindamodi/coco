import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppIcon } from "@/components/AppIcon";
import { ChatBubble } from "@/components/ChatBubble";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ScreenLayout } from "@/components/ScreenLayout";
import { useNarration } from "@/hooks/useNarration";
import { useSpeakOnMount } from "@/hooks/useSpeakOnMount";
import { useTranslation } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { fetchChatHistory, sendTextMessage, sendVoiceMessage } from "@/services/chat";
import {
  getVoiceStateLabel,
  startRecording,
  stopRecording,
  type VoiceUiState,
} from "@/services/voice";
import { getPreferredNarratorLanguage } from "@/stores/authStore";
import { theme } from "@/theme";
import type { ChatMessage } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "Voice">;

export function VoiceScreen({ navigation, route }: Props) {
  const [state, setState] = useState<VoiceUiState>("idle");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Arriving from a My World memory pre-fills the question, so the patient
  // only has to press send to start talking about it.
  const [textInput, setTextInput] = useState(route.params?.seedPrompt ?? "");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const { t } = useTranslation();
  const language = getPreferredNarratorLanguage();
  const { speak, stop } = useNarration();

  useSpeakOnMount(t("voice.instructions"));

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const history = await fetchChatHistory();
        if (!active) return;
        if (history.length === 0) {
          setMessages([
            {
              id: "welcome",
              patient_id: "",
              role: "assistant",
              content: t("voice.welcome"),
              language,
              created_at: new Date().toISOString(),
            },
          ]);
        } else {
          setMessages(history);
        }
      } catch {
        if (!active) return;
        setMessages([
          {
            id: "welcome",
            patient_id: "",
            role: "assistant",
            content: t("voice.welcome"),
            language,
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        if (active) {
          setLoadingHistory(false);
          scrollToEnd();
        }
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, [language, scrollToEnd, t]);

  const appendTurn = useCallback(
    (userMessage: ChatMessage, assistantMessage: ChatMessage) => {
      setMessages((prev) => {
        const withoutWelcome =
          prev.length === 1 && prev[0]?.id === "welcome" ? [] : prev;
        return [...withoutWelcome, userMessage, assistantMessage];
      });
      scrollToEnd();
    },
    [scrollToEnd]
  );

  const handleAssistantReply = useCallback(
    async (assistantMessage: ChatMessage) => {
      setState("speaking");
      // The model replies in markdown and may answer in a different script than
      // the interface language, so this text needs the full treatment.
      await speak(assistantMessage.content, {
        languageCode: language,
        priority: "user",
        userGenerated: true,
      });
      setState("idle");
    },
    [language, speak]
  );

  const handleError = useCallback(async () => {
    const errorText = t("voice.error");
    setMessages((prev) => [
      ...prev,
      {
        id: `error-${Date.now()}`,
        patient_id: "",
        role: "assistant",
        content: errorText,
        language,
        created_at: new Date().toISOString(),
      },
    ]);
    setState("speaking");
    await speak(errorText, { languageCode: language, priority: "user" });
    setState("idle");
    scrollToEnd();
  }, [language, scrollToEnd, speak, t]);

  const processVoiceRecording = useCallback(async () => {
    setState("thinking");
    try {
      const recording = await stopRecording();
      if (!recording) {
        setState("idle");
        return;
      }

      const turn = await sendVoiceMessage(recording.uri, language);
      appendTurn(turn.user_message, turn.assistant_message);
      await handleAssistantReply(turn.assistant_message);
    } catch {
      await handleError();
    }
  }, [appendTurn, handleAssistantReply, handleError, language]);

  const handleMicPress = async () => {
    if (state === "thinking" || state === "speaking") {
      return;
    }

    if (state === "idle") {
      try {
        // Stop narrating first, or Coco talks into its own open microphone.
        stop();
        await startRecording();
        setState("listening");
      } catch (error) {
        const message =
          error instanceof Error && error.message === "MIC_PERMISSION_DENIED"
            ? t("voice.noMicPermission")
            : t("voice.error");
        Alert.alert(t("voice.title"), message);
      }
      return;
    }

    if (state === "listening") {
      await processVoiceRecording();
    }
  };

  const handleSendText = async () => {
    const trimmed = textInput.trim();
    if (!trimmed || state === "thinking" || state === "speaking") {
      return;
    }

    setTextInput("");
    setState("thinking");

    try {
      const turn = await sendTextMessage(trimmed, language);
      appendTurn(turn.user_message, turn.assistant_message);
      await handleAssistantReply(turn.assistant_message);
    } catch {
      await handleError();
    }
  };

  const micColor =
    state === "listening"
      ? theme.colors.accent
      : state === "speaking"
        ? theme.colors.primaryDark
        : state === "thinking"
          ? theme.colors.gold
          : theme.colors.tileVoice;

  const micDisabled = state === "thinking" || state === "speaking";

  return (
    <ScreenLayout>
      <ScreenHeader
        title={t("voice.title")}
        subtitle={t("voice.subtitle")}
        onHomePress={() => navigation.navigate("Home")}
      />

      <View style={styles.chatArea}>
        {loadingHistory ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText} allowFontScaling>
              {t("common.loading")}
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={scrollToEnd}
          >
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                role={message.role}
                content={message.content}
                speakerLabel={
                  message.role === "user" ? t("voice.you") : t("voice.coco")
                }
              />
            ))}
            {state === "thinking" ? (
              <View style={styles.thinkingRow}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.thinkingText} allowFontScaling>
                  {t("voice.thinking")}
                </Text>
              </View>
            ) : null}
          </ScrollView>
        )}
      </View>

      <View style={styles.controls}>
        <Text style={styles.status} allowFontScaling accessibilityLiveRegion="polite">
          {getVoiceStateLabel(state, t)}
        </Text>

        <Pressable
          onPress={handleMicPress}
          disabled={micDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: micDisabled }}
          accessibilityLabel={
            state === "listening"
              ? t("voice.stopListening")
              : t("voice.startListening")
          }
          accessibilityHint={t("voice.micHint")}
          style={({ pressed }) => [
            styles.micButton,
            state === "listening" && styles.micListening,
            state === "speaking" && styles.micSpeaking,
            state === "thinking" && styles.micThinking,
            micDisabled && styles.micDisabled,
            pressed && !micDisabled && styles.pressed,
          ]}
        >
          <AppIcon
            name={state === "listening" ? "StopCircle" : "Microphone"}
            size={72}
            color={micColor}
            weight="fill"
          />
        </Pressable>

        <View style={styles.textRow}>
          <TextInput
            value={textInput}
            onChangeText={setTextInput}
            placeholder={t("voice.typeMessage")}
            placeholderTextColor={theme.colors.muted}
            style={styles.textInput}
            editable={!micDisabled}
            accessibilityLabel={t("voice.typeMessage")}
            returnKeyType="send"
            onSubmitEditing={handleSendText}
          />
          <Pressable
            onPress={handleSendText}
            disabled={micDisabled || !textInput.trim()}
            accessibilityRole="button"
            accessibilityLabel={t("voice.sendText")}
            style={({ pressed }) => [
              styles.sendButton,
              (micDisabled || !textInput.trim()) && styles.sendDisabled,
              pressed && styles.pressed,
            ]}
          >
            <AppIcon
              name="PaperPlaneRight"
              size={28}
              color={theme.colors.onPrimary}
              weight="fill"
            />
          </Pressable>
        </View>

        <Text style={styles.hint} allowFontScaling>
          {t("voice.hint")}
        </Text>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  chatArea: {
    flex: 1,
    minHeight: 120,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    flexGrow: 1,
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  thinkingText: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  controls: {
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderTopWidth: theme.border.width,
    borderTopColor: theme.colors.borderSubtle,
  },
  status: {
    ...theme.typography.title,
    fontSize: 22,
    color: theme.colors.foreground,
    textAlign: "center",
  },
  micButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: theme.border.width * 2,
    borderColor: theme.colors.goldBorder,
    backgroundColor: theme.colors.tileVoiceBg,
    alignItems: "center",
    justifyContent: "center",
  },
  micListening: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.tileProgressBg,
  },
  micSpeaking: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.tilePlayBg,
  },
  micThinking: {
    borderColor: theme.colors.gold,
    backgroundColor: theme.colors.goldLight,
  },
  micDisabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.92,
  },
  textRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    width: "100%",
    paddingHorizontal: theme.spacing.xs,
  },
  textInput: {
    flex: 1,
    minHeight: 56,
    borderWidth: theme.border.width,
    borderColor: theme.colors.border,
    borderRadius: theme.border.radius,
    paddingHorizontal: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.foreground,
    backgroundColor: theme.colors.surface,
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.5,
  },
  hint: {
    ...theme.typography.body,
    fontSize: 18,
    color: theme.colors.muted,
    textAlign: "center",
    paddingHorizontal: theme.spacing.md,
  },
});
