const { PrismaClient, MealType } = require("@prisma/client");
const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("NutriFlexs Water Intake & Sugar Tracking Test Suite");
  console.log("==================================================\n");

  let testUserId = null;
  const testDateKey = "2026-11-24";
  const yesterdayDateKey = "2026-11-23";

  try {
    // 1. Get or create a test user
    console.log("1. Setting up test user...");
    let user = await prisma.user.findFirst({
      where: { email: "test_hydration_sugar@nutriflexs.com" },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "test_hydration_sugar@nutriflexs.com",
          name: "Hydration Sugar Tester",
          role: "CUSTOMER",
        },
      });
    }
    testUserId = user.id;
    console.log(`✓ Test user ready (ID: ${testUserId})\n`);

    // Clean any prior test data for this user
    await prisma.waterEntry.deleteMany({ where: { userId: testUserId } });
    await prisma.waterLog.deleteMany({ where: { userId: testUserId } });
    await prisma.foodLog.deleteMany({ where: { userId: testUserId } });
    await prisma.nutritionGoal.deleteMany({ where: { userId: testUserId } });

    // 2. Test Water Goals
    console.log("2. Testing Water Goals & NutritionGoal persistence...");
    const initialGoal = await prisma.nutritionGoal.create({
      data: {
        userId: testUserId,
        waterGoalMl: 3000,
        sugarTarget: 40,
        addedSugarTarget: 25,
      },
    });
    console.log(`✓ Created goals: Water = ${initialGoal.waterGoalMl}ml, Sugar = ${initialGoal.sugarTarget}g, Added = ${initialGoal.addedSugarTarget}g`);

    // 3. Test Water Intake Logging (WaterEntry + WaterLog sync)
    console.log("\n3. Testing Water Intake Logging & Multi-entry summation...");
    
    // Quick Add +250ml
    const entry1 = await prisma.waterEntry.create({
      data: {
        userId: testUserId,
        dateKey: testDateKey,
        amountMl: 250,
        loggedAt: new Date(),
      },
    });
    console.log(`✓ Logged Entry 1: +250ml (ID: ${entry1.id})`);

    // Quick Add +500ml
    const entry2 = await prisma.waterEntry.create({
      data: {
        userId: testUserId,
        dateKey: testDateKey,
        amountMl: 500,
        loggedAt: new Date(),
      },
    });
    console.log(`✓ Logged Entry 2: +500ml (ID: ${entry2.id})`);

    // Custom +350ml
    const entry3 = await prisma.waterEntry.create({
      data: {
        userId: testUserId,
        dateKey: testDateKey,
        amountMl: 350,
        loggedAt: new Date(),
      },
    });
    console.log(`✓ Logged Entry 3: +350ml (ID: ${entry3.id})`);

    // Yesterday's entry to test dateKey isolation
    const yesterdayEntry = await prisma.waterEntry.create({
      data: {
        userId: testUserId,
        dateKey: yesterdayDateKey,
        amountMl: 1000,
        loggedAt: new Date(),
      },
    });
    console.log(`✓ Logged Yesterday's Entry: +1000ml for ${yesterdayDateKey}`);

    // Verify today's entries
    const todayEntries = await prisma.waterEntry.findMany({
      where: { userId: testUserId, dateKey: testDateKey },
      orderBy: { loggedAt: "desc" },
    });
    const todayTotal = todayEntries.reduce((sum, e) => sum + e.amountMl, 0);
    console.log(`✓ Today's entries count: ${todayEntries.length}, Sum = ${todayTotal}ml`);
    if (todayTotal !== 1100) {
      throw new Error(`Expected today's water total to be 1100ml, got ${todayTotal}ml`);
    }

    // Verify yesterday's entries are isolated
    const yesterdayEntries = await prisma.waterEntry.findMany({
      where: { userId: testUserId, dateKey: yesterdayDateKey },
    });
    if (yesterdayEntries.length !== 1 || yesterdayEntries[0].amountMl !== 1000) {
      throw new Error("DateKey isolation failed for water entries");
    }
    console.log("✓ DateKey isolation verified successfully: yesterday's 1000ml does not bleed into today.");

    // 4. Test Undo / Deleting a Water Entry
    console.log("\n4. Testing Undo / Deletion of Water Entry...");
    await prisma.waterEntry.delete({
      where: { id: entry2.id },
    });
    const remainingEntries = await prisma.waterEntry.findMany({
      where: { userId: testUserId, dateKey: testDateKey },
    });
    const newTotal = remainingEntries.reduce((sum, e) => sum + e.amountMl, 0);
    console.log(`✓ Removed entry ${entry2.id} (-500ml). Remaining entries: ${remainingEntries.length}, New total: ${newTotal}ml`);
    if (newTotal !== 600) {
      throw new Error(`Expected remaining water total to be 600ml, got ${newTotal}ml`);
    }

    // 5. Test Sugar Tracking with Naturally Occurring vs Added Sugar
    console.log("\n5. Testing Sugar Tracking with Natural & Added Sugar breakdown...");
    
    // Log item A: Fresh Apple (Natural Sugar: 19g total, 0g added)
    const appleLog = await prisma.foodLog.create({
      data: {
        userId: testUserId,
        foodNameSnapshot: "Fresh Crisp Apple",
        mealType: MealType.BREAKFAST,
        quantity: 1,
        unit: "medium (180g)",
        calories: 95,
        protein: 0.5,
        carbohydrates: 25,
        fat: 0.3,
        totalSugar: 19,
        addedSugar: 0,
        hasSugarData: true,
        dateKey: testDateKey,
      },
    });
    console.log(`✓ Logged Fresh Apple: Total Sugar = ${appleLog.totalSugar}g, Added Sugar = ${appleLog.addedSugar}g`);

    // Log item B: Protein Bar (High Added Sugar: 16g total, 14g added)
    const barLog = await prisma.foodLog.create({
      data: {
        userId: testUserId,
        foodNameSnapshot: "Chocolate Protein Energy Bar",
        mealType: MealType.SNACKS,
        quantity: 1,
        unit: "bar (60g)",
        calories: 220,
        protein: 20,
        carbohydrates: 24,
        fat: 7,
        totalSugar: 16,
        addedSugar: 14,
        hasSugarData: true,
        dateKey: testDateKey,
      },
    });
    console.log(`✓ Logged Protein Bar: Total Sugar = ${barLog.totalSugar}g, Added Sugar = ${barLog.addedSugar}g`);

    // Log item C: Food with NO sugar data (e.g. unanalyzed local curry)
    const curryLog = await prisma.foodLog.create({
      data: {
        userId: testUserId,
        foodNameSnapshot: "Home-style Vegetable Curry",
        mealType: MealType.LUNCH,
        quantity: 1,
        unit: "bowl (200g)",
        calories: 180,
        protein: 5,
        carbohydrates: 15,
        fat: 9,
        totalSugar: null,
        addedSugar: null,
        hasSugarData: false,
        dateKey: testDateKey,
      },
    });
    console.log(`✓ Logged Unanalyzed Dish: hasSugarData = ${curryLog.hasSugarData}, totalSugar = null (Shows "Not available")`);

    // Calculate aggregated daily sugar totals
    const allLogs = await prisma.foodLog.findMany({
      where: { userId: testUserId, dateKey: testDateKey },
    });

    let totalSugarSum = 0;
    let addedSugarSum = 0;
    let itemsWithSugarData = 0;
    let itemsWithoutSugarData = 0;

    for (const log of allLogs) {
      if (log.hasSugarData && log.totalSugar !== null) {
        itemsWithSugarData++;
        totalSugarSum += log.totalSugar;
        if (log.addedSugar !== null) {
          addedSugarSum += log.addedSugar;
        }
      } else {
        itemsWithoutSugarData++;
      }
    }

    const naturalSugarSum = Math.max(0, Math.round((totalSugarSum - addedSugarSum) * 10) / 10);
    console.log(`\nDaily Sugar Aggregates:`);
    console.log(`- Items with sugar analysis: ${itemsWithSugarData}`);
    console.log(`- Items without sugar data (properly not defaulting to 0): ${itemsWithoutSugarData}`);
    console.log(`- Total Sugar Consumed: ${totalSugarSum}g`);
    console.log(`- Added Sugar Consumed: ${addedSugarSum}g`);
    console.log(`- Natural Sugar Breakdown: ${naturalSugarSum}g`);

    if (totalSugarSum !== 35 || addedSugarSum !== 14 || naturalSugarSum !== 21) {
      throw new Error(`Sugar calculation mismatch! Expected Total: 35g, Added: 14g, Natural: 21g. Got Total: ${totalSugarSum}g, Added: ${addedSugarSum}g, Natural: ${naturalSugarSum}g`);
    }
    console.log("✓ Sugar calculations match expected values perfectly!");

    // 6. Test Food Deletion & Sugar Recalculation
    console.log("\n6. Testing Food Deletion & Automatic Sugar Recalculation...");
    await prisma.foodLog.delete({ where: { id: barLog.id } });
    const logsAfterDelete = await prisma.foodLog.findMany({
      where: { userId: testUserId, dateKey: testDateKey },
    });

    let newTotalSugarSum = 0;
    let newAddedSugarSum = 0;
    for (const log of logsAfterDelete) {
      if (log.hasSugarData && log.totalSugar !== null) {
        newTotalSugarSum += log.totalSugar;
        if (log.addedSugar !== null) {
          newAddedSugarSum += log.addedSugar;
        }
      }
    }
    console.log(`✓ Deleted bar log. New Total Sugar = ${newTotalSugarSum}g (was 35g), New Added Sugar = ${newAddedSugarSum}g (was 14g)`);
    if (newTotalSugarSum !== 19 || newAddedSugarSum !== 0) {
      throw new Error("Automatic sugar recalculation after log deletion failed!");
    }

    // 7. Test Updating Goals
    console.log("\n7. Testing Nutrition Goal Updates...");
    const updatedGoal = await prisma.nutritionGoal.update({
      where: { userId: testUserId },
      data: {
        waterGoalMl: 3500,
        sugarTarget: 30,
        addedSugarTarget: 20,
      },
    });
    console.log(`✓ Updated goals: Water = ${updatedGoal.waterGoalMl}ml, Sugar = ${updatedGoal.sugarTarget}g, Added = ${updatedGoal.addedSugarTarget}g`);

    // Clean up test data
    console.log("\n8. Cleaning up test fixtures...");
    await prisma.waterEntry.deleteMany({ where: { userId: testUserId } });
    await prisma.waterLog.deleteMany({ where: { userId: testUserId } });
    await prisma.foodLog.deleteMany({ where: { userId: testUserId } });
    await prisma.nutritionGoal.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    console.log("✓ Cleaned up test user and records.");

    console.log("\n==================================================");
    console.log("ALL TESTS PASSED WITH 100% SUCCESS!");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ Test Failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
