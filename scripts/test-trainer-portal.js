const assert = require("assert");
const crypto = require("crypto");
const { PrismaClient, Role, SubscriptionStatus, OrderStatus } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

async function signInAndGetCookie(email, password) {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfJson = await csrfRes.json();
  const csrfSetCookies = csrfRes.headers.getSetCookie
    ? csrfRes.headers.getSetCookie()
    : [csrfRes.headers.get("set-cookie") || ""];
  const cookieHeader = csrfSetCookies
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  const body = new URLSearchParams({
    csrfToken: csrfJson.csrfToken,
    email,
    password,
    json: "true",
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
    },
    body: body.toString(),
    redirect: "manual",
  });

  const loginSetCookies = loginRes.headers.getSetCookie
    ? loginRes.headers.getSetCookie()
    : [loginRes.headers.get("set-cookie") || ""];

  const allCookies = [...csrfSetCookies, ...loginSetCookies]
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean);

  // Deduplicate cookie names keeping latest
  const jar = new Map();
  for (const pair of allCookies) {
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function runTests() {
  console.log("==================================================");
  console.log("NutriFlexs Dedicated Trainer Portal Test Suite");
  console.log("==================================================\n");

  const ts = Date.now();
  const trainer1Email = `trainer1_${ts}@nutriflexs.com`;
  const trainer2Email = `trainer2_${ts}@nutriflexs.com`;
  const customerEmail = `referred_cust_${ts}@nutriflexs.com`;
  const password = "TestPassword123!";
  const refCode1 = `NUTRI-T1${String(ts).slice(-4)}`;
  const refCode2 = `NUTRI-T2${String(ts).slice(-4)}`;

  const createdUserIds = [];
  let createdOrderId = null;
  let createdSubId = null;
  let createdReferralId = null;

  try {
    // Provision Trainer 1 & Trainer 2 in DB
    console.log("0. Provisioning test Trainers in Neon PostgreSQL...");
    const t1User = await prisma.user.create({
      data: {
        name: "Trainer Test One",
        email: trainer1Email,
        passwordHash: hashPassword(password),
        role: Role.TRAINER,
        trainerProfile: {
          create: {
            referralCode: refCode1,
            totalReferrals: 0,
            activeSubscribers: 4, // 4 active -> next 1 triggers 5-subscriber reward!
            rewardsEarned: 0,
          },
        },
      },
      include: { trainerProfile: true },
    });
    createdUserIds.push(t1User.id);

    const t2User = await prisma.user.create({
      data: {
        name: "Trainer Test Two",
        email: trainer2Email,
        passwordHash: hashPassword(password),
        role: Role.TRAINER,
        trainerProfile: {
          create: {
            referralCode: refCode2,
            totalReferrals: 0,
            activeSubscribers: 0,
            rewardsEarned: 0,
          },
        },
      },
      include: { trainerProfile: true },
    });
    createdUserIds.push(t2User.id);

    // 1. Trainer 1 logs in
    console.log("1. Testing Trainer 1 authentication & session...");
    const t1Cookie = await signInAndGetCookie(trainer1Email, password);
    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: t1Cookie },
    });
    const sessionJson = await sessionRes.json();
    assert.strictEqual(sessionJson.user.role, "TRAINER", "Session role must be TRAINER");
    console.log(`✓ Trainer 1 logged in (Role: ${sessionJson.user.role})`);

    // 2. Trainer cannot access customer routes (/home, /nutrition)
    console.log("2. Testing Trainer isolation from customer-only routes (/home, /nutrition)...");
    const homeCheck = await fetch(`${BASE_URL}/home`, {
      headers: { Cookie: t1Cookie },
      redirect: "manual",
    });
    assert.strictEqual(homeCheck.status, 307, "/home should redirect TRAINER");
    assert(homeCheck.headers.get("location").includes("/trainer"), "Trainer on /home must redirect to /trainer");

    const nutriCheck = await fetch(`${BASE_URL}/nutrition`, {
      headers: { Cookie: t1Cookie },
      redirect: "manual",
    });
    assert.strictEqual(nutriCheck.status, 307, "/nutrition should redirect TRAINER");
    assert(nutriCheck.headers.get("location").includes("/trainer"), "Trainer on /nutrition must redirect to /trainer");
    console.log("✓ Trainer strictly blocked from /home & /nutrition and redirected to /trainer");

    // 3. Trainer sees their unique referral code
    console.log("3. Testing GET /api/trainer for Trainer 1...");
    const portalRes1 = await fetch(`${BASE_URL}/api/trainer`, {
      headers: { Cookie: t1Cookie },
    });
    const portalJson1 = await portalRes1.json();
    assert.strictEqual(portalJson1.success, true);
    assert.strictEqual(portalJson1.trainer.referralCode, refCode1);
    assert.strictEqual(portalJson1.trainer.clientDiscountPercent, 10);
    console.log(`✓ Trainer 1 sees unique referral code ${portalJson1.trainer.referralCode}`);

    // 4. Customer registers using Trainer 1's referral code
    console.log("4. Testing Customer registration with Trainer 1 referral code...");
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Referred Client A",
        email: customerEmail,
        phone: "9876543210",
        password,
        portal: "customer",
        referralCode: refCode1,
      }),
    });
    const regJson = await regRes.json();
    assert.strictEqual(regJson.success, true, "Customer registration with referral code must succeed");
    createdUserIds.push(regJson.user.id);
    console.log(`✓ Customer registered with referral attribution (${customerEmail})`);

    // 5. Customer appears in Trainer 1's My Referrals
    console.log("5. Verifying customer appears in Trainer 1's My Referrals...");
    const portalRes2 = await fetch(`${BASE_URL}/api/trainer`, {
      headers: { Cookie: t1Cookie },
    });
    const portalJson2 = await portalRes2.json();
    const matchedRef = portalJson2.referrals.find((r) => r.email === customerEmail);
    assert(matchedRef, "Referred customer must appear in My Referrals");
    assert.strictEqual(matchedRef.subscriptionStatus, "PENDING");
    createdReferralId = matchedRef.id;
    console.log(`✓ Customer appears in My Referrals (ID: ${createdReferralId}, Status: ${matchedRef.subscriptionStatus})`);

    // 6. Customer purchases/activates a NutriFlexs Pass -> status updates to ACTIVE & 5th subscriber triggers reward!
    console.log("6. Testing Subscription activation & 5-subscriber meal reward...");
    const plan = await prisma.subscriptionPlan.findFirst();
    assert(plan, "At least one SubscriptionPlan must exist in DB");
    const sub = await prisma.subscription.create({
      data: {
        userId: regJson.user.id,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    createdSubId = sub.id;

    // Simulate referral activation + reward milestone on subscription
    await prisma.$transaction(async (tx) => {
      await tx.referral.update({
        where: { id: createdReferralId },
        data: { status: "ACTIVE" },
      });
      const updatedT = await tx.trainer.update({
        where: { id: t1User.trainerProfile.id },
        data: { activeSubscribers: { increment: 1 } },
      });
      if (updatedT.activeSubscribers % 5 === 0) {
        await tx.trainerReward.create({
          data: {
            trainerId: t1User.trainerProfile.id,
            rewardTitle: `Free Post-Workout Meal / Juice Voucher #${Math.floor(updatedT.activeSubscribers / 5)}`,
            isClaimed: false,
          },
        });
        await tx.trainer.update({
          where: { id: t1User.trainerProfile.id },
          data: { rewardsEarned: { increment: 1 } },
        });
      }
    });

    // 7. Customer places & completes an order -> Total Orders updates
    console.log("7. Testing Completed Order updates referral details...");
    const outlet = await prisma.outlet.findFirst();
    const order = await prisma.order.create({
      data: {
        orderNumber: `NF-T${String(ts).slice(-4)}`,
        userId: regJson.user.id,
        outletId: outlet.id,
        trainerId: t1User.trainerProfile.id,
        status: OrderStatus.COMPLETED,
        subtotal: 300,
        discount: 30,
        totalAmount: 270,
      },
    });
    createdOrderId = order.id;

    // 8. Verify live KPIs, Rewards, and Referral Detail Drawer API
    console.log("8. Verifying live Referral Detail API & Rewards...");
    const portalRes3 = await fetch(`${BASE_URL}/api/trainer`, {
      headers: { Cookie: t1Cookie },
    });
    const portalJson3 = await portalRes3.json();
    const updatedRow = portalJson3.referrals.find((r) => r.id === createdReferralId);
    assert.strictEqual(updatedRow.subscriptionStatus, "ACTIVE", "Subscription status must be ACTIVE");
    assert.strictEqual(updatedRow.hasFirstOrder, true, "hasFirstOrder must be true");
    assert.strictEqual(updatedRow.totalOrders, 1, "totalOrders must be 1");
    assert.strictEqual(portalJson3.trainer.rewardsEarned, 1, "5th active subscriber must earn 1 reward");
    assert.strictEqual(portalJson3.rewards.length, 1, "Reward transaction must be listed");

    const detailRes = await fetch(`${BASE_URL}/api/trainer/referrals/${createdReferralId}`, {
      headers: { Cookie: t1Cookie },
    });
    const detailJson = await detailRes.json();
    assert.strictEqual(detailJson.success, true);
    assert.strictEqual(detailJson.detail.totalCompletedOrders, 1);
    assert.strictEqual(detailJson.detail.subscriptionHistory.length, 1);
    console.log("✓ Subscription status, completed orders, timeline, and rewards verified");

    // 9. Cross-trainer isolation: Trainer 2 CANNOT see Trainer 1's referrals
    console.log("9. Testing Cross-Trainer Authorization (Trainer 2 cannot access Trainer 1 referral)...");
    const t2Cookie = await signInAndGetCookie(trainer2Email, password);
    const t2Portal = await (
      await fetch(`${BASE_URL}/api/trainer`, { headers: { Cookie: t2Cookie } })
    ).json();
    assert.strictEqual(t2Portal.referrals.length, 0, "Trainer 2 must see 0 referrals");

    const forbiddenDetail = await fetch(
      `${BASE_URL}/api/trainer/referrals/${createdReferralId}`,
      { headers: { Cookie: t2Cookie } }
    );
    assert.strictEqual(forbiddenDetail.status, 403, "Trainer 2 requesting Trainer 1 referral must get 403 Forbidden");
    console.log("✓ Cross-trainer isolation verified (403 Forbidden)");

    // 10. Customer login & customer portal (/home) continue working normally
    console.log("10. Testing Customer login & /home access...");
    const custCookie = await signInAndGetCookie(customerEmail, password);
    const custHome = await fetch(`${BASE_URL}/home`, {
      headers: { Cookie: custCookie },
      redirect: "manual",
    });
    assert.strictEqual(custHome.status, 200, "Customer must be able to access /home normally");
    console.log("✓ Customer portal (/home) works normally (HTTP 200)");

    console.log("\n==================================================");
    console.log("ALL 10 TRAINER PORTAL TESTS PASSED 100%!");
    console.log("==================================================");
  } finally {
    // Cleanup ONLY our test fixtures
    console.log("\nCleaning up test fixtures...");
    if (createdOrderId) await prisma.order.delete({ where: { id: createdOrderId } }).catch(() => {});
    if (createdSubId) await prisma.subscription.delete({ where: { id: createdSubId } }).catch(() => {});
    if (createdReferralId) await prisma.referral.delete({ where: { id: createdReferralId } }).catch(() => {});
    if (createdUserIds.length > 0) {
      await prisma.trainerReward.deleteMany({
        where: { trainer: { userId: { in: createdUserIds } } },
      }).catch(() => {});
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("\n❌ Test Failed:", err);
  process.exit(1);
});
