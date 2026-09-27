import { AppState, type AppStateStatus } from "react-native";
import * as Network from "expo-network";

import { useAuthStore } from "@/stores/authStore";
import { syncNow } from "@/services/syncService";

/**
 * Drives background sync from the two moments that matter on a device with
 * patchy coverage: the app coming to the foreground, and the network coming
 * back. Both funnel into `syncNow`, which is itself de-duplicated.
 */

let running = false;

async function runSync(): Promise<void> {
  if (running) return;

  const patientId = useAuthStore.getState().patientId;
  if (!patientId) return;

  running = true;
  try {
    await syncNow(patientId);
  } finally {
    running = false;
  }
}

export function startAutoSync(): () => void {
  const appStateSub = AppState.addEventListener(
    "change",
    (status: AppStateStatus) => {
      if (status === "active") void runSync();
    }
  );

  const networkSub = Network.addNetworkStateListener((state) => {
    if (state.isConnected) void runSync();
  });

  void runSync();

  return () => {
    appStateSub.remove();
    networkSub.remove();
  };
}
