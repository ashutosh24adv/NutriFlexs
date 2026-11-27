import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import {
  ensureFuelPointsDefaults,
  getOrCreateRewardAccount,
  performDailyCheckIn,
  evaluateMealLoggingReward,
  evaluateWaterGoalReward,
  awardPurchaseFuelPoints,
  reversePurchaseFuelPoints,
  redeemReward,
  adminManualAdjustPoints,
  getTodayDateKeyIST,
} from "../services/rewards.service";

async function runTests() {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const emailA = `fp_test_a_${suffix}@nutriflexs.local`;
  const emailB = `fp_test_b_${suffix}@nutriflexs.local`;

  let userAId = "";
  let userBId = "";
  let testOutletId = "";
  let testProductId = "";
  let testOrderId = "";

  try {
    console.log("1. Seeding default rules & catalogue...");
    await ensureFuelPointsDefaults();

    const [userA, userB] = await Promise.all([
      prisma.user.create({
        data: {
          email: emailA,
          name: "FuelPoints Test A",
          role: "CUSTOMER",
        },
      }),
      prisma.user.create({
        data: {
          email: emailB,
          name: "FuelPoints Test B",
          role: "CUSTOMER",
        },
      }),
    ]);
    userAId = userA.id;
    userBId = userB.id;

    // 2. Concurrent Daily Check-In idempotency test (+5 FP only once)
    console.log("2. Testing concurrent Daily Check-In idempotency...");
    const checkInResults = await Promise.all([
      performDailyCheckIn(userAId),
      performDailyCheckIn(userAId),
      performDailyCheckIn(userAId),
      performDailyCheckIn(userAId),
    ]);
    const freshClaims = checkInResults.filter((r) => !r.alreadyCheckedIn);
    assert.equal(freshClaims.length, 1, "Only one concurrent check-in should award points");
    let accountA = await getOrCreateRewardAccount(userAId);
    assert.equal(accountA.availableBalance, 5, "Balance should be 5 FP after daily check-in");

    // 3. Meal Logging (+10 FP once per day)
    console.log("3. Testing Meal Logging reward (+10 FP once/day)...");
    const todayKey = getTodayDateKeyIST();
    await prisma.foodLog.create({
      data: {
        userId: userAId,
        dateKey: todayKey,
        mealType: "BREAKFAST",
        foodNameSnapshot: "Test Oats Bowl",
        quantity: 1,
        unit: "bowl",
        calories: 320,
        protein: 18,
        carbohydrates: 45,
        fat: 7,
      },
    });
    await evaluateMealLoggingReward(userAId, todayKey);
    await evaluateMealLoggingReward(userAId, todayKey); // duplicate call
    accountA = await getOrCreateRewardAccount(userAId);
    assert.equal(accountA.availableBalance, 15, "Balance should be 15 FP after meal log");

    // 4. Water Goal (+10 FP + reversal on deletion)
    console.log("4. Testing Water Goal reward & reversal...");
    await prisma.nutritionGoal.upsert({
      where: { userId: userAId },
      update: { waterGoalMl: 2000 },
      create: {
        userId: userAId,
        dailyCalorieGoal: 2000,
        proteinGoal: 120,
        carbohydrateGoal: 220,
        fatGoal: 60,
        waterGoalMl: 2000,
      },
    });
    const water1 = await prisma.waterEntry.create({
      data: { userId: userAId, dateKey: todayKey, amountMl: 2000 },
    });
    await evaluateWaterGoalReward(userAId, todayKey);
    accountA = await getOrCreateRewardAccount(userAId);
    assert.equal(accountA.availableBalance, 25, "Balance should be 25 FP after reaching water goal");

    // Delete water entry -> should reverse +10 FP
    await prisma.waterEntry.delete({ where: { id: water1.id } });
    await evaluateWaterGoalReward(userAId, todayKey);
    accountA = await getOrCreateRewardAccount(userAId);
    assert.equal(accountA.availableBalance, 15, "Balance should revert to 15 FP after water deletion");

    // 5. Purchase points (1 FP per ₹10) & cancellation reversal
    console.log("5. Testing Purchase points (1 FP per ₹10) & cancellation reversal...");
    const existingOutlet = await prisma.outlet.findFirst({ select: { id: true } });
    const existingProduct = await prisma.product.findFirst({ select: { id: true, price: true } });
    assert.ok(existingOutlet && existingProduct, "Expected existing outlet & product in DB");
    testOutletId = existingOutlet.id;
    testProductId = existingProduct.id;

    const order = await prisma.order.create({
      data: {
        orderNumber: `FPTEST-${suffix}`,
        userId: userAId,
        outletId: testOutletId,
        subtotal: 259,
        totalAmount: 259, // floor(259 / 10) = 25 FP
        totalProtein: 30,
        totalCalories: 450,
        status: "ORDER_PLACED",
        paymentStatus: "PAID",
        items: {
          create: {
            productId: testProductId,
            quantity: 1,
            priceAtPurchase: 259,
          },
        },
      },
    });
    testOrderId = order.id;
    await awardPurchaseFuelPoints(testOrderId);
    await awardPurchaseFuelPoints(testOrderId); // idempotent duplicate call
    accountA = await getOrCreateRewardAccount(userAId);
    assert.equal(accountA.availableBalance, 40, "Balance should be 15 + 25 = 40 FP after paid order");

    await reversePurchaseFuelPoints(testOrderId, "Test order cancellation");
    await reversePurchaseFuelPoints(testOrderId, "Duplicate reversal check");
    accountA = await getOrCreateRewardAccount(userAId);
    assert.equal(accountA.availableBalance, 15, "Balance should revert to 15 FP after cancellation");

    // 6. Concurrent redemption & negative balance protection
    console.log("6. Testing concurrent redemption & overspend prevention...");
    const catalogue300 = await prisma.rewardCatalogue.findFirst({
      where: { pointsRequired: 300, enabled: true },
    });
    assert.ok(catalogue300, "Expected 300 FP reward in catalogue");

    // Give User A 300 FP via admin adjustment (total 315 FP: enough for 1 redemption, NOT 2)
    await adminManualAdjustPoints({
      adminUserId: userBId,
      targetUserId: userAId,
      pointsDelta: 300,
      reason: "Test credit for concurrent redemption check",
    });

    const redeemAttempts = await Promise.allSettled([
      redeemReward(userAId, catalogue300.id),
      redeemReward(userAId, catalogue300.id),
      redeemReward(userAId, catalogue300.id),
    ]);
    const succeeded = redeemAttempts.filter((r) => r.status === "fulfilled");
    const failed = redeemAttempts.filter((r) => r.status === "rejected");
    assert.equal(succeeded.length, 1, "Only ONE concurrent redemption should succeed");
    assert.equal(failed.length, 2, "Remaining concurrent redemptions must fail");

    accountA = await getOrCreateRewardAccount(userAId);
    assert.equal(accountA.availableBalance, 15, "Balance should be 15 FP after 1 redemption");

    // 7. Cross-user coupon isolation check
    console.log("7. Testing cross-user coupon isolation...");
    const redeemedValue = (succeeded[0] as PromiseFulfilledResult<{ couponCode: string }>).value;
    const issuedCoupon = await prisma.coupon.findUnique({
      where: { code: redeemedValue.couponCode },
    });
    assert.ok(issuedCoupon, "Redeemed coupon must exist in Coupon table");
    assert.equal(issuedCoupon.userId, userAId, "Coupon must belong strictly to User A");
    assert.notEqual(issuedCoupon.userId, userBId, "User B must not own User A's coupon");

    // 8. HTTP API unauthenticated security checks against localhost:3000
    console.log("8. Testing HTTP unauthenticated API protection...");
    const endpoints = [
      { url: "http://localhost:3000/api/rewards", method: "GET" },
      { url: "http://localhost:3000/api/rewards/check-in", method: "POST" },
      { url: "http://localhost:3000/api/rewards/redeem", method: "POST" },
      { url: "http://localhost:3000/api/admin/rewards", method: "GET" },
    ];
    for (const ep of endpoints) {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { "Content-Type": "application/json" },
        body: ep.method === "POST" ? JSON.stringify({}) : undefined,
      });
      assert.equal(res.status, 401, `${ep.method} ${ep.url} must return 401 when unauthenticated`);
    }

    console.log("✅ ALL FUELPOINTS FUNCTIONAL & SECURITY TESTS PASSED!");
  } finally {
    // Cleanup test records cleanly
    if (testOrderId) {
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } }).catch(() => {});
      await prisma.order.deleteMany({ where: { id: testOrderId } }).catch(() => {});
    }
    const ids = [userAId, userBId].filter(Boolean);
    if (ids.length > 0) {
      await prisma.coupon.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.rewardRedemption.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.rewardTransaction.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.rewardAccount.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.foodLog.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.waterEntry.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.nutritionGoal.deleteMany({ where: { userId: { in: ids } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
