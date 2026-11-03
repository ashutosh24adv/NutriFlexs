const { PrismaClient, Role } = require("@prisma/client");
const { scryptSync, timingSafeEqual } = require("crypto");

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const [, salt, keyHex] = parts;
    const expectedKey = Buffer.from(keyHex, "hex");
    const derivedKey = scryptSync(password, salt, expectedKey.length);
    return timingSafeEqual(derivedKey, expectedKey);
  }
  return false;
}

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("==================================================================");
  console.log("🏋️ TESTING NUTRIFLEXS TRAINER PARTNER REGISTRATION & LOGIN WORKFLOW");
  console.log("==================================================================");

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

  const timestamp = Date.now();
  const testEmail1 = `test.trainer.dev.${timestamp}@nutriflexs.com`;
  const testEmail2 = `test.trainer.auto.${timestamp}@nutriflexs.com`;
  const testPassword = "TrainerSecret2026!";

  try {
    // -------------------------------------------------------------
    // TEST 1: FRONTEND UI VERIFICATION (/signup?portal=trainer)
    // -------------------------------------------------------------
    console.log("\n1. Verifying Trainer Registration Form UI (/signup?portal=trainer):");
    const resTrainerSignup = await fetch(`${BASE_URL}/signup?portal=trainer`);
    const trainerHtml = await resTrainerSignup.text();

    assert(resTrainerSignup.status === 200, `/signup?portal=trainer loads with HTTP 200`);
    assert(
      !trainerHtml.includes("Partner Invitation Passcode"),
      "Partner Invitation Passcode label is NOT present in trainer signup HTML"
    );
    assert(
      !trainerHtml.includes("NF-TEST-TRAINER-2026"),
      "Passcode placeholder 'NF-TEST-TRAINER-2026' is NOT present in trainer signup HTML"
    );
    assert(
      !trainerHtml.includes("NutriFlexs gym partner invitation passcode"),
      "Passcode hint text is NOT present in trainer signup HTML"
    );
    assert(
      !trainerHtml.includes('id="reg-code"'),
      "Passcode input field 'reg-code' is NOT rendered on trainer signup page"
    );
    assert(
      trainerHtml.includes('id="reg-name"'),
      "Full Name input field 'reg-name' is present"
    );
    assert(
      trainerHtml.includes('id="reg-email"'),
      "Email Address input field 'reg-email' is present"
    );
    assert(
      trainerHtml.includes('id="reg-phone"'),
      "Phone Number input field 'reg-phone' is present"
    );
    assert(
      trainerHtml.includes('id="reg-ref"'),
      "Custom Referral Code input field 'reg-ref' is present"
    );
    assert(
      trainerHtml.includes('id="reg-password"'),
      "Password input field 'reg-password' is present"
    );
    assert(
      trainerHtml.includes("REGISTER TRAINER PARTNER"),
      "Button 'REGISTER TRAINER PARTNER' is present"
    );

    // -------------------------------------------------------------
    // TEST 2: SUCCESSFUL REGISTRATION WITHOUT INVITATION PASSCODE
    // -------------------------------------------------------------
    console.log("\n2. Registering Trainer Partner without Passcode (Custom Referral):");
    const customCode = `COACH${timestamp.toString().slice(-4)}`;
    const regRes1 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Coach Vikram",
        email: testEmail1,
        phone: "+91 9876543210",
        password: testPassword,
        portal: "trainer",
        referralCode: customCode,
        // Notice: NO inviteCode or accessCode provided
      }),
    });

    const regData1 = await regRes1.json();
    assert(regRes1.status === 200, `Registration API returned HTTP 200`);
    assert(regData1.success === true, `Registration response success is true`);
    assert(regData1.portal === "trainer", `Registration response portal is 'trainer'`);

    // Verify database record in Neon PostgreSQL
    const createdUser1 = await prisma.user.findUnique({
      where: { email: testEmail1 },
      include: { trainerProfile: true },
    });

    assert(Boolean(createdUser1), `User record exists in Neon PostgreSQL`);
    assert(createdUser1?.role === Role.TRAINER, `User role is correctly set to TRAINER`);
    assert(createdUser1?.name === "Coach Vikram", `User name matches input`);
    assert(createdUser1?.phone === "+91 9876543210", `User phone matches input`);
    assert(Boolean(createdUser1?.trainerProfile), `Trainer profile record created in database`);
    assert(
      createdUser1?.trainerProfile?.referralCode?.includes("NUTRI-"),
      `Trainer referral code formatted correctly (${createdUser1?.trainerProfile?.referralCode})`
    );

    // Verify password hash
    const isPasswordValid = verifyPassword(testPassword, createdUser1.passwordHash);
    assert(isPasswordValid === true, `Password hash is valid and verifiable for login`);

    // -------------------------------------------------------------
    // TEST 3: AUTOMATIC REFERRAL CODE GENERATION (BLANK REFERRAL CODE)
    // -------------------------------------------------------------
    console.log("\n3. Registering Trainer Partner with Blank Referral Code (Auto-Gen):");
    const regRes2 = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Coach Priya",
        email: testEmail2,
        phone: "+91 9123456789",
        password: testPassword,
        portal: "trainer",
        // Blank referral code
      }),
    });

    const regData2 = await regRes2.json();
    assert(regRes2.status === 200, `Auto-gen registration returned HTTP 200`);
    assert(regData2.success === true, `Auto-gen registration succeeded`);
    assert(Boolean(regData2.referralCode), `Auto-generated referral code returned: ${regData2.referralCode}`);

    const createdUser2 = await prisma.user.findUnique({
      where: { email: testEmail2 },
      include: { trainerProfile: true },
    });
    assert(
      Boolean(createdUser2?.trainerProfile?.referralCode),
      `Auto-generated referral code saved in database: ${createdUser2?.trainerProfile?.referralCode}`
    );

    // -------------------------------------------------------------
    // TEST 4: PREVENT DUPLICATE EMAIL REGISTRATION
    // -------------------------------------------------------------
    console.log("\n4. Verifying Duplicate Email Prevention:");
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Trainer",
        email: testEmail1,
        password: testPassword,
        portal: "trainer",
      }),
    });

    const dupData = await dupRes.json();
    assert(dupRes.status === 400, `Duplicate email registration returns HTTP 400`);
    assert(
      dupData.error?.includes("already exists"),
      `Returns duplicate email error message: "${dupData.error}"`
    );

    // -------------------------------------------------------------
    // TEST 5: TRAINER LOGIN & SESSION CREATION
    // -------------------------------------------------------------
    console.log("\n5. Logging in with Newly Registered Trainer Account:");
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfRes.json();
    const csrfCookie = csrfRes.headers.get("set-cookie") || "";

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: csrfCookie,
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: testEmail1,
        password: testPassword,
        redirect: "false",
      }),
      redirect: "manual",
    });

    assert(loginRes.status === 302, `Trainer login returned HTTP 302 redirect on successful auth`);
    const sessionCookieHeader = loginRes.headers.get("set-cookie") || "";
    const sessionTokenMatch = sessionCookieHeader.match(/next-auth\.session-token=([^;]+)/);
    assert(Boolean(sessionTokenMatch), `NextAuth session token cookie issued to new trainer`);
    const sessionCookie = sessionTokenMatch ? `next-auth.session-token=${sessionTokenMatch[1]}` : "";

    // -------------------------------------------------------------
    // TEST 6: TRAINER DASHBOARD ACCESS & API FUNCTIONALITY
    // -------------------------------------------------------------
    console.log("\n6. Accessing Trainer Dashboard with Session Cookie:");
    // Test API route
    const trainerApiRes = await fetch(`${BASE_URL}/api/trainer`, {
      headers: { Cookie: sessionCookie },
    });
    const trainerApiData = await trainerApiRes.json();
    assert(trainerApiRes.status === 200, `Trainer API /api/trainer returned HTTP 200`);
    assert(trainerApiData.success === true, `Trainer API returned success: true`);
    assert(trainerApiData.trainer?.name === "Coach Vikram", `Trainer API returned correct profile name`);
    assert(
      trainerApiData.trainer?.referralCode === createdUser1.trainerProfile.referralCode,
      `Trainer API returned matching referral code`
    );

    // Test UI page route
    const trainerPageRes = await fetch(`${BASE_URL}/trainer`, {
      headers: { Cookie: sessionCookie },
      redirect: "manual",
    });
    assert(
      trainerPageRes.status === 200,
      `Trainer dashboard /trainer loads with HTTP 200 (not redirected to /login)`
    );

    // -------------------------------------------------------------
    // TEST 7: SECURITY & ROLE ISOLATION (No Admin/Kitchen Access)
    // -------------------------------------------------------------
    console.log("\n7. Verifying Role Isolation for Trainer Account:");
    // Trainer attempting to access /admin should be redirected
    const adminCheckRes = await fetch(`${BASE_URL}/admin`, {
      headers: { Cookie: sessionCookie },
      redirect: "manual",
    });
    assert(
      adminCheckRes.status === 307 || adminCheckRes.status === 302,
      `Trainer access to /admin redirected (HTTP ${adminCheckRes.status})`
    );
    const adminLocation = adminCheckRes.headers.get("location") || "";
    assert(
      adminLocation.includes("unauthorized_role") || adminLocation.includes("/login"),
      `Trainer redirected away from /admin with unauthorized flag (${adminLocation})`
    );

    // Trainer attempting to access /kitchen should be redirected
    const kitchenCheckRes = await fetch(`${BASE_URL}/kitchen`, {
      headers: { Cookie: sessionCookie },
      redirect: "manual",
    });
    assert(
      kitchenCheckRes.status === 307 || kitchenCheckRes.status === 302,
      `Trainer access to /kitchen redirected (HTTP ${kitchenCheckRes.status})`
    );
    const kitchenLocation = kitchenCheckRes.headers.get("location") || "";
    assert(
      kitchenLocation.includes("unauthorized_role") || kitchenLocation.includes("/login"),
      `Trainer redirected away from /kitchen with unauthorized flag (${kitchenLocation})`
    );

    // -------------------------------------------------------------
    // TEST 8: ADMIN INVITATION PASSCODE STILL ENFORCED
    // -------------------------------------------------------------
    console.log("\n8. Verifying Admin Registration Still Enforces Invitation Passcode:");
    const adminRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Unauthorized Admin",
        email: `unauth.admin.${timestamp}@nutriflexs.com`,
        password: testPassword,
        portal: "admin",
      }),
    });

    const adminData = await adminRes.json();
    assert(adminRes.status === 403, `Admin registration without passcode rejected with HTTP 403`);
    assert(
      adminData.error?.includes("Administrator Invitation Key is required"),
      `Admin error message indicates invitation required`
    );

  } catch (err) {
    console.error("  ❌ UNHANDLED ERROR in test suite:", err);
    failed++;
  } finally {
    console.log("\n🧹 Cleaning up test trainer records from Neon PostgreSQL...");
    try {
      await prisma.trainer.deleteMany({
        where: {
          user: {
            email: { in: [testEmail1, testEmail2] },
          },
        },
      });
      await prisma.user.deleteMany({
        where: { email: { in: [testEmail1, testEmail2] } },
      });
      console.log("  Cleaned up temporary test accounts successfully.");
    } catch (cleanupErr) {
      console.warn("  Non-fatal cleanup warning:", cleanupErr.message);
    }
    await prisma.$disconnect();
  }

  console.log("\n==================================================================");
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
