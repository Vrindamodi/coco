import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "@/components/AppIcon";
import { useTranslation } from "@/i18n";
import { theme } from "@/theme";

interface PinPadProps {
  value: string;
  maxLength?: number;
  onChange: (next: string) => void;
  onComplete?: (pin: string) => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function PinPad({
  value,
  maxLength = 4,
  onChange,
  onComplete,
}: PinPadProps) {
  const { t } = useTranslation();

  const handleKey = (key: string) => {
    if (key === "back") {
      onChange(value.slice(0, -1));
      return;
    }
    if (!key || value.length >= maxLength) return;

    const next = `${value}${key}`;
    onChange(next);
    if (next.length === maxLength) {
      onComplete?.(next);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.dots}
        accessibilityLabel={t("pin.pinLength", {
          current: value.length,
          max: maxLength,
        })}
      >
        {Array.from({ length: maxLength }).map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index < value.length && styles.dotFilled]}
          />
        ))}
      </View>

      <View style={styles.grid}>
        {KEYS.map((key, index) => {
          if (key === "") {
            return <View key={`spacer-${index}`} style={styles.keySpacer} />;
          }

          const isBack = key === "back";
          const label = isBack ? t("pin.delete") : key;

          return (
            <Pressable
              key={key}
              onPress={() => handleKey(key)}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={({ pressed }) => [
                styles.key,
                pressed && styles.keyPressed,
              ]}
            >
              {isBack ? (
                <AppIcon
                  name="Backspace"
                  size={32}
                  color={theme.colors.foreground}
                  weight="regular"
                />
              ) : (
                <Text style={styles.keyText} allowFontScaling>
                  {key}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: theme.border.subtleWidth + 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceElevated,
  },
  dotFilled: {
    backgroundColor: theme.colors.primaryDark,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  key: {
    width: "30%",
    minHeight: theme.touch.minTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.md,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.borderSubtle,
    backgroundColor: theme.colors.surfaceElevated,
    ...theme.elevation.sm,
  },
  keySpacer: {
    width: "30%",
    minHeight: theme.touch.minTarget,
  },
  keyPressed: {
    backgroundColor: theme.colors.surfaceWarm,
    opacity: 0.95,
  },
  keyText: {
    ...theme.typography.title,
    color: theme.colors.foreground,
  },
});
