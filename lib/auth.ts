import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "NutriFlexs Account",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "customer@nutriflexs.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Find user in Neon PostgreSQL
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        // If user has a passwordHash, verify it matches
        if (user.passwordHash && user.passwordHash !== credentials.password) {
          return null;
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
  },
  secret: process.env.NEXTAUTH_SECRET || "nutriflexs_secret_2026",
};
