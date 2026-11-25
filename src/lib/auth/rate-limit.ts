const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

interface RateLimitEntry {
  failedCount: number;
  windowStart: number;
  blockedUntil: number;
}

const attemptsByKey = new Map<string, RateLimitEntry>();

function pruneExpired(now: number) {
  if (attemptsByKey.size < 500) {
    return;
  }
  for (const [key, entry] of attemptsByKey.entries()) {
    if (
      now > entry.blockedUntil &&
      now - entry.windowStart > WINDOW_MS
    ) {
      attemptsByKey.delete(key);
    }
  }
}

export function getClientIp(request: Request): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    const first = vercelIp.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) {
    return cfIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Ambil entri paling kanan yang ditambahkan oleh proxy tepercaya terdekat
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const rightmost = parts[parts.length - 1];
    if (rightmost) {
      return rightmost;
    }
  }

  return "local";
}

export function checkLoginRateLimit(
  key: string,
  now: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  pruneExpired(now);
  const entry = attemptsByKey.get(key);
  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (entry.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  if (now - entry.windowStart > WINDOW_MS) {
    attemptsByKey.delete(key);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordFailedLoginAttempt(
  key: string,
  now: number = Date.now(),
): { blocked: boolean; remainingAttempts: number; retryAfterSeconds: number } {
  const existing = attemptsByKey.get(key);
  const isFreshWindow =
    !existing || now - existing.windowStart > WINDOW_MS;

  const failedCount = isFreshWindow ? 1 : existing.failedCount + 1;
  const windowStart = isFreshWindow ? now : existing.windowStart;
  const blocked = failedCount >= MAX_FAILED_ATTEMPTS;
  const blockedUntil = blocked ? now + WINDOW_MS : 0;

  attemptsByKey.set(key, {
    failedCount,
    windowStart,
    blockedUntil,
  });

  return {
    blocked,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - failedCount),
    retryAfterSeconds: blocked ? Math.ceil(WINDOW_MS / 1000) : 0,
  };
}

export function clearLoginRateLimit(key: string): void {
  attemptsByKey.delete(key);
}
