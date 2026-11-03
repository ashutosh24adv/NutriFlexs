/**
 * Comprehensive Test Suite for Nutrition Tracker and Daily Goal Synchronization
 * Verifies Tests A through G with real database records in Neon PostgreSQL via Prisma.
 */

import { PrismaClient, MealType } from "@prisma/client";
import {
  getDailyNutritionDiary,
  addFoodLog,
  updateFoodLog,
  deleteFoodLog,
  upsertNutritionGoals,
} from "@/services/nutrition.service";
import {
  getUserNutritionGoal,
  updateUserCustomGoal,
} from "@/services/nutrition-goal.service";

const prisma = new PrismaClient();

let passedCount = 0;
let failedCount = 0;

function assert(condition: any, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("\n==================================================================");
  console.log("🥗 NUTRIFLEXS NUTRITION TRACKER & DAILY GOAL SYNCHRONIZATION TESTS");
  console.log("==================================================================\n");

  const testEmail1 = `test.nutrition.sync1.${Date.now()}@nutriflexs.com`;
  const testEmail2 = `test.nutrition.sync2.${Date.now()}@nutriflexs.com`;

  let user1: any;
  let user2: any;

  try {
    // 0. Setup: Create 2 test customers
    user1 = await prisma.user.create({
      data: {
        name: "Test Sync Customer 1",
        email: testEmail1,
        proteinGoalGrams: 80,
        customDailyProteinGoal: 80,
      },
    });

    user2 = await prisma.user.create({
      data: {
        name: "Test Sync Customer 2",
        email: testEmail2,
        proteinGoalGrams: 120,
      },
    });

    console.log(`Created test users:\n  User 1: ${user1.email} (ID: ${user1.id})\n  User 2: ${user2.email} (ID: ${user2.id})\n`);

    const timeZone = "Asia/Kolkata";
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(yesterdayDate);

    // -------------------------------------------------------------
    // Test A — Add food
    // -------------------------------------------------------------
    console.log("------------------------------------------------------------------");
    console.log("🧪 TEST A: Add Food (17.8g protein, 217 kcal)");
    console.log("------------------------------------------------------------------");

    // Initial state check
    const initialDiary = await getDailyNutritionDiary(user1.id, todayKey);
    const initialGoal = await getUserNutritionGoal(user1.id, timeZone, todayKey);
    assert(initialDiary.totals.protein === 0, "Initial tracker protein is 0g");
    assert(initialGoal.completedProtein === 0, "Initial dashboard protein intake is 0g");
    assert(initialGoal.proteinGoal === 80, "User 1 daily protein target is 80g");

    // Add food item: "Lean Refuel", 1 serving, 217 kcal, 17.8g protein, 34g carbs, 0.8g fat
    const addedLogResult = await addFoodLog(user1.id, {
      foodName: "Lean Refuel",
      mealType: MealType.BREAKFAST,
      quantity: 1,
      unit: "serving",
      calories: 217,
      protein: 17.8,
      carbohydrates: 34,
      fat: 0.8,
      dateKey: todayKey,
    });
    const log1 = addedLogResult.log;

    assert(log1 && log1.id, "Food log created successfully in Neon PostgreSQL");

    // Re-query Nutrition Tracker & Home Dashboard
    const diaryA = await getDailyNutritionDiary(user1.id, todayKey);
    const dashboardA = await getUserNutritionGoal(user1.id, timeZone, todayKey);

    assert(diaryA.totals.protein === 17.8, `Nutrition Tracker protein is 17.8g (actual: ${diaryA.totals.protein}g)`);
    assert(diaryA.totals.calories === 217, `Nutrition Tracker calories is 217 kcal (actual: ${diaryA.totals.calories})`);
    assert(diaryA.totals.carbohydrates === 34, `Nutrition Tracker carbs is 34g (actual: ${diaryA.totals.carbohydrates}g)`);
    assert(diaryA.totals.fat === 0.8, `Nutrition Tracker fat is 0.8g (actual: ${diaryA.totals.fat}g)`);

    assert(dashboardA.completedProtein === 17.8, `Home Dashboard protein intake is 17.8g (actual: ${dashboardA.completedProtein}g)`);
    assert(dashboardA.proteinGoal === 80, `Home Dashboard target is 80g (actual: ${dashboardA.proteinGoal}g)`);
    assert(dashboardA.remainingProtein === 62.2, `Home Dashboard remaining is 62.2g (actual: ${dashboardA.remainingProtein}g)`);
    assert(dashboardA.progressPercent === 22.25, `Home Dashboard progress is 22.25% (actual: ${dashboardA.progressPercent}%)`);
    assert(diaryA.goals.proteinProgressPercent === 22.25, `Nutrition Tracker progress percent is 22.25% (actual: ${diaryA.goals.proteinProgressPercent}%)`);
    assert(diaryA.totals.protein === dashboardA.completedProtein, "Tracker and Dashboard protein values MATCH EXACTLY");

    // -------------------------------------------------------------
    // Test B — Edit food
    // -------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("🧪 TEST B: Edit Food (Change quantity to 2 servings)");
    console.log("------------------------------------------------------------------");

    await updateFoodLog(user1.id, log1.id, {
      quantity: 2,
      unit: "serving",
      mealType: MealType.BREAKFAST,
    });

    const diaryB = await getDailyNutritionDiary(user1.id, todayKey);
    const dashboardB = await getUserNutritionGoal(user1.id, timeZone, todayKey);

    assert(diaryB.totals.protein === 35.6, `Nutrition Tracker recalculated protein is 35.6g (actual: ${diaryB.totals.protein}g)`);
    assert(diaryB.totals.calories === 434, `Nutrition Tracker recalculated calories is 434 kcal (actual: ${diaryB.totals.calories})`);
    assert(dashboardB.completedProtein === 35.6, `Home Dashboard recalculated protein is 35.6g (actual: ${dashboardB.completedProtein}g)`);
    assert(dashboardB.remainingProtein === 44.4, `Home Dashboard recalculated remaining is 44.4g (actual: ${dashboardB.remainingProtein}g)`);
    assert(dashboardB.progressPercent === 44.5, `Home Dashboard recalculated progress is 44.5% (actual: ${dashboardB.progressPercent}%)`);
    assert(diaryB.totals.protein === dashboardB.completedProtein, "Tracker and Dashboard match after edit");

    // -------------------------------------------------------------
    // Test C — Delete food
    // -------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("🧪 TEST C: Delete Food");
    console.log("------------------------------------------------------------------");

    await deleteFoodLog(user1.id, log1.id);

    const diaryC = await getDailyNutritionDiary(user1.id, todayKey);
    const dashboardC = await getUserNutritionGoal(user1.id, timeZone, todayKey);

    assert(diaryC.totals.protein === 0, `Nutrition Tracker protein decreased to 0g (actual: ${diaryC.totals.protein}g)`);
    assert(diaryC.totals.calories === 0, `Nutrition Tracker calories decreased to 0 (actual: ${diaryC.totals.calories})`);
    assert(dashboardC.completedProtein === 0, `Home Dashboard protein intake decreased to 0g (actual: ${dashboardC.completedProtein}g)`);
    assert(dashboardC.remainingProtein === 80, `Home Dashboard remaining reset to 80g (actual: ${dashboardC.remainingProtein}g)`);
    assert(dashboardC.progressPercent === 0, `Home Dashboard progress reset to 0% (actual: ${dashboardC.progressPercent}%)`);

    // -------------------------------------------------------------
    // Test D — Change goal
    // -------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("🧪 TEST D: Change Protein Goal (80g -> 100g)");
    console.log("------------------------------------------------------------------");

    // Re-add 17.8g food for baseline
    const logReadded = await addFoodLog(user1.id, {
      foodName: "Lean Refuel",
      mealType: MealType.BREAKFAST,
      quantity: 1,
      unit: "serving",
      calories: 217,
      protein: 17.8,
      carbohydrates: 34,
      fat: 0.8,
      dateKey: todayKey,
    });

    // Update goal to 100g via updateUserCustomGoal (home dashboard action)
    await updateUserCustomGoal(user1.id, 100);

    const diaryD = await getDailyNutritionDiary(user1.id, todayKey);
    const dashboardD = await getUserNutritionGoal(user1.id, timeZone, todayKey);

    assert(diaryD.goals.proteinGoal === 100, `Nutrition Tracker reflects new 100g goal (actual: ${diaryD.goals.proteinGoal}g)`);
    assert(dashboardD.proteinGoal === 100, `Home Dashboard reflects new 100g goal (actual: ${dashboardD.proteinGoal}g)`);
    assert(dashboardD.completedProtein === 17.8, `Home Dashboard intake remains 17.8g (actual: ${dashboardD.completedProtein}g)`);
    assert(dashboardD.remainingProtein === 82.2, `Home Dashboard remaining updated to 82.2g (100 - 17.8) (actual: ${dashboardD.remainingProtein}g)`);
    assert(dashboardD.progressPercent === 17.8, `Home Dashboard progress updated to 17.8% (17.8 / 100) (actual: ${dashboardD.progressPercent}%)`);
    assert(diaryD.goals.proteinProgressPercent === 17.8, `Tracker progress percent updated to 17.8% (actual: ${diaryD.goals.proteinProgressPercent}%)`);

    // Also test updating via upsertNutritionGoals (tracker modal action)
    await upsertNutritionGoals(user1.id, { proteinGoal: 120 });
    const dashboardD2 = await getUserNutritionGoal(user1.id, timeZone, todayKey);
    const diaryD2 = await getDailyNutritionDiary(user1.id, todayKey);
    assert(dashboardD2.proteinGoal === 120, `Dashboard goal updated to 120g via nutrition modal (actual: ${dashboardD2.proteinGoal}g)`);
    assert(diaryD2.goals.proteinGoal === 120, `Tracker goal updated to 120g via nutrition modal (actual: ${diaryD2.goals.proteinGoal}g)`);

    // -------------------------------------------------------------
    // Test E — Date handling
    // -------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("🧪 TEST E: Date Isolation (Yesterday vs Today)");
    console.log("------------------------------------------------------------------");

    // Add 25g protein food to yesterday
    await addFoodLog(user1.id, {
      foodName: "High Protein Shake",
      mealType: MealType.SNACKS,
      quantity: 1,
      unit: "serving",
      calories: 180,
      protein: 25,
      carbohydrates: 5,
      fat: 2,
      dateKey: yesterdayKey,
    });

    // Check today's totals: should still only have 17.8g from today
    const diaryToday = await getDailyNutritionDiary(user1.id, todayKey);
    const dashboardToday = await getUserNutritionGoal(user1.id, timeZone, todayKey);

    assert(diaryToday.totals.protein === 17.8, `Today's tracker has 17.8g, yesterday not included (actual: ${diaryToday.totals.protein}g)`);
    assert(dashboardToday.completedProtein === 17.8, `Today's dashboard has 17.8g, yesterday not included (actual: ${dashboardToday.completedProtein}g)`);

    // Check yesterday's totals: should have exactly 25g
    const diaryYesterday = await getDailyNutritionDiary(user1.id, yesterdayKey);
    const dashboardYesterday = await getUserNutritionGoal(user1.id, timeZone, yesterdayKey);

    assert(diaryYesterday.totals.protein === 25, `Yesterday's tracker has 25g (actual: ${diaryYesterday.totals.protein}g)`);
    assert(dashboardYesterday.completedProtein === 25, `Yesterday's dashboard has 25g (actual: ${dashboardYesterday.completedProtein}g)`);

    // -------------------------------------------------------------
    // Test F — Multiple food entries across different meal sections
    // -------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("🧪 TEST F: Multiple Food Entries Across Meal Sections");
    console.log("------------------------------------------------------------------");

    // Clean user1's today logs
    await prisma.foodLog.deleteMany({ where: { userId: user1.id, dateKey: todayKey } });

    // Add across sections:
    // Breakfast: 10g protein (120 kcal)
    await addFoodLog(user1.id, {
      foodName: "Oatmeal Bowl",
      mealType: MealType.BREAKFAST,
      quantity: 1,
      unit: "bowl",
      calories: 120,
      protein: 10,
      carbohydrates: 20,
      fat: 2,
      dateKey: todayKey,
    });

    // Lunch: 30g protein (350 kcal)
    await addFoodLog(user1.id, {
      foodName: "Grilled Chicken Bowl",
      mealType: MealType.LUNCH,
      quantity: 1,
      unit: "serving",
      calories: 350,
      protein: 30,
      carbohydrates: 25,
      fat: 6,
      dateKey: todayKey,
    });

    // Snacks: 15g protein (140 kcal)
    await addFoodLog(user1.id, {
      foodName: "Greek Yogurt",
      mealType: MealType.SNACKS,
      quantity: 1,
      unit: "cup",
      calories: 140,
      protein: 15,
      carbohydrates: 8,
      fat: 1,
      dateKey: todayKey,
    });

    // Dinner: 25g protein (280 kcal)
    await addFoodLog(user1.id, {
      foodName: "Paneer Power Salad",
      mealType: MealType.DINNER,
      quantity: 1,
      unit: "plate",
      calories: 280,
      protein: 25,
      carbohydrates: 12,
      fat: 8,
      dateKey: todayKey,
    });

    // Expected sum: 10 + 30 + 15 + 25 = 80g protein, 890 kcal
    const diaryF = await getDailyNutritionDiary(user1.id, todayKey);
    const dashboardF = await getUserNutritionGoal(user1.id, timeZone, todayKey);

    assert(diaryF.totals.protein === 80, `Tracker total protein is 80g (actual: ${diaryF.totals.protein}g)`);
    assert(diaryF.totals.calories === 890, `Tracker total calories is 890 kcal (actual: ${diaryF.totals.calories})`);
    assert(diaryF.meals[MealType.BREAKFAST].totals.protein === 10, "Breakfast section has 10g protein");
    assert(diaryF.meals[MealType.LUNCH].totals.protein === 30, "Lunch section has 30g protein");
    assert(diaryF.meals[MealType.SNACKS].totals.protein === 15, "Snacks section has 15g protein");
    assert(diaryF.meals[MealType.DINNER].totals.protein === 25, "Dinner section has 25g protein");

    assert(dashboardF.completedProtein === 80, `Dashboard total protein is 80g (actual: ${dashboardF.completedProtein}g)`);
    assert(dashboardF.proteinGoal === 120, `Dashboard goal is 120g (actual: ${dashboardF.proteinGoal}g)`);
    assert(dashboardF.remainingProtein === 40, `Dashboard remaining is 40g (actual: ${dashboardF.remainingProtein}g)`);
    assert(dashboardF.progressPercent === 66.67, `Dashboard progress is 66.67% (80/120) (actual: ${dashboardF.progressPercent}%)`);
    assert(diaryF.totals.protein === dashboardF.completedProtein, "Tracker and Dashboard totals match sum of all meal sections");

    // -------------------------------------------------------------
    // Test G — Authentication & Customer Isolation
    // -------------------------------------------------------------
    console.log("\n------------------------------------------------------------------");
    console.log("🧪 TEST G: Authentication & Multi-Tenant Customer Isolation");
    console.log("------------------------------------------------------------------");

    const diaryUser2 = await getDailyNutritionDiary(user2.id, todayKey);
    const dashboardUser2 = await getUserNutritionGoal(user2.id, timeZone, todayKey);

    assert(diaryUser2.totals.protein === 0, `User 2 has 0g protein despite User 1 having 80g (actual: ${diaryUser2.totals.protein}g)`);
    assert(diaryUser2.totals.calories === 0, `User 2 has 0 kcal (actual: ${diaryUser2.totals.calories})`);
    assert(dashboardUser2.completedProtein === 0, `User 2 dashboard has 0g protein intake (actual: ${dashboardUser2.completedProtein}g)`);
    assert(dashboardUser2.proteinGoal === 120, `User 2 dashboard has their own goal 120g (actual: ${dashboardUser2.proteinGoal}g)`);

    // Add food for User 2
    await addFoodLog(user2.id, {
      foodName: "Custom User2 Shake",
      mealType: MealType.BREAKFAST,
      quantity: 1,
      unit: "serving",
      calories: 150,
      protein: 20,
      carbohydrates: 10,
      fat: 2,
      dateKey: todayKey,
    });

    const diaryUser2After = await getDailyNutritionDiary(user2.id, todayKey);
    const diaryUser1After = await getDailyNutritionDiary(user1.id, todayKey);

    assert(diaryUser2After.totals.protein === 20, "User 2 has 20g protein after logging");
    assert(diaryUser1After.totals.protein === 80, "User 1 remains unaffected at 80g protein");

  } catch (err) {
    console.error("  ❌ UNHANDLED ERROR in test suite:", err);
    failedCount++;
  } finally {
    // Cleanup test users and cascade-delete foodLogs
    console.log("\n🧹 Cleaning up test users and food logs from Neon PostgreSQL...");
    if (user1) {
      await prisma.foodLog.deleteMany({ where: { userId: user1.id } });
      await prisma.nutritionGoal.deleteMany({ where: { userId: user1.id } });
      await prisma.user.delete({ where: { id: user1.id } }).catch(() => {});
    }
    if (user2) {
      await prisma.foodLog.deleteMany({ where: { userId: user2.id } });
      await prisma.nutritionGoal.deleteMany({ where: { userId: user2.id } });
      await prisma.user.delete({ where: { id: user2.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log("\n==================================================================");
  console.log(`📊 RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
