import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-security";
import { redeemRewardSchema } from "@/lib/validations/rewards.schema";
import { redeemReward } from "@/services/rewards.service";

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
        { success: false, error: "FuelPoints redemption is available for customer accounts only." },
        { status: 403 }
      );
    }

    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit({
      key: `rewards_redeem:${sessionUser.id}:${clientIp}`,
      maxRequests: 10,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many redemption requests. Please wait a moment." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
          },
        }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = redeemRewardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid reward request" },
        { status: 400 }
      );
    }

    const result = await redeemReward(sessionUser.id, parsed.data.rewardId);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to redeem reward";
    if (
      message.includes("Insufficient") ||
      message.includes("not found") ||
      message.includes("unavailable")
    ) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return safeErrorResponse(err, "Failed to redeem reward", 500);
  }
}
