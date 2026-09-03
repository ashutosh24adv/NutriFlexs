import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    let activeSubscription = null;
    const userEmail = session?.user?.email || "ashu@nutriflexs.com";
    const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase().trim() } });

    if (user) {
      activeSubscription = await prisma.subscription.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
        },
        include: {
          plan: true,
        },
      });
    }

    return NextResponse.json({ success: true, plans, activeSubscription });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
