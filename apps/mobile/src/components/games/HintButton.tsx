import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { useTranslation } from '@/i18n';
import { theme } from '@/theme';

interface HintButtonProps {
  hintsRemaining: number;
  maxHints: number;
  onPress: () => void;
  color?: string;
}

export function HintButton({
  hintsRemaining,
  maxHints,
  onPress,
  color = theme.colors.warning,
}: HintButtonProps) {
  const { t } = useTranslation();
  const disabled = hintsRemaining <= 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('gameUi.hint', {
        remaining: hintsRemaining,
        max: maxHints,
      })}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { borderColor: color },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Lightbulb size={20} color={color} />
      <Text style={[styles.label, { color }]}>
        {t('gameUi.hint', { remaining: hintsRemaining, max: maxHints })}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.touch.minTarget,
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.width,
    paddingHorizontal: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  label: {
    ...theme.typography.bodyBold,
    marginLeft: theme.spacing.xs,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.4,
  },
});
