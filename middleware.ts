import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const authSecret =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "production"
    ? undefined
    : "nutriflexs_super_secret_auth_key_2026_jwt");

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

  const isApiAdminPath = pathname.startsWith("/api/admin");
  const isAdminPath = pathname.startsWith("/admin");
  const isKitchenPath = pathname.startsWith("/kitchen");
  const isTrainerPath = pathname.startsWith("/trainer");
  const isDietitianPath = pathname.startsWith("/dietitian");

  // 1. Defense-in-depth API route protections
  if (isApiAdminPath) {
    const token = await getToken({
      req,
      secret: authSecret,
    });

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Authentication required for admin API" },
        { status: 401 }
      );
    }

    const userRole = (token.role as string) || "CUSTOMER";
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Super Admin access required" },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // 2. Dashboard UI route protections
  if (isAdminPath || isKitchenPath || isTrainerPath || isDietitianPath) {
    const token = await getToken({
      req,
      secret: authSecret,
    });

    const safeDestination = sanitizeCallbackUrl(pathname);

    // Unauthenticated users -> Redirect to staff sign-in
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", safeDestination);
      loginUrl.searchParams.set("staff", "true");
      return NextResponse.redirect(loginUrl);
    }

    const userRole = (token.role as string) || "CUSTOMER";

    // Super Admin: ADMIN or SUPER_ADMIN
    if (isAdminPath && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("staff", "true");
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("portal", "admin");
      loginUrl.searchParams.set("callbackUrl", safeDestination);
      return NextResponse.redirect(loginUrl);
    }

    // Kitchen Kiosk: KITCHEN or ADMIN or SUPER_ADMIN
    if (isKitchenPath && userRole !== "KITCHEN" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("staff", "true");
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("portal", "kitchen");
      loginUrl.searchParams.set("callbackUrl", safeDestination);
      return NextResponse.redirect(loginUrl);
    }

    // Trainer Partner: TRAINER or ADMIN or SUPER_ADMIN
    if (isTrainerPath && userRole !== "TRAINER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("staff", "true");
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("portal", "trainer");
      loginUrl.searchParams.set("callbackUrl", safeDestination);
      return NextResponse.redirect(loginUrl);
    }

    // Dietitian Partner: DIETITIAN or ADMIN or SUPER_ADMIN
    if (isDietitianPath && userRole !== "DIETITIAN" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("staff", "true");
      loginUrl.searchParams.set("error", "unauthorized_role");
      loginUrl.searchParams.set("portal", "dietitian");
      loginUrl.searchParams.set("callbackUrl", safeDestination);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*", "/trainer/:path*", "/dietitian/:path*", "/api/admin/:path*"],
};
