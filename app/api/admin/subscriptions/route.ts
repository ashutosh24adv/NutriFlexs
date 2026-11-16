import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionPlanType, SubscriptionStatus, PaymentStatus } from "@prisma/client";
import { getAllPlansForAdmin } from "@/services/subscription.service";
import { z } from "zod";

function checkAdminAuth(session: any) {
  const role = (session?.user as any)?.role;
  return Boolean(session && (role === "ADMIN" || role === "SUPER_ADMIN"));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!checkAdminAuth(session)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Administrator role required." },
        { status: 403 }
      );
    }

    // 1. All plans with stats
    const plans = await getAllPlansForAdmin();

    // 2. Active subscribers list
    const activeSubscribers = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        plan: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // 3. Expired / cancelled subscribers
    const pastSubscribers = await prisma.subscription.findMany({
      where: {
        status: { in: [SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED, SubscriptionStatus.UPGRADED] },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    // 4. Subscription revenue analytics
    const successfulPayments = await prisma.subscriptionPayment.findMany({
      where: { status: PaymentStatus.PAID },
      include: { plan: { select: { name: true, planType: true } } },
    });

    let totalRevenue = 0;
    const planWiseRevenue: Record<string, number> = {};
    const planWiseSubscribers: Record<string, number> = {};

    for (const p of successfulPayments) {
      totalRevenue += p.amount;
      const pName = p.plan?.name || "Other";
      planWiseRevenue[pName] = (planWiseRevenue[pName] || 0) + p.amount;
    }

    for (const sub of activeSubscribers) {
      const pName = sub.plan.name;
      planWiseSubscribers[pName] = (planWiseSubscribers[pName] || 0) + 1;
    }

    // 5. Recent audit logs
    const auditLogs = await prisma.subscriptionAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({
      success: true,
      plans,
      activeSubscribers,
      pastSubscribers,
      stats: {
        activeSubscribersCount: activeSubscribers.length,
        totalSubscribersHistorical: activeSubscribers.length + pastSubscribers.length,
        totalRevenue,
        planWiseRevenue,
        planWiseSubscribers,
      },
      auditLogs,
    });
  } catch (error: any) {
    console.error("GET /api/admin/subscriptions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load subscription admin data" },
      { status: 500 }
    );
  }
}

const updatePlanSchema = z.object({
  id: z.string().uuid("Invalid plan ID format"),
  name: z.string().min(2).optional(),
  price: z.number().positive().optional(),
  quarterlyPrice: z.number().positive().nullable().optional(),
  annualPrice: z.number().positive().nullable().optional(),
  promotionalPrice: z.number().positive().nullable().optional(),
  validityDays: z.number().int().positive().optional(),
  aiScanAllowance: z.number().int().nonnegative().optional(),
  foodDiscountPercent: z.number().nonnegative().max(100).optional(),
  description: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  badgeText: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  flaggedForReview: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!checkAdminAuth(session)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Administrator role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updatePlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 }
      );
    }

    const { id, benefits, ...rest } = parsed.data;

    const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    const updateData: any = { ...rest };
    if (benefits) {
      updateData.benefits = JSON.stringify(benefits);
    }

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: updateData,
    });

    // Record audit log
    await prisma.subscriptionAuditLog.create({
      data: {
        action: "PLAN_UPDATED",
        performedBy: (session?.user as any)?.email || (session?.user as any)?.id || "ADMIN",
        targetType: "PLAN",
        targetId: id,
        details: JSON.stringify({
          planName: updatedPlan.name,
          changes: rest,
          updatedBenefitsCount: benefits ? benefits.length : undefined,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Plan "${updatedPlan.name}" updated successfully`,
      plan: updatedPlan,
    });
  } catch (error: any) {
    console.error("POST /api/admin/subscriptions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update plan" },
      { status: 500 }
    );
  }
}
