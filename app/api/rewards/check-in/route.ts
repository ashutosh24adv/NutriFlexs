import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-security";
import { performDailyCheckIn } from "@/services/rewards.service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as { id?: string; role?: string } | undefined;
    if (!sessionUser?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const role = (sessionUser.role || "CUSTOMER").toUpperCase();
    if (role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, error: "FuelPoints check-in is available for customer accounts only." },
        { status: 403 }
      );
    }

    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `rewards_checkin:${sessionUser.id}:${clientIp}`,
      maxRequests: 10,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many check-in attempts. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
          },
        }
      );
    }

    const result = await performDailyCheckIn(sessionUser.id);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to complete daily check-in";
    if (message.includes("disabled")) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return safeErrorResponse(err, "Failed to complete daily check-in", 500);
  }
}
