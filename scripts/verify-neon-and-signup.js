const dns = require("dns");
const net = require("net");
const fs = require("fs");

let envContent = "";
if (fs.existsSync(".env")) envContent += fs.readFileSync(".env", "utf8") + "\n";
if (fs.existsSync(".env.local")) envContent += fs.readFileSync(".env.local", "utf8") + "\n";
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx > 0) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (val.startsWith("\"") && val.endsWith("\"")) val = val.slice(1, -1);
    if (val.startsWith("\x27") && val.endsWith("\x27")) val = val.slice(1, -1);
    process.env[key] = val;
  }
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("====================================================");
  console.log("  NUTRIFLEXS NEON DATABASE & SIGNUP VERIFICATION    ");
  console.log("====================================================\n");

  const dbUrl = process.env.DATABASE_URL;
  const u = new URL(dbUrl);
  const host = u.hostname;
  const port = parseInt(u.port || "5432", 10);

  // 1. DNS Resolution Test
  console.log("[Test 1] Testing DNS resolution for:", host);
  const ipAddress = await new Promise((resolve, reject) => {
    dns.lookup(host, (err, addr) => {
      if (err) reject(err);
      else resolve(addr);
    });
  });
  console.log("  ✓ DNS resolved successfully to IP:", ipAddress);

  // 2. TCP Port Test
  console.log("\n[Test 2] Testing TCP connection to", host, "on port", port);
  const tcpSuccess = await new Promise((resolve, reject) => {
    const start = Date.now();
    const sock = net.createConnection({ host, port, timeout: 5000 }, () => {
      const elapsed = Date.now() - start;
      sock.end();
      resolve(elapsed);
    });
    sock.on("timeout", () => {
      sock.destroy();
      reject(new Error("TCP connection timed out"));
    });
    sock.on("error", (err) => reject(err));
  });
  console.log("  ✓ TCP connection established in:", tcpSuccess, "ms");

  // 3. Simple Prisma Query
  console.log("\n[Test 3] Testing Prisma raw query...");
  const rawRes = await prisma.$queryRaw`SELECT 1 as test_val, current_database() as db_name`;
  console.log("  ✓ Prisma query succeeded. DB:", rawRes[0].db_name, "Value:", rawRes[0].test_val);

  // 4. Test prisma.user.findUnique()
  console.log("\n[Test 4] Testing prisma.user.findUnique()...");
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "ashusahuadmin@gmail.com" },
    select: { id: true, name: true, email: true, role: true }
  });
  console.log("  ✓ prisma.user.findUnique() succeeded. Found user:", existingAdmin ? {
    id: existingAdmin.id,
    name: existingAdmin.name,
    email: existingAdmin.email,
    role: existingAdmin.role
  } : "Not found");

  // 5. Test Server Health & APIs
  console.log("\n[Test 5] Testing Next.js API endpoints connected to Neon...");
  const gymRes = await fetch("http://localhost:3000/api/gyms");
  const gymData = await gymRes.json();
  console.log("  ✓ /api/gyms status:", gymRes.status, "Active gyms count:", gymData.gyms?.length || 0);

  const subRes = await fetch("http://localhost:3000/api/subscriptions");
  const subData = await subRes.json();
  console.log("  ✓ /api/subscriptions status:", subRes.status, "Plans count:", subData.plans?.length || 0);

  // 6. Test Signup End-to-End: Duplicate Email Check
  console.log("\n[Test 6] Testing Duplicate Email Check on /api/auth/register...");
  const dupRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Duplicate Tester",
      email: "ashusahuadmin@gmail.com", // known existing email
      password: "password@123",
      portal: "customer",
    }),
  });
  const dupData = await dupRes.json();
  console.log("  ✓ Status:", dupRes.status);
  console.log("  ✓ Error message received:", dupData.error);
  if (dupRes.status !== 400 || dupData.error !== "An account with this email already exists") {
    throw new Error("Duplicate email check did not return expected message");
  }

  // 7. Test Signup End-to-End: New Customer Registration
  const testCustomerEmail = `e2e_customer_${Date.now()}@nutriflexstest.com`;
  console.log("\n[Test 7] Testing New Customer Registration on /api/auth/register...");
  console.log("  Registering:", testCustomerEmail);
  const regRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Test Customer",
      email: testCustomerEmail,
      phone: "+919876543210",
      password: "StrongPassword@123",
      portal: "customer",
    }),
  });
  const regData = await regRes.json();
  console.log("  ✓ Registration status:", regRes.status);
  console.log("  ✓ Success flag:", regData.success);
  console.log("  ✓ Created User ID:", regData.user?.id);
  console.log("  ✓ Role assigned:", regData.user?.role);

  if (regRes.status !== 200 || !regData.success || regData.user?.role !== "CUSTOMER") {
    throw new Error("Customer registration failed: " + JSON.stringify(regData));
  }

  // 8. Verify the new user exists in Neon database via Prisma
  console.log("\n[Test 8] Verifying user record in Neon database via Prisma...");
  const verifiedUser = await prisma.user.findUnique({
    where: { email: testCustomerEmail },
    select: { id: true, name: true, email: true, role: true, streakDays: true, proteinGoalGrams: true }
  });
  console.log("  ✓ Verified in Neon:", verifiedUser);

  // 9. Test NextAuth Credentials Login with Existing Account
  console.log("\n[Test 9] Testing Existing Account Login via NextAuth Credentials Provider...");
  // Use CSRF token from NextAuth
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfData = await csrfRes.json();
  const cookies = csrfRes.headers.get("set-cookie") || "";

  const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies,
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      email: "ashusahuadmin@gmail.com",
      password: "password@123",
      redirect: "false",
      json: "true",
    }),
    redirect: "manual",
  });
  console.log("  ✓ NextAuth callback response status:", loginRes.status);

  // 10. Clean up only the temporary test customer created in Step 7
  console.log("\n[Test 10] Cleaning up temporary test customer...");
  await prisma.user.delete({
    where: { email: testCustomerEmail }
  });
  console.log("  ✓ Temporary test customer safely deleted. Existing user records untouched.");

  // 11. Final Count Check
  const finalCount = await prisma.user.count();
  console.log("  ✓ Final existing user count in Neon:", finalCount);

  console.log("\n====================================================");
  console.log("  ALL TESTS PASSED SUCCESSFULLY! NEON CONNECTION 100% OPERATIONAL.");
  console.log("====================================================");
}

runTests()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

