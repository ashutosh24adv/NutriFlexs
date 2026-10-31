const { PrismaClient, Role } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log("🔒 Provisioning secure staff accounts and passwords in Neon PostgreSQL...");

  const defaultOutlet = await prisma.outlet.findFirst();

  const staffAccounts = [
    {
      name: "Super Admin Ops",
      email: "admin@nutriflexs.com",
      password: "Admin@NutriFlexs2026!",
      role: Role.ADMIN,
      outletId: null,
    },
    {
      name: "Chef Rajesh",
      email: "kitchen@nutriflexs.com",
      password: "Kitchen@NutriFlexs2026!",
      role: Role.KITCHEN,
      outletId: defaultOutlet?.id || null,
      gymId: defaultOutlet?.gymId || null,
    },
    {
      name: "Trainer Arjun",
      email: "arjun@nutriflexs.com",
      password: "Trainer@NutriFlexs2026!",
      role: Role.TRAINER,
      outletId: null,
    },
    {
      name: "Ashutosh Sharma",
      email: "ashu@nutriflexs.com",
      password: "Customer@NutriFlexs2026!",
      role: Role.CUSTOMER,
      outletId: defaultOutlet?.id || null,
      gymId: defaultOutlet?.gymId || null,
    },
  ];

  for (const account of staffAccounts) {
    const existing = await prisma.user.findUnique({
      where: { email: account.email },
    });

    const hashed = hashPassword(account.password);

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: hashed,
          role: account.role,
          selectedOutletId: account.outletId || existing.selectedOutletId,
        },
      });
      console.log(`✅ Updated password hash and role for ${existing.email} (${account.role})`);
    } else {
      const created = await prisma.user.create({
        data: {
          name: account.name,
          email: account.email,
          passwordHash: hashed,
          role: account.role,
          selectedOutletId: account.outletId,
          selectedGymId: account.gymId,
          streakDays: 1,
          proteinGoalGrams: 120,
        },
      });
      if (account.role === Role.TRAINER) {
        await prisma.trainer.create({
          data: {
            userId: created.id,
            referralCode: "NUTRI-ARJUN-PROV",
            totalReferrals: 0,
            activeSubscribers: 0,
            rewardsEarned: 0,
          },
        });
      }
      console.log(`✅ Provisioned new account for ${created.email} (${created.role})`);
    }
  }

  console.log("✨ Done provisioning staff accounts.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
