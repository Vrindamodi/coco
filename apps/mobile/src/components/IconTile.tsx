import { useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AppIcon, type AppIconName } from "@/components/AppIcon";
import { iconMedallion, theme } from "@/theme";

interface IconTileProps {
  label: string;
  iconName: AppIconName;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  flex?: number;
  accentColor?: string;
  backgroundColor?: string;
  iconWeight?: "duotone" | "regular" | "fill";
}

export function IconTile({
  label,
  iconName,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  flex = 1,
  accentColor = theme.colors.primaryDark,
  backgroundColor = theme.colors.surfaceElevated,
  iconWeight = "duotone",
}: IconTileProps) {
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

  return (
    <Animated.View style={[styles.wrapper, { flex, transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [
          styles.tile,
          {
            backgroundColor,
            borderColor: accentColor,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={iconMedallion(theme.colors.surfaceElevated)}>
          <AppIcon
            name={iconName}
            size={38}
            color={accentColor}
            weight={iconWeight}
          />
        </View>
        <Text style={styles.label} allowFontScaling>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: theme.touch.tileMinHeight,
  },
  tile: {
    flex: 1,
    minHeight: theme.touch.tileMinHeight,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.subtleWidth,
    ...theme.elevation.sm,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.foreground,
    textAlign: "center",
    letterSpacing: 0.4,
  },
});
