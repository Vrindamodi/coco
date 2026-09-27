import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { theme } from '@/theme/index';

interface StarRatingProps {
  rating: number; // 0-3
  size?: number;
  max?: number;
  gap?: number;
}

export function StarRating({ rating, size = 22, max = 3, gap = 4 }: StarRatingProps) {
  return (
    <View style={[styles.row, { gap }]}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < rating;
        return (
          <Star
            key={i}
            size={size}
            color={filled ? theme.colors.gold : theme.colors.border}
            fill={filled ? theme.colors.gold : 'transparent'}
            strokeWidth={filled ? 0 : 1.5}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
