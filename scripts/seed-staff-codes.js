const { PrismaClient } = require("@prisma/client");
const { createHmac } = require("crypto");

const prisma = new PrismaClient();

const STAFF_CODE_SECRET =
  process.env.STAFF_CODE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "nutriflexs_staff_access_code_hmac_secret_2026";

function hashAccessCode(code) {
  const normalized = (code || "").trim().toUpperCase();
  return createHmac("sha256", STAFF_CODE_SECRET).update(normalized).digest("hex");
}

async function seedStaffCodes() {
  console.log("🔐 Checking development staff access code provisioning...");

  if (process.env.NODE_ENV === "production") {
    console.error("🛑 Refusing to seed development staff test codes in production!");
    return;
  }

  const isExplicitlyEnabled =
    process.env.STAFF_ACCESS_CODES_ENABLED === "true" ||
    process.env.STAFF_ACCESS_CODES_ENABLED === "1";

  if (!isExplicitlyEnabled) {
    console.log(
      "ℹ️ STAFF_ACCESS_CODES_ENABLED is not 'true'. Skipping test access code provisioning."
    );
    return;
  }

  // Find default outlet for the kitchen test code
  const indiranagarOutlet = await prisma.outlet.findFirst({
    where: { name: { contains: "Indiranagar" } },
  });

  const defaultOutlet = indiranagarOutlet || (await prisma.outlet.findFirst());

  if (!defaultOutlet) {
    console.warn("⚠️ No outlet found in database. Kitchen test code will not have an outlet pre-assigned.");
  }

  const devCodes = [
    {
      code: "NF-TEST-KITCHEN-2026",
      codePrefix: "NF-TEST-KITCHEN",
      role: "KITCHEN",
      outletId: defaultOutlet ? defaultOutlet.id : null,
      maxUses: 1000,
      description: "Development Seed: Kitchen Display Kiosk (Test Code)",
    },
    {
      code: "NF-TEST-TRAINER-2026",
      codePrefix: "NF-TEST-TRAINER",
      role: "TRAINER",
      outletId: null,
      maxUses: 1000,
      description: "Development Seed: Trainer Partner Portal (Test Code)",
    },
    {
      code: "NF-TEST-ADMIN-2026",
      codePrefix: "NF-TEST-ADMIN",
      role: "ADMIN",
      outletId: null,
      maxUses: 1000,
      description: "Development Seed: Super Admin Operations (Test Code)",
    },
  ];

  for (const item of devCodes) {
    const codeHash = hashAccessCode(item.code);

    const record = await prisma.staffAccessCode.upsert({
      where: { codeHash },
      update: {
        codePrefix: item.codePrefix,
        role: item.role,
        outletId: item.outletId,
        isActive: true,
        maxUses: item.maxUses,
        isDevSeed: true,
        description: item.description,
      },
      create: {
        codeHash,
        codePrefix: item.codePrefix,
        role: item.role,
        outletId: item.outletId,
        isActive: true,
        maxUses: item.maxUses,
        usedCount: 0,
        isDevSeed: true,
        description: item.description,
      },
    });

    console.log(`✅ Seeded staff test code: ${item.role} (${item.codePrefix}••••) -> ID: ${record.id}`);
  }

  console.log("✨ Development staff access codes successfully provisioned.");
}

seedStaffCodes()
  .catch((e) => {
    console.error("❌ Error seeding staff codes:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
