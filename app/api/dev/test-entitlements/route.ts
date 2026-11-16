import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getUserEntitlements,
  assertCanScanMeal,
  recordAiScanUsage,
  calculateFoodOrderPassDiscount,
} from "@/services/subscription-entitlement.service";
import {
  createSubscriptionCheckout,
  verifyAndActivateSubscription,
  cancelUserSubscription,
} from "@/services/subscription.service";
import { SubscriptionPlanType, SubscriptionStatus } from "@prisma/client";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden in production" }, { status: 403 });
  }

  const results: any[] = [];
  const log = (name: string, passed: boolean, details?: any) => {
    results.push({ name, passed, details });
  };

  try {
    const timestamp = Date.now();

    // 1. Fetch 3 Official Plans
    const foodPlan = await prisma.subscriptionPlan.findFirst({ where: { planType: "FOOD_PASS" } });
    const nutritionPlan = await prisma.subscriptionPlan.findFirst({ where: { planType: "NUTRITION_PASS" } });
    const allAccessPlan = await prisma.subscriptionPlan.findFirst({ where: { planType: "ALL_ACCESS_PASS" } });

    log("1. Food Pass in DB", Boolean(foodPlan), { id: foodPlan?.id, discount: foodPlan?.foodDiscountPercent });
    log("2. Nutrition Pass in DB", Boolean(nutritionPlan), { id: nutritionPlan?.id, scans: nutritionPlan?.aiScanAllowance });
    log("3. All Access Pass in DB", Boolean(allAccessPlan), { id: allAccessPlan?.id, scans: allAccessPlan?.aiScanAllowance, discount: allAccessPlan?.foodDiscountPercent });

    // 2. Setup Test Users
    const freeUser = await prisma.user.create({
      data: {
        email: `dev_free_${timestamp}@nutriflexs.test`,
        name: "Dev Free User",
        role: "CUSTOMER",
      },
    });

    const foodUser = await prisma.user.create({
      data: {
        email: `dev_food_${timestamp}@nutriflexs.test`,
        name: "Dev Food User",
        role: "CUSTOMER",
      },
    });

    const nutritionUser = await prisma.user.create({
      data: {
        email: `dev_nutri_${timestamp}@nutriflexs.test`,
        name: "Dev Nutrition User",
        role: "CUSTOMER",
      },
    });

    const allAccessUser = await prisma.user.create({
      data: {
        email: `dev_all_${timestamp}@nutriflexs.test`,
        name: "Dev All Access User",
        role: "CUSTOMER",
      },
    });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const subFood = await prisma.subscription.create({
      data: {
        userId: foodUser.id,
        planId: foodPlan!.id,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const subNutri = await prisma.subscription.create({
      data: {
        userId: nutritionUser.id,
        planId: nutritionPlan!.id,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const subAll = await prisma.subscription.create({
      data: {
        userId: allAccessUser.id,
        planId: allAccessPlan!.id,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // 3. Test Free User
    const freeEnt = await getUserEntitlements(freeUser.id);
    log("Free User: hasActiveSubscription is false", freeEnt.hasActiveSubscription === false);
    log("Free User: canAccessFoodDiscount is false", freeEnt.canAccessFoodDiscount === false);
    log("Free User: canAccessAiScan is false", freeEnt.canAccessAiScan === false);

    let freeScanBlocked = false;
    try {
      await assertCanScanMeal(freeUser.id);
    } catch (err: any) {
      freeScanBlocked = err.statusCode === 403;
    }
    log("Free User: assertCanScanMeal throws 403", freeScanBlocked);

    // 4. Test Food Pass User
    const foodEnt = await getUserEntitlements(foodUser.id);
    log("Food User: planType is FOOD_PASS", foodEnt.planType === SubscriptionPlanType.FOOD_PASS);
    log("Food User: canAccessFoodDiscount is true", foodEnt.canAccessFoodDiscount === true);
    log("Food User: foodDiscountPercent is 15", foodEnt.foodDiscountPercent === 15);
    log("Food User: canAccessAiScan is false", foodEnt.canAccessAiScan === false);

    let foodScanBlocked = false;
    try {
      await assertCanScanMeal(foodUser.id);
    } catch (err: any) {
      foodScanBlocked = err.statusCode === 403 && err.code === "UPGRADE_REQUIRED";
    }
    log("Food User: assertCanScanMeal throws 403 UPGRADE_REQUIRED", foodScanBlocked);

    const foodDiscountCalc = await calculateFoodOrderPassDiscount(foodUser.id, 1000);
    log("Food User: 15% discount applied on ₹1000", foodDiscountCalc.discountAmount === 150);

    // 5. Test Nutrition Pass User
    const nutriEnt = await getUserEntitlements(nutritionUser.id);
    log("Nutrition User: planType is NUTRITION_PASS", nutriEnt.planType === SubscriptionPlanType.NUTRITION_PASS);
    log("Nutrition User: canAccessFoodDiscount is false", nutriEnt.canAccessFoodDiscount === false);
    log("Nutrition User: canAccessAiScan is true", nutriEnt.canAccessAiScan === true);
    log("Nutrition User: aiScanAllowance is 60", nutriEnt.aiScanAllowance === 60);

    let nutriScanAllowed = false;
    try {
      const res = await assertCanScanMeal(nutritionUser.id);
      nutriScanAllowed = res.canAccessAiScan === true;
    } catch {}
    log("Nutrition User: assertCanScanMeal succeeds", nutriScanAllowed);

    const usageRec = await recordAiScanUsage(nutritionUser.id, subNutri.id, { meal: "Dal & Roti" });
    log("Nutrition User: recordAiScanUsage increments used to 1", usageRec.scansUsed === 1);
    log("Nutrition User: remaining decremented to 59", usageRec.scansRemaining === 59);

    // 6. Test Quota Exhaustion
    await prisma.subscription.update({
      where: { id: subNutri.id },
      data: { aiScansUsed: 60 },
    });
    let quotaBlocked = false;
    try {
      await assertCanScanMeal(nutritionUser.id);
    } catch (err: any) {
      quotaBlocked = err.statusCode === 403 && err.code === "QUOTA_EXHAUSTED";
    }
    log("Nutrition User: Quota exhaustion blocks scan with 403 QUOTA_EXHAUSTED", quotaBlocked);

    // 7. Test All Access Combined Pass
    const allEnt = await getUserEntitlements(allAccessUser.id);
    log("All Access: planType is ALL_ACCESS_PASS", allEnt.planType === SubscriptionPlanType.ALL_ACCESS_PASS);
    log("All Access: canAccessFoodDiscount is true (20%)", allEnt.canAccessFoodDiscount === true && allEnt.foodDiscountPercent === 20);
    log("All Access: canAccessAiScan is true (100 allowance)", allEnt.canAccessAiScan === true && allEnt.aiScanAllowance === 100);
    log("All Access: canAccessAdvancedInsights is true", allEnt.canAccessAdvancedInsights === true);

    const allDiscountCalc = await calculateFoodOrderPassDiscount(allAccessUser.id, 1000);
    log("All Access: 20% discount applied on ₹1000", allDiscountCalc.discountAmount === 200);

    // 8. Test Upgrade Flow: Food Pass -> All Access
    const checkout = await createSubscriptionCheckout({
      userId: foodUser.id,
      planId: allAccessPlan!.id,
    });
    log("Upgrade Flow: isUpgrade is true", checkout.isUpgrade === true);
    log("Upgrade Flow: upgradeCredit applied", checkout.upgradeCredit > 0);

    const activate = await verifyAndActivateSubscription({
      userId: foodUser.id,
      razorpayOrderId: checkout.razorpayOrderId,
      razorpayPaymentId: `pay_upgrade_test_${timestamp}`,
      razorpaySignature: "demo_sig_valid",
    });
    log("Upgrade Flow: New subscription active", activate.success === true && activate.subscription?.planId === allAccessPlan!.id);

    const oldSubCheck = await prisma.subscription.findUnique({ where: { id: subFood.id } });
    log("Upgrade Flow: Old subscription marked UPGRADED", oldSubCheck?.status === SubscriptionStatus.UPGRADED);
    log("Upgrade Flow: References new subscription ID", oldSubCheck?.upgradedToId === activate.subscription?.id);

    // 9. Test Cancellation
    const cancel = await cancelUserSubscription(foodUser.id, "Cancel test");
    log("Cancellation: status CANCELLED and autoRenew false", cancel.subscription?.status === SubscriptionStatus.CANCELLED && cancel.subscription?.autoRenew === false);

    const allPassed = results.every((r) => r.passed);

    return NextResponse.json({
      success: allPassed,
      totalTests: results.length,
      passedCount: results.filter((r) => r.passed).length,
      failedCount: results.filter((r) => !r.passed).length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack }, { status: 500 });
  }
}
