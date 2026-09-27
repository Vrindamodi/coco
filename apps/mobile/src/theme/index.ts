import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";

/**
 * Coco NER design tokens — soft pastel palette rooted in North East India:
 * Brahmaputra mist teal, hill-sage greens, butter muga gold accents.
 * High contrast maintained for elderly / dementia-friendly use.
 */
export const theme = {
  colors: {
    background: "#FAF8F4",
    foreground: "#1E2D24",
    primary: "#4A9494",
    primaryDark: "#2D6B6B",
    onPrimary: "#FFFFFF",
    accent: "#6B9B76",
    onAccent: "#FFFFFF",
    gold: "#C4A86A",
    goldLight: "#FBF3E4",
    goldBorder: "#E2D4B0",
    border: "#D4C4A8",
    borderSubtle: "#EDE6DA",
    borderAccent: "#4A9494",
    muted: "#4A5C50",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    surfaceWarm: "#F7F0E4",
    shadow: "rgba(45, 107, 107, 0.06)",
    destructive: "#B91C1C",
    warning: "#B45309",
    tilePlay: "#2D6B6B",
    tileReminders: "#8B7340",
    tileProgress: "#4A7A55",
    tileVoice: "#6B5B96",
    tileMyWorld: "#A15C6B",
    tilePlayBg: "#E5F4F4",
    tileRemindersBg: "#FBF3E4",
    tileProgressBg: "#EAF4EC",
    tileVoiceBg: "#F0ECF8",
    tileMyWorldBg: "#FAECEE",
  },
  spacing: {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  },
  typography: {
    body: {
      fontSize: 20,
      lineHeight: 28,
      fontFamily: "AtkinsonHyperlegible_400Regular",
    } satisfies TextStyle,
    bodyBold: {
      fontSize: 20,
      lineHeight: 28,
      fontFamily: "AtkinsonHyperlegible_700Bold",
      fontWeight: "700",
    } satisfies TextStyle,
    title: {
      fontSize: 28,
      lineHeight: 36,
      fontFamily: "AtkinsonHyperlegible_700Bold",
      fontWeight: "700",
    } satisfies TextStyle,
    display: {
      fontSize: 30,
      lineHeight: 38,
      fontFamily: "AtkinsonHyperlegible_700Bold",
      fontWeight: "700",
    } satisfies TextStyle,
    headline: {
      fontSize: 32,
      lineHeight: 40,
      fontFamily: "AtkinsonHyperlegible_700Bold",
      fontWeight: "700",
    } satisfies TextStyle,
    label: {
      fontSize: 22,
      lineHeight: 30,
      fontFamily: "AtkinsonHyperlegible_700Bold",
      fontWeight: "600",
      letterSpacing: 0.3,
    } satisfies TextStyle,
    caption: {
      fontSize: 18,
      lineHeight: 24,
      fontFamily: "AtkinsonHyperlegible_400Regular",
    } satisfies TextStyle,
    overline: {
      fontSize: 16,
      lineHeight: 22,
      fontFamily: "AtkinsonHyperlegible_700Bold",
      fontWeight: "700",
      letterSpacing: 2,
      textTransform: "uppercase",
    } satisfies TextStyle,
  },
  touch: {
    minTarget: 64,
    tileMinHeight: 148,
    gap: 16,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    full: 999,
  },
  border: {
    radius: 16,
    width: 2,
    subtleWidth: 1,
  },
  elevation: {
    sm: {
      shadowColor: "rgba(45, 107, 107, 0.06)",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 2,
    } satisfies ViewStyle,
    md: {
      shadowColor: "rgba(45, 107, 107, 0.08)",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 12,
      elevation: 4,
    } satisfies ViewStyle,
  },
  motion: {
    pressDuration: 150,
    pressScale: 0.97,
  },
  profileAvatarColors: [
    "#4A9494",
    "#6B9B76",
    "#C4A86A",
    "#6B5B96",
    "#B87B7B",
  ],
} as const;

export type Theme = typeof theme;

/** Legacy handloom border — prefer surfaceCard for new UI */
export const wovenBorder: ViewStyle = {
  borderWidth: theme.border.width,
  borderColor: theme.colors.goldBorder,
  borderRadius: theme.border.radius,
  borderStyle: "solid",
};

/** Elevated card surface with optional warm tint */
export function surfaceCard(options?: {
  warm?: boolean;
  elevated?: boolean;
}): ViewStyle {
  const warm = options?.warm ?? false;
  const elevated = options?.elevated ?? true;
  return {
    backgroundColor: warm ? theme.colors.surfaceWarm : theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    borderWidth: theme.border.subtleWidth,
    borderColor: theme.colors.borderSubtle,
    overflow: "hidden",
    ...(elevated ? theme.elevation.sm : {}),
  };
}

/** Gold Muga thread accent stripe for top of cards */
export const goldThreadAccent: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 4,
  backgroundColor: theme.colors.gold,
};

/** Circular icon container — pastel surface with subtle ring */
export function iconMedallion(surfacePastel: string): ViewStyle {
  return {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: surfacePastel,
    borderWidth: 1.5,
    borderColor: theme.colors.borderSubtle,
    ...theme.elevation.sm,
  };
}

/** Elevated circular pedestal for logo marks */
export const logoPedestal: ViewStyle = {
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.surfaceElevated,
  borderWidth: theme.border.subtleWidth,
  borderColor: theme.colors.borderSubtle,
  ...theme.elevation.md,
};

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  card: {
    ...surfaceCard(),
    padding: theme.spacing.md,
  },
  bodyText: {
    ...theme.typography.body,
    color: theme.colors.foreground,
  },
  titleText: {
    ...theme.typography.title,
    color: theme.colors.foreground,
  },
  mutedText: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
});
