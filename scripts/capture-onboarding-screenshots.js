const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  console.log("=== CAPTURING NUTRIFLEXS NUTRITION ONBOARDING SCREENSHOTS ===");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9298",
    "--user-data-dir=/tmp/chrome-test-onboarding-screenshots",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await wait(1000);
    try {
      res = await fetch("http://127.0.0.1:9298/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9298");

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

    // 1. Step 1 - Sex Selection (Desktop)
    console.log("1. Capturing Step 1: Sex Selection (Desktop 1280px)...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=1" });
    await wait(2000);
    await takeScreenshot("onboarding_step1_sex_desktop.png");

    // 2. Step 1 - Sex Selection (Mobile)
    console.log("2. Capturing Step 1: Sex Selection (Mobile 390px)...");
    await setViewport(390, 844, true);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=1" });
    await wait(1500);
    await takeScreenshot("onboarding_step1_sex_mobile.png");

    // 3. Step 3 - Height with Unit Switcher (Desktop)
    console.log("3. Capturing Step 3: Height & Unit Switcher (Desktop)...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=3" });
    await wait(1500);
    await takeScreenshot("onboarding_step3_height_desktop.png");

    // 4. Step 9 - Feasibility Assessment (Desktop)
    console.log("4. Capturing Step 9: Feasibility Assessment (Desktop)...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=9" });
    await wait(1500);
    await takeScreenshot("onboarding_step9_feasibility_desktop.png");

    // 5. Step 9 - Feasibility Assessment (Mobile)
    console.log("5. Capturing Step 9: Feasibility Assessment (Mobile)...");
    await setViewport(390, 844, true);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=9" });
    await wait(1500);
    await takeScreenshot("onboarding_step9_feasibility_mobile.png");

    // 6. Step 15 - Plan Summary & Science-Backed Targets (Desktop)
    console.log("6. Capturing Step 15: Plan Summary & Macro Targets (Desktop)...");
    await setViewport(1280, 950, false);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=15" });
    await wait(1500);
    await takeScreenshot("onboarding_step15_summary_desktop.png");

    // 7. Step 15 - Plan Summary (Mobile)
    console.log("7. Capturing Step 15: Plan Summary (Mobile)...");
    await setViewport(390, 844, true);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=15" });
    await wait(1500);
    await takeScreenshot("onboarding_step15_summary_mobile.png");

    // 8. Step 16 - Hold to Continue Button (Desktop)
    console.log("8. Capturing Step 16: Hold to Continue (Desktop)...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=16" });
    await wait(1500);
    await takeScreenshot("onboarding_step16_hold_desktop.png");

    // 9. Step 18 - Calorie Rollover (Desktop)
    console.log("9. Capturing Step 18: Calorie Rollover (Desktop)...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=18" });
    await wait(1500);
    await takeScreenshot("onboarding_step18_rollover_desktop.png");

    // 10. Step 19 - Dual Platform Benefits (Desktop)
    console.log("10. Capturing Step 19: NutriFlexs Platform Synergy (Desktop)...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=19" });
    await wait(1500);
    await takeScreenshot("onboarding_step19_platform_desktop.png");

    // 11. Step 19 - Dual Platform Benefits (Mobile)
    console.log("11. Capturing Step 19: NutriFlexs Platform Synergy (Mobile)...");
    await setViewport(390, 844, true);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition?onboarding=true&step=19" });
    await wait(1500);
    await takeScreenshot("onboarding_step19_platform_mobile.png");

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

