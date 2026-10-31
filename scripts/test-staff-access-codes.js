const http = require("http");
const { PrismaClient, Role } = require("@prisma/client");
const { createHmac } = require("crypto");

const prisma = new PrismaClient();

const STAFF_CODE_SECRET =
  process.env.STAFF_CODE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "nutriflexs_super_secret_auth_key_2026_jwt";

function hashAccessCode(code) {
  const normalized = (code || "").trim().toUpperCase();
  return createHmac("sha256", STAFF_CODE_SECRET).update(normalized).digest("hex");
}

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const targetUrl = url.replace("http://localhost:3000", BASE_URL);
    const parsed = new URL(targetUrl);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {}
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            json,
          });
        });
      }
    );
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// NextAuth CSRF helper
async function getCsrfToken() {
  const res = await request("http://localhost:3000/api/auth/csrf");
  const cookies = res.headers["set-cookie"] || [];
  const csrfCookie = cookies.map((c) => c.split(";")[0]).join("; ");
  const json = JSON.parse(res.body);
  return { csrfToken: json.csrfToken, csrfCookie };
}

// NextAuth Credentials sign-in
async function login(email, password) {
  const { csrfToken, csrfCookie } = await getCsrfToken();
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    redirect: "false",
    json: "true",
  }).toString();

  const res = await request("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie,
    },
    body,
  });

  const cookies = res.headers["set-cookie"] || [];
  const sessionCookie = cookies.map((c) => c.split(";")[0]).join("; ");
  return { status: res.status, headers: res.headers, body: res.body, sessionCookie };
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("🛡️  NUTRIFLEXS STAFF ACCESS CODE & REGISTRATION SECURITY TEST SUITE");
  console.log("==================================================================\n");

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

  // Find outlets in database
  const outlets = await prisma.outlet.findMany();
  if (outlets.length < 2) {
    throw new Error("Test suite requires at least 2 outlets in the database.");
  }
  const primaryOutlet = outlets[0];
  const secondaryOutlet = outlets[1];

  console.log(`Primary Outlet: ${primaryOutlet.name} (${primaryOutlet.id})`);
  console.log(`Secondary Outlet: ${secondaryOutlet.name} (${secondaryOutlet.id})\n`);

  // ---------------------------------------------------------
  // TEST 1: Valid Kitchen Code and Valid Outlet
  // ---------------------------------------------------------
  console.log("--- TEST 1: Valid Kitchen Registration with Dev Seed Code ---");
  const validKitchenEmail = `test_chef_${timestamp}@nutriflexs.com`;
  const validKitchenPass = "ChefPass@2026!";

  const regKitchenRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Chef Test 1",
      email: validKitchenEmail,
      password: validKitchenPass,
      portal: "kitchen",
      accessCode: "NF-TEST-KITCHEN-2026",
      outletId: primaryOutlet.id,
    }),
  });

  assert(
    regKitchenRes.status === 200 &&
      regKitchenRes.json?.success === true &&
      regKitchenRes.json?.user?.role === "KITCHEN" &&
      regKitchenRes.json?.user?.selectedOutletId === primaryOutlet.id,
    `Kitchen staff registered with valid code & outlet (Role: ${regKitchenRes.json?.user?.role})`
  );

  // ---------------------------------------------------------
  // TEST 2: Invalid Kitchen Code
  // ---------------------------------------------------------
  console.log("\n--- TEST 2: Invalid Kitchen Access Code ---");
  const invalidCodeRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Attacker Fake",
      email: `fake_chef_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "kitchen",
      accessCode: "NF-INVALID-CODE-9999",
      outletId: primaryOutlet.id,
    }),
  });

  assert(
    invalidCodeRes.status === 403 && invalidCodeRes.json?.success === false,
    `Invalid Kitchen code rejected with 403 Forbidden (got status ${invalidCodeRes.status})`
  );
  assert(
    invalidCodeRes.json?.error === "Invalid or unauthorized staff access code.",
    `Generic error message prevents code existence enumeration (got: "${invalidCodeRes.json?.error}")`
  );

  // ---------------------------------------------------------
  // TEST 3: Kitchen Code used for Trainer Registration
  // ---------------------------------------------------------
  console.log("\n--- TEST 3: Cross-Role Rejection (Kitchen Code on Trainer Portal) ---");
  const crossRoleTrainerRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Cross Role Trainer",
      email: `cross_trainer_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "trainer",
      accessCode: "NF-TEST-KITCHEN-2026", // Wrong role
    }),
  });

  assert(
    crossRoleTrainerRes.status === 403 && crossRoleTrainerRes.json?.success === false,
    `Kitchen code on Trainer portal rejected with 403 (got status ${crossRoleTrainerRes.status})`
  );

  // ---------------------------------------------------------
  // TEST 4: Trainer Code used for Kitchen Registration
  // ---------------------------------------------------------
  console.log("\n--- TEST 4: Cross-Role Rejection (Trainer Code on Kitchen Portal) ---");
  const crossRoleKitchenRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Cross Role Kitchen",
      email: `cross_kitchen_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "kitchen",
      accessCode: "NF-TEST-TRAINER-2026", // Wrong role
      outletId: primaryOutlet.id,
    }),
  });

  assert(
    crossRoleKitchenRes.status === 403 && crossRoleKitchenRes.json?.success === false,
    `Trainer code on Kitchen portal rejected with 403 (got status ${crossRoleKitchenRes.status})`
  );

  // ---------------------------------------------------------
  // TEST 5: Expired Code Rejection
  // ---------------------------------------------------------
  console.log("\n--- TEST 5: Expired Code Rejection ---");
  const expiredPlainCode = `NF-EXP-${timestamp}`;
  const expiredHash = hashAccessCode(expiredPlainCode);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await prisma.staffAccessCode.create({
    data: {
      codeHash: expiredHash,
      codePrefix: "NF-EXP",
      role: Role.KITCHEN,
      outletId: primaryOutlet.id,
      isActive: true,
      expiresAt: yesterday,
      maxUses: 10,
      usedCount: 0,
      description: "Test expired code",
    },
  });

  const expiredRegRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Expired Code User",
      email: `expired_user_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "kitchen",
      accessCode: expiredPlainCode,
      outletId: primaryOutlet.id,
    }),
  });

  assert(
    expiredRegRes.status === 403 && expiredRegRes.json?.success === false,
    `Expired access code rejected with 403 Forbidden (got status ${expiredRegRes.status})`
  );

  // ---------------------------------------------------------
  // TEST 6: Revoked Code Rejection
  // ---------------------------------------------------------
  console.log("\n--- TEST 6: Revoked Code Rejection ---");
  const revokedPlainCode = `NF-REV-${timestamp}`;
  const revokedHash = hashAccessCode(revokedPlainCode);

  await prisma.staffAccessCode.create({
    data: {
      codeHash: revokedHash,
      codePrefix: "NF-REV",
      role: Role.TRAINER,
      isActive: false, // Revoked
      maxUses: 10,
      usedCount: 0,
      description: "Test revoked code",
    },
  });

  const revokedRegRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Revoked Code User",
      email: `revoked_user_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "trainer",
      accessCode: revokedPlainCode,
    }),
  });

  assert(
    revokedRegRes.status === 403 && revokedRegRes.json?.success === false,
    `Revoked access code rejected with 403 Forbidden (got status ${revokedRegRes.status})`
  );

  // ---------------------------------------------------------
  // TEST 7: Exhausted Code & Atomic Limit Enforcement
  // ---------------------------------------------------------
  console.log("\n--- TEST 7: Exhausted Single-Use Code Enforcement ---");
  const singleUseCode = `NF-SINGLE-${timestamp}`;
  const singleUseHash = hashAccessCode(singleUseCode);

  await prisma.staffAccessCode.create({
    data: {
      codeHash: singleUseHash,
      codePrefix: "NF-SING",
      role: Role.TRAINER,
      isActive: true,
      maxUses: 1, // Single use only
      usedCount: 0,
      description: "Single use test code",
    },
  });

  // 1st consumption -> MUST SUCCEED
  const firstUseRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Single Use User 1",
      email: `single_user_1_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "trainer",
      accessCode: singleUseCode,
    }),
  });

  assert(
    firstUseRes.status === 200 && firstUseRes.json?.success === true,
    `1st use of single-use code succeeds (status ${firstUseRes.status})`
  );

  // 2nd consumption -> MUST BE REJECTED
  const secondUseRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Single Use User 2",
      email: `single_user_2_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "trainer",
      accessCode: singleUseCode,
    }),
  });

  assert(
    secondUseRes.status === 403 && secondUseRes.json?.success === false,
    `2nd use of exhausted code rejected with 403 Forbidden (status ${secondUseRes.status})`
  );

  // ---------------------------------------------------------
  // TEST 8: Outlet Mismatch Enforcement
  // ---------------------------------------------------------
  console.log("\n--- TEST 8: Outlet Authorization Mismatch Enforcement ---");
  const lockedOutletCode = `NF-OUTLET-LOCK-${timestamp}`;
  const lockedOutletHash = hashAccessCode(lockedOutletCode);

  // Tied strictly to primaryOutlet
  await prisma.staffAccessCode.create({
    data: {
      codeHash: lockedOutletHash,
      codePrefix: "NF-LOCK",
      role: Role.KITCHEN,
      outletId: primaryOutlet.id, // Strictly primaryOutlet
      isActive: true,
      maxUses: 5,
      usedCount: 0,
      description: "Outlet locked test code",
    },
  });

  // Attempting to register for secondaryOutlet with code locked to primaryOutlet -> MUST BE REJECTED
  const outletMismatchRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Mismatch Chef",
      email: `mismatch_chef_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "kitchen",
      accessCode: lockedOutletCode,
      outletId: secondaryOutlet.id, // Unauthorized outlet
    }),
  });

  assert(
    outletMismatchRes.status === 403 && outletMismatchRes.json?.success === false,
    `Unauthorized outlet assignment rejected with 403 (status ${outletMismatchRes.status})`
  );

  // ---------------------------------------------------------
  // TEST 9: Duplicate Email Registration Prevention
  // ---------------------------------------------------------
  console.log("\n--- TEST 9: Duplicate Email Registration ---");
  const duplicateEmailRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Duplicate Chef",
      email: validKitchenEmail, // Already registered in Test 1
      password: "Password123!",
      portal: "kitchen",
      accessCode: "NF-TEST-KITCHEN-2026",
      outletId: primaryOutlet.id,
    }),
  });

  assert(
    duplicateEmailRes.status === 400 &&
      duplicateEmailRes.json?.error?.includes("already exists"),
    `Duplicate email rejected with 400 Bad Request (got: "${duplicateEmailRes.json?.error}")`
  );

  // ---------------------------------------------------------
  // TEST 10: Incorrect Password Login Rejection
  // ---------------------------------------------------------
  console.log("\n--- TEST 10: Incorrect Password Rejection ---");
  const badLogin = await login(validKitchenEmail, "WrongPassword123!");
  assert(
    badLogin.body.includes("error") || !badLogin.sessionCookie.includes("next-auth.session-token"),
    "Incorrect password rejected without issuing session token"
  );

  // ---------------------------------------------------------
  // TEST 11: Successful Login & Session Persistence
  // ---------------------------------------------------------
  console.log("\n--- TEST 11: Successful Login & Session Persistence ---");
  const goodLogin = await login(validKitchenEmail, validKitchenPass);
  assert(
    goodLogin.sessionCookie.includes("next-auth.session-token"),
    "Kitchen staff authenticated and received valid session cookie"
  );

  const kitchenPageAccess = await request("http://localhost:3000/kitchen", {
    headers: { Cookie: goodLogin.sessionCookie },
  });
  assert(
    kitchenPageAccess.status === 200,
    `Kitchen dashboard accessible with persistent session (status ${kitchenPageAccess.status})`
  );

  // ---------------------------------------------------------
  // TEST 12: Logout & Protected Route Denial
  // ---------------------------------------------------------
  console.log("\n--- TEST 12: Unauthenticated Protected Route Denial ---");
  const unauthAccess = await request("http://localhost:3000/kitchen");
  assert(
    unauthAccess.status === 307 || unauthAccess.status === 302,
    `Protected route /kitchen redirects unauthenticated requests (status ${unauthAccess.status})`
  );
  const locationHeader = unauthAccess.headers["location"] || "";
  assert(
    locationHeader.includes("/login") && locationHeader.includes("staff=true"),
    `Redirect destination is /login?staff=true (got: ${locationHeader})`
  );

  // ---------------------------------------------------------
  // TEST 13: Customer Signup cannot specify Privileged Role
  // ---------------------------------------------------------
  console.log("\n--- TEST 13: Customer Public Signup Privileged Role Denial ---");
  const customerEmail = `customer_${timestamp}@nutriflexs.com`;
  const customerSignupRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Sneaky Customer",
      email: customerEmail,
      password: "CustomerPass123!",
      portal: "customer",
      role: "ADMIN", // Attacker trying to elevate role
    }),
  });

  assert(
    customerSignupRes.status === 200 &&
      customerSignupRes.json?.user?.role === "CUSTOMER",
    `Customer public signup strictly creates CUSTOMER role, ignoring role field (Role: ${customerSignupRes.json?.user?.role})`
  );

  // ---------------------------------------------------------
  // TEST 14: Customer Denial from Staff Portals
  // ---------------------------------------------------------
  console.log("\n--- TEST 14: Customer Access Denial from Staff Portals ---");
  const customerLogin = await login(customerEmail, "CustomerPass123!");
  assert(
    customerLogin.sessionCookie.includes("next-auth.session-token"),
    "Customer logged in successfully"
  );

  const customerAdminTry = await request("http://localhost:3000/admin", {
    headers: { Cookie: customerLogin.sessionCookie },
  });
  assert(
    customerAdminTry.status === 307 || customerAdminTry.status === 302,
    `Customer redirected away from /admin (status ${customerAdminTry.status})`
  );
  assert(
    (customerAdminTry.headers["location"] || "").includes("unauthorized_role"),
    `Customer redirected with unauthorized_role parameter`
  );

  // ---------------------------------------------------------
  // TEST 15: Kitchen Staff Outlet Isolation (Cannot view other outlets' orders)
  // ---------------------------------------------------------
  console.log("\n--- TEST 15: Kitchen Staff Cross-Outlet Order Isolation ---");
  // validKitchenEmail is assigned to primaryOutlet
  const crossOutletViewRes = await request(
    `http://localhost:3000/api/orders?view=kitchen&outletId=${secondaryOutlet.id}`,
    {
      headers: { Cookie: goodLogin.sessionCookie },
    }
  );

  assert(
    crossOutletViewRes.status === 403,
    `Kitchen staff attempting to access secondary outlet's orders returns 403 Forbidden (got status ${crossOutletViewRes.status})`
  );

  // ---------------------------------------------------------
  // TEST 16: Kitchen Staff Cross-Outlet Order Status Update Isolation
  // ---------------------------------------------------------
  console.log("\n--- TEST 16: Kitchen Staff Cross-Outlet Order Status Update Isolation ---");
  // Find or create an order for secondaryOutlet
  let secondaryOrder = await prisma.order.findFirst({
    where: { outletId: secondaryOutlet.id },
  });

  if (!secondaryOrder) {
    const custUser = await prisma.user.findUnique({ where: { email: customerEmail } });
    secondaryOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-${timestamp}`,
        userId: custUser.id,
        outletId: secondaryOutlet.id,
        subtotal: 399,
        totalAmount: 399,
      },
    });
  }

  // Kitchen operator from primaryOutlet attempts to update secondaryOutlet order
  const crossOutletUpdateRes = await request(
    `http://localhost:3000/api/orders/${secondaryOrder.id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: goodLogin.sessionCookie,
      },
      body: JSON.stringify({ status: "PREPARING" }),
    }
  );

  assert(
    crossOutletUpdateRes.status === 403,
    `Kitchen staff updating another outlet's order returns 403 Forbidden (got status ${crossOutletUpdateRes.status})`
  );

  // ---------------------------------------------------------
  // TEST 17: Unauthorized Access to Access Code Management API
  // ---------------------------------------------------------
  console.log("\n--- TEST 17: Unauthorized Access to /api/admin/access-codes ---");
  const unauthCodeApi = await request("http://localhost:3000/api/admin/access-codes");
  assert(
    unauthCodeApi.status === 403,
    `Unauthenticated request to /api/admin/access-codes returns 403 Forbidden (got ${unauthCodeApi.status})`
  );

  const kitchenCodeApi = await request("http://localhost:3000/api/admin/access-codes", {
    headers: { Cookie: goodLogin.sessionCookie },
  });
  assert(
    kitchenCodeApi.status === 403,
    `Kitchen staff request to /api/admin/access-codes returns 403 Forbidden (got ${kitchenCodeApi.status})`
  );

  // ---------------------------------------------------------
  // TEST 18: Admin Access-Code Management (Generate, List, Revoke)
  // ---------------------------------------------------------
  console.log("\n--- TEST 18: Super Admin Access Code Management Workflow ---");
  const adminLogin = await login("admin@nutriflexs.com", "Admin@NutriFlexs2026!");
  assert(
    adminLogin.sessionCookie.includes("next-auth.session-token"),
    "Super Admin authenticated successfully"
  );

  // List codes
  const listCodesRes = await request("http://localhost:3000/api/admin/access-codes", {
    headers: { Cookie: adminLogin.sessionCookie },
  });
  assert(
    listCodesRes.status === 200 && Array.isArray(listCodesRes.json?.codes),
    `Super Admin successfully lists access codes (found: ${listCodesRes.json?.codes?.length})`
  );
  assert(
    listCodesRes.json?.codes.every((c) => c.codeHash === undefined),
    "Security check: Code hashes are never exposed in API responses"
  );

  // Generate a new code
  const generateRes = await request("http://localhost:3000/api/admin/access-codes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminLogin.sessionCookie,
    },
    body: JSON.stringify({
      role: "KITCHEN",
      outletId: primaryOutlet.id,
      maxUses: 3,
      description: `E2E Automated Test Code ${timestamp}`,
    }),
  });

  assert(
    generateRes.status === 200 &&
      generateRes.json?.success === true &&
      Boolean(generateRes.json?.plaintextCode),
    `Super Admin generated new code (One-time plaintext returned: ${generateRes.json?.plaintextCode?.slice(0, 7)}••••)`
  );

  const newCodeId = generateRes.json?.code?.id;
  const newPlaintext = generateRes.json?.plaintextCode;

  // Revoke the newly generated code
  const revokeRes = await request("http://localhost:3000/api/admin/access-codes", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminLogin.sessionCookie,
    },
    body: JSON.stringify({
      id: newCodeId,
      isActive: false,
    }),
  });

  assert(
    revokeRes.status === 200 && revokeRes.json?.code?.isActive === false,
    `Super Admin successfully revoked the access code`
  );

  // Verify revoked code cannot be registered with
  const attemptRevokedRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Should Fail Chef",
      email: `fail_chef_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "kitchen",
      accessCode: newPlaintext,
      outletId: primaryOutlet.id,
    }),
  });

  assert(
    attemptRevokedRes.status === 403,
    `Revoked code immediately rejected during registration with 403 (got status ${attemptRevokedRes.status})`
  );

  // ---------------------------------------------------------
  // TEST 19: Trainer Registration with Referral Code Preservation
  // ---------------------------------------------------------
  console.log("\n--- TEST 19: Trainer Registration & Referral Handle Preservation ---");
  const trainerEmail = `trainer_partner_${timestamp}@nutriflexs.com`;
  const trainerRegRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Coach Vikram",
      email: trainerEmail,
      phone: "+91 98888 77777",
      password: "TrainerPass123!",
      portal: "trainer",
      accessCode: "NF-TEST-TRAINER-2026",
      referralCode: `VIKRAM${timestamp % 1000}`,
    }),
  });

  assert(
    trainerRegRes.status === 200 &&
      trainerRegRes.json?.user?.role === "TRAINER" &&
      Boolean(trainerRegRes.json?.referralCode),
    `Trainer registered with custom referral handle (Code: ${trainerRegRes.json?.referralCode})`
  );

  // ---------------------------------------------------------
  // TEST 20: Super Admin Registration with Dev Test Code
  // ---------------------------------------------------------
  console.log("\n--- TEST 20: Super Admin Registration with Dev Test Code ---");
  const newAdminEmail = `super_admin_${timestamp}@nutriflexs.com`;
  const adminRegRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Admin Kavita",
      email: newAdminEmail,
      password: "AdminPass123!",
      portal: "admin",
      accessCode: "NF-TEST-ADMIN-2026",
    }),
  });

  assert(
    adminRegRes.status === 200 && adminRegRes.json?.user?.role === "ADMIN",
    `Super Admin successfully registered with Role.ADMIN (role: ${adminRegRes.json?.user?.role})`
  );

  console.log("\n==================================================================");
  console.log(`📊 TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((err) => {
    console.error("Fatal test suite error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
