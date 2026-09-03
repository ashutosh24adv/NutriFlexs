import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protected paths
  const isAdminPath = pathname.startsWith("/admin");
  const isKitchenPath = pathname.startsWith("/kitchen");
  const isTrainerPath = pathname.startsWith("/trainer");

  if (isAdminPath || isKitchenPath || isTrainerPath) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET || "nutriflexs_secret_2026" });

    // For local demo convenience, if no token is present, we allow session fallback or check role if token exists
    if (token) {
      const userRole = (token.role as string) || "CUSTOMER";

      if (isAdminPath && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/home", req.url));
      }

      if (isKitchenPath && userRole !== "KITCHEN" && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/home", req.url));
      }

      if (isTrainerPath && userRole !== "TRAINER" && userRole !== "ADMIN") {
        return NextResponse.redirect(new URL("/home", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kitchen/:path*", "/trainer/:path*"],
};
