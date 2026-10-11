const { PrismaClient } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log("🔒 Provisioning secure staff passwords in Neon PostgreSQL...");

  const staffAccounts = [
    { email: "admin@nutriflexs.com", password: "Admin@NutriFlexs2026!" },
    { email: "kitchen@nutriflexs.com", password: "Kitchen@NutriFlexs2026!" },
    { email: "arjun@nutriflexs.com", password: "Trainer@NutriFlexs2026!" },
    { email: "ashu@nutriflexs.com", password: "Customer@NutriFlexs2026!" },
  ];

  for (const account of staffAccounts) {
    const user = await prisma.user.findUnique({
      where: { email: account.email },
    });

    if (user) {
      const hashed = hashPassword(account.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashed },
      });
      console.log(`✅ Provisioned password hash for ${user.email} (${user.role})`);
    } else {
      console.warn(`⚠️ User not found: ${account.email}`);
    }
  }

  console.log("Done provisioning.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
