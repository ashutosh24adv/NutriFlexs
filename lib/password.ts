import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Hashes a plaintext password using scrypt with a unique random salt.
 * Returns formatted string: `scrypt:<salt>:<derivedKeyHex>`
 */
export function hashPassword(password: string): string {
  if (!password) {
    throw new Error("Password cannot be empty");
  }
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored hash or legacy record.
 * Handles both scrypt-hashed passwords and legacy plaintext records with timing-safe comparison.
 * Rejects null or empty stored hashes.
 */
export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!password || !storedHash) {
    return false;
  }

  try {
    if (storedHash.startsWith("scrypt:")) {
      const parts = storedHash.split(":");
      if (parts.length !== 3) return false;
      const [, salt, keyHex] = parts;
      const keyBuffer = Buffer.from(keyHex, "hex");
      const derivedKey = scryptSync(password, salt, 64);
      if (keyBuffer.length !== derivedKey.length) return false;
      return timingSafeEqual(keyBuffer, derivedKey);
    }

    // Fallback for legacy plaintext password entries
    const passwordBuffer = Buffer.from(password);
    const storedBuffer = Buffer.from(storedHash);
    if (passwordBuffer.length !== storedBuffer.length) {
      return false;
    }
    return timingSafeEqual(passwordBuffer, storedBuffer);
  } catch {
    return false;
  }
}
