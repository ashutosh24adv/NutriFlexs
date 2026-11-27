import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { safeErrorResponse } from "@/lib/api-security";
import { getCustomerRewardsDashboard } from "@/services/rewards.service";

export const dynamic = "force-dynamic";

export async function GET() {
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
        { success: false, error: "FuelPoints rewards are available for customer accounts only." },
        { status: 403 }
      );
    }

    const dashboard = await getCustomerRewardsDashboard(sessionUser.id);
    return NextResponse.json({ success: true, data: dashboard });
  } catch (err) {
    return safeErrorResponse(err, "Failed to load FuelPoints dashboard", 500);
  }
}
