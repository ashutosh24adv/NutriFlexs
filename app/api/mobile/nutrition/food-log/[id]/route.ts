import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/mobile/nutrition/food-log/[id]
 * Deletes a food log entry linked to the authenticated athlete.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getMobileAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;
    const logId = params.id;

    if (!logId) {
      return NextResponse.json(
        { success: false, error: "Food log ID is required" },
        { status: 400 }
      );
    }

    const existing = await withDbRetry(() =>
      prisma.foodLog.findFirst({
        where: { id: logId, userId },
      })
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Food log entry not found or unauthorized" },
        { status: 404 }
      );
    }

    await withDbRetry(() =>
      prisma.foodLog.delete({
        where: { id: logId },
      })
    );

    return NextResponse.json({
      success: true,
      message: "Food log entry deleted successfully",
      id: logId,
    });
  } catch (error: any) {
    console.error("[Mobile Food Log DELETE Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete food log entry" },
      { status: 500 }
    );
  }
}
