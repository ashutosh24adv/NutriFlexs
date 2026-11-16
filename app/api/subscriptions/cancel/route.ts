import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelUserSubscription } from "@/services/subscription.service";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    let reason = "Customer initiated cancellation";
    try {
      const body = await req.json();
      if (body.reason) reason = body.reason;
    } catch {}

    const result = await cancelUserSubscription(user.id, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/subscriptions/cancel error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel subscription" },
      { status: 400 }
    );
  }
}
