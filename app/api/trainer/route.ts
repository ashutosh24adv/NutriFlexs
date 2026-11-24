import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrainerPortalData } from "@/services/referral.service";
import { stripSensitiveFields, safeErrorResponse } from "@/lib/api-security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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
        { success: false, error: "Unauthorized. Trainer or Admin role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = (searchParams.get("status") as any) || "ALL";
    const dateRange = (searchParams.get("dateRange") as any) || "ALL";
    const sort = (searchParams.get("sort") as any) || "newest";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    let targetTrainerUserId = userId;
    // Allow Admins inspecting the trainer portal to view the first trainer if they don't have their own Trainer row
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      const ownTrainer = await prisma.trainer.findUnique({ where: { userId } });
      if (!ownTrainer) {
        const firstTrainer = await prisma.trainer.findFirst({ select: { userId: true } });
        if (firstTrainer) targetTrainerUserId = firstTrainer.userId;
      }
    }

    const data = await getTrainerPortalData(targetTrainerUserId, {
      search,
      status,
      dateRange,
      sort,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 10 : limit,
    });

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Trainer profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...stripSensitiveFields(data),
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to load trainer portal data", 500);
  }
}
