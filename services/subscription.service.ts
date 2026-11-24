import { prisma } from "@/lib/prisma";
import { activateTrainerReferralOnSubscription } from "./referral.service";
import { SubscriptionPlanType, SubscriptionStatus, PaymentStatus } from "@prisma/client";
import { createRazorpayOrder, verifyRazorpaySignature } from "@/lib/razorpay";
import {
  getUserActiveSubscription,
  getUserEntitlements,
  UserEntitlements,
} from "./subscription-entitlement.service";

export interface PlanPricingPeriod {
  period: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  price: number;
  durationDays: number;
  monthlyEquivalent: number;
  savingsPercent?: number;
}

export interface FormattedSubscriptionPlan {
  id: string;
  name: string;
  slug: string | null;
  planType: SubscriptionPlanType;
  description: string;
  badgeText: string | null;
  benefits: string[];
  foodDiscountPercent: number;
  aiScanAllowance: number;
  hasFoodBenefits: boolean;
  hasNutritionBenefits: boolean;
  hasAiScan: boolean;
  hasAdvancedInsights: boolean;
  displayOrder: number;
  isActive: boolean;
  pricing: {
    monthly: PlanPricingPeriod;
    quarterly: PlanPricingPeriod | null;
    annual: PlanPricingPeriod | null;
  };
}

/**
 * Parses and formats plan benefits stored as JSON or semicolon-separated text.
 */
function parseBenefits(rawBenefits: string): string[] {
  try {
    const parsed = JSON.parse(rawBenefits);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") return parsed.split(";").map((s) => s.trim()).filter(Boolean);
  } catch {
    if (rawBenefits) {
      return rawBenefits.split(";").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Returns the 3 official subscription passes formatted for display and purchase.
 */
export async function getSubscriptionPlans(): Promise<FormattedSubscriptionPlan[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: {
      isActive: true,
      planType: {
        in: [
          SubscriptionPlanType.FOOD_PASS,
          SubscriptionPlanType.NUTRITION_PASS,
          SubscriptionPlanType.ALL_ACCESS_PASS,
        ],
      },
    },
    orderBy: { displayOrder: "asc" },
  });

  return plans.map((p) => {
    const monthlyPrice = p.price;
    const quarterlyPrice = p.quarterlyPrice || Math.round(monthlyPrice * 3 * 0.9); // default ~10% off
    const annualPrice = p.annualPrice || Math.round(monthlyPrice * 12 * 0.75); // default ~25% off

    const quarterlySavings = Math.round(
      ((monthlyPrice * 3 - quarterlyPrice) / (monthlyPrice * 3)) * 100
    );
    const annualSavings = Math.round(
      ((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12)) * 100
    );

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      planType: p.planType,
      description: p.description,
      badgeText: p.badgeText,
      benefits: parseBenefits(p.benefits),
      foodDiscountPercent: p.foodDiscountPercent,
      aiScanAllowance: p.aiScanAllowance,
      hasFoodBenefits: p.hasFoodBenefits,
      hasNutritionBenefits: p.hasNutritionBenefits,
      hasAiScan: p.hasAiScan,
      hasAdvancedInsights: p.hasAdvancedInsights,
      displayOrder: p.displayOrder,
      isActive: p.isActive,
      pricing: {
        monthly: {
          period: "MONTHLY",
          price: monthlyPrice,
          durationDays: p.validityDays || 30,
          monthlyEquivalent: monthlyPrice,
        },
        quarterly: p.quarterlyPrice
          ? {
              period: "QUARTERLY",
              price: quarterlyPrice,
              durationDays: 90,
              monthlyEquivalent: Math.round(quarterlyPrice / 3),
              savingsPercent: quarterlySavings > 0 ? quarterlySavings : undefined,
            }
          : null,
        annual: p.annualPrice
          ? {
              period: "ANNUAL",
              price: annualPrice,
              durationDays: 365,
              monthlyEquivalent: Math.round(annualPrice / 12),
              savingsPercent: annualSavings > 0 ? annualSavings : undefined,
            }
          : null,
      },
    };
  });
}

/**
 * Returns all plans including legacy ones for admin overview.
 */
export async function getAllPlansForAdmin() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: [{ planType: "asc" }, { displayOrder: "asc" }],
    include: {
      _count: {
        select: {
          subscriptions: { where: { status: SubscriptionStatus.ACTIVE } },
        },
      },
    },
  });

  return plans.map((p) => ({
    ...p,
    benefitsList: parseBenefits(p.benefits),
    activeSubscribersCount: p._count.subscriptions,
  }));
}

