const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Simple env loader fallback if not launched with --env-file
if (!process.env.DATABASE_URL && fs.existsSync(path.join(__dirname, '../.env'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient();

async function withRetry(operation, maxRetries = 5, delayMs = 2000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (attempt < maxRetries) {
        const backoff = delayMs * (attempt + 1);
        console.warn(`[Neon DB Retry] Retrying operation in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, backoff));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log("Starting comprehensive food database seeding...");

  const dataPath = path.join(__dirname, '../data/comprehensive-nutrition-database.json');
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found at: ${dataPath}`);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const foodItems = JSON.parse(rawData);
  console.log(`Found ${foodItems.length} items to seed/upsert.`);

  // Fetch all existing foods from database with retry
  const existingFoods = await withRetry(() => prisma.foodItem.findMany({
    select: {
      id: true,
      name: true,
      category: true,
      isCustom: true
    }
  }));

  console.log(`Existing items in DB before seeding: ${existingFoods.length}`);

  // Create lookup map by lowercase normalized name
  const existingMap = new Map();
  for (const f of existingFoods) {
    existingMap.set(f.name.trim().toLowerCase(), f);
  }

  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < foodItems.length; i++) {
    const item = foodItems[i];
    const normName = item.name.trim().toLowerCase();

    const existing = existingMap.get(normName);

    const dataPayload = {
      name: item.name.trim(),
      description: item.description || null,
      category: item.category,
      subCategory: item.subCategory || null,
      cuisine: item.cuisine || null,
      brand: item.brand || null,
      caloriesPer100g: item.caloriesPer100g,
      protein: item.protein,
      carbohydrates: item.carbohydrates,
      fat: item.fat,
      fiber: item.fiber || 0,
      sugar: item.sugar || 0,
      sodium: item.sodium || 0,
      saturatedFat: item.saturatedFat || 0,
      defaultServingSize: item.defaultServingSize || 1,
      defaultServingUnit: item.defaultServingUnit || "g",
      servingWeightGrams: item.servingWeightGrams || 100,
      servingUnits: item.servingUnits || null,
      dataSource: item.dataSource || "ICMR-NIN (IFCT 2017)",
      isVerified: true,
      isActive: true,
      isCustom: false
    };

    if (existing) {
      await withRetry(() => prisma.foodItem.update({
        where: { id: existing.id },
        data: dataPayload
      }));
      updatedCount++;
    } else {
      const created = await withRetry(() => prisma.foodItem.create({
        data: dataPayload
      }));
      existingMap.set(normName, created);
      insertedCount++;
    }

    if ((i + 1) % 50 === 0 || i === foodItems.length - 1) {
      console.log(`Progress: ${i + 1}/${foodItems.length} (Inserted: ${insertedCount}, Updated: ${updatedCount})`);
    }
  }

  const finalCount = await withRetry(() => prisma.foodItem.count());
  console.log("\n=======================================================");
  console.log(`Seeding complete!`);
  console.log(`Total FoodItems in DB: ${finalCount}`);
  console.log(`New foods inserted: ${insertedCount}`);
  console.log(`Existing foods enriched/updated: ${updatedCount}`);
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Error during food database seeding:", e);
  await prisma.$disconnect();
  process.exit(1);
});
