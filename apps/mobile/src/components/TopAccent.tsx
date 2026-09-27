import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { theme } from "@/theme";

/**
 * Soft rounded cap at the top of splash screens — no stripe bands.
 */
export function TopAccent() {
  return (
    <View
      style={styles.wrapper}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={[theme.colors.tilePlayBg, "rgba(255, 251, 245, 0)"]}
        locations={[0, 1]}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
});
