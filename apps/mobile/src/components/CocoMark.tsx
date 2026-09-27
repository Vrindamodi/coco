import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

interface CocoMarkProps {
  size?: "sm" | "lg";
}

/**
 * Geometric mark inspired by a tea leaf / hill contour —
 * Coco's visual anchor for splash and login screens.
 */
export function CocoMark({ size = "lg" }: CocoMarkProps) {
  const dim = size === "lg" ? 80 : 48;

  return (
    <View
      style={[styles.container, { width: dim, height: dim }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.outer, { borderRadius: dim / 2 }]}>
        <View style={styles.innerLeaf} />
        <View style={styles.stem} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  outer: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: theme.colors.gold,
  },
  innerLeaf: {
    width: "45%",
    height: "55%",
    backgroundColor: theme.colors.accent,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 40,
    transform: [{ rotate: "-30deg" }],
    marginTop: -4,
  },
  stem: {
    position: "absolute",
    bottom: "22%",
    width: 3,
    height: "20%",
    backgroundColor: theme.colors.gold,
    borderRadius: 2,
  },
});
