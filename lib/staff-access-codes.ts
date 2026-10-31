import { createHmac, randomBytes } from "crypto";
import { Role, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Secret used to derive deterministic HMAC hashes for staff access codes.
 * Kept strictly server-side.
 */
const STAFF_CODE_SECRET =
  process.env.STAFF_CODE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "nutriflexs_staff_access_code_hmac_secret_2026";

/**
 * Development-only seed codes.
 * These are strictly invalid in production and can only be enabled in development
 * when STAFF_ACCESS_CODES_ENABLED=true.
 */
export const DEV_TEST_CODES = {
  KITCHEN: "NF-TEST-KITCHEN-2026",
  TRAINER: "NF-TEST-TRAINER-2026",
  SUPER_ADMIN: "NF-TEST-ADMIN-2026",
} as const;

/**
 * Normalizes an access code (trimmed, uppercase, single spaces).
 */
export function normalizeAccessCode(code: string): string {
  return (code || "").trim().toUpperCase();
}

/**
 * Generates a cryptographic HMAC-SHA256 hash of the staff access code.
 * Ensures codes are never stored as plaintext in the database while allowing
 * indexed O(1) server-side lookup.
 */
export function hashAccessCode(code: string): string {
  const normalized = normalizeAccessCode(code);
  if (!normalized) {
    throw new Error("Access code cannot be empty");
  }
  return createHmac("sha256", STAFF_CODE_SECRET).update(normalized).digest("hex");
}

/**
 * Masks an access code for safe display in administrative logs/audits.
 * Example: "NF-TEST-KITCHEN-2026" -> "NF-TEST-••••-2026"
 */
export function maskAccessCode(code: string): string {
  const normalized = normalizeAccessCode(code);
  if (normalized.length <= 6) {
    return "••••••";
  }
  const prefix = normalized.slice(0, 4);
  const suffix = normalized.slice(-4);
  return `${prefix}••••${suffix}`;
}

/**
 * Checks if a given code matches any of the development test seed codes.
 */
export function isDevTestCode(code: string): boolean {
  const normalized = normalizeAccessCode(code);
  return (
    normalized === DEV_TEST_CODES.KITCHEN ||
    normalized === DEV_TEST_CODES.TRAINER ||
    normalized === DEV_TEST_CODES.SUPER_ADMIN
  );
}

/**
 * Determines whether development test codes are permitted.
 * Test codes must NOT automatically become valid in production.
 * Only enabled when NODE_ENV !== "production" AND STAFF_ACCESS_CODES_ENABLED=true.
 */
export function areDevTestCodesEnabled(): boolean {
  const isProduction = process.env.NODE_ENV === "production";
  const isExplicitlyEnabled =
    process.env.STAFF_ACCESS_CODES_ENABLED === "true" ||
    process.env.STAFF_ACCESS_CODES_ENABLED === "1";
  return !isProduction && isExplicitlyEnabled;
}

/**
 * Generates a cryptographically strong staff access code string.
 * Example: "NF-KTCH-A8F2-91DE"
 */
export function generateSecureAccessCode(role: Role): string {
  const roleSlug =
    role === Role.KITCHEN ? "KTCH" : role === Role.TRAINER ? "TRNR" : "ADMN";
  const part1 = randomBytes(2).toString("hex").toUpperCase();
  const part2 = randomBytes(2).toString("hex").toUpperCase();
  return `NF-${roleSlug}-${part1}-${part2}`;
}

export interface ValidateAndConsumeOptions {
  code: string;
  requiredRole: Role;
  requestedOutletId?: string | null;
  tx?: Prisma.TransactionClient;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  outletId?: string | null;
  codeId?: string;
}

/**
 * Server-side validation and atomic consumption of a staff access code.
 *
 * Enforces:
 * - Constant-time / timing-safe lookup via cryptographic HMAC-SHA256 hash.
 * - Active / unrevoked status check.
 * - Expiration timestamp verification.
 * - Maximum usage limit enforcement.
 * - Strict role authorization matching.
 * - Kitchen outlet authorization constraints.
 * - Strict development-only test code restrictions (refused in production).
 * - Atomic database transaction consumption to eliminate concurrency race conditions.
 * - Generic error responses to prevent code existence enumeration.
 */
export async function validateAndConsumeStaffCode({
  code,
  requiredRole,
  requestedOutletId,
  tx,
}: ValidateAndConsumeOptions): Promise<ValidationResult> {
  const normalized = normalizeAccessCode(code);
  const genericError = "Invalid or unauthorized staff access code.";

  if (!normalized) {
    return { valid: false, error: "Staff access code is required." };
  }

  // 1. Enforce development test code safety
  if (isDevTestCode(normalized)) {
    if (!areDevTestCodesEnabled()) {
      return { valid: false, error: genericError };
    }
  }

  const client = tx || prisma;
  const targetHash = hashAccessCode(normalized);

  // 2. Query code record by hash
  const record = await client.staffAccessCode.findUnique({
    where: { codeHash: targetHash },
  });

  if (!record) {
    return { valid: false, error: genericError };
  }

  // 3. Status and expiration verification
  if (!record.isActive) {
    return { valid: false, error: genericError };
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    return { valid: false, error: genericError };
  }

  if (record.usedCount >= record.maxUses) {
    return { valid: false, error: genericError };
  }

  // 4. Role authorization check
  if (record.role !== requiredRole) {
    return { valid: false, error: genericError };
  }

  // 5. If this is flagged as a dev seed record, ensure dev codes are enabled
  if (record.isDevSeed && !areDevTestCodesEnabled()) {
    return { valid: false, error: genericError };
  }

  // 6. Outlet verification for Kitchen role
  let targetOutletId: string | null = null;
  if (requiredRole === Role.KITCHEN) {
    if (record.outletId) {
      // Code is tied to a specific outlet
      if (requestedOutletId && requestedOutletId !== record.outletId) {
        return {
          valid: false,
          error: "Selected outlet is not authorized for this access code.",
        };
      }
      targetOutletId = record.outletId;
    } else {
      // Global/unlocked kitchen code: requires a valid selected outlet
      if (requestedOutletId) {
        const outletExists = await client.outlet.findUnique({
          where: { id: requestedOutletId },
        });
        if (!outletExists) {
          return { valid: false, error: "Invalid kitchen outlet selection." };
        }
        targetOutletId = requestedOutletId;
      } else {
        const defaultOutlet = await client.outlet.findFirst();
        targetOutletId = defaultOutlet ? defaultOutlet.id : null;
      }
    }
  }

  // 7. Atomic consumption: increment usage count safely
  const updateResult = await client.staffAccessCode.updateMany({
    where: {
      id: record.id,
      isActive: true,
      usedCount: { lt: record.maxUses },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    data: {
      usedCount: { increment: 1 },
    },
  });

  if (updateResult.count === 0) {
    return { valid: false, error: genericError };
  }

  return {
    valid: true,
    outletId: targetOutletId,
    codeId: record.id,
  };
}
