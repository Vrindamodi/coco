import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { useTranslation } from '@/i18n';
import { theme } from '@/theme';

interface HowToPlayButtonProps {
  onPress: () => void;
  color?: string;
}

export function HowToPlayButton({
  onPress,
  color = theme.colors.primaryDark,
}: HowToPlayButtonProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('gameUi.howToPlay')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { borderColor: color },
        pressed && styles.pressed,
      ]}
    >
      <BookOpen size={20} color={color} />
      <Text style={[styles.label, { color }]}>{t('gameUi.howToPlay')}</Text>
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
});
