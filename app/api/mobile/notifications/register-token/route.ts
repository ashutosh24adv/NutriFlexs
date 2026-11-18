import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

const registerTokenSchema = z.object({
  expoPushToken: z.string().min(1, "Push token cannot be empty"),
});

/**
 * POST /api/mobile/notifications/register-token
 * Authenticated via Bearer JWT (lib/mobile-auth.ts).
 * Saves expoPushToken to User in Neon Postgres.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawToken = body.expoPushToken || body.token || body.pushToken;

    const validation = registerTokenSchema.safeParse({
      expoPushToken: typeof rawToken === "string" ? rawToken.trim() : "",
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Push token is required",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const expoPushToken = validation.data.expoPushToken;

    const updatedUser = await withDbRetry(() =>
      prisma.user.update({
        where: { id: authUser.id },
        data: {
          expoPushToken,
          notificationsEnabled: true,
        },
        select: {
          id: true,
          email: true,
          expoPushToken: true,
          notificationsEnabled: true,
        },
      })
    );

    return NextResponse.json({
      success: true,
      message: "Push token registered successfully",
      expoPushToken: updatedUser.expoPushToken,
    });
  } catch (error: any) {
    console.error("[Notifications Register Token Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to register push token" },
      { status: 500 }
    );
  }
}
