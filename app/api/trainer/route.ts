import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  if (!session || (userRole !== "TRAINER" && userRole !== "ADMIN")) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Trainer or Admin role required." },
      { status: 403 }
    );
  }

  // If logged in as trainer, load their profile; if admin, allow inspection
  let trainer = await prisma.trainer.findFirst({
    where: userRole === "TRAINER" && userId ? { userId } : undefined,
    include: {
      user: true,
      referrals: {
        include: {
          customer: true,
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
    trainer: {
      id: trainer.id,
      name: trainer.user.name,
      email: trainer.user.email,
      referralCode: trainer.referralCode,
      totalReferrals: trainer.totalReferrals,
      activeSubscribers: trainer.activeSubscribers,
      rewardsEarned: trainer.rewardsEarned,
      referrals: trainer.referrals,
      rewards: trainer.rewards,
    },
  });
}
