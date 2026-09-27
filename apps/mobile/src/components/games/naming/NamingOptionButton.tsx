import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { theme } from '@/theme';

export type NamingOptionState = 'default' | 'correct' | 'incorrect' | 'revealed' | 'eliminated';

interface NamingOptionButtonProps {
  label: string;
  state: NamingOptionState;
  onPress: () => void;
  disabled: boolean;
}

export function NamingOptionButton({
  label,
  state,
  onPress,
  disabled,
}: NamingOptionButtonProps) {
  if (state === 'eliminated') {
    // Keep the slot in the layout (so the grid doesn't reflow) but hide it.
    return <View style={styles.eliminatedSlot} />;
  }

  const palette = {
    default: { bg: theme.colors.surface, border: theme.colors.tileProgress, text: theme.colors.tileProgress },
    correct: { bg: theme.colors.tileProgress, border: theme.colors.tileProgress, text: theme.colors.onAccent },
    incorrect: { bg: theme.colors.destructive, border: theme.colors.destructive, text: theme.colors.onPrimary },
    revealed: { bg: theme.colors.tileProgressBg, border: theme.colors.tileProgress, text: theme.colors.tileProgress },
  }[state];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.touch.minTarget,
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.width,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.xs,
    width: '100%',
  },
  eliminatedSlot: {
    minHeight: theme.touch.minTarget,
    marginVertical: theme.spacing.xs,
    width: '100%',
  },
  label: {
    ...theme.typography.label,
  },
  pressed: {
    opacity: 0.8,
  },
});
