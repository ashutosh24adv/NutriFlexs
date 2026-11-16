import { NextResponse } from "next/server";

/**
 * Strips passwordHash and internal sensitive credentials from user objects.
 */
export function sanitizeUser<T extends Record<string, any>>(user: T | null | undefined): Omit<T, "passwordHash"> | null {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser as Omit<T, "passwordHash">;
}

/**
 * Deeply sanitizes any object or array to recursively strip `passwordHash` fields.
 */
export function stripSensitiveFields<T>(data: T): T {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => stripSensitiveFields(item)) as unknown as T;
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "passwordHash") {
      continue;
    }
    if (value && typeof value === "object") {
      sanitized[key] = stripSensitiveFields(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Returns a sanitized JSON error response that logs diagnostic details on the server
 * without exposing internal error messages, SQL queries, or stack traces to clients.
 */
export function safeErrorResponse(
  error: unknown,
  fallbackMessage: string = "An unexpected error occurred. Please try again.",
  status: number = 500
): NextResponse {
  // Always log full diagnostics on server
  console.error(`[API Security Error] [Status ${status}]:`, error);

  // In production, do not leak raw error messages if they look like internal database/runtime errors
  const rawMessage = error instanceof Error ? error.message : String(error);
  const isInternalLeak =
    rawMessage.includes("prisma") ||
    rawMessage.includes("SQL") ||
    rawMessage.includes("database") ||
    rawMessage.includes("connection") ||
    rawMessage.includes("neon.tech") ||
    rawMessage.includes("syntax") ||
    rawMessage.includes("column") ||
    rawMessage.includes("table") ||
    rawMessage.includes("undefined is not");

  const clientMessage = isInternalLeak ? fallbackMessage : rawMessage || fallbackMessage;

  return NextResponse.json(
    {
      success: false,
      error: clientMessage,
    },
    { status }
  );
}

/**
 * Verifies that the current session owns the resource, or possesses ADMIN role.
 */
export function isOwnerOrAdmin(
  resourceUserId: string | null | undefined,
  sessionUser: { id?: string; role?: string } | null | undefined
): boolean {
  if (!sessionUser?.id) return false;
  if (sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN") return true;
  return Boolean(resourceUserId && resourceUserId === sessionUser.id);
}

