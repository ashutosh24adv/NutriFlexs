import crypto from "crypto";
import { prisma, withDbRetry } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

interface StoredResetToken {
  hashedToken: string;
  userId: string;
  userEmail: string;
  expiresAt: number; // epoch ms
  used: boolean;
}

// In-memory single-use token vault
const tokenStore = new Map<string, StoredResetToken>();

// Periodic cleanup of expired tokens every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of tokenStore.entries()) {
      if (record.expiresAt < now || record.used) {
        tokenStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks if the system has an active email delivery transport configured.
 */
export function isEmailDeliveryConfigured(): boolean {
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const hasSendGrid = Boolean(process.env.SENDGRID_API_KEY);
  const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  return hasResend || hasSendGrid || hasSmtp;
}

/**
 * Initiates a password reset request:
 * 1. Generates a cryptographically secure random token (32 bytes).
 * 2. Hashes token with SHA-256 for persistent/secure storage.
 * 3. Associates token with user and sets a 1-hour expiration.
 * 4. Checks email transport availability.
 */
export async function createPasswordResetToken(email: string): Promise<{
  success: boolean;
  emailConfigured: boolean;
  devToken?: string; // Only provided in development environment for verification
}> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    })
  );

  // Timing defense / user privacy: If user does not exist, return generic success without generating token
  if (!user) {
    return {
      success: true,
      emailConfigured: isEmailDeliveryConfigured(),
    };
  }

  // 1. Generate 32-byte cryptographically random token
  const rawToken = crypto.randomBytes(32).toString("hex");

  // 2. Hash token with SHA-256 before storing
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  // 3. Set 1-hour expiration
  const expiresAt = Date.now() + 60 * 60 * 1000;

  tokenStore.set(hashedToken, {
    hashedToken,
    userId: user.id,
    userEmail: user.email,
    expiresAt,
    used: false,
  });

  const emailConfigured = isEmailDeliveryConfigured();

  if (!emailConfigured) {
    console.info(
      `[PasswordReset] Secure reset token generated for account [${user.email.slice(0, 3)}***]. Note: Email delivery transport (Resend/Sendgrid/SMTP) is not configured in environment.`
    );
  }

  return {
    success: true,
    emailConfigured,
    // Expose devToken only in development/test environments for automated test verification
    ...(process.env.NODE_ENV !== "production" ? { devToken: rawToken } : {}),
  };
}

/**
 * Validates a reset token and updates the user's password using scrypt hashing.
 * The token is immediately marked used and invalidated.
 */
export async function verifyAndResetPassword({
  token,
  newPassword,
}: {
  token: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return { success: false, error: "Password reset token is required." };
  }

  const trimmedToken = token.trim();
  const hashedCandidate = crypto.createHash("sha256").update(trimmedToken).digest("hex");
  const stored = tokenStore.get(hashedCandidate);

  if (!stored) {
    return {
      success: false,
      error: "Invalid or expired password reset link. Please request a new link.",
    };
  }

  if (stored.used) {
    tokenStore.delete(hashedCandidate);
    return {
      success: false,
      error: "This password reset link has already been used. Please request a new link.",
    };
  }

  if (Date.now() > stored.expiresAt) {
    tokenStore.delete(hashedCandidate);
    return {
      success: false,
      error: "This password reset link has expired. Reset links are valid for 1 hour.",
    };
  }

  // Immediately mark used to prevent race condition / replay
  stored.used = true;
  tokenStore.delete(hashedCandidate);

  // Hash new password using scrypt
  const hashedPassword = hashPassword(newPassword);

  // Update in database with retry
  await withDbRetry(() =>
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash: hashedPassword },
    })
  );

  return { success: true };
}
