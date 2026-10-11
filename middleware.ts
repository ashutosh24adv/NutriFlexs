import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

function sanitizeCallbackUrl(url: string | null): string {
  if (!url) return "/home";
  // Protect against open redirects: must be relative path starting with a single '/'
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\") || url.includes("://")) {
    return "/home";
  }
  return url;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPath = pathname.startsWith("/admin");
  const isKitchenPath = pathname.startsWith("/kitchen");
  const isTrainerPath = pathname.startsWith("/trainer");

  if (isAdminPath || isKitchenPath || isTrainerPath) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "nutriflexs_super_secret_auth_key_2026_jwt",
    });

    const safeDestination = sanitizeCallbackUrl(pathname);

    // 1. Unauthenticated users -> Redirect to staff sign-in
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", safeDestination);
      loginUrl.searchParams.set("staff", "true");
      return NextResponse.redirect(loginUrl);
    }

    const userRole = (token.role as string) || "CUSTOMER";

    // 2. Role-based authorization
    // Super Admin: ADMIN only
    if (isAdminPath && userRole !== "ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("staff", "true");
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("portal", "admin");
      loginUrl.searchParams.set("callbackUrl", safeDestination);
      return NextResponse.redirect(loginUrl);
    }

    // Kitchen Kiosk: KITCHEN or ADMIN
    if (isKitchenPath && userRole !== "KITCHEN" && userRole !== "ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("staff", "true");
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("portal", "kitchen");
      loginUrl.searchParams.set("callbackUrl", safeDestination);
      return NextResponse.redirect(loginUrl);
    }

    // Trainer Partner: TRAINER or ADMIN
    if (isTrainerPath && userRole !== "TRAINER" && userRole !== "ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("staff", "true");
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("portal", "trainer");
      loginUrl.searchParams.set("callbackUrl", safeDestination);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*", "/trainer/:path*"],
};
