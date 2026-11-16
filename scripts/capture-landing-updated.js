const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureLandingScreenshots() {
  console.log("=== CAPTURING UPDATED LANDING PAGE SCREENSHOTS ===");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9288",
    "--user-data-dir=/tmp/chrome-test-landing-updated",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await wait(1000);
    try {
      res = await fetch("http://127.0.0.1:9288/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9288");

  try {
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data);
        callbacks.delete(data.id);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        callbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await new Promise((r) => (ws.onopen = r));
    await send("Page.enable");
    await send("DOM.enable");

    async function captureView(url, width, height, outputFile, scrollY = 0) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 2,
        mobile: width < 600,
      });

      await send("Page.navigate", { url });
      await wait(3000);

      if (scrollY > 0) {
        await send("Runtime.evaluate", {
          expression: `window.scrollTo({ top: ${scrollY}, behavior: 'instant' })`,
        });
        await wait(1000);
      }

      const { result } = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(ARTIFACTS_DIR, outputFile);
      fs.writeFileSync(filePath, Buffer.from(result.data, "base64"));
      console.log(`   ✓ Saved ${outputFile}`);
    }

    console.log("1. Capturing Desktop Landing Transition (1280px, scrolled to How NutriFlexs Works)...");
    await captureView("http://localhost:3000/#how-it-works", 1280, 950, "landing_page_no_bmi_transition_desktop.png", 1450);

    console.log("2. Capturing Desktop Landing Hero (1280px)...");
    await captureView("http://localhost:3000", 1280, 850, "landing_page_no_bmi_hero_desktop.png", 0);

    console.log("3. Capturing Mobile Landing Transition (390px)...");
    await captureView("http://localhost:3000/#how-it-works", 390, 844, "landing_page_no_bmi_transition_mobile.png", 2600);

    ws.close();
  } finally {
    chrome.kill("SIGTERM");
  }

  console.log("=== ALL LANDING SCREENSHOTS CAPTURED SUCCESSFULLY ===");
}

captureLandingScreenshots().catch((err) => {
  console.error("Screenshot capture error:", err);
  process.exit(1);
});

