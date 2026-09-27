import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { RootStackParamList } from "@/navigation/types";
import { GameStubScreen } from "@/screens/GameStubScreen";
import { CommunityScreen } from "@/screens/CommunityScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { LoginPinScreen } from "@/screens/LoginPinScreen";
import { MemoryDetailScreen } from "@/screens/MemoryDetailScreen";
import { MyWorldScreen } from "@/screens/MyWorldScreen";
import { PlayScreen } from "@/screens/PlayScreen";
import { ProgressScreen } from "@/screens/ProgressScreen";
import { RemindersScreen } from "@/screens/RemindersScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { SplashScreen } from "@/screens/SplashScreen";
import { VoiceScreen } from "@/screens/VoiceScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: "fade",
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="LoginPin" component={LoginPinScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="Play" component={PlayScreen} />
      <Stack.Screen name="GameStub" component={GameStubScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="Voice" component={VoiceScreen} />
      <Stack.Screen name="MyWorld" component={MyWorldScreen} />
      <Stack.Screen name="Community" component={CommunityScreen} />
      <Stack.Screen name="MemoryDetail" component={MemoryDetailScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
