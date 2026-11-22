const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function run() {
  console.log("=== Verifying Diet Goal Classifications in PostgreSQL ===");

  const allCount = await prisma.productDietGoal.count();
  console.log(`Total ProductDietGoal rows in database: ${allCount}`);

  const lossCount = await prisma.productDietGoal.count({ where: { goal: "WEIGHT_LOSS" } });
  const gainCount = await prisma.productDietGoal.count({ where: { goal: "WEIGHT_GAIN" } });
  const maintCount = await prisma.productDietGoal.count({ where: { goal: "WEIGHT_MAINTENANCE" } });

  console.log(`- Weight Loss: ${lossCount} products`);
  console.log(`- Weight Gain: ${gainCount} products`);
  console.log(`- Weight Maintenance: ${maintCount} products`);

  const productsWithGoals = await prisma.product.findMany({
    include: {
      dietGoals: true,
      category: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("\nProducts and their assigned goals:");
  productsWithGoals.forEach((p, idx) => {
    const goals = p.dietGoals.map((g) => g.goal).join(", ");
    console.log(`${idx + 1}. [${p.isVeg ? "VEG" : "NON-VEG"}] "${p.name}" (${p.calories} kcal, ${p.protein}g P) -> [${goals}]`);
  });

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
