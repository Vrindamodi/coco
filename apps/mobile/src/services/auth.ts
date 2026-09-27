import type {
  AuthMeResponse,
  PatientLoginRequest,
  Token,
} from "@/types/api";

import { api } from "@/services/api";

export async function patientLogin(
  payload: PatientLoginRequest
): Promise<Token> {
  const { data } = await api.post<Token>("/api/v1/auth/patient-login", payload);
  return data;
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const { data } = await api.get<AuthMeResponse>("/api/v1/auth/me");
  return data;
}
