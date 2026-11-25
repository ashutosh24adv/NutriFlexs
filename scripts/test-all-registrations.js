const assert = require("assert");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("==================================================");
  console.log("Testing Customer, Trainer & Dietitian Registration");
  console.log("==================================================\n");

  const ts = Date.now();
  const custEmail = `reg_cust_${ts}@nutriflexs.com`;
  const trainerEmail = `reg_trainer_${ts}@nutriflexs.com`;
  const dietitianEmail = `reg_diet_${ts}@nutriflexs.com`;
  const password = "TestPassword123!";
  const createdIds = [];

  try {
    // 1. Customer Registration
    console.log("1. Testing Customer registration...");
    const custRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Customer",
        email: custEmail,
        password,
        portal: "customer",
      }),
    });
    const custJson = await custRes.json();
    assert.strictEqual(custRes.status, 200, `Customer register failed: ${JSON.stringify(custJson)}`);
    assert.strictEqual(custJson.success, true);
    assert.strictEqual(custJson.user.role, "CUSTOMER");
    createdIds.push(custJson.user.id);
    console.log("✓ Customer registration passed");

    // 2. Trainer Registration
    console.log("2. Testing Trainer registration...");
    const trainerRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Trainer",
        email: trainerEmail,
        password,
        portal: "trainer",
      }),
    });
    const trainerJson = await trainerRes.json();
    assert.strictEqual(trainerRes.status, 200, `Trainer register failed: ${JSON.stringify(trainerJson)}`);
    assert.strictEqual(trainerJson.success, true);
    assert.strictEqual(trainerJson.user.role, "TRAINER");
    assert(trainerJson.referralCode, "Trainer must receive generated referralCode");
    createdIds.push(trainerJson.user.id);
    console.log(`✓ Trainer registration passed (Code: ${trainerJson.referralCode})`);

    // 3. Dietitian Registration
    console.log("3. Testing Dietitian registration...");
    const dietRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Dietitian",
        email: dietitianEmail,
        password,
        portal: "dietitian",
      }),
    });
    const dietJson = await dietRes.json();
    assert.strictEqual(dietRes.status, 200, `Dietitian register failed: ${JSON.stringify(dietJson)}`);
    assert.strictEqual(dietJson.success, true);
    assert.strictEqual(dietJson.user.role, "DIETITIAN");
    createdIds.push(dietJson.user.id);

    const profile = await prisma.dietitianProfile.findUnique({
      where: { userId: dietJson.user.id },
    });
    assert(profile, "DietitianProfile must be created in PostgreSQL");
    assert.strictEqual(profile.verificationStatus, "PENDING");
    console.log("✓ Dietitian registration + DietitianProfile creation passed");

    console.log("\nALL 3 REGISTRATION FLOWS PASSED 100%!");
  } finally {
    if (createdIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("❌ Registration test failed:", err);
  process.exit(1);
});
