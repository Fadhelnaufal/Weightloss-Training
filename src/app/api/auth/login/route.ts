import { NextResponse } from "next/server";
import { verifyOwnerPassword } from "@/lib/auth/password";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  getClientIp,
  recordFailedLoginAttempt,
} from "@/lib/auth/rate-limit";
import {
  createSessionToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateLimit = checkLoginRateLimit(clientIp);

  if (!rateLimit.allowed) {
    const minutes = Math.max(1, Math.ceil(rateLimit.retryAfterSeconds / 60));
    return NextResponse.json(
      {
        error: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${minutes} menit.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Input tidak valid.",
      },
      { status: 400 },
    );
  }

  const result = await verifyOwnerPassword(parsed.data.password);
  if (result.misconfigured) {
    return NextResponse.json(
      {
        error:
          "Konfigurasi password server belum lengkap. Periksa AUTH_PASSWORD_HASH di env.",
      },
      { status: 500 },
    );
  }

  if (!result.valid) {
    const failed = recordFailedLoginAttempt(clientIp);
    const message = failed.blocked
      ? "Password salah. Terlalu banyak percobaan gagal, coba lagi dalam 15 menit."
      : `Password salah. Sisa percobaan: ${failed.remainingAttempts}.`;
    return NextResponse.json(
      { error: message },
      { status: failed.blocked ? 429 : 401 },
    );
  }

  clearLoginRateLimit(clientIp);

  try {
    const token = await createSessionToken();
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      {
        error:
          "Konfigurasi sesi server belum lengkap. Periksa AUTH_SECRET di env.",
      },
      { status: 500 },
    );
  }
}
