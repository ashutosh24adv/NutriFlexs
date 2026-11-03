const { PrismaClient, Role } = require("@prisma/client");
const prisma = new PrismaClient();

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("NutriFlexs Super Admin Registration & Invitation Security Test Suite");
  console.log("==================================================================");

  const timestamp = Date.now();
  const testAdminEmail = `invited.admin.${timestamp}@nutriflexs.com`;
  const duplicateAdminEmail = `duplicate.admin.${timestamp}@nutriflexs.com`;
  const testPassword = "AdminSecure@2026!";

  try {
    // -------------------------------------------------------------------------
    // TEST 1: UI Form Check Without Invitation Token
    // -------------------------------------------------------------------------
    console.log("\n1. Verifying /signup?portal=admin UI without token:");
    const resNoToken = await fetch(`${BASE_URL}/signup?portal=admin&callbackUrl=%2Fadmin&staff=true`);
    assert(resNoToken.status === 200, "Loads with HTTP 200");
    const htmlNoToken = await resNoToken.text();

    assert(
      !htmlNoToken.includes("Administrator Invitation Key"),
      "Visible label 'Administrator Invitation Key' is NOT present in UI"
    );
    assert(
      !htmlNoToken.includes('id="reg-code"'),
      "Key input field 'reg-code' is NOT rendered in UI"
    );
    assert(
      !htmlNoToken.includes("Confidential master administrative invite key"),
      "Key helper text is NOT present in UI"
    );
    assert(
      !htmlNoToken.includes("Unrestricted public self-registration is strictly prohibited"),
      "Old key warning helper text is NOT present in UI"
    );
    assert(
      htmlNoToken.includes('id="reg-name"'),
      "Full Name input 'reg-name' is present"
    );
    assert(
      htmlNoToken.includes('id="reg-email"'),
      "Email input 'reg-email' is present"
    );
    assert(
      htmlNoToken.includes('id="reg-password"'),
      "Password input 'reg-password' is present"
    );
    assert(
      htmlNoToken.includes("REGISTER SUPER ADMIN"),
      "'REGISTER SUPER ADMIN' button is present"
    );
    assert(
      htmlNoToken.includes("Authorized Invitation Required"),
      "UI displays 'Authorized Invitation Required' warning badge when no token linked"
    );

    // -------------------------------------------------------------------------
    // TEST 2: UI Form Check With Invitation Token Linked
    // -------------------------------------------------------------------------
    console.log("\n2. Verifying /signup?portal=admin UI with token in URL:");
    const resWithToken = await fetch(
      `${BASE_URL}/signup?portal=admin&token=NF-TEST-ADMIN-2026&callbackUrl=%2Fadmin&staff=true`
    );
    assert(resWithToken.status === 200, "Loads with HTTP 200");
    const htmlWithToken = await resWithToken.text();

    assert(
      !htmlWithToken.includes("Administrator Invitation Key"),
      "Key label remains completely absent when token is provided in URL"
    );
    assert(
      !htmlWithToken.includes('id="reg-code"'),
      "Key input field remains completely absent when token is provided in URL"
    );
    assert(
      htmlWithToken.includes("Invitation Token Linked"),
      "UI displays 'Invitation Token Linked' green confirmation badge when token is present"
    );

    // -------------------------------------------------------------------------
    // TEST 3: Security Check — Reject Registration Without Token
    // -------------------------------------------------------------------------
    console.log("\n3. Testing Super Admin self-registration rejection without invitation token:");
    const unauthRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Unauthorized Hacker",
        email: `hacker.${timestamp}@nutriflexs.com`,
        password: testPassword,
        portal: "admin",
      }),
    });
    const unauthData = await unauthRes.json();
    assert(unauthRes.status === 403, "Registration without invitation token returns HTTP 403 Forbidden");
    assert(unauthData.success === false, "Response returns success: false");
    assert(
      unauthData.error?.includes("Administrator Invitation Key is required"),
      "Error indicates administrative invitation is strictly required"
    );

    // -------------------------------------------------------------------------
    // TEST 4: Security Check — Reject Invalid / Forged Invitation Token
    // -------------------------------------------------------------------------
    console.log("\n4. Testing Super Admin registration with forged / invalid token:");
    const forgedRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Forged Token Admin",
        email: `forged.${timestamp}@nutriflexs.com`,
        password: testPassword,
        portal: "admin",
        inviteCode: "NF-FAKE-TOKEN-9999",
      }),
    });
    const forgedData = await forgedRes.json();
    assert(
      forgedRes.status === 400 || forgedRes.status === 403,
      `Registration with invalid token rejected (Status ${forgedRes.status})`
    );
    assert(forgedData.success === false, "Invalid token response returns success: false");

    // -------------------------------------------------------------------------
    // TEST 5: Authorized Single-Use Invitation Link Registration
    // -------------------------------------------------------------------------
    console.log("\n5. Testing Authorized Single-Use Invitation Link Registration Flow:");
    // Dynamically provision a single-use staff access code for Super Admin in database
    const crypto = require("crypto");
    const secret =
      process.env.STAFF_CODE_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      process.env.AUTH_SECRET ||
      "nutriflexs_staff_access_code_hmac_secret_2026";

    function hashAccessCode(code) {
      return crypto.createHmac("sha256", secret).update(code.trim().toUpperCase()).digest("hex");
    }

    const testPlainCode = `NF-ADMN-TEST-${timestamp.toString().slice(-6)}`;
    const testCodeHash = hashAccessCode(testPlainCode);

    const codeRecord = await prisma.staffAccessCode.create({
      data: {
        codeHash: testCodeHash,
        codePrefix: "NF-ADMN",
        role: Role.ADMIN,
        maxUses: 1, // Single-use!
        usedCount: 0,
        isActive: true,
        description: `Single-use test invitation token for ${testAdminEmail}`,
        isDevSeed: false,
      },
    });
    assert(Boolean(codeRecord?.id), `Single-use Super Admin invitation code created in DB (ID: ${codeRecord?.id})`);

    // Submit registration simulating clicking the invitation link
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Director Rajesh",
        email: testAdminEmail,
        password: testPassword,
        portal: "admin",
        inviteCode: testPlainCode,
      }),
    });

    const regData = await regRes.json();
    assert(regRes.status === 200, "Registration with valid invitation token succeeded with HTTP 200");
    assert(regData.success === true, "Response returns success: true");
    assert(regData.user?.role === "ADMIN", "Registered user assigned Role.ADMIN");
    assert(regData.portal === "admin", "Portal confirmed as 'admin'");

    // Verify user record in database
    const dbUser = await prisma.user.findUnique({
      where: { email: testAdminEmail },
    });
    assert(Boolean(dbUser), "Admin user persisted in Neon PostgreSQL");
    assert(dbUser?.role === Role.ADMIN, "User role in database is Role.ADMIN");

    // Verify code record was atomically consumed (usedCount incremented to 1)
    const updatedCodeRecord = await prisma.staffAccessCode.findUnique({
      where: { id: codeRecord.id },
    });
    assert(updatedCodeRecord?.usedCount === 1, "Invitation code usedCount incremented to 1");

    // -------------------------------------------------------------------------
    // TEST 6: Single-Use Security Check — Replay / Reuse Rejection
    // -------------------------------------------------------------------------
    console.log("\n6. Testing Replay Rejection — Attempting to reuse the consumed single-use invitation token:");
    const replayRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Hacker",
        email: duplicateAdminEmail,
        password: testPassword,
        portal: "admin",
        inviteCode: testPlainCode, // Reusing the exact same token!
      }),
    });
    const replayData = await replayRes.json();
    assert(
      replayRes.status === 400 || replayRes.status === 403,
      `Reusing single-use token strictly rejected with HTTP ${replayRes.status}`
    );
    assert(replayData.success === false, "Token reuse returns success: false");

    // Clean up test staff code & created user
    console.log("\n🧹 Cleaning up test database records...");
    await prisma.user.deleteMany({
      where: { email: { in: [testAdminEmail, duplicateAdminEmail] } },
    });
    await prisma.staffAccessCode.deleteMany({
      where: { id: codeRecord.id },
    });
    console.log("Test records cleaned up successfully.");

  } catch (err) {
    console.error("  ❌ UNHANDLED ERROR in test suite:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log("\n==================================================================");
    console.log(`Summary: ${passed} Passed, ${failed} Failed`);
    console.log("==================================================================");
    if (failed > 0) process.exit(1);
  }
}

runTests();
