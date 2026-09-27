import type { GameType } from "@/types/api";

export type RootStackParamList = {
  Splash: undefined;
  LoginPin: undefined;
  Home: undefined;
  Play: undefined;
  Memory: { gameType: GameType };
  Pattern: { gameType: GameType };
  Naming: { gameType: GameType };
  Reminders: undefined;
  Progress: undefined;
  Voice: { seedPrompt?: string } | undefined;
  MyWorld: undefined;
  Community: undefined;
  MemoryDetail: { itemId: string };
  Settings: undefined;
};
