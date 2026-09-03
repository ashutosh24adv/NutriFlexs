import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Staff protected routes
  const isAdminPath = pathname.startsWith("/admin");
  const isKitchenPath = pathname.startsWith("/kitchen");
  const isTrainerPath = pathname.startsWith("/trainer");

  if (isAdminPath || isKitchenPath || isTrainerPath) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || "nutriflexs_secret_2026",
    });

    // If unauthenticated, redirect to staff login with callbackUrl
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("staff", "true");
      return NextResponse.redirect(loginUrl);
    }

    const userRole = (token.role as string) || "CUSTOMER";

    // Strict role authorization
    if (isAdminPath && userRole !== "ADMIN") {
      const homeUrl = new URL("/home", req.url);
      homeUrl.searchParams.set("error", "unauthorized_role");
      return NextResponse.redirect(homeUrl);
    }

    if (isKitchenPath && userRole !== "KITCHEN" && userRole !== "ADMIN") {
      const homeUrl = new URL("/home", req.url);
      homeUrl.searchParams.set("error", "unauthorized_role");
      return NextResponse.redirect(homeUrl);
    }

    if (isTrainerPath && userRole !== "TRAINER" && userRole !== "ADMIN") {
      const homeUrl = new URL("/home", req.url);
      homeUrl.searchParams.set("error", "unauthorized_role");
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*", "/trainer/:path*"],
};
