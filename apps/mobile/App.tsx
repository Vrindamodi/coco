import {
  AtkinsonHyperlegible_400Regular,
  AtkinsonHyperlegible_700Bold,
} from "@expo-google-fonts/atkinson-hyperlegible";
import { NavigationContainer } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { initializeDatabase } from "@/db/database";
import { RootNavigator } from "@/navigation/RootNavigator";
import { startAutoSync } from "@/services/autoSync";
import "@/services/notifications";
import {
  configurePlaybackAudioSession,
  initScreenReaderWatch,
  installVoiceCatalogLifecycle,
} from "@/services/speech";
import { theme } from "@/theme";

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });

  useEffect(() => {
    initializeDatabase()
      .then(() => setDbReady(true))
      .catch((error) => {
        console.error("Failed to initialize database", error);
        setDbReady(true);
      });
  }, []);

  // Narration needs three things ready before any screen speaks: a playback
  // audio session, the screen-reader state, and the device's voice list.
  useEffect(() => {
    void configurePlaybackAudioSession();
    const stopScreenReaderWatch = initScreenReaderWatch();
    const stopVoiceCatalogWatch = installVoiceCatalogLifecycle();

    return () => {
      stopScreenReaderWatch();
      stopVoiceCatalogWatch();
    };
  }, []);

  // Only start syncing once the local tables exist — the outbox and the
  // My World mirror both live in them.
  useEffect(() => {
    if (!dbReady) return;
    return startAutoSync();
  }, [dbReady]);

  if (!fontsLoaded || !dbReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootNavigator />
      <StatusBar style="dark" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
});
