import axios from "axios";
import { NativeModules, Platform } from "react-native";

import { resolveApiUrl } from "@/services/resolveApiUrl";
import { useAuthStore } from "@/stores/authStore";

function packagerHost(): string | null {
  const scriptURL: unknown = NativeModules.SourceCode?.scriptURL;
  if (typeof scriptURL !== "string" || scriptURL.startsWith("file:")) {
    return null;
  }

  try {
    return new URL(scriptURL).hostname || null;
  } catch {
    const match = scriptURL.match(/^https?:\/\/(\[[^\]]+\]|[^/:]+)/);
    return match?.[1] ?? null;
  }
}

export const API_URL = resolveApiUrl({
  envUrl: process.env.EXPO_PUBLIC_API_URL,
  platform: Platform.OS,
  packagerHost: packagerHost(),
});

if (__DEV__) {
  console.log(`[coco] API base URL: ${API_URL}`);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  }
);

/**
 * True when a request never reached the server (no connection, DNS failure,
 * timeout) as opposed to the server answering with an error status.
 *
 * The difference matters offline: a 401 means the session is genuinely gone,
 * while a network failure means we simply cannot tell yet and should keep
 * trusting what is already on the device.
 */
export function isOfflineError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
