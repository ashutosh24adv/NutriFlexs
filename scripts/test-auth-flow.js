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

  console.log(`\n================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
