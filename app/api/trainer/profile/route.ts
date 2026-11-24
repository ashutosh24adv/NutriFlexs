import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateTrainerProfile } from "@/services/referral.service";
import { safeErrorResponse } from "@/lib/api-security";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (
      !session ||
      !userId ||
      (userRole !== "TRAINER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Trainer role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const phone =
      typeof body.phone === "string"
        ? body.phone.trim()
        : body.phone === null
        ? null
        : undefined;

    if (name !== undefined && name.length < 2) {
      return NextResponse.json(
        { success: false, error: "Name must be at least 2 characters." },
        { status: 400 }
      );
    }

    const updated = await updateTrainerProfile(userId, { name, phone });

    return NextResponse.json({
      success: true,
      profile: updated,
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to update trainer profile", 500);
  }
}
