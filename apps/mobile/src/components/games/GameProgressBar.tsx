import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/theme';

interface GameProgressBarProps {
  current: number;
  total: number;
  color: string;
}

export function GameProgressBar({
  current,
  total,
  color,
}: GameProgressBarProps) {
  const progress = Math.min(1, Math.max(0, current / Math.max(1, total)));

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: current }}
    >
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
  },
  track: {
    width: '100%',
    maxWidth: 280,
    height: 18,
    borderRadius: theme.radius.full,
    overflow: 'hidden',
    backgroundColor: theme.colors.borderSubtle,
    ...theme.elevation.sm,
  },
  fill: {
    height: '100%',
    borderRadius: theme.radius.full,
  },
});
