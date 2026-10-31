const { Role, PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runProductionRefusalTests() {
  console.log("==================================================================");
  console.log("🔒 TESTING PRODUCTION & DISABLED FLAG REFUSAL OF DEV TEST CODES");
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

  // Import after setting env or dynamic require
  const staffLib = require("../lib/staff-access-codes");

  const devTestCodes = [
    { code: "NF-TEST-KITCHEN-2026", role: Role.KITCHEN },
    { code: "NF-TEST-TRAINER-2026", role: Role.TRAINER },
    { code: "NF-TEST-ADMIN-2026", role: Role.ADMIN },
  ];

  // SCENARIO 1: NODE_ENV === "production"
  console.log("--- SCENARIO 1: When NODE_ENV === 'production' ---");
  process.env.NODE_ENV = "production";
  process.env.STAFF_ACCESS_CODES_ENABLED = "true";

  assert(
    staffLib.areDevTestCodesEnabled() === false,
    "areDevTestCodesEnabled() returns FALSE in production mode"
  );

  for (const item of devTestCodes) {
    const res = await staffLib.validateAndConsumeStaffCode({
      code: item.code,
      requiredRole: item.role,
    });

    assert(
      res.valid === false && res.error === "Invalid or unauthorized staff access code.",
      `Production mode strictly refuses test code "${item.code}" (valid: ${res.valid})`
    );
  }

  // SCENARIO 2: STAFF_ACCESS_CODES_ENABLED === "false" in development
  console.log("\n--- SCENARIO 2: When STAFF_ACCESS_CODES_ENABLED === 'false' in dev ---");
  process.env.NODE_ENV = "development";
  process.env.STAFF_ACCESS_CODES_ENABLED = "false";

  assert(
    staffLib.areDevTestCodesEnabled() === false,
    "areDevTestCodesEnabled() returns FALSE when STAFF_ACCESS_CODES_ENABLED='false'"
  );

  for (const item of devTestCodes) {
    const res = await staffLib.validateAndConsumeStaffCode({
      code: item.code,
      requiredRole: item.role,
    });

    assert(
      res.valid === false && res.error === "Invalid or unauthorized staff access code.",
      `Disabled flag strictly refuses test code "${item.code}" (valid: ${res.valid})`
    );
  }

  // SCENARIO 3: STAFF_ACCESS_CODES_ENABLED === "true" and NODE_ENV !== "production"
  console.log("\n--- SCENARIO 3: When STAFF_ACCESS_CODES_ENABLED === 'true' in development ---");
  process.env.NODE_ENV = "development";
  process.env.STAFF_ACCESS_CODES_ENABLED = "true";

  assert(
    staffLib.areDevTestCodesEnabled() === true,
    "areDevTestCodesEnabled() returns TRUE only when dev && explicitly enabled"
  );

  console.log("\n==================================================================");
  console.log(`📊 PRODUCTION REFUSAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionRefusalTests()
  .catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
