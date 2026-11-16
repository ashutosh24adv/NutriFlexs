const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  console.log("=== CAPTURING NUTRIFLEXS COLOR CONSISTENCY SCREENSHOTS ===");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9297",
    "--user-data-dir=/tmp/chrome-test-color-screenshots",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await wait(1000);
    try {
      res = await fetch("http://127.0.0.1:9297/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9297");

  try {
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    let id = 1;
    const send = (method, params = {}) => {
      const msgId = ++id;
      return new Promise((resolve) => {
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === msgId) {
            ws.removeEventListener("message", handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await new Promise((resolve) => (ws.onopen = resolve));
    await send("Page.enable");

    async function setViewport(width, height, isMobile) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: isMobile ? 3 : 2,
        mobile: isMobile,
      });
    }

    async function takeScreenshot(fileName) {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(ARTIFACTS_DIR, fileName);
      fs.writeFileSync(filePath, Buffer.from(shot.data, "base64"));
      console.log(`   ✓ Saved ${fileName}`);
    }

    // 1. Desktop: Two Primary Experience Cards Side-by-Side (1280x1100)
    console.log("1. Capturing Landing Page Primary Cards (Order Food & Track Nutrition side-by-side)...");
    await setViewport(1280, 1100, false);
    await send("Page.navigate", { url: "http://localhost:3000/#order-food" });
    await wait(1000);
    await send("Runtime.evaluate", {
      expression: `
        const el = document.getElementById("order-food");
        if (el) {
          el.scrollIntoView({ behavior: "instant", block: "start" });
        }
      `,
    });
    await wait(2000);
    await takeScreenshot("landing_two_mode_cards_desktop.png");

    // 2. Mobile: Order Food Card (390x844)
    console.log("2. Capturing Landing Page Primary Cards (Mobile 390px)...");
    await setViewport(390, 844, true);
    await send("Page.navigate", { url: "http://localhost:3000/#order-food" });
    await wait(1000);
    await send("Runtime.evaluate", {
      expression: `
        const el = document.getElementById("order-food");
        if (el) {
          el.scrollIntoView({ behavior: "instant", block: "start" });
        }
      `,
    });
    await wait(1500);
    await takeScreenshot("landing_two_mode_cards_mobile.png");

    // 2b. Mobile: Track Nutrition Card scrolled (390x844)
    console.log("2b. Capturing Mobile Track Nutrition Card...");
    await send("Runtime.evaluate", {
      expression: `
        window.scrollBy({ top: 620, behavior: "instant" });
      `,
    });
    await wait(1500);
    await takeScreenshot("landing_track_nutrition_card_mobile.png");

    // 3. Desktop Hero Section Dual Composition
    console.log("3. Capturing Hero Section Dual Composition...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000" });
    await wait(2000);
    await takeScreenshot("landing_hero_dual_brand_desktop.png");

    // 4. Desktop: Indian Food Variants & Innovation Showcase
    console.log("4. Capturing Indian Food Variants Section...");
    await setViewport(1280, 950, false);
    await send("Page.navigate", { url: "http://localhost:3000/#indian-nutrition-innovation" });
    await wait(1000);
    await send("Runtime.evaluate", {
      expression: `
        const el = document.getElementById("indian-nutrition-innovation");
        if (el) {
          el.scrollIntoView({ behavior: "instant", block: "start" });
        }
      `,
    });
    await wait(2000);
    await takeScreenshot("landing_indian_variants_green_theme_desktop.png");

    // 5. Desktop: Track Nutrition Dashboard View (/nutrition)
    console.log("5. Capturing Track Nutrition Dashboard...");
    await setViewport(1280, 950, false);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    await wait(2500);
    await takeScreenshot("nutrition_tracker_dashboard_green_theme_desktop.png");

    // 6. Mobile: Track Nutrition Dashboard View (/nutrition)
    console.log("6. Capturing Mobile Track Nutrition Dashboard...");
    await setViewport(390, 844, true);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    await wait(2000);
    await takeScreenshot("nutrition_tracker_dashboard_green_theme_mobile.png");

    console.log("\n✓ ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
    ws.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

captureScreenshots().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
