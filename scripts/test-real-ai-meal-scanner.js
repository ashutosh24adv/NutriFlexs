const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";
const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function uploadAndAnalyze(filePath, mimeType, description) {
  console.log(`\n--- Testing ${description} (${path.basename(filePath)}, MIME: ${mimeType}) ---`);
  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append("image", blob, path.basename(filePath));

  const start = Date.now();
  const res = await fetch(`${BASE_URL}/api/nutrition/analyze-image`, {
    method: "POST",
    body: formData,
  });

  const elapsed = Date.now() - start;
  const data = await res.json();

  console.log(`Response HTTP ${res.status} in ${elapsed}ms:`, {
    success: data.success,
    mealTitle: data.mealTitle,
    itemsCount: data.detectedItems?.length,
    calories: data.totalMealNutrition?.calories,
    protein: data.totalMealNutrition?.protein,
    carbs: data.totalMealNutrition?.carbohydrates,
    fat: data.totalMealNutrition?.fat,
  });

  if (res.status === 429) {
    console.warn(`⚠️ Google AI Studio Free Tier rate limit/quota reached for ${description}:`, data.error);
    assert(data.code === "QUOTA_EXCEEDED", "API correctly returns code QUOTA_EXCEEDED on 429");
    return data;
  }

  assert(res.status === 200, `HTTP status is 200 for ${description}`);
  assert(data.success === true, `API returned success: true for ${description}`);
  assert(data.requiresUserConfirmation === true, "Indicates user confirmation required");
  assert(typeof data.mealTitle === "string" && data.mealTitle.length > 0, "Meal title returned");
  assert(Array.isArray(data.detectedItems) && data.detectedItems.length >= 1, "At least 1 food item detected");
  assert(data.totalMealNutrition?.calories > 0, "Total meal calories calculated");

  console.log(`Detected items for ${description}:`);
  data.detectedItems.forEach((item, idx) => {
    console.log(
      `  ${idx + 1}. ${item.displayName} (${item.detectedName}) - ${item.quantity} ${item.unit} (~${item.grams}g) | ${item.calories} kcal, P:${item.protein}g, C:${item.carbohydrates}g, F:${item.fat}g | Source: ${item.matchSource} (${item.isVerified ? "Verified" : "AI Estimated"})`
    );
  });

  await new Promise((r) => setTimeout(r, 1500));
  return data;
}

