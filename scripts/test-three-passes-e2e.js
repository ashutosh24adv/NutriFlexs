const { PrismaClient, SubscriptionPlanType, SubscriptionStatus, PaymentStatus } = require("@prisma/client");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS — THREE-PASS SUBSCRIPTION ARCHITECTURE E2E TEST SUITE");
  console.log("================================================================================");

  // 1. VERIFY THREE OFFICIAL PLANS IN DATABASE
  console.log("\n1. Verifying Database Plans...");
  const foodPlan = await prisma.subscriptionPlan.findFirst({ where: { planType: "FOOD_PASS" } });
  const nutritionPlan = await prisma.subscriptionPlan.findFirst({ where: { planType: "NUTRITION_PASS" } });
  const allAccessPlan = await prisma.subscriptionPlan.findFirst({ where: { planType: "ALL_ACCESS_PASS" } });

  assert(Boolean(foodPlan), `Food Pass found in DB (ID: ${foodPlan?.id}, price: ₹${foodPlan?.price}, discount: ${foodPlan?.foodDiscountPercent}%)`);
  assert(Boolean(nutritionPlan), `Nutrition Pass found in DB (ID: ${nutritionPlan?.id}, price: ₹${nutritionPlan?.price}, scans: ${nutritionPlan?.aiScanAllowance})`);
  assert(Boolean(allAccessPlan), `All Access Pass found in DB (ID: ${allAccessPlan?.id}, price: ₹${allAccessPlan?.price}, discount: ${allAccessPlan?.foodDiscountPercent}%, scans: ${allAccessPlan?.aiScanAllowance})`);

  // Verify legacy plans are flagged
  const legacyPlans = await prisma.subscriptionPlan.findMany({ where: { planType: "LEGACY" } });
  assert(legacyPlans.length >= 2, `Legacy plans correctly archived & flagged for review (${legacyPlans.length} plans)`);
  assert(legacyPlans.every(p => p.flaggedForReview === true), "All legacy plans have flaggedForReview: true");

  // 2. SETUP TEST USERS
  console.log("\n2. Setting up isolated test users...");
  const timestamp = Date.now();
  const testUsers = {
    free: await prisma.user.upsert({
      where: { email: `test_free_${timestamp}@nutriflexs.test` },
      update: {},
      create: {
        email: `test_free_${timestamp}@nutriflexs.test`,
        name: "Test Free User",
        role: "CUSTOMER",
      },
    }),
    foodUser: await prisma.user.upsert({
      where: { email: `test_food_${timestamp}@nutriflexs.test` },
      update: {},
      create: {
        email: `test_food_${timestamp}@nutriflexs.test`,
        name: "Test Food Pass User",
        role: "CUSTOMER",
      },
    }),
    nutritionUser: await prisma.user.upsert({
      where: { email: `test_nutri_${timestamp}@nutriflexs.test` },
      update: {},
      create: {
        email: `test_nutri_${timestamp}@nutriflexs.test`,
        name: "Test Nutrition Pass User",
        role: "CUSTOMER",
      },
    }),
    allAccessUser: await prisma.user.upsert({
      where: { email: `test_all_${timestamp}@nutriflexs.test` },
      update: {},
      create: {
        email: `test_all_${timestamp}@nutriflexs.test`,
        name: "Test All Access User",
        role: "CUSTOMER",
      },
    }),
  };

  // Assign Active Subscriptions
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const subFood = await prisma.subscription.create({
    data: {
      userId: testUsers.foodUser.id,
      planId: foodPlan.id,
      startDate,
      endDate,
      status: "ACTIVE",
      aiScansUsed: 0,
    },
  });

  const subNutrition = await prisma.subscription.create({
    data: {
      userId: testUsers.nutritionUser.id,
      planId: nutritionPlan.id,
      startDate,
      endDate,
      status: "ACTIVE",
      aiScansUsed: 0,
    },
  });

  const subAllAccess = await prisma.subscription.create({
    data: {
      userId: testUsers.allAccessUser.id,
      planId: allAccessPlan.id,
      startDate,
      endDate,
      status: "ACTIVE",
      aiScansUsed: 0,
    },
  });

  // 3. TEST ENTITLEMENT LOGIC VIA SERVICES DIRECTLY
  console.log("\n3. Testing Server-Side Entitlement Resolution...");
  const {
    getUserEntitlements,
    assertCanScanMeal,
    recordAiScanUsage,
    calculateFoodOrderPassDiscount,
  } = require("../services/subscription-entitlement.service");

  // Free User Entitlements
  const freeEntitlements = await getUserEntitlements(testUsers.free.id);
  assert(freeEntitlements.hasActiveSubscription === false, "Free user has no active subscription");
  assert(freeEntitlements.canAccessFoodDiscount === false, "Free user has NO food order discount");
  assert(freeEntitlements.canAccessAiScan === false, "Free user has NO AI scan access");

  let freeScanBlocked = false;
  try {
    await assertCanScanMeal(testUsers.free.id);
  } catch (err) {
    freeScanBlocked = true;
    assert(err.statusCode === 403, `Free user AI scan correctly blocked with HTTP 403 (${err.code})`);
  }
  assert(freeScanBlocked, "Free user cannot scan meals");

  // Food Pass User Entitlements
  const foodEntitlements = await getUserEntitlements(testUsers.foodUser.id);
  assert(foodEntitlements.planType === "FOOD_PASS", "Food user has FOOD_PASS");
  assert(foodEntitlements.canAccessFoodDiscount === true, "Food user has food discount enabled");
  assert(foodEntitlements.foodDiscountPercent === 15, "Food user has 15% discount configured");
  assert(foodEntitlements.canAccessAiScan === false, "Food user has NO AI scan access");

  let foodScanBlocked = false;
  try {
    await assertCanScanMeal(testUsers.foodUser.id);
  } catch (err) {
    foodScanBlocked = true;
    assert(err.statusCode === 403, `Food Pass user AI scan correctly blocked with HTTP 403 (${err.code})`);
  }
  assert(foodScanBlocked, "Food Pass user cannot scan meals (requires Nutrition or All Access)");

  // Food Order Discount Verification
  const foodOrderDiscount = await calculateFoodOrderPassDiscount(testUsers.foodUser.id, 1000);
  assert(foodOrderDiscount.discountAmount === 150, `15% discount applied correctly on ₹1000 order (₹${foodOrderDiscount.discountAmount})`);

  // Nutrition Pass User Entitlements
  const nutritionEntitlements = await getUserEntitlements(testUsers.nutritionUser.id);
  assert(nutritionEntitlements.planType === "NUTRITION_PASS", "Nutrition user has NUTRITION_PASS");
  assert(nutritionEntitlements.canAccessFoodDiscount === false, "Nutrition user has NO food discount");
  assert(nutritionEntitlements.canAccessAiScan === true, "Nutrition user has AI scan access");
  assert(nutritionEntitlements.aiScanAllowance === 60, "Nutrition user has 60 AI scans allowance");
  assert(nutritionEntitlements.aiScansRemaining === 60, "Nutrition user starts with 60 remaining scans");

  // Nutrition Pass AI Scan Assertion & Usage Recording
  const allowedNutri = await assertCanScanMeal(testUsers.nutritionUser.id);
  assert(allowedNutri.canAccessAiScan === true, "assertCanScanMeal allows Nutrition Pass user");

  const usageRecord = await recordAiScanUsage(testUsers.nutritionUser.id, subNutrition.id, {
    foodName: "Paneer Bhurji & Roti",
    confidence: 0.94,
  });
  assert(usageRecord.scansUsed === 1, "Scan counter incremented to 1");
  assert(usageRecord.scansRemaining === 59, "Remaining scans decremented to 59");

  // Verify Usage Record stored in DB
  const dbUsage = await prisma.subscriptionUsageRecord.findUnique({
    where: { id: usageRecord.usageId },
  });
  assert(dbUsage !== null, "SubscriptionUsageRecord successfully persisted in database");
  assert(dbUsage.feature === "AI_MEAL_SCAN", "Usage record feature is AI_MEAL_SCAN");

  // Quota Exhaustion Test
  console.log("\n4. Testing AI Scan Quota Exhaustion...");
  await prisma.subscription.update({
    where: { id: subNutrition.id },
    data: { aiScansUsed: 60 },
  });

  let quotaBlocked = false;
  try {
    await assertCanScanMeal(testUsers.nutritionUser.id);
  } catch (err) {
    quotaBlocked = true;
    assert(err.statusCode === 403, `Quota exhaustion correctly blocked with HTTP 403 (${err.code})`);
  }
  assert(quotaBlocked, "User cannot scan after consuming monthly allowance");

  // Reset scans used
  await prisma.subscription.update({
    where: { id: subNutrition.id },
    data: { aiScansUsed: 1 },
  });

  // All Access User Entitlements
  console.log("\n5. Testing All Access Combined Entitlements...");
  const allEntitlements = await getUserEntitlements(testUsers.allAccessUser.id);
  assert(allEntitlements.planType === "ALL_ACCESS_PASS", "User has ALL_ACCESS_PASS");
  assert(allEntitlements.canAccessFoodDiscount === true, "All Access has food discount enabled");
  assert(allEntitlements.foodDiscountPercent === 20, "All Access has 20% food discount");
  assert(allEntitlements.canAccessAiScan === true, "All Access has AI scan enabled");
  assert(allEntitlements.aiScanAllowance === 100, "All Access has 100 AI scans allowance");
  assert(allEntitlements.canAccessAdvancedInsights === true, "All Access has Advanced Insights enabled");

  const allAccessOrderDiscount = await calculateFoodOrderPassDiscount(testUsers.allAccessUser.id, 1000);
  assert(allAccessOrderDiscount.discountAmount === 200, `20% discount applied on ₹1000 order for All Access (₹${allAccessOrderDiscount.discountAmount})`);

  // 6. TEST UPGRADE PATH: Food Pass -> All Access Pass
  console.log("\n6. Testing Upgrade Flow (Food Pass -> All Access Pass)...");
  const {
    createSubscriptionCheckout,
    verifyAndActivateSubscription,
    cancelUserSubscription,
  } = require("../services/subscription.service");

  const checkoutResult = await createSubscriptionCheckout({
    userId: testUsers.foodUser.id,
    planId: allAccessPlan.id,
    billingPeriod: "MONTHLY",
  });

  assert(checkoutResult.success === true, "Checkout initialized successfully");
  assert(checkoutResult.isUpgrade === true, "Checkout correctly identified as an UPGRADE");
  assert(checkoutResult.upgradeCredit > 0, `Upgrade credit applied: ₹${checkoutResult.upgradeCredit}`);

  const activationResult = await verifyAndActivateSubscription({
    userId: testUsers.foodUser.id,
    razorpayOrderId: checkoutResult.razorpayOrderId,
    razorpayPaymentId: `pay_test_${timestamp}`,
    razorpaySignature: "demo_sig_valid",
  });

  assert(activationResult.success === true, "Upgrade subscription verified and activated");
  assert(activationResult.subscription.planId === allAccessPlan.id, "New active plan is ALL_ACCESS_PASS");

  // Check previous subscription status
  const previousSub = await prisma.subscription.findUnique({
    where: { id: subFood.id },
  });
  assert(previousSub.status === "UPGRADED", `Previous subscription transitioned to UPGRADED (was: ${previousSub.status})`);
  assert(previousSub.upgradedToId === activationResult.subscription.id, "Previous subscription references new subscription ID");

  // Audit log check
  const upgradeAudit = await prisma.subscriptionAuditLog.findFirst({
    where: { targetId: activationResult.subscription.id },
    orderBy: { createdAt: "desc" },
  });
  assert(upgradeAudit !== null, "Audit log created for subscription upgrade");
  assert(upgradeAudit.action === "SUBSCRIPTION_UPGRADED", "Audit log action is SUBSCRIPTION_UPGRADED");

  // 7. TEST CANCELLATION
  console.log("\n7. Testing Subscription Cancellation...");
  const cancelResult = await cancelUserSubscription(testUsers.foodUser.id, "Testing cancel flow");
  assert(cancelResult.success === true, "Subscription cancelled successfully");
  assert(cancelResult.subscription.status === "CANCELLED", "Subscription status is CANCELLED");
  assert(cancelResult.subscription.autoRenew === false, "Auto-renew set to false");

  // 8. TEST API ENDPOINTS VIA HTTP
  console.log("\n8. Testing Public & Customer HTTP API Endpoints...");
  const publicRes = await fetch("http://localhost:3000/api/subscriptions");
  assert(publicRes.status === 200, "GET /api/subscriptions returned HTTP 200");
  const publicData = await publicRes.json();
  assert(publicData.success === true, "API returned success: true");
  assert(publicData.plans.length === 3, `API returned exactly 3 official passes (got: ${publicData.plans.length})`);
  assert(publicData.plans[0].planType === "FOOD_PASS", "First plan is FOOD_PASS");
  assert(publicData.plans[1].planType === "NUTRITION_PASS", "Second plan is NUTRITION_PASS");
  assert(publicData.plans[2].planType === "ALL_ACCESS_PASS", "Third plan is ALL_ACCESS_PASS");

  // 9. BROWSER CDP SCREENSHOT TESTS
  console.log("\n9. Capturing Browser Visual Proof via Chrome CDP...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9298",
    "--user-data-dir=/tmp/chrome-test-three-passes",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let cdpRes = null;
  for (let i = 0; i < 15; i++) {
    await wait(800);
    try {
      cdpRes = await fetch("http://127.0.0.1:9298/json");
      if (cdpRes.ok) break;
    } catch {}
  }
  if (!cdpRes || !cdpRes.ok) throw new Error("Could not connect to Chrome CDP on port 9298");

  try {
    const tabs = await cdpRes.json();
    const pageTab = tabs.find((t) => t.type === "page");
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    let msgId = 1;
    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener("message", handler);
            resolve(data.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await new Promise((resolve) => ws.addEventListener("open", resolve));
    await send("Page.enable");
    await send("DOM.enable");

    // Desktop Pass Comparison (1280px)
    console.log("   Capturing Desktop Pass Page (1280px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/pass" });
    await wait(2500);
    const snapDesktop = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "three_passes_comparison_desktop.png"),
      Buffer.from(snapDesktop.data, "base64")
    );
    console.log("   📸 Saved artifact: three_passes_comparison_desktop.png");

    // Mobile Pass Comparison (390px)
    console.log("   Capturing Mobile Pass Page (390px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send("Page.navigate", { url: "http://localhost:3000/pass" });
    await wait(2000);
    const snapMobile = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "three_passes_comparison_mobile.png"),
      Buffer.from(snapMobile.data, "base64")
    );
    console.log("   📸 Saved artifact: three_passes_comparison_mobile.png");

    // Landing Page with 3 Passes Section (1280px)
    console.log("   Capturing Landing Page Pass Section (1280px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000" });
    await wait(2500);
    const snapLanding = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "landing_three_passes_desktop.png"),
      Buffer.from(snapLanding.data, "base64")
    );
    console.log("   📸 Saved artifact: landing_three_passes_desktop.png");

    ws.close();
    chrome.kill("SIGTERM");
  } catch (err) {
    chrome.kill("SIGTERM");
    throw err;
  }

  console.log("\n================================================================================");
  console.log("🎉 ALL THREE-PASS SUBSCRIPTION ARCHITECTURE TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================================");
}

runTests()
  .catch((err) => {
    console.error("Test Suite Failure:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
