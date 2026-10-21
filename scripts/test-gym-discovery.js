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

async function runGymDiscoveryTests() {
  console.log("🚀 Starting NutriFlexs Gym Discovery & Nearby Locations Test Suite...\n");
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

  // 1. API - Get All Active Gyms (Database-backed)
  console.log("--- 1. Backend Gyms API (PostgreSQL Query) ---");
  const allGymsRes = await request("http://localhost:3000/api/gyms");
  assert(allGymsRes.status === 200, `GET /api/gyms returns 200 (got ${allGymsRes.status})`);
  const allGymsData = JSON.parse(allGymsRes.body);
  assert(allGymsData.success === true, "API response success is true");
  assert(Array.isArray(allGymsData.gyms) && allGymsData.gyms.length >= 3, `Returned at least 3 partner gyms (found ${allGymsData.gyms?.length})`);

  const indiranagarGym = allGymsData.gyms.find((g) => g.name.includes("Cult.fit Indiranagar"));
  assert(!!indiranagarGym, "Database contains Cult.fit Indiranagar");
  assert(indiranagarGym && indiranagarGym.outlets && indiranagarGym.outlets.length > 0, "Cult.fit Indiranagar has associated kiosk outlets");

  const bandraGym = allGymsData.gyms.find((g) => g.name.includes("Nitrro Wellness Bandra"));
  assert(!!bandraGym && bandraGym.city === "Mumbai", "Database contains Nitrro Wellness Bandra in Mumbai");

  // 2. API - Nearby Gyms Geolocation & Distance Calculation
  console.log("\n--- 2. Geolocation Nearby Gyms API ---");
  // Coordinates near Indiranagar Cult.fit (lat 12.9784, lng 77.6408)
  const nearbyIndiranagarRes = await request("http://localhost:3000/api/gyms/nearby?lat=12.9784&lng=77.6408");
  assert(nearbyIndiranagarRes.status === 200, `GET /api/gyms/nearby with coordinates returns 200 (got ${nearbyIndiranagarRes.status})`);
  const nearbyIndiranagarData = JSON.parse(nearbyIndiranagarRes.body);
  assert(nearbyIndiranagarData.success === true, "Nearby gyms query succeeds");
  assert(Array.isArray(nearbyIndiranagarData.gyms) && nearbyIndiranagarData.gyms.length > 0, "Returned nearby gyms list");

  // Verify sorted nearest first: Cult.fit Indiranagar must be first (distance ~0 km)
  const nearestGym = nearbyIndiranagarData.gyms[0];
  assert(nearestGym.gymName.includes("Cult.fit Indiranagar"), `Nearest gym is Indiranagar (got ${nearestGym.gymName})`);
  assert(typeof nearestGym.distanceKm === "number" && nearestGym.distanceKm < 0.1, `Calculated distance is accurate (< 0.1km, got ${nearestGym.distanceKm})`);
  assert(typeof nearestGym.formattedDistance === "string" && nearestGym.formattedDistance.includes("m away"), `Formatted distance string is user-friendly (${nearestGym.formattedDistance})`);

  // Verify further gyms sorted after: Koramangala then Bandra (Mumbai)
  const lastGym = nearbyIndiranagarData.gyms[nearbyIndiranagarData.gyms.length - 1];
  assert(lastGym.gymName.includes("Bandra"), `Furthest gym is Bandra Mumbai (got ${lastGym.gymName})`);
  assert(lastGym.distanceKm > 500, `Distance to Mumbai is realistic (> 500km, got ${lastGym.distanceKm}km)`);

  // 3. API - Coordinate Validation & Error Handling
  console.log("\n--- 3. Geolocation Validation & Error Handling ---");
  const invalidGeoRes = await request("http://localhost:3000/api/gyms/nearby?lat=invalid&lng=100");
  assert(invalidGeoRes.status === 400, `Invalid latitude rejected with 400 (got ${invalidGeoRes.status})`);

  const outOfBoundsGeoRes = await request("http://localhost:3000/api/gyms/nearby?lat=95&lng=100");
  assert(outOfBoundsGeoRes.status === 400, `Out of bounds latitude (> 90) rejected with 400 (got ${outOfBoundsGeoRes.status})`);

  // 4. Page Routing & HTML Verification
  console.log("\n--- 4. Dedicated Gym Discovery Page (/gyms) ---");
  const gymsPageRes = await request("http://localhost:3000/gyms");
  assert(gymsPageRes.status === 200, `GET /gyms returns 200 OK (got ${gymsPageRes.status})`);
  assert(gymsPageRes.body.includes("Partner Gym"), "Page renders Partner Gym title");
  assert(gymsPageRes.body.includes("Use My Location"), "Page contains Use My Location button");

  // 5. Hero Button & Navbar Links Verification
  console.log("\n--- 5. Hero Button & Navbar Links ---");
  const homeRes = await request("http://localhost:3000/");
  assert(homeRes.status === 200, "Landing page returns 200 OK");
  assert(homeRes.body.includes('href="/gyms"'), "Hero FIND YOUR GYM or Navbar links to /gyms");
  assert(homeRes.body.includes("Nearby Gyms"), "Navbar includes Nearby Gyms link");

  const menuRes = await request("http://localhost:3000/menu");
  assert(menuRes.status === 200, "Menu page returns 200 OK");
  assert(menuRes.body.includes("Nearby Gyms"), "Menu page navbar includes Nearby Gyms");
  assert(menuRes.body.includes("Pickup Location:"), "Menu page displays active pickup location strip");

  // 6. User Gym Preference Sync (Authenticated)
  console.log("\n--- 6. User Gym Preference Sync (Authenticated Customer) ---");
  const customerLogin = await login("ashu@nutriflexs.com", "Customer@NutriFlexs2026!");
  assert(customerLogin.sessionCookie.includes("next-auth.session-token"), "Customer successfully logged in");

  // Test updating preferred gym to Gold's Koramangala
  const goldsGym = allGymsData.gyms.find((g) => g.name.includes("Gold"));
  const goldsOutlet = goldsGym.outlets[0];

  const updateGymRes = await request("http://localhost:3000/api/user/gym", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: customerLogin.sessionCookie,
    },
    body: JSON.stringify({
      gymId: goldsGym.id,
      outletId: goldsOutlet.id,
    }),
  });
  assert(updateGymRes.status === 200, `POST /api/user/gym updates preference (status ${updateGymRes.status})`);
  const updateGymData = JSON.parse(updateGymRes.body);
  assert(updateGymData.selectedGymId === goldsGym.id, "User profile gym updated in PostgreSQL");
  assert(updateGymData.selectedOutletId === goldsOutlet.id, "User profile outlet updated in PostgreSQL");

  // Verify persistence via GET /api/user/gym
  const getPrefRes = await request("http://localhost:3000/api/user/gym", {
    headers: { Cookie: customerLogin.sessionCookie },
  });
  const getPrefData = JSON.parse(getPrefRes.body);
  assert(getPrefData.selectedGymId === goldsGym.id, "Persisted gym matches updated gym after reload");

  console.log(`\n================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================`);
  if (failed > 0) process.exit(1);
}

runGymDiscoveryTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
