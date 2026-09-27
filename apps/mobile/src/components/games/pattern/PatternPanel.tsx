import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import { theme } from '@/theme';

interface PatternPanelProps {
  color: string;
  active: boolean; // lit up (playback or correct-tap flash)
  disabled: boolean;
  size: number;
  onPress: () => void;
  accessibilityLabel: string;
}

export function PatternPanel({
  color,
  active,
  disabled,
  size,
  onPress,
  accessibilityLabel,
}: PatternPanelProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? 1.06 : 1,
      friction: 14,
      tension: 35,
      // delay: 10,
      useNativeDriver: true,
    }).start();
  }, [active]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={{ width: size, height: size, margin: 8 }}
    >
      <Animated.View
        style={[
          styles.panel,
          {
            width: size,
            height: size,
            backgroundColor: color,
            opacity: active ? 1 : 0.65,
            transform: [{ scale }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: theme.radius.lg,
  },
});
