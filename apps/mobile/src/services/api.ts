import axios from "axios";

import { useAuthStore } from "@/stores/authStore";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

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
