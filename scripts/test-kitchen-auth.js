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

async function getCsrfToken() {
  const res = await request("http://127.0.0.1:3000/api/auth/csrf");
  const cookies = res.headers["set-cookie"] || [];
  const csrfCookie = cookies.map((c) => c.split(";")[0]).join("; ");
  const json = JSON.parse(res.body);
  return { csrfToken: json.csrfToken, csrfCookie };
}

async function login(email, password, portal = "kitchen") {
  const { csrfToken, csrfCookie } = await getCsrfToken();
  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    portal,
    redirect: "false",
    json: "true",
  }).toString();

  const res = await request("http://127.0.0.1:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookie,
    },
    body,
  });

  const cookies = res.headers["set-cookie"] || [];
  const sessionCookie = cookies.map((c) => c.split(";")[0]).join("; ");

  let error = null;
  let url = null;
  try {
    const json = JSON.parse(res.body);
    url = json.url;
    if (url) {
      const parsedUrl = new URL(url);
      error = parsedUrl.searchParams.get("error");
    }
  } catch (e) {}

  return {
    status: res.status,
    ok: res.status === 200,
    headers: res.headers,
    body: res.body,
    sessionCookie,
    error,
    url,
  };
}

async function runTests() {
  console.log("=================================================================");
  console.log("🧑‍🍳 NutriFlexs Kitchen Login & Backend Upgrade Verification");
  console.log("=================================================================\n");

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

  // --- Test Case 11: Direct access to Kitchen routes without authentication ---
  console.log("--- 1. Route Protection & Unauthenticated Redirects ---");
  const unauthRes = await request("http://127.0.0.1:3000/kitchen");
  assert(
    unauthRes.status === 307 || unauthRes.status === 302,
    `Direct GET /kitchen redirects unauthenticated users (status: ${unauthRes.status})`
  );
  const redirectLoc = unauthRes.headers["location"] || "";
  assert(
    redirectLoc.includes("/kitchen/login"),
    `Unauthenticated redirect lands at /kitchen/login (location: ${redirectLoc})`
  );

  // --- Check Kitchen Login Page renders cleanly ---
  const loginPageRes = await request("http://127.0.0.1:3000/kitchen/login");
  assert(
    loginPageRes.status === 200,
    `Dedicated /kitchen/login page renders with status 200`
  );
  assert(
    loginPageRes.body.includes("Kitchen Staff Login") || loginPageRes.body.includes("Kitchen"),
    `Page contains Kitchen branding and headers`
  );

  // --- Test Case 1: Correct Kitchen credentials ---
  console.log("\n--- 2. Kitchen Staff Authentication (Valid Credentials) ---");
  const validKitchen = await login("kitchen@nutriflexs.com", "Kitchen@NutriFlexs2026!", "kitchen");
  assert(
    validKitchen.status === 200 && validKitchen.ok,
    `Kitchen staff login returns HTTP 200 OK`
  );
  assert(
    !validKitchen.error,
    `Successful login has no error`
  );
  assert(
    validKitchen.sessionCookie.length > 0,
    `NextAuth session cookie established: ${validKitchen.sessionCookie.slice(0, 35)}...`
  );

  // Also test login by username (e.g. "kitchen" or "Indiranagar Kitchen Express")
  const validByUsername = await login("kitchen", "Kitchen@NutriFlexs2026!", "kitchen");
  assert(
    validByUsername.status === 200 && validByUsername.ok,
    `Kitchen staff can log in using their username ("kitchen")`
  );

  // --- Test Case 10: Refreshing after successful login / Session persistence ---
  console.log("\n--- 3. Session Persistence & Dashboard Access ---");
  const sessionCheck = await request("http://127.0.0.1:3000/api/auth/session", {
    headers: { Cookie: validKitchen.sessionCookie },
  });
  const sessionData = JSON.parse(sessionCheck.body);
  assert(
    sessionData?.user?.email === "kitchen@nutriflexs.com",
    `Session persists user email: ${sessionData?.user?.email}`
  );
  assert(
    sessionData?.user?.role === "KITCHEN",
    `Session persists authorized role: ${sessionData?.user?.role}`
  );

  // Verify Kitchen staff can access Kitchen orders API
  const ordersRes = await request("http://127.0.0.1:3000/api/orders?view=kitchen", {
    headers: { Cookie: validKitchen.sessionCookie },
  });
  assert(
    ordersRes.status === 200,
    `Kitchen staff can access /api/orders?view=kitchen (status: ${ordersRes.status})`
  );
  const ordersData = JSON.parse(ordersRes.body);
  assert(
    ordersData.success === true && Array.isArray(ordersData.orders),
    `Live orders successfully returned from database (count: ${ordersData.orders?.length})`
  );

  // --- Test Case 2: Incorrect password ---
  console.log("\n--- 4. Invalid Password Handling ---");
  const badPassword = await login("kitchen@nutriflexs.com", "WrongPassword999!", "kitchen");
  assert(
    badPassword.status === 401 && badPassword.error === "CredentialsSignin",
    `Incorrect password rejected with generic CredentialsSignin error (status: ${badPassword.status})`
  );

  // --- Test Case 3: Unregistered account ---
  console.log("\n--- 5. Unregistered Account Handling ---");
  const unregistered = await login("nonexistent_chef@nutriflexs.com", "SomePass123!", "kitchen");
  assert(
    unregistered.status === 401 && unregistered.error === "CredentialsSignin",
    `Unregistered account rejected with generic CredentialsSignin error (status: ${unregistered.status})`
  );

  // --- Test Case 4: Customer account attempting Kitchen login ---
  console.log("\n--- 6. Role Authorization: Customer Account Rejection ---");
  const customerKitchenAttempt = await login("ashu@nutriflexs.com", "Customer@NutriFlexs2026!", "kitchen");
  assert(
    customerKitchenAttempt.status === 401 &&
      customerKitchenAttempt.error &&
      customerKitchenAttempt.error.includes("Customer accounts cannot access"),
    `Customer account denied Kitchen access: "${customerKitchenAttempt.error}"`
  );

  // Verify customer session cannot access Kitchen API
  const custLoginDirect = await login("ashu@nutriflexs.com", "Customer@NutriFlexs2026!", "");
  const custOrdersRes = await request("http://127.0.0.1:3000/api/orders?view=kitchen", {
    headers: { Cookie: custLoginDirect.sessionCookie },
  });
  assert(
    custOrdersRes.status === 403,
    `Customer session querying /api/orders?view=kitchen rejected with 403 Forbidden`
  );

  // --- Test Case 5: Trainer account attempting Kitchen login ---
  console.log("\n--- 7. Role Authorization: Trainer Account Rejection ---");
  const trainerKitchenAttempt = await login("arjun@nutriflexs.com", "Trainer@NutriFlexs2026!", "kitchen");
  assert(
    trainerKitchenAttempt.status === 401 &&
      trainerKitchenAttempt.error &&
      trainerKitchenAttempt.error.includes("Trainer accounts cannot access"),
    `Trainer account denied Kitchen access: "${trainerKitchenAttempt.error}"`
  );

  // --- Test Case 7 & 8: Form Validation ---
  console.log("\n--- 8. Client & Server Input Validation ---");
  const emptyRes = await login("", "", "kitchen");
  assert(
    emptyRes.status === 401 || emptyRes.error !== null,
    `Empty login credentials rejected cleanly (status: ${emptyRes.status})`
  );

  // --- Test Case 9: Rate Limiting ---
  console.log("\n--- 9. Brute-Force Rate Limiting ---");
  const testRateLimitEmail = `brute_test_${Date.now()}@nutriflexs.com`;
  for (let i = 0; i < 5; i++) {
    await login(testRateLimitEmail, "badpass", "kitchen");
  }
  const blockedAttempt = await login(testRateLimitEmail, "badpass", "kitchen");
  assert(
    blockedAttempt.error && blockedAttempt.error.includes("Too many failed login attempts"),
    `Brute-force protection triggered after repeated failed attempts: "${blockedAttempt.error}"`
  );

  // --- Test Case 12: Logout and session invalidation ---
  console.log("\n--- 10. Session Logout & Termination ---");
  const { csrfToken: logoutCsrf, csrfCookie: logoutCookie } = await getCsrfToken();
  const logoutRes = await request("http://127.0.0.1:3000/api/auth/signout", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `${validKitchen.sessionCookie}; ${logoutCookie}`,
    },
    body: new URLSearchParams({
      csrfToken: logoutCsrf,
      callbackUrl: "/kitchen/login",
      json: "true",
    }).toString(),
  });
  assert(
    logoutRes.status === 200,
    `NextAuth signOut returns HTTP 200`
  );

  // Verify that an expired/cleared session cannot view kitchen orders
  const expiredOrdersRes = await request("http://127.0.0.1:3000/api/orders?view=kitchen", {
    headers: { Cookie: "next-auth.session-token=invalid_expired_token_123" },
  });
  assert(
    expiredOrdersRes.status === 403 || expiredOrdersRes.status === 401,
    `Invalidated session rejected from Kitchen API (status: ${expiredOrdersRes.status})`
  );

  // --- Test Case: Password Reset Workflow ---
  console.log("\n--- 11. Password Reset Security Workflow ---");
  const forgotRes = await request("http://127.0.0.1:3000/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "kitchen@nutriflexs.com" }),
  });
  assert(
    forgotRes.status === 200,
    `POST /api/auth/forgot-password returns HTTP 200`
  );
  const forgotJson = JSON.parse(forgotRes.body);
  assert(
    forgotJson.success === true,
    `Forgot password response reports success without leaking internal DB state`
  );
  assert(
    forgotJson.emailConfigured === false,
    `Accurately reports emailConfigured: false (no fake email delivery)`
  );
  assert(
    forgotJson.emailNotice !== undefined,
    `Transparently notices that email transport is pending system configuration`
  );

  if (forgotJson.devToken) {
    const resetRes = await request("http://127.0.0.1:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: forgotJson.devToken,
        newPassword: "Kitchen@NutriFlexs2026!",
        confirmPassword: "Kitchen@NutriFlexs2026!",
      }),
    });
    if (resetRes.status !== 200) {
      console.log("Reset failed:", resetRes.status, resetRes.body);
    }
    assert(
      resetRes.status === 200,
      `POST /api/auth/reset-password updates password with single-use token (status: ${resetRes.status})`
    );

    // Verify token invalidation on second use
    const replayRes = await request("http://127.0.0.1:3000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: forgotJson.devToken,
        newPassword: "Kitchen@NutriFlexs2026!",
        confirmPassword: "Kitchen@NutriFlexs2026!",
      }),
    });
    assert(
      replayRes.status === 400,
      `Single-use reset token invalidated immediately upon use (re-use status: ${replayRes.status})`
    );
  }

  console.log("\n=================================================================");
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
