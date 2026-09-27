import { NextResponse } from "next/server";

import type { LoginRequest, Token } from "@coco/shared-types";

import { AUTH_COOKIE, getApiBaseUrl } from "@/server/constants";

export async function POST(request: Request) {
  let body: LoginRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "Login failed";
    try {
      const err = await res.json();
      detail = typeof err.detail === "string" ? err.detail : detail;
    } catch {
      /* ignore */
    }
    return NextResponse.json({ detail }, { status: res.status });
  }

  const token = (await res.json()) as Token;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, token.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}
