import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "wlt_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "Variabel lingkungan AUTH_SECRET harus diset (minimal 16 karakter).",
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Membuat token sesi JWT bertanda tangan HMAC-SHA256 berlaku 30 hari.
 */
export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

/**
 * Memverifikasi keabsahan token sesi JWT.
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload.role === "owner";
  } catch {
    return false;
  }
}

/**
 * Mengecek apakah request saat ini memiliki cookie sesi yang valid.
 */
export async function hasValidSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Memastikan sesi aktif tersedia; melempar error jika tidak terautentikasi.
 */
export async function requireSession(): Promise<void> {
  const valid = await hasValidSession();
  if (!valid) {
    throw new Error("UNAUTHORIZED");
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}
