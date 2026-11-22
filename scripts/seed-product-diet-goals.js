process.loadEnvFile(".env");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

async function withRetry(op, retries = 5, delay = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await op();
    } catch (e) {
      if (i === retries) throw e;
      console.warn(`[Neon wake-up retry ${i + 1}/${retries}] Waiting ${delay * (i + 1)}ms...`);
      await new Promise((r) => setTimeout(r, delay * (i + 1)));
    }
  }
}

const INITIAL_CLASSIFICATIONS = {
  "c079186e-2f61-4343-a4c1-35ebc1719045": ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], // Green Electrolyte & Alkalizer (85 kcal, 2.5g P)
  "ae5c9a36-c711-4f1f-ae9a-9fb6a8ac580b": ["WEIGHT_GAIN", "WEIGHT_MAINTENANCE"], // Citrus Hydrator & Recovery (160 kcal, 38g C)
  "6d3da943-1e0c-4ed9-838e-50412a57eefc": ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], // Boiled Organic Egg White Pack (72 kcal, 16g P)
  "87195df0-df1f-48b2-b3dd-15f9ed87b058": ["WEIGHT_LOSS", "WEIGHT_GAIN", "WEIGHT_MAINTENANCE"], // High-Protein Egg Scramble (340 kcal, 24.5g P)
  "ffe6d0f0-5826-4fda-bc24-f0a8aa64ec55": ["WEIGHT_GAIN", "WEIGHT_MAINTENANCE"], // Herb-Grilled Organic Paneer Skewers (410 kcal, 27g P, 30g F)
  "da90059f-b2a7-4249-b9f8-03eb7eea9503": ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], // Lean Grilled Chicken Breast (220 kcal, 36g P)
  "067eb192-b308-4ed9-aaae-8dbf1aad011b": ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], // Pan-Seared Lemon Herb Fish Fillet (190 kcal, 28g P)
  "83b74499-f384-4e8b-aeb2-f3f1962ebeb8": ["WEIGHT_LOSS", "WEIGHT_GAIN", "WEIGHT_MAINTENANCE"], // Grilled Chicken & Quinoa Energy Bowl (430 kcal, 32g P)
  "ffa3d2f6-77bf-4d36-9c76-bb6b11983090": ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], // High-Protein Crunchy Veggie & Sprouts Bowl (320 kcal, 21g P)
  "30709553-1d9e-4fc9-a309-4959fbf88653": ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], // Lean Refuel (217 kcal, 17.8g P)
  "3f85d58b-b78b-4152-9a76-21bf0aacfbdc": ["WEIGHT_GAIN", "WEIGHT_MAINTENANCE"], // Vegan Muscle Pack (405 kcal, 23.5g P)
  "5b55efac-341b-440b-9dab-28fb4b7903d6": ["WEIGHT_GAIN", "WEIGHT_MAINTENANCE"], // Pro-Gainer Combo (380 kcal, 38g P)
  "e22f04b0-a567-4261-9c90-6bfeedadb0fb": ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"], // ABC Stamina Rebuilder (145 kcal, 34g C)
};

async function seedDietGoals() {
  console.log("Seeding initial diet-goal classifications for NutriFlexs products...");
  
  const products = await withRetry(() => prisma.product.findMany());
  console.log(`Found ${products.length} products in database.`);

  for (const product of products) {
    const goals = INITIAL_CLASSIFICATIONS[product.id] || ["WEIGHT_MAINTENANCE"];
    console.log(`Classifying "${product.name}" (${product.calories} kcal, ${product.protein}g P) -> [${goals.join(", ")}]`);

    await withRetry(async () => {
      await prisma.productDietGoal.deleteMany({
        where: { productId: product.id },
      });

      await prisma.productDietGoal.createMany({
        data: goals.map((goal) => ({
          productId: product.id,
          goal,
        })),
      });
    });
  }

  const totalAssigned = await withRetry(() => prisma.productDietGoal.count());
  console.log(`\nSuccessfully assigned ${totalAssigned} diet-goal classifications across ${products.length} products.`);

  await prisma.$disconnect();
}

seedDietGoals().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
