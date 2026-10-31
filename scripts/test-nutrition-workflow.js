const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runNutritionVerification() {
  console.log("==================================================================");
  console.log("🥗 RUNNING COMPLETE NUTRITION WORKFLOW VERIFICATION");
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

  try {
    // 1. Verify model accessor existence
    assert(typeof prisma.foodItem?.findMany === "function", "prisma.foodItem.findMany is defined");
    assert(typeof prisma.foodLog?.findMany === "function", "prisma.foodLog.findMany is defined");
    assert(typeof prisma.nutritionGoal?.findUnique === "function", "prisma.nutritionGoal.findUnique is defined");

    // 2. Count seeded food items in Neon
    const totalFoods = await prisma.foodItem.count();
    assert(totalFoods >= 70, `Neon PostgreSQL contains ${totalFoods} food items (>= 70 expected)`);

    // 3. Test exact searches: Rice, Roti, Dal, Paneer, Chicken
    const rice = await prisma.foodItem.findMany({
      where: { name: { contains: "Rice", mode: "insensitive" } },
    });
    assert(rice.length > 0, `Search for 'Rice' returned ${rice.length} items from database`);

    const roti = await prisma.foodItem.findMany({
      where: { name: { contains: "Roti", mode: "insensitive" } },
    });
    assert(roti.length > 0, `Search for 'Roti' returned ${roti.length} items from database`);

    const dal = await prisma.foodItem.findMany({
      where: { name: { contains: "Dal", mode: "insensitive" } },
    });
    assert(dal.length > 0, `Search for 'Dal' returned ${dal.length} items from database`);

    const paneer = await prisma.foodItem.findMany({
      where: { name: { contains: "Paneer", mode: "insensitive" } },
    });
    assert(paneer.length > 0, `Search for 'Paneer' returned ${paneer.length} items from database`);

    const chicken = await prisma.foodItem.findMany({
      where: { name: { contains: "Chicken", mode: "insensitive" } },
    });
    assert(chicken.length > 0, `Search for 'Chicken' returned ${chicken.length} items from database`);

    // 4. Test selecting an item and serving math
    const brownRice = rice.find((r) => r.name.includes("Brown Rice")) || rice[0];
    assert(brownRice != null, `Selected item: ${brownRice.name}`);

    // Standard formula: 200g cooked brown rice (caloriesPer100g = 112)
    const grams = 200;
    const factor = grams / 100;
    const expectedCals = Math.round(brownRice.caloriesPer100g * factor * 10) / 10;
    const expectedProtein = Math.round(brownRice.protein * factor * 10) / 10;
    assert(expectedCals === 224, `200g Brown Rice calculates to 224 kcal (got ${expectedCals})`);
    assert(expectedProtein === 5.2, `200g Brown Rice calculates to 5.2g Protein (got ${expectedProtein})`);

    // 5. Test User Association & Food Logging
    let testUser = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
    if (!testUser) {
      testUser = await prisma.user.findFirst();
    }
    assert(testUser != null, `Found test user: ${testUser?.name || testUser?.email} (${testUser?.id})`);

    const testDateKey = "2026-10-31";

    // 6. Test Logging Food to Lunch
    const createdLog = await prisma.foodLog.create({
      data: {
        userId: testUser.id,
        foodItemId: brownRice.id,
        foodNameSnapshot: brownRice.name,
        mealType: "LUNCH",
        quantity: 200,
        unit: "g",
        calories: expectedCals,
        protein: expectedProtein,
        carbohydrates: Math.round(brownRice.carbohydrates * factor * 10) / 10,
        fat: Math.round(brownRice.fat * factor * 10) / 10,
        dateKey: testDateKey,
      },
    });
    assert(createdLog.id != null, `Successfully logged ${createdLog.foodNameSnapshot} to LUNCH (id: ${createdLog.id})`);

    // 7. Verify food log persists and can be queried for the day
    const dayLogs = await prisma.foodLog.findMany({
      where: { userId: testUser.id, dateKey: testDateKey },
    });
    const foundLoggedItem = dayLogs.find((l) => l.id === createdLog.id);
    assert(foundLoggedItem != null, `Verified food log persisted in Neon PostgreSQL`);

    // 8. Test updating log quantity (e.g. adjust from 200g to 150g)
    const newGrams = 150;
    const newFactor = newGrams / 100;
    const updatedCals = Math.round(brownRice.caloriesPer100g * newFactor * 10) / 10;
    const updatedProtein = Math.round(brownRice.protein * newFactor * 10) / 10;

    const updatedLog = await prisma.foodLog.update({
      where: { id: createdLog.id },
      data: {
        quantity: newGrams,
        calories: updatedCals,
        protein: updatedProtein,
      },
    });
    assert(updatedLog.quantity === 150, `Successfully updated log quantity to 150g`);
    assert(updatedLog.calories === 168, `Calories recalculated accurately to 168 kcal`);

    // 9. Test Custom Food Creation
    const customFood = await prisma.foodItem.create({
      data: {
        name: "Mom's Special Paneer Bhurji (Test)",
        description: "Fresh homemade spiced scrambled paneer with chopped onions and tomatoes",
        category: "Vegetables and curries",
        caloriesPer100g: 220,
        protein: 14.5,
        carbohydrates: 6.0,
        fat: 15.0,
        defaultServingSize: 1,
        defaultServingUnit: "bowl",
        servingWeightGrams: 150,
        isCustom: true,
        createdById: testUser.id,
      },
    });
    assert(customFood.id != null && customFood.isCustom === true, `Created Custom Food: ${customFood.name} (isCustom: true)`);

    // Log the custom food to Dinner
    const customLog = await prisma.foodLog.create({
      data: {
        userId: testUser.id,
        foodItemId: customFood.id,
        foodNameSnapshot: customFood.name,
        mealType: "DINNER",
        quantity: 1,
        unit: "bowl",
        calories: 330, // 150g = 1.5 * 220
        protein: 21.75,
        carbohydrates: 9,
        fat: 22.5,
        dateKey: testDateKey,
      },
    });
    assert(customLog.id != null, `Logged custom food to DINNER`);

    // 10. Verify total daily nutrition aggregation
    const allLogsToday = await prisma.foodLog.findMany({
      where: { userId: testUser.id, dateKey: testDateKey },
    });
    const totalDayCalories = allLogsToday.reduce((sum, l) => sum + l.calories, 0);
    const totalDayProtein = allLogsToday.reduce((sum, l) => sum + l.protein, 0);
    assert(totalDayCalories >= updatedLog.calories + customLog.calories, `Daily totals calculated: ${totalDayCalories} kcal, ${Math.round(totalDayProtein * 10) / 10}g protein`);

    // 11. Clean up test logs and test custom food item
    await prisma.foodLog.delete({ where: { id: createdLog.id } });
    await prisma.foodLog.delete({ where: { id: customLog.id } });
    await prisma.foodItem.delete({ where: { id: customFood.id } });
    console.log("  🧹 Cleaned up temporary test records cleanly.");

    console.log("\n==================================================================");
    console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runNutritionVerification();

