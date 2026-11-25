import assert from "node:assert/strict";
import test from "node:test";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  getClientIp,
  recordFailedLoginAttempt,
} from "../auth/rate-limit";

test("getClientIp memprioritaskan header proxy tepercaya dan mencegah spoofing kiri x-forwarded-for", () => {
  const reqSpoofed = new Request("http://localhost/api/auth/login", {
    headers: {
      "x-forwarded-for": "1.2.3.4, 203.0.113.9",
    },
  });
  assert.equal(getClientIp(reqSpoofed), "203.0.113.9");

  const reqVercel = new Request("http://localhost/api/auth/login", {
    headers: {
      "x-vercel-forwarded-for": "198.51.100.42",
      "x-forwarded-for": "1.2.3.4",
    },
  });
  assert.equal(getClientIp(reqVercel), "198.51.100.42");
});

test("rate limit memblokir setelah 5 percobaan gagal dan reset setelah clearLoginRateLimit", () => {
  const key = "test-ip-rate-limit";
  clearLoginRateLimit(key);
  const baseTime = 1_700_000_000_000;

  for (let i = 1; i <= 4; i += 1) {
    const res = recordFailedLoginAttempt(key, baseTime + i * 1000);
    assert.equal(res.blocked, false);
    assert.equal(checkLoginRateLimit(key, baseTime + i * 1000).allowed, true);
  }

  const fifth = recordFailedLoginAttempt(key, baseTime + 5000);
  assert.equal(fifth.blocked, true);
  assert.equal(checkLoginRateLimit(key, baseTime + 6000).allowed, false);

  clearLoginRateLimit(key);
  assert.equal(checkLoginRateLimit(key, baseTime + 7000).allowed, true);
});
