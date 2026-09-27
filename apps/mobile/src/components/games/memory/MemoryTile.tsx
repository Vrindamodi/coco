import React, { useEffect, useRef } from 'react';
import { Pressable, Text, Animated, StyleSheet, View } from 'react-native';
import { theme } from '@/theme';

interface MemoryTileProps {
  emoji: string;
  label: string;
  faceUp: boolean; // flipped or matched — shows the emoji
  matched: boolean;
  size: number;
  disabled: boolean;
  onPress: () => void;
}

export function MemoryTile({
  emoji,
  label,
  faceUp,
  matched,
  size,
  disabled,
  onPress,
}: MemoryTileProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // A quick, reliable "pop" when the tile turns face up — avoids relying
    // on a 3D rotateY flip, which is more failure-prone across devices.
    if (faceUp) {
      scale.setValue(0.85);
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [faceUp]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={faceUp ? label : 'hidden card'}
      disabled={disabled || faceUp}
      onPress={onPress}
      style={{ width: size, height: size, margin: 6 }}
    >
      <Animated.View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            transform: [{ scale }],
            backgroundColor: matched
              ? theme.colors.tileProgressBg
              : faceUp
              ? theme.colors.surface
              : theme.colors.tilePlay,
            borderColor: matched ? theme.colors.tileProgress : theme.colors.primaryDark,
          },
        ]}
      >
        {faceUp ? (
          <Text style={[styles.emoji, { fontSize: size * 0.46 }]}>{emoji}</Text>
        ) : (
          <View style={styles.backMark}>
            <Text style={[styles.backMarkText, { fontSize: size * 0.32 }]}>?</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: theme.radius.md,
    borderWidth: theme.border.width,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
  backMark: {
    opacity: 0.85,
  },
  backMarkText: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
});
