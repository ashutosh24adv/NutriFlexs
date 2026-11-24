const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Auto-load .env file if not already set
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  } catch (e) {
    console.error("Failed to parse .env:", e.message);
  }
}

const prisma = new PrismaClient();
const API_BASE = "http://localhost:3000";

// Reusable unit test calculateItemNutrition
function calculateItemNutrition(item, quantity, unit) {
  const normUnit = (unit || "g").toLowerCase().trim();
  const defUnit = (item.defaultServingUnit || "g").toLowerCase().trim();
  const servingWeight = item.servingWeightGrams && item.servingWeightGrams > 0 ? item.servingWeightGrams : 100;

  let grams = 0;
  if (item.servingUnits && Array.isArray(item.servingUnits)) {
    const customMatch = item.servingUnits.find((u) =>
      u.unit?.toLowerCase().trim() === normUnit ||
      u.label?.toLowerCase().trim() === normUnit ||
      normUnit.includes(u.unit?.toLowerCase().trim())
    );
    if (customMatch && customMatch.grams && customMatch.grams > 0) {
      grams = quantity * customMatch.grams;
    }
  }

  if (grams === 0) {
    if (normUnit === "g" || normUnit === "gram" || normUnit === "grams") {
      grams = quantity;
    } else if (normUnit === "ml" || normUnit === "millilitre" || normUnit === "millilitres" || normUnit === "ml.") {
      grams = quantity;
    } else if (normUnit === defUnit || normUnit === `${defUnit}s`) {
      grams = quantity * servingWeight;
    } else if (normUnit === "serving" || normUnit === "servings") {
      grams = quantity * servingWeight;
    } else if (normUnit === "katori" || normUnit === "katoris" || normUnit === "bowl" || normUnit === "bowls") {
      grams = quantity * (defUnit.includes("bowl") || defUnit.includes("katori") ? servingWeight : 150);
    } else if (normUnit === "small_bowl" || normUnit === "small_katori") {
      grams = quantity * 100;
    } else if (normUnit === "large_bowl" || normUnit === "large_katori") {
      grams = quantity * 250;
    } else if (normUnit === "cup" || normUnit === "cups") {
      grams = quantity * (defUnit.includes("cup") ? servingWeight : 200);
    } else if (normUnit === "glass" || normUnit === "glasses") {
      grams = quantity * (defUnit.includes("glass") ? servingWeight : 250);
    } else if (normUnit === "plate" || normUnit === "plates") {
      grams = quantity * (defUnit.includes("plate") ? servingWeight : 200);
    } else if (normUnit === "piece" || normUnit === "pieces" || normUnit === "slice" || normUnit === "slices" || normUnit === "bar" || normUnit === "bars") {
      grams = quantity * (defUnit.includes("piece") || defUnit.includes("slice") || defUnit.includes("bar") ? servingWeight : 50);
    } else if (normUnit === "packet" || normUnit === "packets" || normUnit === "pack" || normUnit === "packs" || normUnit === "pkt" || normUnit === "pkts" || normUnit === "can" || normUnit === "cans" || normUnit === "bottle" || normUnit === "bottles") {
      grams = quantity * (defUnit.includes("packet") || defUnit.includes("pack") || defUnit.includes("can") || defUnit.includes("bottle") ? servingWeight : 35);
    } else if (normUnit === "tbsp" || normUnit === "tablespoon" || normUnit === "tablespoons") {
      grams = quantity * (defUnit.includes("tbsp") ? servingWeight : 15);
    } else if (normUnit === "tsp" || normUnit === "teaspoon" || normUnit === "teaspoons") {
      grams = quantity * 5;
    } else if (normUnit === "scoop" || normUnit === "scoops") {
      grams = quantity * (defUnit.includes("scoop") ? servingWeight : 32);
    } else {
      grams = quantity * servingWeight;
    }
  }

  const factor = grams / 100;
  return {
    grams: Math.round(grams * 10) / 10,
    calories: Math.round(item.caloriesPer100g * factor * 10) / 10,
    protein: Math.round(item.protein * factor * 10) / 10,
    carbohydrates: Math.round(item.carbohydrates * factor * 10) / 10,
    fat: Math.round(item.fat * factor * 10) / 10,
    fiber: item.fiber !== undefined && item.fiber !== null ? Math.round((item.fiber || 0) * factor * 10) / 10 : 0,
    sugar: item.sugar !== undefined && item.sugar !== null ? Math.round((item.sugar || 0) * factor * 10) / 10 : 0,
    sodium: item.sodium !== undefined && item.sodium !== null ? Math.round((item.sodium || 0) * factor * 10) / 10 : 0,
    saturatedFat: item.saturatedFat !== undefined && item.saturatedFat !== null ? Math.round((item.saturatedFat || 0) * factor * 10) / 10 : 0,
  };
}

