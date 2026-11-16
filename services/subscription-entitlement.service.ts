import { prisma } from "@/lib/prisma";
import { SubscriptionPlanType, SubscriptionStatus } from "@prisma/client";

export interface UserEntitlements {
  hasActiveSubscription: boolean;
  planId: string | null;
  planName: string | null;
  planType: SubscriptionPlanType | null;
  subscriptionId: string | null;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number;
  autoRenew: boolean;
  status: SubscriptionStatus | "FREE";

  // Order Food Entitlements
  canAccessFoodDiscount: boolean;
  foodDiscountPercent: number;

  // Track Nutrition Entitlements
  canAccessAiScan: boolean;
  aiScanAllowance: number;
  aiScansUsed: number;
  aiScansRemaining: number;
  canAccessAdvancedInsights: boolean;
  canAccessPremiumGoals: boolean;
}

export class EntitlementError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 403, code = "ENTITLEMENT_FORBIDDEN") {
    super(message);
    this.name = "EntitlementError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Retrieves the user's active subscription, automatically handling expiration if endDate has passed.
 */
export async function getUserActiveSubscription(userId: string) {
  if (!userId) return null;

  const now = new Date();

  // Find most recent active subscription
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: SubscriptionStatus.ACTIVE,
    },
    include: {
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) return null;

  // Auto-expire if past end date
  if (subscription.endDate < now) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.EXPIRED },
    });
    return null;
  }

  return subscription;
}

/**
 * Calculates and returns the complete server-enforced entitlement profile for a user.
 */
export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const defaultFreeEntitlements: UserEntitlements = {
    hasActiveSubscription: false,
    planId: null,
    planName: null,
    planType: null,
    subscriptionId: null,
    startDate: null,
    endDate: null,
    daysRemaining: 0,
    autoRenew: false,
    status: "FREE",
    canAccessFoodDiscount: false,
    foodDiscountPercent: 0,
    canAccessAiScan: false,
    aiScanAllowance: 0,
    aiScansUsed: 0,
    aiScansRemaining: 0,
    canAccessAdvancedInsights: false,
    canAccessPremiumGoals: false,
  };

  if (!userId) return defaultFreeEntitlements;

  const sub = await getUserActiveSubscription(userId);
  if (!sub || !sub.plan) return defaultFreeEntitlements;

  const now = new Date();
  const msRemaining = sub.endDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  const plan = sub.plan;
  const planType = plan.planType;

  // 1. Food Benefits
  const canAccessFoodDiscount =
    planType === SubscriptionPlanType.FOOD_PASS ||
    planType === SubscriptionPlanType.ALL_ACCESS_PASS ||
    (planType === SubscriptionPlanType.LEGACY && plan.foodDiscountPercent > 0);

  const foodDiscountPercent = canAccessFoodDiscount ? plan.foodDiscountPercent : 0;

  // 2. Nutrition Benefits (AI Scan & Insights)
  const canAccessAiScan =
    planType === SubscriptionPlanType.NUTRITION_PASS ||
    planType === SubscriptionPlanType.ALL_ACCESS_PASS ||
    (planType === SubscriptionPlanType.LEGACY && plan.hasAiScan);

  const aiScanAllowance = canAccessAiScan ? plan.aiScanAllowance : 0;
  const aiScansUsed = sub.aiScansUsed || 0;
  const aiScansRemaining = canAccessAiScan ? Math.max(0, aiScanAllowance - aiScansUsed) : 0;

  const canAccessAdvancedInsights =
    planType === SubscriptionPlanType.NUTRITION_PASS ||
    planType === SubscriptionPlanType.ALL_ACCESS_PASS ||
    (planType === SubscriptionPlanType.LEGACY && plan.hasAdvancedInsights);

  return {
    hasActiveSubscription: true,
    planId: plan.id,
    planName: plan.name,
    planType: plan.planType,
    subscriptionId: sub.id,
    startDate: sub.startDate.toISOString(),
    endDate: sub.endDate.toISOString(),
    daysRemaining,
    autoRenew: sub.autoRenew,
    status: sub.status,
    canAccessFoodDiscount,
    foodDiscountPercent,
    canAccessAiScan,
    aiScanAllowance,
    aiScansUsed,
    aiScansRemaining,
    canAccessAdvancedInsights,
    canAccessPremiumGoals: canAccessAdvancedInsights,
  };
}

/**
 * Server-side gatekeeper for AI meal scanning.
 * Throws EntitlementError (403) if the user is not entitled or has exhausted their monthly allowance.
 */
export async function assertCanScanMeal(userId: string) {
  const entitlements = await getUserEntitlements(userId);

  if (!entitlements.hasActiveSubscription) {
    throw new EntitlementError(
      "AI meal scanning requires an active NutriFlexs Nutrition Pass or All Access Pass. Free accounts can log meals manually.",
      403,
      "PLAN_REQUIRED"
    );
  }

  if (entitlements.planType === SubscriptionPlanType.FOOD_PASS) {
    throw new EntitlementError(
      "Your NutriFlexs Food Pass covers food ordering discounts. Upgrade to Nutrition Pass or All Access Pass to unlock AI photo meal scanning.",
      403,
      "UPGRADE_REQUIRED"
    );
  }

  if (!entitlements.canAccessAiScan) {
    throw new EntitlementError(
      "AI meal scanning is not enabled on your current subscription plan.",
      403,
      "FEATURE_DISABLED"
    );
  }

  if (entitlements.aiScansRemaining <= 0) {
    const formattedRenewal = entitlements.endDate
      ? new Date(entitlements.endDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "your next billing cycle";

    throw new EntitlementError(
      `You have reached your monthly allowance of ${entitlements.aiScanAllowance} AI scans. Your quota will reset on ${formattedRenewal}.`,
      403,
      "QUOTA_EXHAUSTED"
    );
  }

  return entitlements;
}

/**
 * Atomically increments the AI scan usage counter and records a usage record.
 */
export async function recordAiScanUsage(
  userId: string,
  subscriptionId: string,
  metadata?: Record<string, any>
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Increment subscription count
    const updatedSub = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        aiScansUsed: { increment: 1 },
      },
      include: { plan: true },
    });

    // 2. Insert usage record
    const usage = await tx.subscriptionUsageRecord.create({
      data: {
        subscriptionId,
        userId,
        feature: "AI_MEAL_SCAN",
        quantity: 1,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    const remaining = Math.max(0, updatedSub.plan.aiScanAllowance - updatedSub.aiScansUsed);

    return {
      success: true,
      scansUsed: updatedSub.aiScansUsed,
      allowance: updatedSub.plan.aiScanAllowance,
      scansRemaining: remaining,
      usageId: usage.id,
    };
  });
}

/**
 * Calculates the member food order discount server-side based on the user's active pass.
 */
export async function calculateFoodOrderPassDiscount(userId: string, subtotal: number) {
  if (!userId || subtotal <= 0) {
    return { discountAmount: 0, discountPercent: 0, appliedPlan: null };
  }

  const entitlements = await getUserEntitlements(userId);
  if (!entitlements.canAccessFoodDiscount || entitlements.foodDiscountPercent <= 0) {
    return { discountAmount: 0, discountPercent: 0, appliedPlan: null };
  }

  const discountAmount = Math.round((subtotal * entitlements.foodDiscountPercent) / 100);

  return {
    discountAmount,
    discountPercent: entitlements.foodDiscountPercent,
    appliedPlan: entitlements.planName,
  };
}
