import { useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { theme } from "@/theme";

type BigButtonVariant = "primary" | "outline" | "accent";

interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: BigButtonVariant;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BigButton({
  label,
  onPress,
  variant = "primary",
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  style,
}: BigButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) return;
      Animated.timing(scale, {
        toValue: theme.motion.pressScale,
        duration: theme.motion.pressDuration,
        useNativeDriver: true,
      }).start();
    });
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: theme.motion.pressDuration,
      useNativeDriver: true,
    }).start();
  };

  const variantStyle =
    variant === "outline"
      ? styles.outline
      : variant === "accent"
        ? styles.accent
        : styles.primary;

  const textStyle =
    variant === "outline" ? styles.outlineText : styles.filledText;

  const elevationStyle =
    variant === "outline" ? undefined : theme.elevation.sm;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.button,
          variantStyle,
          elevationStyle,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text style={[styles.label, textStyle]} allowFontScaling>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: theme.touch.minTarget,
    minWidth: theme.touch.minTarget,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: theme.border.subtleWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  accent: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  outline: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.primary,
    ...theme.elevation.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...theme.typography.label,
    textAlign: "center",
  },
  filledText: {
    color: theme.colors.onPrimary,
  },
  outlineText: {
    color: theme.colors.primaryDark,
  },
});