async function run() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS AI MEAL SCANNER COMPLETE VERIFICATION SUITE");
  console.log("================================================================================");

  // SECTION 1: Error Classification Tests
  console.log("\n>>> SECTION 1: Error Classification & Validation Tests");

  // 1.1 Empty Payload (no image attached)
  const emptyForm = new FormData();
  emptyForm.append("dummy", "val");
  const resEmpty = await fetch(`${BASE_URL}/api/nutrition/analyze-image`, {
    method: "POST",
    body: emptyForm,
  });
  const dataEmpty = await resEmpty.json();
  assert(resEmpty.status === 400, "Empty payload rejected with HTTP 400");
  assert(dataEmpty.code === "INVALID_PAYLOAD", "Returns code INVALID_PAYLOAD");

  // 1.2 Non-Image / Unsupported Format (text file)
  const textBlob = new Blob([Buffer.from("Not an image file at all")], { type: "text/plain" });
  const textForm = new FormData();
  textForm.append("image", textBlob, "notes.txt");
  const resText = await fetch(`${BASE_URL}/api/nutrition/analyze-image`, {
    method: "POST",
    body: textForm,
  });
  const dataText = await resText.json();
  assert(resText.status === 400, "Text file rejected with HTTP 400");
  assert(dataText.code === "UNSUPPORTED_IMAGE_FORMAT", "Returns code UNSUPPORTED_IMAGE_FORMAT");

  // 1.3 Oversized Image (> 8MB)
  const hugeBuffer = Buffer.alloc(9 * 1024 * 1024, 0xff); // 9MB
  const hugeBlob = new Blob([hugeBuffer], { type: "image/jpeg" });
  const hugeForm = new FormData();
  hugeForm.append("image", hugeBlob, "huge.jpg");
  const resHuge = await fetch(`${BASE_URL}/api/nutrition/analyze-image`, {
    method: "POST",
    body: hugeForm,
  });
  const dataHuge = await resHuge.json();
  assert(resHuge.status === 400, "Over-8MB file rejected with HTTP 400");
  assert(dataHuge.code === "INVALID_PAYLOAD", "Returns code INVALID_PAYLOAD for size limit");

  // SECTION 2: Real Gemini AI Multimodal Image Analysis
  console.log("\n>>> SECTION 2: Real Gemini AI Multimodal Vision Analysis");

  // 2.1 Burger (JPEG)
  const burgerResult = await uploadAndAnalyze(
    "public/images/test-meals/burger.jpg",
    "image/jpeg",
    "Burger (JPEG)"
  );

  // 2.2 Indian Thali (JPEG)
  const thaliResult = await uploadAndAnalyze(
    "public/images/test-meals/indian-thali.jpg",
    "image/jpeg",
    "Indian Thali (JPEG)"
  );

  // 2.3 Dal, Rice and Roti (JPEG)
  const dalResult = await uploadAndAnalyze(
    "public/images/test-meals/dal-rice-roti.jpg",
    "image/jpeg",
    "Dal, Rice and Roti (JPEG)"
  );

  // 2.4 Chicken Meal (WebP)
  const chickenResult = await uploadAndAnalyze(
    "public/images/products/lean-grilled-chicken-breast.webp",
    "image/webp",
    "Chicken Meal (WebP)"
  );

  // 2.5 Fresh Salad (PNG)
  const saladResult = await uploadAndAnalyze(
    "public/images/test-meals/salad-bowl.png",
    "image/png",
    "Fresh Salad Bowl (PNG)"
  );

  // 2.6 Multi-Item Bowl (WebP)
  const bowlResult = await uploadAndAnalyze(
    "public/images/products/grilled-chicken-quinoa-bowl.webp",
    "image/webp",
    "Multi-Item Power Bowl (WebP)"
  );

  // SECTION 3: Confirmation and Saving to Food Diary
  console.log("\n>>> SECTION 3: Confirm and Save Meal to Food Diary");

  // Create or retrieve a test user
  const testEmail = "test_ai_scanner_verify@nutriflexs.test";
  let user = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "AI Scanner Test User",
        streakDays: 5,
        proteinGoalGrams: 140,
        weightKg: 72,
        isVegetarian: false,
      },
    });
  }

  // Use real detected items from a successful AI scan to confirm meal
  const candidateResult = [burgerResult, thaliResult, dalResult, chickenResult, saladResult, bowlResult].find(
    (r) => r && Array.isArray(r.detectedItems) && r.detectedItems.length > 0
  );
  assert(candidateResult !== undefined, "At least one real AI scan succeeded with detected food items");
  console.log(`Using real AI scan results from "${candidateResult.mealTitle}" for Food Diary confirmation test.`);

  const todayKey = new Date().toISOString().slice(0, 10);
  const itemsToConfirm = candidateResult.detectedItems.slice(0, 3).map((item) => ({
    foodItemId: item.foodItemId,
    foodVariantId: item.foodVariantId,
    name: item.displayName,
    quantity: item.quantity,
    unit: item.unit,
    grams: item.grams,
    calories: item.calories,
    protein: item.protein,
    carbohydrates: item.carbohydrates,
    fat: item.fat,
  }));

  console.log("Confirming items to Lunch for user:", user.email);
  // Direct test of addFoodLog service or confirm endpoint
  const { addFoodLog, getDailyNutritionDiary } = require("./services/nutrition.service");
  for (const item of itemsToConfirm) {
    await addFoodLog(user.id, {
      dateKey: todayKey,
      mealType: "LUNCH",
      foodName: item.name,
      quantity: item.quantity,
      unit: item.unit,
      foodItemId: item.foodItemId || undefined,
      foodVariantId: item.foodVariantId || undefined,
      calories: item.calories,
      protein: item.protein,
      carbohydrates: item.carbohydrates,
      fat: item.fat,
    });
  }

  const diary = await getDailyNutritionDiary(user.id, todayKey);
  console.log("Daily diary updated:", {
    date: diary.date,
    totalCalories: diary.totals.calories,
    totalProtein: diary.totals.protein,
    lunchLogsCount: diary.meals.LUNCH.logs.length,
  });

  assert(diary.meals.LUNCH.logs.length >= 3, "Confirmed meal items recorded in LUNCH category");
  assert(diary.totals.calories > 0, "Daily total calories updated with confirmed meal");

  console.log("\n================================================================================");
  console.log("🎉 ALL REAL AI MEAL SCANNER TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("================================================================================");
}

run()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
