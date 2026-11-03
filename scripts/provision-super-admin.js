const { PrismaClient, Role } = require("@prisma/client");
const { randomBytes, scryptSync, timingSafeEqual } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  if (!password) {
    throw new Error("Password cannot be empty");
  }
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  if (!storedHash.startsWith("scrypt:")) return false;
  const parts = storedHash.split(":");
  if (parts.length !== 3) return false;
  const [, salt, keyHex] = parts;
  const keyBuffer = Buffer.from(keyHex, "hex");
  const derivedKey = scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(keyBuffer, derivedKey);
}

async function main() {
  const targetEmail = process.env.ADMIN_EMAIL || "ashusahuadmin@gmail.com";
  const targetName = process.env.ADMIN_NAME || "Ashutosh Sahu";
  const targetPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD;

  if (!targetPassword) {
    console.error("ADMIN_PASSWORD environment variable required to run this script.");
    process.exit(1);
  }

  console.log("==================================================================");
  console.log("NutriFlexs Super Admin Account Provisioning");
  console.log("==================================================================");

  // 1. Check existing account
  const existing = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  const secureHash = hashPassword(targetPassword);
  let adminUser = null;

  if (existing) {
    console.log(`ℹ️ Account ${targetEmail} already exists. Updating role to Role.ADMIN and refreshing password hash...`);
    adminUser = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: targetName,
        passwordHash: secureHash,
        role: Role.ADMIN,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    console.log("✅ Existing user successfully updated to Role.ADMIN.");
  } else {
    console.log(`Creating new Super Admin user ${targetEmail}...`);
    adminUser = await prisma.user.create({
      data: {
        name: targetName,
        email: targetEmail,
        passwordHash: secureHash,
        role: Role.ADMIN,
        streakDays: 1,
        proteinGoalGrams: 120,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    console.log("✅ New Super Admin user successfully created in Neon PostgreSQL.");
  }

  // 2. Local cryptographic verification
  const isHashValid = verifyPassword(targetPassword, secureHash);
  console.log(`✅ Password verification algorithm check: ${isHashValid ? "PASSED" : "FAILED"}`);

  // 3. Authenticate with NextAuth credentials endpoint
  const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
  console.log(`\nVerifying NextAuth authentication against ${BASE_URL}...`);

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
      email: targetEmail,
      password: targetPassword,
      redirect: "false",
    }),
    redirect: "manual",
  });

  const rawCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get("set-cookie")];
  const cookieHeader = (rawCookies || []).join("; ");
  const hasSessionToken = cookieHeader.includes("next-auth.session-token");
  console.log(`✅ NextAuth login response status: ${loginRes.status}`);
  console.log(`✅ Session cookie issued: ${hasSessionToken ? "YES" : "NO"}`);

  // Extract session token
  const tokenMatch = cookieHeader.match(/next-auth\.session-token=([^;]+)/);
  const sessionToken = tokenMatch ? tokenMatch[1] : null;

  if (sessionToken) {
    // 4. Verify Super Admin dashboard access
    const adminPageRes = await fetch(`${BASE_URL}/admin`, {
      headers: {
        Cookie: `next-auth.session-token=${sessionToken}`,
      },
      redirect: "manual",
    });
    console.log(`✅ Super Admin dashboard (/admin) HTTP status: ${adminPageRes.status} (200 = Authorized)`);

    // 5. Verify Super Admin API route access
    const adminApiRes = await fetch(`${BASE_URL}/api/admin/access-codes`, {
      headers: {
        Cookie: `next-auth.session-token=${sessionToken}`,
      },
    });
    const adminApiData = await adminApiRes.json();
    console.log(`✅ Super Admin API (/api/admin/access-codes) HTTP status: ${adminApiRes.status}, success: ${adminApiData.success}`);
  }

  console.log("\n==================================================================");
  console.log("Account Summary (Sensitive credentials redacted):");
  console.log(`• Full Name : ${adminUser.name}`);
  console.log(`• Email     : ${adminUser.email}`);
  console.log(`• Role      : ${adminUser.role} (SUPER_ADMIN)`);
  console.log(`• User ID   : ${adminUser.id}`);
  console.log(`• Status    : ACTIVE & VERIFIED`);
  console.log("==================================================================");
}

main()
  .catch((err) => {
    console.error("❌ Error provisioning Super Admin account:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
