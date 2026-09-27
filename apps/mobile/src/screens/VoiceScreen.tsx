import axios from "axios";
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
  MAX_RECORDING_MS,
  MIN_RECORDING_MS,
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
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation();
  const language = getPreferredNarratorLanguage();
  const { speak, stopAsync } = useNarration();

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

  /**
   * Return to idle, unless the patient has already interrupted and started
   * talking — `speak` resolves as soon as it is stopped, so without this the
   * reply would drop the microphone it just opened back to idle.
   */
  const finishSpeaking = useCallback(() => {
    setState((current) => (current === "speaking" ? "idle" : current));
  }, []);

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
      finishSpeaking();
    },
    [finishSpeaking, language, speak]
  );

  const clearAutoStop = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  }, []);

  useEffect(() => clearAutoStop, [clearAutoStop]);

  /**
   * Spoken-only prompts for recoverable listening problems. Unlike
   * `handleError` these add no bubble: nothing was said, so there is nothing
   * to show in the conversation.
   */
  const promptRetry = useCallback(
    async (key: "voice.tooShort" | "voice.notUnderstood") => {
      setState("speaking");
      await speak(t(key), { languageCode: language, priority: "user" });
      finishSpeaking();
    },
    [finishSpeaking, language, speak, t]
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
    finishSpeaking();
    scrollToEnd();
  }, [finishSpeaking, language, scrollToEnd, speak, t]);

  const processVoiceRecording = useCallback(async () => {
    clearAutoStop();
    setState("thinking");
    let recording: Awaited<ReturnType<typeof stopRecording>> = null;
    try {
      recording = await stopRecording();
    } catch {
      await handleError();
      return;
    }
    if (!recording) {
      setState("idle");
      return;
    }
    // An accidental tap produces a clip Whisper will invent words for, so it
    // never leaves the phone.
    if (recording.durationMillis > 0 && recording.durationMillis < MIN_RECORDING_MS) {
      await promptRetry("voice.tooShort");
      return;
    }
    if (recording.interrupted) {
      // Uploading it would only buy a slower "not understood" from Whisper.
      console.warn("The recorder stopped before the patient did; skipping upload");
      await promptRetry("voice.notUnderstood");
      return;
    }

    try {
      const turn = await sendVoiceMessage(recording.uri, language);
      appendTurn(turn.user_message, turn.assistant_message);
      await handleAssistantReply(turn.assistant_message);
    } catch (error) {
      // 400 is the server saying the clip held no recognisable speech.
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        await promptRetry("voice.notUnderstood");
        return;
      }
      await handleError();
    }
  }, [
    appendTurn,
    clearAutoStop,
    handleAssistantReply,
    handleError,
    language,
    promptRetry,
  ]);

  // Declared after processVoiceRecording so the auto-stop timer can call it.
  const processVoiceRecordingRef = useRef(processVoiceRecording);
  processVoiceRecordingRef.current = processVoiceRecording;

  const handleMicPress = async () => {
    // Only a request in flight blocks the microphone. A reply runs for several
    // sentences, and a patient who taps during it is asking to be heard now —
    // refusing until Coco finishes reads as the app ignoring them.
    if (state === "thinking") {
      return;
    }

    if (state === "idle" || state === "speaking") {
      try {
        // Wait for narration to actually stop, or Coco talks into its own open
        // microphone and the audio session flips mid-sentence.
        await stopAsync();
        await startRecording();
        setState("listening");
        // A forgotten open mic would otherwise upload an unbounded file.
        clearAutoStop();
        autoStopRef.current = setTimeout(() => {
          void processVoiceRecordingRef.current();
        }, MAX_RECORDING_MS);
      } catch (error) {
        console.error("Voice recording could not start", error);
        const detail = error instanceof Error ? error.message : String(error);
        const message =
          detail === "MIC_PERMISSION_DENIED"
            ? t("voice.noMicPermission")
            : __DEV__
              ? `${t("voice.error")}\n\n${detail}`
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
    if (!trimmed || state === "thinking") {
      return;
    }

    // Sending while Coco is still reading its last answer interrupts it, the
    // same way pressing the microphone does.
    await stopAsync();
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

  // Narration is interruptible, so only a request in flight disables the row.
  const micDisabled = state === "thinking";

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

        {/* Mic, text and send share one row so the conversation above gets the
            screen: with the old stacked layout only two bubbles were visible. */}
        <View style={styles.textRow}>
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
              size={40}
              color={micColor}
              weight="fill"
            />
          </Pressable>

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
              size={26}
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
    minHeight: 200,
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
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
    borderTopWidth: theme.border.width,
    borderTopColor: theme.colors.borderSubtle,
  },
  status: {
    ...theme.typography.caption,
    fontSize: 16,
    color: theme.colors.muted,
    textAlign: "center",
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    // Without this the input keeps its intrinsic width and pushes the send
    // button off-screen on narrow phones.
    minWidth: 0,
    minHeight: 60,
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
    ...theme.typography.caption,
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: "center",
    paddingHorizontal: theme.spacing.md,
  },
});
