import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "NutriFlexs Account",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "customer@nutriflexs.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();

        // Find user in Neon PostgreSQL
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        // Verify password with timing safety & scrypt
        const isValid = verifyPassword(credentials.password, user.passwordHash);
        if (!isValid) {
          return null;
        }

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
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "nutriflexs_super_secret_auth_key_2026_jwt",
};
