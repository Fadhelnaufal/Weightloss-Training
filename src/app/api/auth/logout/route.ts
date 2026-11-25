import { NextResponse } from "next/server";
import {
  getSessionCookieOptions,
  hasValidSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";

export async function POST() {
  const valid = await hasValidSession();
  const clearCookieOptions = {
    ...getSessionCookieOptions(),
    maxAge: 0,
  };

  if (!valid) {
    const unauthorized = NextResponse.json(
      { error: "Sesi tidak valid atau sudah berakhir." },
      { status: 401 },
    );
    unauthorized.cookies.set(SESSION_COOKIE_NAME, "", clearCookieOptions);
    return unauthorized;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", clearCookieOptions);
  return response;
}
