import { View, Text, StyleSheet } from "react-native";

import { BigButton } from "@/components/BigButton";
import { useTranslation } from "@/i18n";
import { theme } from "@/theme";

interface ScreenHeaderProps {
  title: string;
  showHome?: boolean;
  onHomePress?: () => void;
  subtitle?: string;
}

export function ScreenHeader({
  title,
  showHome = true,
  onHomePress,
  subtitle,
}: ScreenHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.accentBar} />
        <View style={styles.textBlock}>
          <Text style={styles.title} allowFontScaling accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} allowFontScaling>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {showHome && onHomePress ? (
        <BigButton
          label={t("common.home")}
          onPress={onHomePress}
          variant="outline"
          accessibilityHint={t("screenHeader.homeHint")}
          style={styles.homeButton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  accentBar: {
    width: 4,
    minHeight: 44,
    backgroundColor: theme.colors.gold,
    borderRadius: 2,
    marginTop: 6,
  },
  textBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.foreground,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.muted,
  },
  homeButton: {
    alignSelf: "flex-start",
    minWidth: 120,
  },
});
