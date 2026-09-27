import type { ComponentType } from "react";
import {
  Backspace,
  Bell,
  ChartLineUp,
  CheckCircle,
  CircleDashed,
  CloudSlash,
  FileText,
  GameController,
  Heart,
  Images,
  ListNumbers,
  Microphone,
  MoonStars,
  PaperPlaneRight,
  Play,
  Scan,
  SpeakerHigh,
  SquaresFour,
  StopCircle,
  Sun,
  SunHorizon,
  type IconProps,
  UsersThree,
} from "phosphor-react-native";
import { View } from "react-native";

export type AppIconName =
  | "GameController"
  | "Bell"
  | "ChartLineUp"
  | "Microphone"
  | "PaperPlaneRight"
  | "SquaresFour"
  | "ListNumbers"
  | "Scan"
  | "CheckCircle"
  | "CircleDashed"
  | "Backspace"
  | "StopCircle"
  | "SunHorizon"
  | "Sun"
  | "MoonStars"
  | "Heart"
  | "Images"
  | "Play"
  | "SpeakerHigh"
  | "FileText"
  | "CloudSlash"
  | "UsersThree";

type AppIconWeight = "duotone" | "regular" | "fill";

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color: string;
  weight?: AppIconWeight;
}

const ICON_MAP: Record<AppIconName, ComponentType<IconProps>> = {
  GameController,
  Bell,
  ChartLineUp,
  Microphone,
  PaperPlaneRight,
  SquaresFour,
  ListNumbers,
  Scan,
  CheckCircle,
  CircleDashed,
  Backspace,
  StopCircle,
  SunHorizon,
  Sun,
  MoonStars,
  Heart,
  Images,
  Play,
  SpeakerHigh,
  FileText,
  CloudSlash,
  UsersThree,
};

export function AppIcon({
  name,
  size = 24,
  color,
  weight = "regular",
}: AppIconProps) {
  const IconComponent = ICON_MAP[name];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <IconComponent size={size} color={color} weight={weight} />
    </View>
  );
}
