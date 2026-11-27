import { NextRequest } from "next/server";
import { getToken, decode } from "next-auth/jwt";
import { prisma, withDbRetry } from "@/lib/prisma";

export interface MobileAuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isGuest?: boolean;
}

export const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "nutriflexs_super_secret_auth_key_2026_jwt");

/**
 * Extracts Authorization Bearer <token> consistently from request headers.
 * Supports both NextRequest and standard Request.
 */
export function extractBearerToken(req: NextRequest | Request): string | null {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Decodes and cryptographically verifies a JWT token using NextAuth secret.
 * Never trusts unverified/unsigned JWT payloads.
 */
export async function decodeMobileToken(tokenString: string): Promise<any> {
  if (!tokenString || !AUTH_SECRET) return null;

  try {
    const decoded = await decode({
      token: tokenString,
      secret: AUTH_SECRET,
    });
    if (decoded && (decoded.id || decoded.sub || decoded.email)) {
      return decoded;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Authenticates mobile client requests using Bearer JWT or NextAuth session cookie.
 * Returns null if no valid authenticated user is found — callers must handle null as 401.
 */
export async function getMobileAuthUser(
  req: NextRequest | Request
): Promise<MobileAuthUser | null> {
  try {
    // 1. Extract and verify Authorization: Bearer <token>
    const tokenString = extractBearerToken(req);

    if (tokenString) {
      try {
        const decoded = await decodeMobileToken(tokenString);

        if (decoded && (decoded.email || decoded.id || decoded.sub)) {
          const userEmail = (decoded.email as string) || "";
          const userId =
            (decoded.id as string) || (decoded.sub as string) || "";

          // Always verify against Neon Postgres
          let dbUser = null;
          if (userId) {
            dbUser = await withDbRetry(() =>
              prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, name: true, email: true, role: true },
              })
            );
          }
          if (!dbUser && userEmail) {
            dbUser = await withDbRetry(() =>
              prisma.user.findUnique({
                where: { email: userEmail.toLowerCase().trim() },
                select: { id: true, name: true, email: true, role: true },
              })
            );
          }

          if (dbUser) {
            return {
              id: dbUser.id,
              name: dbUser.name || "Nutri Member",
              email: dbUser.email,
              role: dbUser.role || "CUSTOMER",
              isGuest: false,
            };
          }

          // Token decoded but user not found in DB → reject
          return null;
        }
      } catch {
        // Invalid token
      }
    }

    // 2. Try NextAuth session cookie if request is NextRequest
    if ("cookies" in req) {
      try {
        const nextAuthToken = await getToken({
          req: req as NextRequest,
          secret: AUTH_SECRET,
        });
        if (nextAuthToken?.email) {
          const dbUser = await withDbRetry(() =>
            prisma.user.findUnique({
              where: {
                email: (nextAuthToken.email as string).toLowerCase().trim(),
              },
              select: { id: true, name: true, email: true, role: true },
            })
          );
          if (dbUser) {
            return {
              id: dbUser.id,
              name: dbUser.name || "Nutri Member",
              email: dbUser.email,
              role: dbUser.role || "CUSTOMER",
              isGuest: false,
            };
          }
        }
      } catch {
        // Fall through
      }
    }
  } catch {
    // Database or network error
  }

  // No valid authenticated user
  return null;
}
