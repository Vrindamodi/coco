import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { surfaceCard, theme } from '@/theme';
import { StarRating } from './StarRating';

interface GameCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  tint: string;
  level: number;
  stars: number;
  onPress: () => void;
}

export function GameCard({
  title,
  subtitle,
  icon: Icon,
  color,
  tint,
  level,
  stars,
  onPress,
}: GameCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. Level ${level}. ${stars} of 3 stars last time.`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: color },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconBadge, { backgroundColor: tint }]}>
        <Icon size={30} color={color} strokeWidth={2} />
      </View>

      <View style={styles.textArea}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.levelPill, { backgroundColor: tint }]}>
            <Text style={[styles.levelText, { color }]}>Level {level}</Text>
          </View>
          <StarRating rating={stars} size={18} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    ...surfaceCard(),
    borderLeftWidth: 6,
    padding: theme.spacing.md,
    minHeight: theme.touch.tileMinHeight,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  textArea: {
    flex: 1,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.foreground,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  levelPill: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.radius.full,
  },
  levelText: {
    ...theme.typography.overline,
  },
});
