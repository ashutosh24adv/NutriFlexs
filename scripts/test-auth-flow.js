const http = require("http");

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
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
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
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

// Helper to get CSRF token from NextAuth
async function getCsrfToken() {
  const res = await request("http://localhost:3000/api/auth/csrf");
  const cookies = res.headers["set-cookie"] || [];
  const csrfCookie = cookies.map((c) => c.split(";")[0]).join("; ");
  const json = JSON.parse(res.body);
  return { csrfToken: json.csrfToken, csrfCookie };
}

// Helper to sign in via NextAuth Credentials Provider
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

async function runTests() {
  console.log("🚀 Starting NutriFlexs Staff Auth End-to-End Test Suite...\n");
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

  // 1. Unauthenticated redirects on staff routes
  console.log("--- 1. Unauthenticated Route Protection ---");
  for (const portal of ["/admin", "/kitchen", "/trainer"]) {
    const res = await request(`http://localhost:3000${portal}`);
    assert(
      res.status === 307 || res.status === 302,
      `Unauthenticated ${portal} redirects (status ${res.status})`
    );
    const location = res.headers["location"] || "";
    assert(
      location.includes("/login") && location.includes("staff=true"),
      `Redirect target contains /login?staff=true (got ${location})`
    );
  }

  // 2. Unauthenticated access to sensitive APIs
  console.log("\n--- 2. Unauthenticated API Protection ---");
  const adminStatsRes = await request("http://localhost:3000/api/admin/stats");
  assert(adminStatsRes.status === 403, `GET /api/admin/stats returns 403 (got ${adminStatsRes.status})`);

  const trainerApiRes = await request("http://localhost:3000/api/trainer");
  assert(trainerApiRes.status === 403, `GET /api/trainer returns 403 (got ${trainerApiRes.status})`);

  const kitchenOrdersRes = await request("http://localhost:3000/api/orders?view=kitchen");
  assert(kitchenOrdersRes.status === 403, `GET /api/orders?view=kitchen returns 403 (got ${kitchenOrdersRes.status})`);

  // 3. Unknown email login
  console.log("\n--- 3. Invalid Credentials & Unknown Email ---");
  const unknownLogin = await login("unknown_user_999@nutriflexs.com", "Password123!");
  assert(
    unknownLogin.body.includes("error") || unknownLogin.status === 401 || !unknownLogin.sessionCookie.includes("next-auth.session-token"),
    "Unknown email rejected without session token"
  );

  // 4. Wrong password
  const wrongPassLogin = await login("admin@nutriflexs.com", "WrongPassword123!");
  assert(
    wrongPassLogin.body.includes("error") || wrongPassLogin.status === 401 || !wrongPassLogin.sessionCookie.includes("next-auth.session-token"),
    "Wrong password rejected without session token"
  );

  // 5. Correct Admin Login
  console.log("\n--- 4. Authorized Admin Login ---");
  const adminLogin = await login("admin@nutriflexs.com", "Admin@NutriFlexs2026!");
  assert(
    adminLogin.sessionCookie.includes("next-auth.session-token"),
    "Admin successfully authenticated and received session cookie"
  );

  // Admin access to /admin and /api/admin/stats
  const adminPageRes = await request("http://localhost:3000/admin", {
    headers: { Cookie: adminLogin.sessionCookie },
  });
  assert(adminPageRes.status === 200, `Admin session accesses /admin successfully (status ${adminPageRes.status})`);

  const adminStatsAuthRes = await request("http://localhost:3000/api/admin/stats", {
    headers: { Cookie: adminLogin.sessionCookie },
  });
  assert(adminStatsAuthRes.status === 200, `Admin session accesses /api/admin/stats (status ${adminStatsAuthRes.status})`);

  // 6. Correct Kitchen Login
  console.log("\n--- 5. Authorized Kitchen Login ---");
  const kitchenLogin = await login("kitchen@nutriflexs.com", "Kitchen@NutriFlexs2026!");
  assert(
    kitchenLogin.sessionCookie.includes("next-auth.session-token"),
    "Kitchen user successfully authenticated and received session cookie"
  );

  const kitchenPageRes = await request("http://localhost:3000/kitchen", {
    headers: { Cookie: kitchenLogin.sessionCookie },
  });
  assert(kitchenPageRes.status === 200, `Kitchen session accesses /kitchen successfully (status ${kitchenPageRes.status})`);

  const kitchenOrdersAuthRes = await request("http://localhost:3000/api/orders?view=kitchen", {
    headers: { Cookie: kitchenLogin.sessionCookie },
  });
  assert(kitchenOrdersAuthRes.status === 200, `Kitchen session accesses /api/orders?view=kitchen (status ${kitchenOrdersAuthRes.status})`);

  // Kitchen user attempting /admin -> denied by middleware
  const kitchenAdminRes = await request("http://localhost:3000/admin", {
    headers: { Cookie: kitchenLogin.sessionCookie },
  });
  assert(
    kitchenAdminRes.status === 307 || kitchenAdminRes.status === 302,
    `Kitchen user denied access to /admin (redirect status ${kitchenAdminRes.status})`
  );
  const kitchenAdminLoc = kitchenAdminRes.headers["location"] || "";
  assert(
    kitchenAdminLoc.includes("unauthorized_role"),
    `Kitchen user redirected with unauthorized_role parameter (got ${kitchenAdminLoc})`
  );

  // Kitchen user attempting /api/admin/stats -> 403 Forbidden
  const kitchenAdminApiRes = await request("http://localhost:3000/api/admin/stats", {
    headers: { Cookie: kitchenLogin.sessionCookie },
  });
  assert(kitchenAdminApiRes.status === 403, `Kitchen user denied /api/admin/stats with 403 (got ${kitchenAdminApiRes.status})`);

  // 7. Correct Trainer Login
  console.log("\n--- 6. Authorized Trainer Login ---");
  const trainerLogin = await login("arjun@nutriflexs.com", "Trainer@NutriFlexs2026!");
  assert(
    trainerLogin.sessionCookie.includes("next-auth.session-token"),
    "Trainer user successfully authenticated and received session cookie"
  );

  const trainerPageRes = await request("http://localhost:3000/trainer", {
    headers: { Cookie: trainerLogin.sessionCookie },
  });
  assert(trainerPageRes.status === 200, `Trainer session accesses /trainer successfully (status ${trainerPageRes.status})`);

  const trainerApiAuthRes = await request("http://localhost:3000/api/trainer", {
    headers: { Cookie: trainerLogin.sessionCookie },
  });
  assert(trainerApiAuthRes.status === 200, `Trainer session accesses /api/trainer (status ${trainerApiAuthRes.status})`);

  // 8. Customer Role Authorization
  console.log("\n--- 7. Customer Role Restrictions ---");
  const customerLogin = await login("ashu@nutriflexs.com", "Customer@NutriFlexs2026!");
  assert(
    customerLogin.sessionCookie.includes("next-auth.session-token"),
    "Customer successfully authenticated"
  );

  // Customer attempting /admin -> denied
  const customerAdminRes = await request("http://localhost:3000/admin", {
    headers: { Cookie: customerLogin.sessionCookie },
  });
  assert(
    customerAdminRes.status === 307 || customerAdminRes.status === 302,
    `Customer denied access to /admin (redirect status ${customerAdminRes.status})`
  );
  const customerAdminLoc = customerAdminRes.headers["location"] || "";
  assert(
    customerAdminLoc.includes("unauthorized_role"),
    `Customer redirected with unauthorized_role parameter (got ${customerAdminLoc})`
  );

  // Customer attempting /kitchen -> denied
  const customerKitchenRes = await request("http://localhost:3000/kitchen", {
    headers: { Cookie: customerLogin.sessionCookie },
  });
  assert(
    customerKitchenRes.status === 307 || customerKitchenRes.status === 302,
    `Customer denied access to /kitchen (redirect status ${customerKitchenRes.status})`
  );

  // Customer attempting /trainer -> denied
  const customerTrainerRes = await request("http://localhost:3000/trainer", {
    headers: { Cookie: customerLogin.sessionCookie },
  });
  assert(
    customerTrainerRes.status === 307 || customerTrainerRes.status === 302,
    `Customer denied access to /trainer (redirect status ${customerTrainerRes.status})`
  );

  // 8. Staff Portal Registration Security & Enforcement
  console.log("\n--- 8. Staff Portal Registration Security & Access Code Enforcement ---");
  const timestamp = Date.now();

  // Test 8.1: Super Admin registration without invitation code -> MUST be 403
  const adminNoCodeRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Attacker Admin",
      email: `attacker_admin_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "admin",
      // No inviteCode
    }),
  });
  assert(
    adminNoCodeRes.status === 403,
    `Admin signup without invite code is rejected with 403 (got ${adminNoCodeRes.status})`
  );

  // Test 8.2: Super Admin registration with wrong code -> MUST be 403
  const adminWrongCodeRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Attacker Admin 2",
      email: `attacker_admin2_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "admin",
      inviteCode: "WRONG_ADMIN_CODE_123",
    }),
  });
  assert(
    adminWrongCodeRes.status === 403,
    `Admin signup with invalid code is rejected with 403 (got ${adminWrongCodeRes.status})`
  );

  // Test 8.3: Kitchen registration with wrong code -> MUST be 403
  const kitchenWrongCodeRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Attacker Kitchen",
      email: `attacker_kitchen_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "kitchen",
      inviteCode: "WRONG_KITCHEN_CODE",
    }),
  });
  assert(
    kitchenWrongCodeRes.status === 403,
    `Kitchen signup with invalid code is rejected with 403 (got ${kitchenWrongCodeRes.status})`
  );

  // Test 8.4: Trainer registration with wrong code -> MUST be 403
  const trainerWrongCodeRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Attacker Trainer",
      email: `attacker_trainer_${timestamp}@nutriflexs.com`,
      password: "Password123!",
      portal: "trainer",
      inviteCode: "WRONG_TRAINER_CODE",
    }),
  });
  assert(
    trainerWrongCodeRes.status === 403,
    `Trainer signup with invalid code is rejected with 403 (got ${trainerWrongCodeRes.status})`
  );

  // 9. Legitimate Staff Portal Signups & Immediate Session Access
  console.log("\n--- 9. Legitimate Staff Portal Registrations & Access ---");

  // Test 9.1: Register new Kitchen staff member
  const newKitchenEmail = `new_chef_${timestamp}@nutriflexs.com`;
  const newKitchenPass = "ChefPass1234!";
  const kitchenRegRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Chef Maya",
      email: newKitchenEmail,
      password: newKitchenPass,
      portal: "kitchen",
      inviteCode: "NF-KITCHEN-2026",
    }),
  });
  const kitchenRegJson = JSON.parse(kitchenRegRes.body);
  assert(
    kitchenRegRes.status === 200 && kitchenRegJson.success === true && kitchenRegJson.user.role === "KITCHEN",
    `Kitchen staff successfully registered with Role.KITCHEN (role: ${kitchenRegJson.user?.role})`
  );

  // Login with newly registered kitchen staff
  const newKitchenLogin = await login(newKitchenEmail, newKitchenPass);
  assert(
    newKitchenLogin.sessionCookie.includes("next-auth.session-token"),
    "New kitchen staff successfully authenticated"
  );
  const newKitchenAccess = await request("http://localhost:3000/kitchen", {
    headers: { Cookie: newKitchenLogin.sessionCookie },
  });
  assert(
    newKitchenAccess.status === 200,
    `New kitchen staff accesses /kitchen with status 200 (got ${newKitchenAccess.status})`
  );

  // Test 9.2: Register new Trainer partner
  const newTrainerEmail = `new_coach_${timestamp}@nutriflexs.com`;
  const newTrainerPass = "CoachPass1234!";
  const trainerRegRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Coach Rahul",
      email: newTrainerEmail,
      phone: "+91 91234 56789",
      password: newTrainerPass,
      portal: "trainer",
      inviteCode: "NF-TRAINER-2026",
      referralCode: `NUTRI-RAHUL-${timestamp % 1000}`,
    }),
  });
  const trainerRegJson = JSON.parse(trainerRegRes.body);
  assert(
    trainerRegRes.status === 200 && trainerRegJson.success === true && trainerRegJson.user.role === "TRAINER",
    `Trainer partner successfully registered with Role.TRAINER (role: ${trainerRegJson.user?.role})`
  );

  // Login with newly registered trainer partner
  const newTrainerLogin = await login(newTrainerEmail, newTrainerPass);
  assert(
    newTrainerLogin.sessionCookie.includes("next-auth.session-token"),
    "New trainer partner successfully authenticated"
  );
  const newTrainerAccess = await request("http://localhost:3000/trainer", {
    headers: { Cookie: newTrainerLogin.sessionCookie },
  });
  assert(
    newTrainerAccess.status === 200,
    `New trainer accesses /trainer with status 200 (got ${newTrainerAccess.status})`
  );

  // Test 9.3: Register new Super Admin
  const newAdminEmail = `new_admin_${timestamp}@nutriflexs.com`;
  const newAdminPass = "AdminPass1234!";
  const adminRegRes = await request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Admin Priya",
      email: newAdminEmail,
      password: newAdminPass,
      portal: "admin",
      inviteCode: "NF-ADMIN-2026-SECURE",
    }),
  });
  const adminRegJson = JSON.parse(adminRegRes.body);
  assert(
    adminRegRes.status === 200 && adminRegJson.success === true && adminRegJson.user.role === "ADMIN",
    `Super admin successfully registered with Role.ADMIN (role: ${adminRegJson.user?.role})`
  );

  // Login with newly registered super admin
  const newAdminLogin = await login(newAdminEmail, newAdminPass);
  assert(
    newAdminLogin.sessionCookie.includes("next-auth.session-token"),
    "New super admin successfully authenticated"
  );
  const newAdminAccess = await request("http://localhost:3000/admin", {
    headers: { Cookie: newAdminLogin.sessionCookie },
  });
  assert(
    newAdminAccess.status === 200,
    `New admin accesses /admin with status 200 (got ${newAdminAccess.status})`
  );

  // 10. Staff Portal Navigation & Pages Verification
  console.log("\n--- 10. Staff Portal Navigation & Pages Verification ---");
  const landingRes = await request("http://localhost:3000/");
  assert(landingRes.status === 200, `Landing page returns 200 (got ${landingRes.status})`);
  assert(
    landingRes.body.includes("Staff Portal"),
    "Landing page contains Staff Portal trigger button"
  );

  const loginKitchenRes = await request("http://localhost:3000/login?portal=kitchen&staff=true");
  assert(loginKitchenRes.status === 200, `Kitchen login page returns 200 (got ${loginKitchenRes.status})`);
  assert(loginKitchenRes.body.includes("Kitchen Display Kiosk"), "Kitchen login page renders Kitchen badge");

  const signupKitchenRes = await request("http://localhost:3000/signup?portal=kitchen&staff=true");
  assert(signupKitchenRes.status === 200, `Kitchen signup page returns 200 (got ${signupKitchenRes.status})`);
  assert(signupKitchenRes.body.includes("Kitchen Display Kiosk"), "Kitchen signup page renders Kitchen badge");

  const signupTrainerRes = await request("http://localhost:3000/signup?portal=trainer&staff=true");
  assert(signupTrainerRes.status === 200, `Trainer signup page returns 200 (got ${signupTrainerRes.status})`);
  assert(signupTrainerRes.body.includes("Trainer Partner Portal"), "Trainer signup page renders Trainer badge");

  const signupAdminRes = await request("http://localhost:3000/signup?portal=admin&staff=true");
  assert(signupAdminRes.status === 200, `Admin signup page returns 200 (got ${signupAdminRes.status})`);
  assert(signupAdminRes.body.includes("Super Admin Operations"), "Admin signup page renders Admin badge");

  console.log(`\n================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
