import bcrypt from "bcryptjs";

const BCRYPT_PREFIXES = ["$2a$", "$2b$", "$2y$"];

export interface PasswordVerifyResult {
  valid: boolean;
  misconfigured?: boolean;
}

/**
 * Memverifikasi password input terhadap AUTH_PASSWORD_HASH (format base64 di env).
 */
export async function verifyOwnerPassword(
  password: string,
): Promise<PasswordVerifyResult> {
  const encodedHash = process.env.AUTH_PASSWORD_HASH?.trim();
  if (!encodedHash) {
    return { valid: false, misconfigured: true };
  }

  let decodedHash = "";
  try {
    decodedHash = Buffer.from(encodedHash, "base64").toString("utf8").trim();
  } catch {
    return { valid: false, misconfigured: true };
  }

  const hasValidPrefix = BCRYPT_PREFIXES.some((prefix) =>
    decodedHash.startsWith(prefix),
  );
  if (!hasValidPrefix || decodedHash.length < 59) {
    return { valid: false, misconfigured: true };
  }

  const valid = await bcrypt.compare(password, decodedHash);
  return { valid };
}
