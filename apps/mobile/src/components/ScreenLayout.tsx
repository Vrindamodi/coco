import { ReactNode } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

import { DecorativeBackground } from "@/components/DecorativeBackground";
import { theme } from "@/theme";

interface ScreenLayoutProps {
  children: ReactNode;
  scrollable?: boolean;
  decorated?: boolean;
}

export function ScreenLayout({
  children,
  scrollable = false,
  decorated = true,
}: ScreenLayoutProps) {
  const inner = (
    <>
      {decorated ? <DecorativeBackground /> : null}
      <View style={styles.contentArea}>{children}</View>
    </>
  );

  if (scrollable) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          {inner}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>{inner}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.lg,
  },
  contentArea: {
    flex: 1,
  },
});
