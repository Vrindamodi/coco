import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';
import { theme } from '@/theme';
import type { LucideIcon } from 'lucide-react-native';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  style?: StyleProp<ViewStyle>;
}

export function BigButton({
  label,
  onPress,
  color = theme.colors.primary,
  textColor,
  icon: Icon,
  disabled = false,
  variant = 'solid',
  style,
}: BigButtonProps) {
  const isOutline = variant === 'outline';
  const resolvedTextColor = textColor ?? (isOutline ? color : theme.colors.onPrimary);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isOutline
          ? { backgroundColor: theme.colors.surface, borderWidth: theme.border.width, borderColor: color }
          : { backgroundColor: color },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {Icon ? (
          <Icon size={22} color={resolvedTextColor} style={{ marginRight: theme.spacing.xs }} />
        ) : null}
        <Text style={[styles.label, { color: resolvedTextColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.touch.minTarget,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...theme.typography.label,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
});
