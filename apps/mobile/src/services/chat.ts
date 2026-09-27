import type { NarratorLanguageCode } from "@/constants/narratorLanguages";
import type { ChatMessage, ChatTurnResponse } from "@/types/api";

import { api } from "./api";

const CHAT_TIMEOUT_MS = 60_000;

function multipartConfig() {
  return {
    timeout: CHAT_TIMEOUT_MS,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  const response = await api.get<ChatMessage[]>("/api/v1/chat/history", {
    timeout: CHAT_TIMEOUT_MS,
  });
  return response.data;
}

export async function sendTextMessage(
  text: string,
  language: NarratorLanguageCode
): Promise<ChatTurnResponse> {
  const form = new FormData();
  form.append("text", text);
  form.append("language", language);

  const response = await api.post<ChatTurnResponse>(
    "/api/v1/chat/message",
    form,
    multipartConfig()
  );
  return response.data;
}

export async function sendVoiceMessage(
  audioUri: string,
  language: NarratorLanguageCode
): Promise<ChatTurnResponse> {
  const filename = audioUri.split("/").pop() ?? "recording.m4a";
  const form = new FormData();
  form.append("audio", {
    uri: audioUri,
    name: filename,
    type: "audio/m4a",
  } as unknown as Blob);
  form.append("language", language);

  const response = await api.post<ChatTurnResponse>(
    "/api/v1/chat/message",
    form,
    multipartConfig()
  );
  return response.data;
}
