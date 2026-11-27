import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { safeErrorResponse } from "@/lib/api-security";
import {
  adminAdjustPointsSchema,
  adminCatalogueItemSchema,
  adminUpdateRuleSchema,
} from "@/lib/validations/rewards.schema";
import {
  adminManualAdjustPoints,
  adminUpdateRewardRule,
  adminUpsertCatalogueReward,
  getAdminRewardsOverview,
} from "@/services/rewards.service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const adminActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_rule"),
    payload: adminUpdateRuleSchema,
  }),
  z.object({
    action: z.literal("upsert_catalogue"),
    payload: adminCatalogueItemSchema,
  }),
  z.object({
    action: z.literal("adjust_points"),
    payload: adminAdjustPointsSchema,
  }),
]);

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser?.id) {
    return { error: NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 }) };
  }
  const role = (sessionUser.role || "CUSTOMER").toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ success: false, error: "Forbidden: Admin access required" }, { status: 403 }) };
  }
  return { userId: sessionUser.id };
}

export async function GET() {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const overview = await getAdminRewardsOverview();
    return NextResponse.json({ success: true, data: overview });
  } catch (err) {
    return safeErrorResponse(err, "Failed to fetch admin rewards overview", 500);
  }
}

export async function PATCH(request: Request) {
  return handleAdminMutation(request);
}

export async function POST(request: Request) {
  return handleAdminMutation(request);
}

async function handleAdminMutation(request: Request) {
  try {
    const auth = await requireAdminSession();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    const parsed = adminActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid request payload" },
        { status: 400 }
      );
    }

    const { action, payload } = parsed.data;

    if (action === "update_rule") {
      const updated = await adminUpdateRewardRule(payload);
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "upsert_catalogue") {
      const saved = await adminUpsertCatalogueReward(payload);
      return NextResponse.json({ success: true, data: saved });
    }

    const adjusted = await adminManualAdjustPoints({
      adminUserId: auth.userId,
      targetUserId: payload.userId,
      pointsDelta: payload.pointsDelta,
      reason: payload.reason,
    });
    return NextResponse.json({ success: true, data: adjusted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process admin rewards action";
    if (message.includes("not found") || message.includes("negative") || message.includes("zero")) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return safeErrorResponse(err, "Failed to process admin rewards action", 500);
  }
}
