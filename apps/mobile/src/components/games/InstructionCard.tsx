import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@/i18n';
import { surfaceCard, theme } from '@/theme';

interface InstructionCardProps {
  title?: string;
  message: string;
  color: string;
}

export function InstructionCard({
  title,
  message,
  color,
}: InstructionCardProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={[styles.title, { color }]}>{title ?? t('gameUi.howToPlay')}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaceCard({ elevated: true }),
    width: '100%',
    maxWidth: 360,
    padding: theme.spacing.md,
    borderLeftWidth: 5,
    borderLeftColor: theme.colors.gold,
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.bodyBold,
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