/**
 * Creates a server-side checkout session for a subscription purchase or upgrade.
 */
export async function createSubscriptionCheckout(params: {
  userId: string;
  planId: string;
  billingPeriod?: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  idempotencyKey?: string;
}) {
  const { userId, planId, billingPeriod = "MONTHLY", idempotencyKey } = params;

  // 1. Fetch user & plan
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Selected subscription plan was not found");
  if (!plan.isActive) throw new Error("This subscription plan is not currently active for purchase");

  // 2. Calculate exact server-side price
  let amount = plan.price;
  let durationDays = plan.validityDays || 30;

  if (billingPeriod === "QUARTERLY") {
    amount = plan.quarterlyPrice || Math.round(plan.price * 3 * 0.9);
    durationDays = 90;
  } else if (billingPeriod === "ANNUAL") {
    amount = plan.annualPrice || Math.round(plan.price * 12 * 0.75);
    durationDays = 365;
  }

  // 3. Check for existing active subscription (Upgrade/Downgrade Path check)
  const currentSub = await getUserActiveSubscription(userId);
  let isUpgrade = false;
  let upgradeCredit = 0;

  if (currentSub) {
    if (currentSub.planId === planId) {
      // Same plan renewal
      isUpgrade = false;
    } else {
      isUpgrade = true;
      // If upgrading from Food or Nutrition to All Access, we can apply prorated unused value
      const now = new Date();
      if (currentSub.endDate > now) {
        const msRemaining = currentSub.endDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
        const dailyRate = currentSub.plan.price / (currentSub.plan.validityDays || 30);
        upgradeCredit = Math.min(amount - 100, Math.round(daysRemaining * dailyRate * 0.5)); // 50% prorated credit towards upgrade
      }
    }
  }

  const finalAmount = Math.max(1, amount - upgradeCredit);

  // 4. Create Razorpay Order
  const paymentReceipt = `sub_${Date.now()}_${userId.slice(0, 6)}`;
  const rzpOrder = await createRazorpayOrder(finalAmount, paymentReceipt);

  // 5. Store pending SubscriptionPayment record
  const paymentRecord = await prisma.subscriptionPayment.create({
    data: {
      userId,
      planId,
      subscriptionId: currentSub?.id || null,
      amount: finalAmount,
      currency: "INR",
      status: PaymentStatus.PENDING,
      razorpayOrderId: rzpOrder.id,
      billingPeriod,
      idempotencyKey: idempotencyKey || null,
      metadata: JSON.stringify({
        isUpgrade,
        upgradeCredit,
        originalPrice: amount,
        billingPeriod,
        durationDays,
        currentPlan: currentSub?.plan.name || null,
        targetPlan: plan.name,
      }),
    },
  });

  return {
    success: true,
    paymentRecordId: paymentRecord.id,
    razorpayOrderId: rzpOrder.id,
    amount: finalAmount,
    currency: "INR",
    planName: plan.name,
    billingPeriod,
    durationDays,
    isUpgrade,
    upgradeCredit,
    keyId: rzpOrder.keyId,
  };
}

/**
 * Server-side payment verification & atomic subscription activation.
 */
