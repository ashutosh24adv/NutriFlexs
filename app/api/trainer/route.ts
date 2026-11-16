import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripSensitiveFields, safeErrorResponse } from "@/lib/api-security";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || (userRole !== "TRAINER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Trainer or Admin role required." },
        { status: 403 }
      );
    }

    // If logged in as trainer, load their profile; if admin, allow inspection
    const trainer = await prisma.trainer.findFirst({
      where: userRole === "TRAINER" && userId ? { userId } : undefined,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        referrals: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
              },
            },
          },
        },
        rewards: true,
      },
    });

    if (!trainer) {
      return NextResponse.json({ success: false, error: "Trainer profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      trainer: stripSensitiveFields({
        id: trainer.id,
        name: trainer.user.name,
        email: trainer.user.email,
        referralCode: trainer.referralCode,
        totalReferrals: trainer.totalReferrals,
        activeSubscribers: trainer.activeSubscribers,
        rewardsEarned: trainer.rewardsEarned,
        referrals: trainer.referrals,
        rewards: trainer.rewards,
      }),
    });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to load trainer profile", 500);
  }
}
