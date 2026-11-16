const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function runTests() {
  console.log("🧪 Running Smart Indian Food Variants and Portion Measurement E2E Tests...\n");

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

  // 1. Verify Parent Food Items with Variants
  console.log("Test 1: Verify Parent Dishes and Variants");
  const dishes = ["Chole / Chana Masala", "Rajma Masala", "Paneer Butter Masala", "Palak Paneer", "Chicken Curry (Homestyle)", "Egg Curry", "Dal Makhani", "Dal (Yellow Dal / Dal Fry)"];
  
  for (const dishName of dishes) {
    const parent = await prisma.foodItem.findFirst({
      where: { name: { equals: dishName, mode: "insensitive" } },
      include: { variants: { orderBy: { displayOrder: "asc" } } },
    });
    assert(Boolean(parent), `Found parent dish: ${dishName}`);
    assert(parent?.hasVariants === true, `${dishName} hasVariants is true`);
    assert(parent?.variants.length === 3, `${dishName} has exactly 3 variants (found: ${parent?.variants.length})`);
  }

  // 2. Verify Nutrition Discrepancy Between Variants (Main vs Gravy)
  console.log("\nTest 2: Verify Nutrition Distinction (Main vs Gravy)");
  const chole = await prisma.foodItem.findFirst({
    where: { name: { contains: "Chole", mode: "insensitive" } },
    include: { variants: true },
  });
  const mostlyChickpeas = chole.variants.find((v) => v.variantType === "MORE_MAIN");
  const regularChole = chole.variants.find((v) => v.variantType === "BALANCED");
  const gravyOnlyChole = chole.variants.find((v) => v.variantType === "GRAVY_ONLY");

  assert(mostlyChickpeas.protein > regularChole.protein, `Mostly Chickpeas protein (${mostlyChickpeas.protein}g) > Regular (${regularChole.protein}g)`);
  assert(regularChole.protein > gravyOnlyChole.protein, `Regular protein (${regularChole.protein}g) > Gravy only (${gravyOnlyChole.protein}g)`);
  assert(mostlyChickpeas.caloriesPer100g > gravyOnlyChole.caloriesPer100g, `Mostly Chickpeas calories (${mostlyChickpeas.caloriesPer100g}) > Gravy only (${gravyOnlyChole.caloriesPer100g})`);

  // 3. Verify Portion Serving Conversions Formula
  console.log("\nTest 3: Authoritative Portion Conversion Calculation Formula");
  // Formula: Selected nutrition = Nutrition per 100g × Selected quantity in grams / 100
  const conversions = mostlyChickpeas.servingConversions;
  assert(Boolean(conversions.medium_bowl), `Variant has medium_bowl conversion (${conversions.medium_bowl}g)`);
  assert(Boolean(conversions.small_bowl), `Variant has small_bowl conversion (${conversions.small_bowl}g)`);
  assert(Boolean(conversions.large_bowl), `Variant has large_bowl conversion (${conversions.large_bowl}g)`);
  assert(Boolean(conversions.cup), `Variant has cup conversion (${conversions.cup}g)`);

  const medBowlGrams = conversions.medium_bowl; // 180g
  const expectedCals = Math.round((mostlyChickpeas.caloriesPer100g * medBowlGrams / 100) * 10) / 10;
  const expectedProt = Math.round((mostlyChickpeas.protein * medBowlGrams / 100) * 10) / 10;
  
  assert(expectedCals === 320.4, `1 medium bowl (180g) Mostly Chickpeas calories = 320.4 kcal (got: ${expectedCals})`);
  assert(expectedProt === 18.4, `1 medium bowl (180g) Mostly Chickpeas protein = 18.4g (got: ${expectedProt})`);

  // 4. Test Diary Logging with Variant Foreign Key & Snapshots
  console.log("\nTest 4: Logging Variant to Food Diary");
  const testUser = await prisma.user.findFirst();
  assert(Boolean(testUser), `Found user for logging test: ${testUser?.email}`);

  if (testUser) {
    const todayKey = new Date().toISOString().split("T")[0];
    const createdLog = await prisma.foodLog.create({
      data: {
        userId: testUser.id,
        foodItemId: chole.id,
        foodVariantId: mostlyChickpeas.id,
        foodNameSnapshot: mostlyChickpeas.name,
        variantNameSnapshot: mostlyChickpeas.name,
        servingUnitSnapshot: "medium_bowl",
        gramsCalculated: medBowlGrams,
        mealType: "LUNCH",
        quantity: 1,
        unit: "medium_bowl",
        calories: expectedCals,
        protein: expectedProt,
        carbohydrates: Math.round((mostlyChickpeas.carbohydrates * medBowlGrams / 100) * 10) / 10,
        fat: Math.round((mostlyChickpeas.fat * medBowlGrams / 100) * 10) / 10,
        dateKey: todayKey,
        loggedAt: new Date(),
      },
    });

    assert(Boolean(createdLog.id), `Logged entry created with ID: ${createdLog.id}`);
    assert(createdLog.foodVariantId === mostlyChickpeas.id, `FoodLog.foodVariantId points to variant: ${createdLog.foodVariantId}`);
    assert(createdLog.variantNameSnapshot === "Chole – Mostly Chickpeas", `FoodLog.variantNameSnapshot is preserved`);
    assert(createdLog.gramsCalculated === 180, `FoodLog.gramsCalculated is 180g`);

    // Clean up test log
    await prisma.foodLog.delete({ where: { id: createdLog.id } });
    console.log("  🧹 Cleaned up test food log entry");
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

