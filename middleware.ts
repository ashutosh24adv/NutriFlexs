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
  const isApiCustomerOnlyPath =
    pathname.startsWith("/api/nutrition") ||
    pathname.startsWith("/api/diet-plans") ||
    pathname.startsWith("/api/rewards");
  const isAdminPath = pathname.startsWith("/admin");
  const isKitchenPath = pathname.startsWith("/kitchen") && !pathname.startsWith("/kitchen/login");
  const isKitchenLoginPath = pathname === "/kitchen/login";
  const isTrainerPath = pathname.startsWith("/trainer");
  const isDietitianPath = pathname.startsWith("/dietitian");
  const isCustomerOnlyPath =
    pathname === "/home" ||
    pathname.startsWith("/home/") ||
    pathname === "/nutrition" ||
    pathname.startsWith("/nutrition/") ||
    pathname === "/cart" ||
    pathname.startsWith("/cart/") ||
    pathname === "/orders" ||
    pathname.startsWith("/orders/") ||
    pathname === "/pass" ||
    pathname.startsWith("/pass/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/") ||
    pathname === "/diet-plans" ||
    pathname.startsWith("/diet-plans/") ||
    pathname === "/meals" ||
    pathname.startsWith("/meals/") ||
    pathname === "/rewards" ||
    pathname.startsWith("/rewards/");

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

  // Block Trainers from accessing customer-only APIs
  if (isApiCustomerOnlyPath) {
    const token = await getToken({ req, secret: authSecret });
    if (token && (token.role as string) === "TRAINER") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Trainers cannot access customer nutrition APIs." },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // Isolate Trainers from Customer-only UI routes -> redirect immediately to /trainer
  if (isCustomerOnlyPath) {
    const token = await getToken({ req, secret: authSecret });
    if (token && (token.role as string) === "TRAINER") {
      return NextResponse.redirect(new URL("/trainer", req.url));
    }
    return NextResponse.next();
  }

  // 2. Kitchen login page: If already logged in with authorized role, redirect to /kitchen
  if (isKitchenLoginPath) {
    const token = await getToken({
      req,
      secret: authSecret,
    });

    if (token) {
      const userRole = (token.role as string) || "CUSTOMER";
      if (userRole === "KITCHEN" || userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
        return NextResponse.redirect(new URL("/kitchen", req.url));
      }
    }
    return NextResponse.next();
  }

  // 3. Dashboard UI route protections
  if (isAdminPath || isKitchenPath || isTrainerPath || isDietitianPath) {
    const token = await getToken({
      req,
      secret: authSecret,
    });

    const safeDestination = sanitizeCallbackUrl(pathname);

    // Unauthenticated users -> Redirect to staff sign-in
    if (!token) {
      if (isKitchenPath) {
        const kitchenLoginUrl = new URL("/kitchen/login", req.url);
        kitchenLoginUrl.searchParams.set("callbackUrl", safeDestination);
        return NextResponse.redirect(kitchenLoginUrl);
      }

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
      const loginUrl = new URL("/kitchen/login", req.url);
      loginUrl.searchParams.set("error", "unauthorized_role");
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
  matcher: [
    "/admin/:path*",
    "/kitchen/:path*",
    "/trainer/:path*",
    "/dietitian/:path*",
    "/api/admin/:path*",
    "/api/nutrition/:path*",
    "/api/diet-plans/:path*",
    "/api/rewards/:path*",
    "/home/:path*",
    "/nutrition/:path*",
    "/cart/:path*",
    "/orders/:path*",
    "/pass/:path*",
    "/profile/:path*",
    "/checkout/:path*",
    "/diet-plans/:path*",
    "/meals/:path*",
    "/rewards/:path*",
  ],
};
