import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/theme";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  speakerLabel: string;
}

export function ChatBubble({ role, content, speakerLabel }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAssistant,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${speakerLabel}. ${content}`}
    >
      <Text style={styles.speaker} allowFontScaling>
        {speakerLabel}
      </Text>
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        <Text style={styles.content} allowFontScaling>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: theme.spacing.sm,
    maxWidth: "92%",
  },
  rowUser: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  rowAssistant: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  speaker: {
    ...theme.typography.bodyBold,
    fontSize: 18,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs / 2,
  },
  bubble: {
    borderRadius: theme.border.radius,
    borderWidth: theme.border.width,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  bubbleUser: {
    backgroundColor: theme.colors.tilePlayBg,
    borderColor: theme.colors.primary,
  },
  bubbleAssistant: {
    backgroundColor: theme.colors.tileVoiceBg,
    borderColor: theme.colors.tileVoice,
  },
  content: {
    ...theme.typography.body,
    color: theme.colors.foreground,
  },
});
