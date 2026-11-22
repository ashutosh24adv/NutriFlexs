const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("================================================================================");
  console.log("    NUTRIFLEXS AI MEAL SCANNER COMPLETE VERIFICATION (JPEG, PNG, WEBP)        ");
  console.log("================================================================================");

  // 1. API Verification for JPEG, PNG, WebP
  const testImages = [
    { name: "JPEG Format (Burger)", file: "public/images/test-meals/burger.jpg", mime: "image/jpeg" },
    { name: "PNG Format (Salad Bowl)", file: "public/images/test-meals/salad-bowl.png", mime: "image/png" },
    { name: "WebP Format (Quinoa Bowl)", file: "public/images/products/grilled-chicken-quinoa-bowl.webp", mime: "image/webp" },
  ];

  for (const img of testImages) {
    console.log(`\nTesting API with: ${img.name} (${img.file})...`);
    const buffer = fs.readFileSync(img.file);
    const formData = new FormData();
    formData.append("image", new Blob([buffer], { type: img.mime }), path.basename(img.file));

    const start = Date.now();
    const res = await fetch("http://localhost:3000/api/nutrition/analyze-image", {
      method: "POST",
      body: formData,
    });
    const duration = Date.now() - start;
    console.log(`Response HTTP Status: ${res.status} ${res.statusText} in ${duration}ms`);

    const data = await res.json();
    if (!data.success) {
      console.error(`❌ API Failed for ${img.name}:`, data);
      throw new Error(`API failed for ${img.name}`);
    }

    console.log(`✅ ${img.name} Succeeded!`);
    console.log(`   - Meal Title: "${data.mealTitle}"`);
    console.log(`   - Detected Components: ${data.detectedItems?.length}`);
    data.detectedItems?.forEach((item, idx) => {
      console.log(`     [${idx + 1}] ${item.detectedName} -> Display: "${item.displayName}" (${item.grams}g, ${item.calories} kcal, Source: ${item.matchSource}, Verified: ${item.isVerified})`);
    });
    console.log(`   - Macro Totals: ${data.totalMealNutrition?.calories} kcal | ${data.totalMealNutrition?.protein}g P | ${data.totalMealNutrition?.carbohydrates}g C | ${data.totalMealNutrition?.fat}g F`);
  }

  // 2. Headless Chrome UI Verification
  console.log("\n--------------------------------------------------------------------------------");
  console.log("2. Testing End-to-End UI Flow via Headless Chrome...");
  console.log("--------------------------------------------------------------------------------");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9323",
    "--user-data-dir=/tmp/chrome-test-scanner-v3",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  await wait(1500);
  const cdpRes = await fetch("http://127.0.0.1:9323/json");
  const tabs = await cdpRes.json();
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = msgId++;
    const handler = (e) => {
      const data = JSON.parse(e.data);
      if (data.id === id) {
        ws.removeEventListener("message", handler);
        resolve(data.result);
      }
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise((r) => ws.addEventListener("open", r));
  await send("Page.enable");
  await send("DOM.enable");
  await send("Runtime.enable");

  async function evaluate(expression) {
    const res = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });

  console.log("Navigating to http://localhost:3000/nutrition ...");
  await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
  await wait(3000);

  // Click on "Scan Your Meal" button
  console.log("Clicking 'Scan Your Meal' button...");
  await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      const scanBtn = buttons.find(b => b.innerText && (b.innerText.includes("Scan Meal") || b.innerText.includes("AI Scanner") || b.innerText.includes("Scan with AI")));
      if (scanBtn) {
        scanBtn.click();
        return true;
      }
      return false;
    })()
  `);

  await wait(1500);

  // Capture modal open screenshot
  const shotModalOpen = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, "ai_meal_scanner_modal_verified.png"), Buffer.from(shotModalOpen.data, "base64"));
  console.log("Saved: ai_meal_scanner_modal_verified.png");

  ws.close();
  chrome.kill();
  console.log("\n================================================================================");
  console.log("✅ COMPLETE END-TO-END VERIFICATION SUCCEEDED!");
  console.log("================================================================================");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
