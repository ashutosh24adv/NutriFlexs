import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma, withDbRetry } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "NutriFlexs Account",
      credentials: {
        email: { label: "Email or Username", type: "text", placeholder: "staff@nutriflexs.com" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const rawIdentifier = credentials.email.trim();
        const normalizedIdentifier = rawIdentifier.toLowerCase();
        const rateLimitKey = `login-attempt:${normalizedIdentifier}`;

        // 1. Sliding window rate limiting: max 5 failed attempts per 15 minutes
        const rateLimit = checkRateLimit({
          key: rateLimitKey,
          maxRequests: 5,
          windowMs: 15 * 60 * 1000,
        });

        if (!rateLimit.allowed) {
          throw new Error("Too many failed login attempts. Please wait 15 minutes before trying again.");
        }

        // 2. Lookup user by email or username (name)
        const isEmail = normalizedIdentifier.includes("@");
        const user = await withDbRetry(() =>
          isEmail
            ? prisma.user.findUnique({
                where: { email: normalizedIdentifier },
              })
            : prisma.user.findFirst({
                where: {
                  OR: [
                    { email: normalizedIdentifier },
                    { email: `${normalizedIdentifier}@nutriflexs.com` },
                    { name: { equals: rawIdentifier, mode: "insensitive" } },
                  ],
                },
              })
        );

        if (!user || !user.passwordHash) {
          return null;
        }

        // 3. Verify password with timing safety & scrypt
        const isValid = verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        // 4. Verify account and assigned outlet active status
        if (user.selectedOutletId) {
          try {
            const outlet = await prisma.outlet.findUnique({
              where: { id: user.selectedOutletId },
              select: { isActive: true },
            });
            if (outlet && outlet.isActive === false) {
              throw new Error("Account Inactive: Your assigned kitchen outlet is currently disabled.");
            }
          } catch (err: any) {
            if (err.message?.includes("Account Inactive")) {
              throw err;
            }
            // Non-fatal database retry warning
          }
        }

        // 5. Portal-specific role authorization
        const requestedPortal = (credentials as any)?.portal?.toLowerCase()?.trim();
        if (requestedPortal === "kitchen") {
          if (user.role === "CUSTOMER") {
            throw new Error("Access Denied: Customer accounts cannot access the Kitchen Workspace.");
          }
          if (user.role === "TRAINER") {
            throw new Error("Access Denied: Trainer accounts cannot access the Kitchen Workspace.");
          }
          if (user.role !== "KITCHEN" && user.role !== "ADMIN") {
            throw new Error("Access Denied: Your account does not have Kitchen Staff authorization.");
          }
        }

        // Reset rate limit counter on successful credentials verification
        resetRateLimit(rateLimitKey);

        // Seamlessly upgrade legacy plaintext password to scrypt hash if applicable
        if (!user.passwordHash.startsWith("scrypt:")) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { passwordHash: hashPassword(credentials.password) },
            });
          } catch (err) {
            console.error("Non-fatal: Failed to upgrade legacy password hash", err);
          }
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          selectedGymId: user.selectedGymId,
          selectedOutletId: user.selectedOutletId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role || "CUSTOMER";
        token.selectedGymId = (user as any).selectedGymId;
        token.selectedOutletId = (user as any).selectedOutletId;
      }
      if (trigger === "update" && session) {
        token.selectedGymId = session.selectedGymId ?? token.selectedGymId;
        token.selectedOutletId = session.selectedOutletId ?? token.selectedOutletId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).selectedGymId = token.selectedGymId as string | null;
        (session.user as any).selectedOutletId = token.selectedOutletId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === "production"
      ? undefined
      : "nutriflexs_super_secret_auth_key_2026_jwt"),
};
