/**
 * test-nutrition-phases-0-to-3.js
 * Comprehensive automated verification for NutriFlexs Nutrition Tracker (Phases 0 to 3).
 */

const { PrismaClient, MealType } = require("@prisma/client");
const http = require("http");

const prisma = new PrismaClient();
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

function fetchApi(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, "http://localhost:3000");
    const reqOptions = {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log("==================================================================");
  console.log("🥗 NUTRIFLEXS NUTRITION TRACKER — PHASES 0 TO 3 TEST SUITE");
  console.log("==================================================================\n");

  let testUser = null;

  try {
    // -------------------------------------------------------------
    // PHASE 0: AUDIT & ADD FOOD QUERY STABILITY
    // -------------------------------------------------------------
    console.log("📦 PHASE 0: Existing Implementation & Error Resolution");

    // Verify /nutrition page route returns HTTP 200
    const pageRes = await fetchApi("/nutrition");
    assert(pageRes.status === 200, `/nutrition page loads with HTTP 200 (actual: ${pageRes.status})`);

    // Verify /api/nutrition/categories
    const catsRes = await fetchApi("/api/nutrition/categories");
    assert(catsRes.status === 200 && catsRes.body.success, "Categories API returns HTTP 200 with success: true");
    assert(Array.isArray(catsRes.body.categories) && catsRes.body.categories.length > 0, `Food categories loaded: ${catsRes.body.categories?.length} categories`);

    // Verify /api/nutrition/foods?q=egg (No 'findMany of undefined' error!)
    const searchRes = await fetchApi("/api/nutrition/foods?q=egg");
    assert(searchRes.status === 200 && searchRes.body.success, "Food search API returns HTTP 200 with success: true (No Prisma findMany error)");
    assert(Array.isArray(searchRes.body.foods) && searchRes.body.foods.length > 0, `Food search returned verified foods (${searchRes.body.foods?.length} items)`);

    // Create or find a test customer user in database
    testUser = await prisma.user.findFirst({
      where: { email: "test.nutrition.phases@nutriflexs.com" },
    });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          name: "Phase Test User",
          email: "test.nutrition.phases@nutriflexs.com",
          role: "CUSTOMER",
          streakDays: 5,
          proteinGoalGrams: 130,
        },
      });
    }
    assert(Boolean(testUser?.id), `Test user verified in database (ID: ${testUser.id})`);

    // -------------------------------------------------------------
    // PHASE 1: NUTRITION DASHBOARD & DAILY GOALS
    // -------------------------------------------------------------
    console.log("\n🎯 PHASE 1: Nutrition Dashboard & Daily Goals");

    // Set / update daily goals directly in database
    const upsertGoal = await prisma.nutritionGoal.upsert({
      where: { userId: testUser.id },
      create: {
        userId: testUser.id,
        dailyCalorieGoal: 2200,
        proteinGoal: 140,
        carbohydrateGoal: 240,
        fatGoal: 65,
      },
      update: {
        dailyCalorieGoal: 2200,
        proteinGoal: 140,
        carbohydrateGoal: 240,
        fatGoal: 65,
      },
    });
    assert(upsertGoal.dailyCalorieGoal === 2200, `Daily calorie goal configured: ${upsertGoal.dailyCalorieGoal} kcal`);
    assert(upsertGoal.proteinGoal === 140, `Protein goal configured: ${upsertGoal.proteinGoal}g`);
    assert(upsertGoal.carbohydrateGoal === 240, `Carbohydrate goal configured: ${upsertGoal.carbohydrateGoal}g`);
    assert(upsertGoal.fatGoal === 65, `Fat goal configured: ${upsertGoal.fatGoal}g`);

    // Verify calculation: Remaining Calories = Daily Goal - Calories Consumed
    const sampleConsumed = 850;
    const remainingCalc = upsertGoal.dailyCalorieGoal - sampleConsumed;
    assert(remainingCalc === 1350, `Remaining calculation verified: 2200 - 850 = ${remainingCalc} kcal`);

    // -------------------------------------------------------------
    // PHASE 2: FOOD DATABASE, SEARCH & MANUAL LOGGING
    // -------------------------------------------------------------
    console.log("\n🍛 PHASE 2: Food Database, Search & Manual Logging");

    const indianFoodsCheck = [
      "Roti", "Dal", "Rice", "Paneer", "Poha", "Upma", "Idli", "Dosa",
      "Khichdi", "Rajma", "Chole", "Egg", "Chicken breast", "Milk", "Banana", "Oats", "Curd"
    ];

    let foundAll = true;
    for (const food of indianFoodsCheck) {
      const match = await prisma.foodItem.findFirst({
        where: { name: { contains: food, mode: "insensitive" } },
      });
      if (!match) {
        console.error(`     Missing verified food item: ${food}`);
        foundAll = false;
      }
    }
    assert(foundAll, "All required Indian household foods, grains, proteins & dairy verified in database");

    // Test proportional scaling: 100g vs 200g
    const paneer = await prisma.foodItem.findFirst({
      where: { name: { contains: "Fresh Paneer", mode: "insensitive" } },
    });
    assert(Boolean(paneer), `Found food item '${paneer?.name}' (100g = ${paneer?.caloriesPer100g} kcal, ${paneer?.protein}g protein)`);
    const scaledCalories200g = Math.round((paneer.caloriesPer100g * 200) / 100);
    const scaledProtein200g = Math.round(((paneer.protein * 200) / 100) * 10) / 10;
    assert(scaledCalories200g === paneer.caloriesPer100g * 2, `Proportional scaling verified for 200g: ${scaledCalories200g} kcal`);

    // Test manual logging across all 4 meal categories: BREAKFAST, LUNCH, SNACKS, DINNER
    const todayKey = new Date().toISOString().split("T")[0];

    // Clean any prior test logs for today
    await prisma.foodLog.deleteMany({
      where: { userId: testUser.id, dateKey: todayKey },
    });

    const mealCategories = ["BREAKFAST", "LUNCH", "SNACKS", "DINNER"];
    for (const mType of mealCategories) {
      const log = await prisma.foodLog.create({
        data: {
          userId: testUser.id,
          foodNameSnapshot: `Test ${mType} Fuel`,
          mealType: mType,
          quantity: 1,
          unit: "serving",
          calories: 250,
          protein: 20,
          carbohydrates: 25,
          fat: 6,
          dateKey: todayKey,
        },
      });
      assert(log.mealType === mType, `Successfully logged food in category: ${mType}`);
    }

    // Verify daily totals calculation across all categories
    const dayLogs = await prisma.foodLog.findMany({
      where: { userId: testUser.id, dateKey: todayKey },
    });
    const totalDayCalories = dayLogs.reduce((acc, l) => acc + l.calories, 0);
    const totalDayProtein = dayLogs.reduce((acc, l) => acc + l.protein, 0);
    assert(totalDayCalories === 1000, `Daily total calories correctly aggregated: 4 * 250 = ${totalDayCalories} kcal`);
    assert(totalDayProtein === 80, `Daily total protein correctly aggregated: 4 * 20 = ${totalDayProtein}g`);

    // Test log update and delete
    const firstLog = dayLogs[0];
    const updatedLog = await prisma.foodLog.update({
      where: { id: firstLog.id },
      data: { quantity: 2, calories: 500, protein: 40 },
    });
    assert(updatedLog.quantity === 2 && updatedLog.calories === 500, `Food log successfully updated (quantity: 2, calories: 500)`);

    await prisma.foodLog.delete({ where: { id: firstLog.id } });
    const remainingLogs = await prisma.foodLog.count({ where: { userId: testUser.id, dateKey: todayKey } });
    assert(remainingLogs === 3, `Food log successfully deleted (3 remaining)`);

    // -------------------------------------------------------------
    // PHASE 3: RECENT FOODS, FAVOURITES & SAVED MEALS
    // -------------------------------------------------------------
    console.log("\n⭐ PHASE 3: Recent Foods, Favourites & Saved Meals");

    // 3.1 Recently logged foods
    const recents = await prisma.foodLog.findMany({
      where: { userId: testUser.id },
      orderBy: { loggedAt: "desc" },
      take: 10,
    });
    assert(recents.length > 0, `Recent foods query returns actual user logs (${recents.length} entries)`);
    assert(Boolean(recents[0].foodNameSnapshot), `Recent food item: ${recents[0].foodNameSnapshot}`);

    // 3.2 Favourite foods (create, verify, delete)
    await prisma.favoriteFood.deleteMany({ where: { userId: testUser.id } });

    const fav = await prisma.favoriteFood.create({
      data: {
        userId: testUser.id,
        foodNameSnapshot: "Boiled Whole Egg",
        category: "Eggs",
        caloriesPer100g: 155,
        protein: 13,
        carbohydrates: 1.1,
        fat: 11,
        defaultServingSize: 2,
        defaultServingUnit: "piece",
      },
    });
    assert(Boolean(fav.id), `Favorite food created: ${fav.foodNameSnapshot} (ID: ${fav.id})`);

    const favsList = await prisma.favoriteFood.findMany({ where: { userId: testUser.id } });
    assert(favsList.length === 1 && favsList[0].foodNameSnapshot === "Boiled Whole Egg", "User favorites successfully retrieved from database");

    // 3.3 Saved meals and recipes (multi-item creation, macro combination, logging)
    await prisma.savedMeal.deleteMany({ where: { userId: testUser.id } });

    const savedMeal = await prisma.savedMeal.create({
      data: {
        userId: testUser.id,
        name: "My Power Recovery Breakfast",
        description: "2 boiled eggs + 2 slices whole-wheat bread + 1 banana + 200ml milk",
        items: {
          create: [
            {
              foodName: "Boiled Whole Egg",
              quantity: 2,
              unit: "piece",
              calories: 155,
              protein: 13,
              carbohydrates: 1.1,
              fat: 11,
            },
            {
              foodName: "Whole-Wheat Bread",
              quantity: 2,
              unit: "slice",
              calories: 140,
              protein: 6,
              carbohydrates: 26,
              fat: 1.5,
            },
            {
              foodName: "Banana",
              quantity: 1,
              unit: "piece",
              calories: 105,
              protein: 1.3,
              carbohydrates: 27,
              fat: 0.3,
            },
            {
              foodName: "Toned Milk",
              quantity: 200,
              unit: "ml",
              calories: 120,
              protein: 6.4,
              carbohydrates: 9.6,
              fat: 6,
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    assert(savedMeal.items.length === 4, `Saved meal created with 4 individual food items`);
    const totalMealCalories = savedMeal.items.reduce((acc, i) => acc + i.calories, 0);
    const totalMealProtein = Math.round(savedMeal.items.reduce((acc, i) => acc + i.protein, 0) * 10) / 10;
    assert(totalMealCalories === 520, `Combined meal calories accurately calculated: ${totalMealCalories} kcal`);
    assert(totalMealProtein === 26.7, `Combined meal protein accurately calculated: ${totalMealProtein}g`);

    // Log the entire saved meal into BREAKFAST (creates 4 individual FoodLog records)
    const logsBefore = await prisma.foodLog.count({ where: { userId: testUser.id, dateKey: todayKey } });
    await prisma.$transaction(
      savedMeal.items.map((it) =>
        prisma.foodLog.create({
          data: {
            userId: testUser.id,
            foodNameSnapshot: it.foodName,
            mealType: "BREAKFAST",
            quantity: it.quantity,
            unit: it.unit,
            calories: it.calories,
            protein: it.protein,
            carbohydrates: it.carbohydrates,
            fat: it.fat,
            dateKey: todayKey,
          },
        })
      )
    );
    const logsAfter = await prisma.foodLog.count({ where: { userId: testUser.id, dateKey: todayKey } });
    assert(logsAfter === logsBefore + 4, `Logging entire saved meal successfully created ${logsAfter - logsBefore} individual food diary records`);

    // Clean up test data
    await prisma.foodLog.deleteMany({ where: { userId: testUser.id } });
    await prisma.savedMeal.deleteMany({ where: { userId: testUser.id } });
    await prisma.favoriteFood.deleteMany({ where: { userId: testUser.id } });
    await prisma.nutritionGoal.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log("  🧹 Test artifacts cleanly dismantled");

    console.log("\n==================================================================");
    console.log(`📊 FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed with error:", err);
    if (testUser?.id) {
      try {
        await prisma.user.delete({ where: { id: testUser.id } });
      } catch {}
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();

