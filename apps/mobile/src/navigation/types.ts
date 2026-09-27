import type { GameType } from "@/types/api";

export type RootStackParamList = {
  Splash: undefined;
  LoginPin: undefined;
  Home: undefined;
  Play: undefined;
  GameStub: { gameType: GameType };
  Reminders: undefined;
  Progress: undefined;
  Voice: { seedPrompt?: string } | undefined;
  MyWorld: undefined;
  Community: undefined;
  MemoryDetail: { itemId: string };
  Settings: undefined;
};
