import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { GameProgressBar } from './GameProgressBar';
import { useTranslation } from '@/i18n';
import { theme } from '@/theme';

interface GameHeaderProps {
  title: string;
  color: string;
  onBack: () => void;
  score?: number;
  progress?: { current: number; total: number };
  rightSlot?: React.ReactNode;
}

export function GameHeader({
  title,
  color,
  onBack,
  score,
  progress,
  rightSlot,
}: GameHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('gameUi.backToGamesHint')}
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          { borderColor: color },
          pressed && { opacity: 0.7 },
        ]}
      >
        <ArrowLeft size={24} color={color} />
      </Pressable>

      {progress ? (
        <GameProgressBar
          current={progress.current}
          total={progress.total}
          color={color}
        />
      ) : (
        <Text style={[styles.title, { color }]} numberOfLines={1}>
          {score === undefined ? title : `Score: ${score}`}
        </Text>
      )}

      <View style={styles.rightSlot}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  backButton: {
    width: theme.touch.minTarget,
    height: theme.touch.minTarget,
    borderRadius: theme.radius.full,
    borderWidth: theme.border.width,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  title: {
    flex: 1,
    ...theme.typography.title,
    textAlign: 'center',
  },
  rightSlot: {
    minWidth: theme.touch.minTarget,
    alignItems: 'flex-end',
  },
});
