const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Updating all product preparation times in Neon PostgreSQL to 5 minutes...");

  const beforeProducts = await prisma.product.findMany({
    select: { id: true, name: true, preparationTimeMinutes: true },
  });

  console.log(`Found ${beforeProducts.length} products before update:`);
  beforeProducts.forEach((p) => {
    console.log(`- ${p.name}: ${p.preparationTimeMinutes} min`);
  });

  const updateResult = await prisma.product.updateMany({
    data: {
      preparationTimeMinutes: 5,
    },
  });

  console.log(`\nUpdated ${updateResult.count} products to 5 minutes.`);

  const afterProducts = await prisma.product.findMany({
    select: { id: true, name: true, preparationTimeMinutes: true },
  });

  console.log("\nVerification after update:");
  let allFive = true;
  afterProducts.forEach((p) => {
    console.log(`- ${p.name}: ${p.preparationTimeMinutes} min`);
    if (p.preparationTimeMinutes !== 5) {
      allFive = false;
    }
  });

  if (allFive) {
    console.log("\n✅ SUCCESS: All products in the database now have preparationTimeMinutes = 5.");
  } else {
    console.error("\n❌ ERROR: Some products do not have preparationTimeMinutes = 5.");
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Failed to update products:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

