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
import { StarRating } from "@/components/games/StarRating";
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
  level?: number;
  stars?: number;
  gameLayout?: boolean;
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
  level,
  stars,
  gameLayout = false,
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
          gameLayout && styles.gameTile,
          {
            backgroundColor,
            borderColor: accentColor,
          },
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            iconMedallion(theme.colors.surfaceElevated),
            gameLayout && styles.largeIcon,
          ]}
        >
          <AppIcon
            name={iconName}
            size={gameLayout ? 52 : 38}
            color={accentColor}
            weight={iconWeight}
          />
        </View>
        <View style={gameLayout ? styles.details : undefined}>
          <Text style={styles.label} allowFontScaling numberOfLines={1}>
            {label}
          </Text>
          {gameLayout && level !== undefined && stars !== undefined ? (
            <>
              <Text style={[styles.level, { color: accentColor }]}>Level {level}</Text>
              <StarRating rating={stars} size={22} gap={3} />
            </>
          ) : null}
        </View>
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
  gameTile: {
    flexDirection: "row",
    gap: theme.spacing.md,
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
  largeIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  details: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: theme.spacing.xs,
  },
  level: {
    ...theme.typography.caption,
    fontWeight: "700",
  },
});