export async function verifyAndActivateSubscription(params: {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const { userId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = params;

  // 1. Find the pending subscription payment record
  const paymentRecord = await prisma.subscriptionPayment.findUnique({
    where: { razorpayOrderId },
    include: { plan: true },
  });

  if (!paymentRecord) {
    throw new Error("Subscription order record not found");
  }

  if (paymentRecord.userId !== userId) {
    throw new Error("Forbidden: This payment does not belong to the authenticated user");
  }

  // Idempotency: if already paid, return existing state safely
  if (paymentRecord.status === PaymentStatus.PAID) {
    const existingSub = await getUserActiveSubscription(userId);
    return {
      success: true,
      message: "Subscription payment was already confirmed",
      subscription: existingSub,
      isDuplicate: true,
    };
  }

  // 2. Cryptographic signature check
  const isSignatureValid = verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isSignatureValid) {
    await prisma.subscriptionPayment.update({
      where: { id: paymentRecord.id },
      data: { status: PaymentStatus.FAILED },
    });
    throw new Error("Payment signature verification failed");
  }

  // 3. Parse metadata for duration and upgrade details
  let durationDays = paymentRecord.plan.validityDays || 30;
  try {
    if (paymentRecord.metadata) {
      const meta = JSON.parse(paymentRecord.metadata);
      if (meta.durationDays) durationDays = meta.durationDays;
    }
  } catch {}

  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // 4. Atomic transaction to update payment, transition previous subscription, and activate new one
  const result = await prisma.$transaction(async (tx) => {
    // A. Update payment record to PAID
    await tx.subscriptionPayment.update({
      where: { id: paymentRecord.id },
      data: {
        status: PaymentStatus.PAID,
        razorpayPaymentId,
        razorpaySignature,
      },
    });

    // B. Handle existing active subscription
    const existingActiveSub = await tx.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // C. Create the new subscription
    const newSubscription = await tx.subscription.create({
      data: {
        userId,
        planId: paymentRecord.planId,
        billingPeriod: paymentRecord.billingPeriod,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        remainingCredits: paymentRecord.plan.creditsCount || 0,
        aiScansUsed: 0,
        autoRenew: true,
      },
      include: {
        plan: true,
      },
    });

    // D. If user had an existing subscription, mark it UPGRADED or EXPIRED
    if (existingActiveSub) {
      const isSwitch = existingActiveSub.planId !== paymentRecord.planId;
      await tx.subscription.update({
        where: { id: existingActiveSub.id },
        data: {
          status: isSwitch ? SubscriptionStatus.UPGRADED : SubscriptionStatus.EXPIRED,
          upgradedToId: newSubscription.id,
        },
      });

      // Audit log the transition
      await tx.subscriptionAuditLog.create({
        data: {
          action: isSwitch ? "SUBSCRIPTION_UPGRADED" : "SUBSCRIPTION_RENEWED",
          performedBy: userId,
          targetType: "SUBSCRIPTION",
          targetId: newSubscription.id,
          details: JSON.stringify({
            previousSubId: existingActiveSub.id,
            previousPlanId: existingActiveSub.planId,
            newSubId: newSubscription.id,
            newPlanId: newSubscription.planId,
            billingPeriod: paymentRecord.billingPeriod,
            amount: paymentRecord.amount,
          }),
        },
      });
    } else {
      // Audit log new subscription
      await tx.subscriptionAuditLog.create({
        data: {
          action: "SUBSCRIPTION_CREATED",
          performedBy: userId,
          targetType: "SUBSCRIPTION",
          targetId: newSubscription.id,
          details: JSON.stringify({
            newSubId: newSubscription.id,
            planId: newSubscription.planId,
            planName: newSubscription.plan.name,
            amount: paymentRecord.amount,
            billingPeriod: paymentRecord.billingPeriod,
          }),
        },
      });
    }

    // Link payment record to new subscription
    await tx.subscriptionPayment.update({
      where: { id: paymentRecord.id },
      data: { subscriptionId: newSubscription.id },
    });

    return newSubscription;
  });

  try {
    await activateTrainerReferralOnSubscription(userId);
  } catch (refErr) {
    console.error("[Subscription] Non-fatal referral activation error:", refErr);
  }

  return {
    success: true,
    message: "Subscription successfully activated",
    subscription: result,
  };
}

/**
 * Cancels or toggles auto-renewal for a customer's active subscription.
 */
export async function cancelUserSubscription(userId: string, reason?: string) {
  const activeSub = await getUserActiveSubscription(userId);
  if (!activeSub) throw new Error("No active subscription found to cancel");

  const updated = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.update({
      where: { id: activeSub.id },
      data: {
        autoRenew: false,
        cancelledAt: new Date(),
        cancellationReason: reason || "User requested cancellation",
        status: SubscriptionStatus.CANCELLED,
      },
      include: { plan: true },
    });

    await tx.subscriptionAuditLog.create({
      data: {
        action: "SUBSCRIPTION_CANCELLED",
        performedBy: userId,
        targetType: "SUBSCRIPTION",
        targetId: sub.id,
        details: JSON.stringify({
          planName: sub.plan.name,
          reason,
          effectiveEndDate: sub.endDate.toISOString(),
        }),
      },
    });

    return sub;
  });

  return {
    success: true,
    message: "Subscription has been cancelled. Entitlements will cease or continue until the end date.",
    subscription: updated,
  };
}
