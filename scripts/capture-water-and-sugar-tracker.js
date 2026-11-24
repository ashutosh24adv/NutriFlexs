const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Starting headless Chrome for visual verification...");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9324",
    "--user-data-dir=/tmp/chrome-test-water-sugar-" + Date.now(),
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 20; attempt++) {
    await wait(500);
    try {
      res = await fetch("http://127.0.0.1:9324/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome on port 9324");
  }

  try {
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found in Chrome CDP");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let id = 1;

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === msgId) {
            ws.removeEventListener("message", handler);
            resolve(data.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await new Promise((resolve) => ws.addEventListener("open", resolve));

    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");

    // 1. Desktop Viewport
    console.log("Setting desktop viewport 1280x950...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 950,
      deviceScaleFactor: 2,
      mobile: false,
    });

    console.log("Navigating to http://localhost:3000/nutrition ...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    await wait(3500);

    // Pre-populate guest localStorage so user sees populated cards in screenshot
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const today = new Date().toISOString().split("T")[0];
          // Set water entries
          const waterEntries = [
            { id: "demo_w1", dateKey: today, amountMl: 500, loggedAt: new Date(Date.now() - 3600000 * 3).toISOString() },
            { id: "demo_w2", dateKey: today, amountMl: 250, loggedAt: new Date(Date.now() - 3600000 * 1.5).toISOString() },
            { id: "demo_w3", dateKey: today, amountMl: 500, loggedAt: new Date(Date.now() - 1800000).toISOString() },
          ];
          localStorage.setItem("nutriflexs_guest_water_entries", JSON.stringify(waterEntries));
          localStorage.setItem("nutriflexs_guest_water_goal", JSON.stringify(3000));
          localStorage.setItem("nutriflexs_guest_sugar_goal", JSON.stringify({ sugarTarget: 35, addedSugarTarget: 25 }));

          // Set a couple food logs with sugar
          const foodLogs = [
            {
              id: "demo_food1",
              name: "Oatmeal with Blueberries & Honey",
              mealType: "BREAKFAST",
              quantity: 1,
              unit: "bowl",
              dateKey: today,
              calories: 280,
              protein: 10,
              carbohydrates: 52,
              fat: 4,
              totalSugar: 14,
              addedSugar: 6,
              hasSugarData: true,
              loggedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
              isAutoLoggedFromOrder: false
            },
            {
              id: "demo_food2",
              name: "Grilled Chicken Breast with Steamed Broccoli",
              mealType: "LUNCH",
              quantity: 1,
              unit: "plate",
              dateKey: today,
              calories: 360,
              protein: 48,
              carbohydrates: 12,
              fat: 8,
              totalSugar: 2.5,
              addedSugar: 0,
              hasSugarData: true,
              loggedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
              isAutoLoggedFromOrder: false
            }
          ];
          localStorage.setItem("nutriflexs_guest_food_logs", JSON.stringify(foodLogs));
          window.location.reload();
        })();
      `
    });

    await wait(3000);

    // Capture desktop screenshot
    console.log("Capturing Desktop Water & Sugar Tracker screenshot...");
    const desktopScreenshot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "water_sugar_tracker_desktop.png"),
      Buffer.from(desktopScreenshot.data, "base64")
    );
    console.log("✓ Saved water_sugar_tracker_desktop.png");

    // 2. Mobile Viewport (iPhone 14: 390x844)
    console.log("Setting mobile viewport 390x844...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await wait(1500);

    console.log("Capturing Mobile Water & Sugar Tracker screenshot...");
    const mobileScreenshot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "water_sugar_tracker_mobile.png"),
      Buffer.from(mobileScreenshot.data, "base64")
    );
    console.log("✓ Saved water_sugar_tracker_mobile.png");

    ws.close();
    chrome.kill();
    console.log("Visual verification capture completed successfully!");
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

run();
