import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { theme, wovenBorder } from "@/theme";

interface ProfilePhotoTileProps {
  displayName: string;
  photoUri?: string | null;
  onPress: () => void;
  colorIndex?: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfilePhotoTile({
  displayName,
  photoUri,
  onPress,
  colorIndex = 0,
}: ProfilePhotoTileProps) {
  const avatarColor =
    theme.profileAvatarColors[
      colorIndex % theme.profileAvatarColors.length
    ];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Select profile for ${displayName}`}
      accessibilityHint="Opens PIN entry for this profile"
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.avatarWrapper, { borderColor: theme.colors.gold }]}>
        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            style={styles.avatar}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.initialsCircle, { backgroundColor: avatarColor }]}>
            <Text style={styles.initials} allowFontScaling>
              {getInitials(displayName)}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.name} allowFontScaling numberOfLines={2}>
        {displayName}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    ...wovenBorder,
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.goldBorder,
    minHeight: theme.touch.tileMinHeight + 40,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    borderWidth: 3,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  initialsCircle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    ...theme.typography.title,
    color: theme.colors.onPrimary,
  },
  name: {
    ...theme.typography.label,
    color: theme.colors.foreground,
    textAlign: "center",
  },
});
