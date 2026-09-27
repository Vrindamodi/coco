import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

/** Soft hill-sky gradient — Brahmaputra mist at dawn */
export function DecorativeBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.noPointer]}>
      <LinearGradient
        colors={[
          theme.colors.background,
          theme.colors.tileRemindersBg,
          theme.colors.tilePlayBg,
          theme.colors.background,
        ]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.orbTop} />
      <View style={styles.orbMid} />
      <View style={styles.orbBottom} />
    </View>
  );
}

const styles = StyleSheet.create({
  noPointer: {
    pointerEvents: "none",
  },
  orbTop: {
    position: "absolute",
    top: 24,
    right: -36,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(74, 148, 148, 0.06)",
  },
  orbMid: {
    position: "absolute",
    top: "38%",
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(107, 155, 118, 0.05)",
  },
  orbBottom: {
    position: "absolute",
    bottom: 80,
    right: -20,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(196, 168, 106, 0.06)",
  },
});
