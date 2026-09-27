import * as Network from "expo-network";
import { create } from "zustand";

/**
 * The one place screens ask "are we online?".
 *
 * Optimistic by default — a screen must never show an offline banner before
 * the first real reading arrives.
 */

interface NetworkState {
  isConnected: boolean;
  setConnected: (value: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true,
  setConnected: (value) => set({ isConnected: value }),
}));

export function startNetworkWatch(): () => void {
  const { setConnected } = useNetworkStore.getState();

  void Network.getNetworkStateAsync()
    .then((state) => setConnected(state.isConnected !== false))
    .catch(() => {
      // Unknown is treated as online; the listener will correct it.
    });

  const subscription = Network.addNetworkStateListener((state) => {
    setConnected(state.isConnected !== false);
  });

  return () => subscription.remove();
}

export const useNetworkStatus = (): boolean =>
  useNetworkStore((state) => state.isConnected);