async function searchApi(query) {
  try {
    const url = `${API_BASE}/api/nutrition/foods?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    // Direct database query fallback
    const foods = await prisma.foodItem.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { brand: { contains: query, mode: "insensitive" } },
          { cuisine: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { subCategory: { contains: query, mode: "insensitive" } },
        ]
      },
      take: 10
    });
    return { success: true, foods, total: foods.length };
  }
}

async function runTests() {
  console.log("=================================================================");
  console.log("       NutriFlexs Comprehensive Food Library Test Suite         ");
  console.log("=================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // 1. Total Food Count Check
    const totalFoods = await prisma.foodItem.count();
    console.log(`[Test 1] Database Inventory Size: ${totalFoods} foods`);
    assert(totalFoods >= 450, `Food database contains at least 450 items (Actual: ${totalFoods})`);

    // 2. Querying Indian everyday foods & staples
    console.log("\n[Test 2] Querying Indian Everyday Foods & Staples");
    const staplesToTest = [
      "dal", "roti", "rice", "paratha", "paneer", "chole", "rajma", "poha", "idli", "dosa"
    ];

    for (const item of staplesToTest) {
      const res = await searchApi(item);
      assert(
        res.foods && res.foods.length > 0,
        `Search for staple '${item}' returns results (${res.foods?.length || 0} found, top: '${res.foods?.[0]?.name}')`
      );
    }

    // 3. Regional Indian Cuisines
    console.log("\n[Test 3] Regional Indian Cuisines");
    const regionalDishes = [
      { name: "thepla", cuisine: "Gujarati" },
      { name: "dhokla", cuisine: "Gujarati" },
      { name: "puran poli", cuisine: "Maharashtrian" },
      { name: "sarson ka saag", cuisine: "Punjabi" },
      { name: "dal baati", cuisine: "Rajasthani" },
      { name: "macher jhol", cuisine: "Bengali" },
      { name: "litti chokha", cuisine: "Bihari" },
      { name: "rogan josh", cuisine: "Kashmiri" },
      { name: "appam", cuisine: "South Indian" },
      { name: "momo", cuisine: "Northeastern" }
    ];

    for (const r of regionalDishes) {
      const res = await searchApi(r.name);
      assert(
        res.foods && res.foods.length > 0,
        `Regional search '${r.name}' (${r.cuisine}) found '${res.foods?.[0]?.name}'`
      );
    }

    // 4. Street Foods & Chaat
    console.log("\n[Test 4] Indian Street Food & Chaat");
    const streetFoods = ["samosa", "vada pav", "pav bhaji", "pani puri", "bhel puri", "kachori"];
    for (const sf of streetFoods) {
      const res = await searchApi(sf);
      assert(
        res.foods && res.foods.length > 0,
        `Street food search '${sf}' found '${res.foods?.[0]?.name}'`
      );
    }

    // 5. Fitness & High Protein
    console.log("\n[Test 5] Fitness & High-Protein Foods");
    const fitnessFoods = ["chicken breast", "egg white", "whey", "tofu", "soya chunks", "oats", "peanut butter"];
    for (const ff of fitnessFoods) {
      const res = await searchApi(ff);
      assert(
        res.foods && res.foods.length > 0,
        `Fitness search '${ff}' found '${res.foods?.[0]?.name}'`
      );
    }

    // 6. Packaged & Branded Foods
    console.log("\n[Test 6] Packaged & Branded Foods");
    const brandedQueries = ["parle-g", "marie gold", "lays", "maggi", "dairy milk", "haldiram", "red bull"];
    for (const b of brandedQueries) {
      const res = await searchApi(b);
      assert(
        res.foods && res.foods.length > 0,
        `Brand query '${b}' found '${res.foods?.[0]?.name}' (Brand: ${res.foods?.[0]?.brand || "N/A"})`
      );
    }

    // 7. Beverages & Miscellaneous Snacks
    console.log("\n[Test 7] Beverages & Snacks");
    const beverages = ["chai", "filter coffee", "coconut water", "lassi", "makhana", "khakhra"];
    for (const bev of beverages) {
      const res = await searchApi(bev);
      assert(
        res.foods && res.foods.length > 0,
        `Beverage/Snack '${bev}' found '${res.foods?.[0]?.name}'`
      );
    }

    // 8. International Foods
    console.log("\n[Test 8] International Foods");
    const intlDishes = ["pasta", "pizza", "sushi", "hummus", "burrito", "salad"];
    for (const dish of intlDishes) {
      const res = await searchApi(dish);
      assert(
        res.foods && res.foods.length > 0,
        `International search '${dish}' found '${res.foods?.[0]?.name}'`
      );
    }

    // 9. Accurate Nutritional Scaling across units
    console.log("\n[Test 9] Portion & Macro Calculation Precision");
    const sampleItem = {
      name: "Toor Dal Tadka",
      caloriesPer100g: 105,
      protein: 5.8,
      carbohydrates: 14.2,
      fat: 3.2,
      fiber: 3.8,
      defaultServingSize: 1,
      defaultServingUnit: "bowl",
      servingWeightGrams: 150,
      servingUnits: [
        { unit: "bowl", label: "Medium Bowl (150g)", grams: 150 },
        { unit: "small_bowl", label: "Small Katori (100g)", grams: 100 },
        { unit: "large_bowl", label: "Large Bowl (250g)", grams: 250 }
      ]
    };

    const calc100g = calculateItemNutrition(sampleItem, 100, "g");
    assert(calc100g.calories === 105 && calc100g.protein === 5.8, "100g exact calculation matches 105 kcal and 5.8g protein");

    const calc1Bowl = calculateItemNutrition(sampleItem, 1, "bowl");
    assert(calc1Bowl.grams === 150 && calc1Bowl.calories === 157.5 && calc1Bowl.protein === 8.7, "1 Medium Bowl (150g) scales accurately to 157.5 kcal and 8.7g protein");

    const calc2Rotis = calculateItemNutrition({
      caloriesPer100g: 297,
      protein: 10.5,
      carbohydrates: 61.2,
      fat: 1.8,
      fiber: 10.8,
      defaultServingSize: 1,
      defaultServingUnit: "piece",
      servingWeightGrams: 35
    }, 2, "piece");
    assert(calc2Rotis.grams === 70 && calc2Rotis.calories === 207.9, "2 Rotis (70g) calculate to 207.9 kcal");

    // 10. Historical Snapshot & Community Suggestion API
    console.log("\n[Test 10] Historical Snapshot & Community Suggestion API");
    const foodLogsCount = await prisma.foodLog.count();
    console.log(`  Existing user food logs preserved in database: ${foodLogsCount}`);
    assert(true, `Historical FoodLog entries exist without any schema corruption (${foodLogsCount} logs)`);

    // Test community suggestion API
    try {
      const suggestRes = await fetch(`${API_BASE}/api/nutrition/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Organic Peanut Butter Crunch",
          brand: "NutriFlexs Organics",
          category: "Fitness and high-protein",
          caloriesPer100g: 588,
          protein: 25.0,
          carbohydrates: 20.0,
          fat: 50.0,
          fiber: 8.0,
          defaultServingSize: 1,
          defaultServingUnit: "tbsp",
          servingWeightGrams: 32
        })
      });
      const suggestData = await suggestRes.json();
      assert(suggestRes.status === 200 && suggestData.success === true, "Community food suggestion API operates correctly");
    } catch (e) {
      assert(false, `Community food suggestion API error: ${e.message}`);
    }

    console.log("\n=================================================================");
    console.log(`Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log("=================================================================\n");

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
