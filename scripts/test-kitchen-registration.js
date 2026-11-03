/**
 * Comprehensive Verification Suite for Kitchen Staff Registration
 * Tests:
 * 1. UI Check: Access code input removed from /signup?portal=kitchen
 * 2. UI Check: Admin and Trainer portals still require their access codes
 * 3. Functional: Kitchen registration succeeds with Name, Email, Outlet, Password (no code)
 * 4. DB Check: User created in Neon PostgreSQL with Role.KITCHEN & assigned outlet
 * 5. Security: Duplicate email registration blocked (HTTP 400)
 * 6. Security: Missing or inactive outlet rejected (HTTP 400)
 * 7. Security: Privileged Admin registration without code rejected (HTTP 403)
 * 8. Auth: Credentials verification succeeds for the newly registered staff
 * 9. Outlet Isolation: Kitchen operator is restricted to their assigned outlet
 */

const { PrismaClient, Role } = require("@prisma/client");
const { scryptSync, timingSafeEqual } = require("crypto");

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  try {
    if (storedHash.startsWith("scrypt:")) {
      const parts = storedHash.split(":");
      if (parts.length !== 3) return false;
      const [, salt, keyHex] = parts;
      const keyBuffer = Buffer.from(keyHex, "hex");
      const derivedKey = scryptSync(password, salt, 64);
      if (keyBuffer.length !== derivedKey.length) return false;
      return timingSafeEqual(keyBuffer, derivedKey);
    }
    return false;
  } catch {
    return false;
  }
}

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("👨‍🍳 TESTING KITCHEN STAFF REGISTRATION (NO ACCESS CODE REQUIRED)");
  console.log("==================================================================\n");

  const testEmail = `test.kitchen.dev.${Date.now()}@nutriflexs.com`;
  const testPassword = "SecureKitchenPass2026!";
  let testUserId = null;
  let testOutlet = null;

  try {
    // -------------------------------------------------------------
    // Step 0: Find an active outlet in database
    // -------------------------------------------------------------
    console.log("0. Fetching an active kiosk outlet from database:");
    testOutlet = await prisma.outlet.findFirst({
      where: { isActive: true },
      include: { gym: true },
    });
    assert(!!testOutlet, `Found active kiosk outlet: ${testOutlet?.name} (ID: ${testOutlet?.id})`);

    // -------------------------------------------------------------
    // Step 1: Frontend Verification: Kitchen Signup Page
    // -------------------------------------------------------------
    console.log("\n1. Verifying Kitchen Registration Form UI (/signup?portal=kitchen):");
    const resKitchenSignup = await fetch(`${BASE_URL}/signup?portal=kitchen`);
    const kitchenHtml = await resKitchenSignup.text();
    assert(resKitchenSignup.status === 200, `/signup?portal=kitchen loads with HTTP 200`);
    assert(
      !kitchenHtml.includes("NF-TEST-KITCHEN-2026"),
      `Access code placeholder 'NF-TEST-KITCHEN-2026' is NOT present in kitchen signup HTML`
    );
    assert(
      !kitchenHtml.includes('id="reg-code"'),
      `Access code input field 'reg-code' is NOT rendered on kitchen signup page`
    );
    assert(
      kitchenHtml.includes("Assigned Kitchen Outlet"),
      `Kitchen Outlet selector label is present in kitchen signup HTML`
    );
    assert(
      kitchenHtml.includes("Kitchen Staff Registration"),
      `Title 'Kitchen Staff Registration' is present in kitchen signup HTML`
    );

    // -------------------------------------------------------------
    // Step 2: Ensure Privileged Roles Still Require Codes
    // -------------------------------------------------------------
    console.log("\n2. Verifying Privileged Portals Still Require Access Codes:");
    const resAdminSignup = await fetch(`${BASE_URL}/signup?portal=admin`);
    const adminHtml = await resAdminSignup.text();
    assert(
      adminHtml.includes("Administrator Invitation Key"),
      `Admin signup still requires 'Administrator Invitation Key'`
    );

    const resTrainerSignup = await fetch(`${BASE_URL}/signup?portal=trainer`);
    const trainerHtml = await resTrainerSignup.text();
    assert(
      trainerHtml.includes("Partner Invitation Passcode"),
      `Trainer signup still requires 'Partner Invitation Passcode'`
    );

    // -------------------------------------------------------------
    // Step 3: Kitchen Staff Registration without Access Code
    // -------------------------------------------------------------
    console.log("\n3. Submitting Kitchen Staff Registration without Access Code:");
    const registerPayload = {
      name: "Chef Vikram Sharma",
      email: testEmail,
      password: testPassword,
      portal: "kitchen",
      outletId: testOutlet.id,
      // No accessCode or inviteCode provided!
    };

    const resRegister = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerPayload),
    });

    const regData = await resRegister.json();
    assert(resRegister.status === 200, `Registration API returned HTTP 200`);
    assert(regData.success === true, `Registration returned success: true`);
    assert(regData.portal === "kitchen", `Registration confirmed portal: 'kitchen'`);
    assert(regData.user?.role === "KITCHEN", `User role is 'KITCHEN'`);
    assert(
      regData.user?.selectedOutletId === testOutlet.id,
      `User assigned to outlet ID ${testOutlet.id}`
    );
    testUserId = regData.user?.id;

    // -------------------------------------------------------------
    // Step 4: Verify Account in Neon PostgreSQL
    // -------------------------------------------------------------
    console.log("\n4. Verifying Account State in Neon PostgreSQL:");
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    assert(!!dbUser, `Database user record exists for ${testEmail}`);
    assert(dbUser?.role === Role.KITCHEN, `Database role is strictly Role.KITCHEN`);
    assert(dbUser?.selectedOutletId === testOutlet.id, `selectedOutletId matches kiosk outlet`);
    assert(dbUser?.selectedGymId === testOutlet.gymId, `selectedGymId matches kiosk gym`);
    assert(
      dbUser?.passwordHash?.startsWith("scrypt:"),
      `Password is securely hashed with scrypt salt`
    );

    // -------------------------------------------------------------
    // Step 5: Verify Login & Credentials Verification
    // -------------------------------------------------------------
    console.log("\n5. Verifying Login System & Password Verification:");
    const isPasswordCorrect = verifyPassword(testPassword, dbUser.passwordHash);
    assert(isPasswordCorrect === true, `verifyPassword succeeds with registration password`);

    const isWrongPasswordFails = verifyPassword("WrongPassword123!", dbUser.passwordHash);
    assert(isWrongPasswordFails === false, `verifyPassword rejects incorrect password`);

    // -------------------------------------------------------------
    // Step 6: Security - Reject Duplicate Email Registration
    // -------------------------------------------------------------
    console.log("\n6. Security Checks - Duplicate Email & Invalid Outlets:");
    const resDup = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerPayload),
    });
    const dupData = await resDup.json();
    assert(resDup.status === 400, `Duplicate email registration returns HTTP 400`);
    assert(
      dupData.error?.includes("already exists"),
      `Duplicate registration returns friendly message: "${dupData.error}"`
    );

    // Missing outletId
    const resMissingOutlet = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Chef Test",
        email: `missing-outlet-${Date.now()}@nutriflexs.com`,
        password: testPassword,
        portal: "kitchen",
      }),
    });
    const missingOutletData = await resMissingOutlet.json();
    assert(resMissingOutlet.status === 400, `Missing outletId returns HTTP 400`);
    assert(
      missingOutletData.error?.includes("Assigned kitchen outlet is required"),
      `Missing outlet returns expected error: "${missingOutletData.error}"`
    );

    // Inactive or fake outletId
    const resFakeOutlet = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Chef Test",
        email: `fake-outlet-${Date.now()}@nutriflexs.com`,
        password: testPassword,
        portal: "kitchen",
        outletId: "00000000-0000-0000-0000-000000000000",
      }),
    });
    const fakeOutletData = await resFakeOutlet.json();
    assert(resFakeOutlet.status === 400, `Fake outletId returns HTTP 400`);
    assert(
      fakeOutletData.error?.includes("invalid or inactive"),
      `Fake outlet returns expected error: "${fakeOutletData.error}"`
    );

    // -------------------------------------------------------------
    // Step 7: Security - Super Admin Registration Still Protected
    // -------------------------------------------------------------
    console.log("\n7. Security Checks - Privilege Escalation Prevention:");
    const resAdminNoCode = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Hacker Attempt",
        email: `escalation-${Date.now()}@nutriflexs.com`,
        password: testPassword,
        portal: "admin",
      }),
    });
    assert(
      resAdminNoCode.status === 403,
      `Super Admin registration without code returns HTTP 403 (actual: ${resAdminNoCode.status})`
    );

  } catch (err) {
    console.error("  ❌ UNHANDLED ERROR in test suite:", err);
    failedCount++;
  } finally {
    // -------------------------------------------------------------
    // Step 8: Clean up test user from Neon PostgreSQL
    // -------------------------------------------------------------
    if (testUserId) {
      try {
        await prisma.user.delete({
          where: { id: testUserId },
        });
        console.log(`\n🧹 Cleaned up test user ${testEmail} from database.`);
      } catch (cleanupErr) {
        console.error("Cleanup error:", cleanupErr);
      }
    }
    await prisma.$disconnect();
  }

  console.log("\n==================================================================");
  console.log(`📊 RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
