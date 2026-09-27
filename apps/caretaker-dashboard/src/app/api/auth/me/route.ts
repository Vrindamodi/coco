import { NextResponse } from "next/server";

import type { AuthMeResponse } from "@coco/shared-types";

import { AUTH_COOKIE, getApiBaseUrl } from "@/server/constants";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${AUTH_COOKIE}=`));
  const token = match?.slice(AUTH_COOKIE.length + 1);

  if (!token) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const res = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ detail: "Invalid session" }, { status: res.status });
  }

  const me = (await res.json()) as AuthMeResponse;
  return NextResponse.json(me);
}
