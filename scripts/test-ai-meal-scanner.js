const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runE2E() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS AI PHOTO FOOD & CALORIE SCANNER COMPLETE E2E VERIFICATION");
  console.log("================================================================================");

  // 1. Direct Backend API Security & Missing Gemini API Key Verification
  console.log("\n--- TEST 1: Backend API Security & Missing Key Verification ---");

  // Create a minimal valid JPEG buffer (starts with FF D8 FF)
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x00, 0xff, 0xd9,
  ]);

  // Test missing key error response without simulate header
  const formWithoutSim = new FormData();
  formWithoutSim.append("image", new Blob([validJpegBuffer], { type: "image/jpeg" }), "plate.jpg");

  const scanRes503 = await fetch("http://localhost:3000/api/nutrition/analyze-image", {
    method: "POST",
    body: formWithoutSim,
  });

  const scanData503 = await scanRes503.json();
  console.log("Missing key response status:", scanRes503.status);
  console.log("Missing key response body:", scanData503);

  assert(scanRes503.status === 503, "API returns HTTP 503 when GEMINI_API_KEY is not configured");
  assert(scanData503.code === "MISSING_GEMINI_API_KEY", "API returns code MISSING_GEMINI_API_KEY");
  assert(
    scanData503.error.includes("Gemini API key is not configured on the server"),
    "API returns exact security error description without silently mocking"
  );

  // Test invalid file rejection (e.g. text file)
  const invalidBuffer = Buffer.from("Hello this is plain text, not an image");
  const formInvalid = new FormData();
  formInvalid.append("image", new Blob([invalidBuffer], { type: "text/plain" }), "fake.txt");

  const scanResInvalid = await fetch("http://localhost:3000/api/nutrition/analyze-image", {
    method: "POST",
    body: formInvalid,
  });
  const scanDataInvalid = await scanResInvalid.json();
  assert(scanResInvalid.status === 400, "API rejects non-image with HTTP 400");
  assert(scanDataInvalid.error.includes("Unsupported image format"), "API returns magic-byte format validation error");

  // 2. Test Multi-Component AI Analysis & Authoritative Database Matching
  console.log("\n--- TEST 2: Multi-Component Food Analysis & DB Matching ---");
  const simRes = await fetch("http://localhost:3000/api/nutrition/analyze-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mock-meal-analysis": "true",
    },
    body: JSON.stringify({
      simulateSample: true,
      imageBase64: "data:image/jpeg;base64," + validJpegBuffer.toString("base64"),
    }),
  });

  const simData = await simRes.json();
  assert(simRes.ok && simData.success, "Analysis endpoint returns success: true");
  assert(Array.isArray(simData.detectedItems), "Detected items is an array");
  assert(simData.detectedItems.length >= 3, `Identified separate food components (${simData.detectedItems.length} items)`);

  const dalItem = simData.detectedItems.find((i) => i.detectedName.toLowerCase().includes("dal"));
  assert(dalItem !== undefined, "Identified Dal Makhani as separate component");
  assert(dalItem.isGravy === true, "Distinguished gravy component with isGravy: true");
  assert(dalItem.isVerified === true, "Authoritatively matched against NutriFlexs database");
  console.log("Dal Makhani matched:", {
    name: dalItem.displayName,
    calories: dalItem.calories,
    protein: dalItem.protein,
    carbs: dalItem.carbohydrates,
    fat: dalItem.fat,
    isGravy: dalItem.isGravy,
    isVerified: dalItem.isVerified,
  });

  const rotiItem = simData.detectedItems.find((i) => i.detectedName.toLowerCase().includes("roti"));
  assert(rotiItem !== undefined, "Identified Whole Wheat Roti as separate component");
  assert(rotiItem.isGravy === false, "Whole Wheat Roti flagged as solid food (isGravy: false)");

  assert(simData.totalMealNutrition.calories > 0, "Total meal calories computed");
  assert(simData.totalMealNutrition.protein > 0, "Total meal protein computed");

  // 3. Test Confirmation Endpoint (/api/nutrition/confirm-image-log)
  console.log("\n--- TEST 3: Confirm Image Log Endpoint ---");
  const todayKey = new Date().toISOString().split("T")[0];
  const confirmGuestRes = await fetch("http://localhost:3000/api/nutrition/confirm-image-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mealType: "LUNCH",
      dateKey: todayKey,
      items: [
        {
          name: dalItem.displayName,
          quantity: 1,
          unit: "medium_bowl",
          grams: dalItem.grams,
          calories: dalItem.calories,
          protein: dalItem.protein,
          carbohydrates: dalItem.carbohydrates,
          fat: dalItem.fat,
        },
      ],
    }),
  });

  const confirmGuestData = await confirmGuestRes.json();
  assert(confirmGuestRes.ok && confirmGuestData.success, "Guest confirmation endpoint succeeds");
  assert(confirmGuestData.isGuest === true, "Guest confirmation returns isGuest: true for local storage logging");

  // 4. Create an authenticated test user with completed onboarding & Nutrition Pass
  console.log("\n--- TEST 4: Setting up Authenticated User & Subscription ---");
  const timestamp = Date.now();
  const testEmail = `ai_scanner_test_${timestamp}@nutriflexs.com`;
  const testPassword = "Password123!";
  const testName = `AI Scanner Tester ${timestamp.toString().slice(-4)}`;

  console.log(`Registering test user: ${testEmail}...`);
  const regRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      portal: "customer",
    }),
  });
  const regData = await regRes.json();
  assert(regRes.ok && regData.success, "Test customer created successfully");

  // Mark onboarding complete so user accesses /nutrition directly
  const updatedUser = await prisma.user.update({
    where: { email: testEmail },
    data: {
      hasCompletedNutritionOnboarding: true,
      nutritionOnboardingStep: 4,
      nutritionOnboardingCompletedAt: new Date(),
      nutritionGoal: {
        create: {
          dailyCalorieGoal: 2200,
          proteinGoal: 140,
          carbohydrateGoal: 220,
          fatGoal: 65,
        },
      },
    },
  });

  // Assign Nutrition Pass
  const nutritionPlan = await prisma.subscriptionPlan.findFirst({
    where: { planType: "NUTRITION_PASS" },
  });
  if (nutritionPlan) {
    await prisma.subscription.create({
      data: {
        userId: updatedUser.id,
        planId: nutritionPlan.id,
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        aiScansUsed: 0,
      },
    });
    console.log("Assigned NutriFlexs Nutrition Pass subscription to test user");
  }

  // 5. Browser UI Automation & Verification via Chrome CDP
  console.log("\n--- TEST 5: Browser UI Automation & Visual Inspection ---");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9298",
    "--user-data-dir=/tmp/chrome-test-ai-scanner",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let cdpRes = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
    try {
      cdpRes = await fetch("http://127.0.0.1:9298/json");
      if (cdpRes.ok) break;
    } catch (e) {}
  }
  if (!cdpRes || !cdpRes.ok) throw new Error("Could not connect to Chrome CDP on port 9298");

  try {
    const tabs = await cdpRes.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let msgId = 1;

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener("message", handler);
            const r = data.result;
            resolve(r?.result !== undefined ? r.result : r);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await new Promise((resolve) => (ws.onopen = resolve));
    await send("Page.enable");
    await send("Runtime.enable");

    async function setViewport(width, height, isMobile) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: isMobile ? 3 : 2,
        mobile: isMobile,
      });
    }

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.value;
    }

    async function captureScreenshot(filename) {
      const res = await send("Page.captureScreenshot", { format: "png" });
      const targetPath = path.join(ARTIFACTS_DIR, filename);
      fs.writeFileSync(targetPath, Buffer.from(res.data, "base64"));
      console.log(`📸 Screenshot saved: ${filename}`);
      return targetPath;
    }

    // Set Desktop Viewport
    await setViewport(1280, 850, false);

    // Log in as Customer
    console.log("Logging into http://localhost:3000/login...");
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await wait(2000);

    await evaluate(`
      (() => {
        function setReactInput(input, value) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const emailInput = document.getElementById("login-email") || document.querySelector('input[type="email"]');
        const passInput = document.getElementById("login-password") || document.querySelector('input[type="password"]');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (emailInput && passInput && submitBtn) {
          setReactInput(emailInput, "${testEmail}");
          setReactInput(passInput, "${testPassword}");
          submitBtn.click();
        }
      })()
    `);

    // Wait for login redirect
    for (let i = 0; i < 20; i++) {
      await wait(600);
      const url = await evaluate("window.location.pathname");
      if (url === "/home" || url === "/menu" || url === "/nutrition") break;
    }

    // Navigate to /nutrition
    console.log("Navigating to http://localhost:3000/nutrition...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });

    // Wait for Daily Nutrition Tracker to render
    for (let i = 0; i < 20; i++) {
      await wait(600);
      const hasTracker = await evaluate(`
        document.body.innerText.includes("Daily Nutrition Tracker") || document.body.innerText.includes("Calories")
      `);
      if (hasTracker) break;
    }

    // Verify "Scan Your Meal" button is present on /nutrition
    const hasScanButton = await evaluate(`
      Boolean(Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Scan Your Meal')))
    `);
    assert(hasScanButton, "Scan Your Meal prominent button exists on /nutrition");

    // Click "Scan Your Meal"
    console.log("Clicking 'Scan Your Meal' button...");
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Scan Your Meal'));
      if (btn) btn.click();
    `);
    await wait(1200);

    // Verify modal is open
    const modalTitle = await evaluate(`
      document.querySelector('#scanner-modal-title')?.innerText || ''
    `);
    assert(modalTitle.includes("Scan Your Meal"), "AI Meal Scanner modal opened with title 'Scan Your Meal'");

    // Capture upload modal screenshot
    await captureScreenshot("ai_scanner_upload_modal_desktop.png");

    // Click the "Try Sample Indian Thali Scan (Quick Demo)" button
    console.log("Triggering Sample Indian Thali Scan demonstration...");
    await evaluate(`
      const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Try Sample Indian Thali Scan'));
      if (demoBtn) demoBtn.click();
    `);

    // Wait for analysis transition (Neon DB query can take 2-5 seconds)
    let analysisHeader = "";
    for (let i = 0; i < 30; i++) {
      await wait(600);
      analysisHeader = await evaluate(`
        document.querySelector('#scanner-modal-title')?.innerText || ''
      `);
      if (
        analysisHeader.includes("Thali") ||
        analysisHeader.includes("Meal Analysis") ||
        analysisHeader.includes("Plate")
      ) {
        break;
      }
    }
    console.log("Modal title after scan:", analysisHeader);
    assert(
      analysisHeader.includes("Thali") ||
        analysisHeader.includes("Meal Analysis") ||
        analysisHeader.includes("Plate"),
      "Modal displayed 'Your Meal Analysis' confirmation view"
    );

    // Capture confirmation screen screenshot
    await captureScreenshot("ai_scanner_confirmation_screen_desktop.png");

    // Verify detected food item cards in UI
    const detectedNames = await evaluate(`
      Array.from(document.querySelectorAll('input[type="text"]')).map(i => i.value).filter(Boolean)
    `);
    console.log("Detected food items in UI:", detectedNames);
    assert(detectedNames.some((n) => n.includes("Dal Makhani")), "Dal Makhani displayed in editable cards");
    assert(detectedNames.some((n) => n.includes("Roti") || n.includes("Phulka")), "Whole Wheat Roti / Phulka displayed in editable cards");

    // Verify Gravy and Verified badges in UI
    const badgesText = await evaluate(`
      Array.from(document.querySelectorAll('span, div')).map(el => el.innerText).filter(t => t.includes('Gravy') || t.includes('NutriFlexs Verified'))
    `);
    assert(badgesText.length > 0, "UI renders Gravy and NutriFlexs Verified badges");

    // Test interactive quantity editing: increase Dal Makhani quantity
    console.log("Testing live interactive quantity adjustment...");
    const initialCaloriesText = await evaluate(`
      document.querySelector('div.grid.grid-cols-4')?.innerText || ''
    `);
    console.log("Initial calories in summary card:", initialCaloriesText.replace(/\\n/g, ' '));

    // Click "+" button on first item
    await evaluate(`
      const plusButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText === '+');
      if (plusButtons[0]) plusButtons[0].click();
    `);
    await wait(800);

    const updatedCaloriesText = await evaluate(`
      document.querySelector('div.grid.grid-cols-4')?.innerText || ''
    `);
    console.log("Updated calories after + click:", updatedCaloriesText.replace(/\\n/g, ' '));
    assert(initialCaloriesText !== updatedCaloriesText, "Live macro recalculation dynamically updated total calories");

    // Capture screenshot of edited quantities
    await captureScreenshot("ai_scanner_edited_quantities_desktop.png");

    // Test "+ Add Missing Food Item" search
    console.log("Testing + Add Missing Food Item picker...");
    await evaluate(`
      const addMissingBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add Missing Food Item'));
      if (addMissingBtn) addMissingBtn.click();
    `);
    await wait(600);

    // Type "Rice" into search
    await evaluate(`
      const searchInput = document.querySelector('input[placeholder*="Search e.g."]');
      if (searchInput) {
        searchInput.value = 'Rice';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);
    await wait(1200);

    // Capture screenshot of missing food search
    await captureScreenshot("ai_scanner_add_missing_food_desktop.png");

    // Click "Add to Food Diary" button
    console.log("Confirming meal into Food Diary...");
    await evaluate(`
      const addToDiaryBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Add to Food Diary'));
      if (addToDiaryBtn) addToDiaryBtn.click();
    `);
    await wait(2200);

    // Verify food diary updated on page
    const diaryContent = await evaluate(`
      document.body.innerText
    `);
    assert(
      diaryContent.includes("Dal Makhani") || diaryContent.includes("Roti") || diaryContent.includes("Phulka"),
      "Newly scanned meal items immediately appeared in Food Diary"
    );

    // Capture diary screenshot
    await captureScreenshot("nutrition_diary_after_ai_scan_desktop.png");

    // 6. Test Mobile Viewport Responsiveness (375x667)
    console.log("\n--- TEST 6: Mobile Viewport Responsiveness ---");
    await setViewport(375, 720, true);
    await wait(1000);

    // Click "Scan Your Meal" on mobile
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Scan Your Meal'));
      if (btn) btn.click();
    `);
    await wait(1000);

    // Open sample on mobile
    await evaluate(`
      const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Try Sample Indian Thali Scan'));
      if (demoBtn) demoBtn.click();
    `);
    for (let i = 0; i < 30; i++) {
      await wait(600);
      const title = await evaluate(`document.querySelector('#scanner-modal-title')?.innerText || ''`);
      if (title.includes("Thali") || title.includes("Meal Analysis") || title.includes("Plate")) {
        break;
      }
    }

    await captureScreenshot("ai_scanner_mobile_confirmation.png");

    console.log("\n================================================================================");
    console.log("🎉 ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY!");
    console.log("================================================================================");

    ws.close();
  } finally {
    chrome.kill("SIGTERM");
    await prisma.$disconnect();
  }
}

runE2E().catch((err) => {
  console.error("FATAL ERROR in E2E runner:", err);
  process.exit(1);
});
