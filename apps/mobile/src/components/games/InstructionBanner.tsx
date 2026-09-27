import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { BigButton } from './BigButton';
import { useTranslation } from '@/i18n';
import { surfaceCard, theme } from '@/theme';

interface InstructionBannerProps {
  visible: boolean;
  message: string;
  color: string;
  onStart: () => void;
}

export function InstructionBanner({
  visible,
  message,
  color,
  onStart,
}: InstructionBannerProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStart}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={[styles.title, { color }]}>{t('gameUi.howToPlay')}</Text>
          <Text style={styles.message}>{message}</Text>
          <BigButton label={t('gameUi.start')} color={color} onPress={onStart} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: 'rgba(30, 45, 36, 0.22)',
  },
  card: {
    ...surfaceCard({ elevated: true }),
    width: '100%',
    maxWidth: 400,
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  title: {
    ...theme.typography.title,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  button: {
    width: '100%',
  },
});
