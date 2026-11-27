import assert from "node:assert/strict";
import { encode } from "next-auth/jwt";
import { prisma } from "../lib/prisma";
import { AUTH_SECRET, decodeMobileToken } from "../lib/mobile-auth";

const BASE_URL = "http://localhost:3000";

function makeUnsignedJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.unsigned_sig`;
}

async function runSecurityTests() {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const testEmail = `sec_test_${suffix}@nutriflexs.local`;
  let testUserId = "";
  let createdOrderIds: string[] = [];

  try {
    console.log("1. Testing JWT signature bypass rejection (decodeMobileToken)...");
    const forgedToken = makeUnsignedJwt({
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@nutriflexs.com",
      role: "ADMIN",
    });
    const decodedForged = await decodeMobileToken(forgedToken);
    assert.equal(decodedForged, null, "Unsigned/forged JWT must be rejected as null");

    const verifyUnauthRes = await fetch(`${BASE_URL}/api/mobile/orders/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: "nonexistent" }),
    });
    assert.equal(verifyUnauthRes.status, 401, "Unauthenticated /api/mobile/orders/verify must return 401");

    const verifyForgedRes = await fetch(`${BASE_URL}/api/mobile/orders/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${forgedToken}`,
      },
      body: JSON.stringify({ orderId: "nonexistent" }),
    });
    assert.equal(verifyForgedRes.status, 401, "Forged Bearer token must return 401");

    console.log("2. Testing staff registration privilege escalation refusal...");
    const outlet = await prisma.outlet.findFirst({ where: { isActive: true }, select: { id: true } });
    const kitchenEscRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Attacker Kitchen",
        email: `k_esc_${suffix}@nutriflexs.local`,
        password: "Password123!",
        portal: "kitchen",
        outletId: outlet?.id || "missing",
      }),
    });
    assert.equal(kitchenEscRes.status, 403, "Kitchen registration without access code must return 403");

    const trainerEscRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Attacker Trainer",
        email: `t_esc_${suffix}@nutriflexs.local`,
        password: "Password123!",
        portal: "trainer",
      }),
    });
    assert.equal(trainerEscRes.status, 403, "Trainer registration without access code must return 403");

    console.log("3. Testing admin dietary handler-level authorization...");
    const adminDietaryRes = await fetch(`${BASE_URL}/api/admin/products/fake-id/dietary`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVeg: true }),
    });
    assert.ok(
      adminDietaryRes.status === 401 || adminDietaryRes.status === 403,
      `Unauthenticated admin dietary PATCH must return 401/403 (got ${adminDietaryRes.status})`
    );

    console.log("4. Testing mobile login rate limiting (429 after 5 attempts)...");
    const rlEmail = `rl_${suffix}@nutriflexs.local`;
    let got429 = false;
    for (let i = 0; i < 7; i++) {
      const r = await fetch(`${BASE_URL}/api/mobile/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: rlEmail, password: "wrong-password" }),
      });
      if (r.status === 429) {
        got429 = true;
        break;
      }
    }
    assert.equal(got429, true, "Mobile login should return 429 after repeated failed attempts");

    console.log("5. Testing wallet checkout server-side price & concurrent overspend protection...");
    const product = await prisma.product.findFirst({
      where: { isAvailable: true, price: { gte: 100 } },
      select: { id: true, name: true, price: true },
    });
    assert.ok(product, "Expected an available product >= ₹100 for checkout security test");

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Security Test User",
        role: "CUSTOMER",
        passBalance: product.price, // Exact balance for 1 unit, NOT 2, and tampered price: 1 must fail/be ignored
      },
    });
    testUserId = user.id;

    const validToken = await encode({
      token: {
        id: user.id,
        sub: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      secret: AUTH_SECRET,
      maxAge: 3600,
    });

    // Attempt 2 concurrent checkouts with tampered item.price = 1
    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}/api/mobile/orders/wallet-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          items: [{ id: product.id, quantity: 1, price: 1 }],
          totalAmount: 1,
          walletUsed: 1,
        }),
      }),
      fetch(`${BASE_URL}/api/mobile/orders/wallet-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${validToken}`,
        },
        body: JSON.stringify({
          items: [{ id: product.id, quantity: 1, price: 1 }],
          totalAmount: 1,
          walletUsed: 1,
        }),
      }),
    ]);

    const json1 = await res1.json();
    const json2 = await res2.json();
    const successes = [json1, json2].filter((j) => j.success);
    assert.equal(
      successes.length,
      1,
      `Only ONE concurrent wallet checkout should succeed (got ${successes.length}: ${JSON.stringify([json1, json2])})`
    );
    assert.equal(
      successes[0].order.totalAmount,
      product.price,
      "Order total must use authoritative DB Product.price, ignoring tampered price=1"
    );
    if (successes[0]?.order?.id) createdOrderIds.push(successes[0].order.id);

    const updatedUser = await prisma.user.findUniqueOrThrow({
      where: { id: testUserId },
      select: { passBalance: true },
    });
    assert.equal(updatedUser.passBalance, 0, "Wallet balance must be 0 and never negative");

    console.log("✅ ALL PHASE 2 SECURITY HARDENING TESTS PASSED!");
  } finally {
    if (createdOrderIds.length > 0) {
      await prisma.payment.deleteMany({ where: { orderId: { in: createdOrderIds } } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runSecurityTests().catch((err) => {
  console.error("❌ SECURITY TEST FAILED:", err);
  process.exit(1);
});
