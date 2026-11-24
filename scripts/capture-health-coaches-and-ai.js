const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("Starting headless Chrome for visual capture...");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9323",
    "--user-data-dir=/tmp/chrome-test-coaches-ai-" + Date.now(),
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 20; attempt++) {
    await wait(500);
    try {
      res = await fetch("http://127.0.0.1:9323/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome on port 9323");
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

    await new Promise((r) => ws.addEventListener("open", r));

    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");

    // 1. CAPTURE /dietitians (Desktop)
    console.log("Capturing /dietitians Desktop...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/dietitians" });
    await wait(3500);

    const shot1 = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    if (shot1 && shot1.data) {
      fs.writeFileSync(
        path.join(ARTIFACTS_DIR, "health_coaches_desktop.png"),
        Buffer.from(shot1.data, "base64")
      );
      console.log("Saved health_coaches_desktop.png");
    }

    // 2. CAPTURE /dietitians (Mobile)
    console.log("Capturing /dietitians Mobile...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await wait(1000);

    const shot2 = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    if (shot2 && shot2.data) {
      fs.writeFileSync(
        path.join(ARTIFACTS_DIR, "health_coaches_mobile.png"),
        Buffer.from(shot2.data, "base64")
      );
      console.log("Saved health_coaches_mobile.png");
    }

    // 3. CAPTURE /ai-coach (Desktop)
    console.log("Capturing /ai-coach Desktop...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/ai-coach" });
    await wait(3500);

    const shot3 = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    if (shot3 && shot3.data) {
      fs.writeFileSync(
        path.join(ARTIFACTS_DIR, "ai_coach_desktop.png"),
        Buffer.from(shot3.data, "base64")
      );
      console.log("Saved ai_coach_desktop.png");
    }

    console.log("All screenshots captured successfully!");
    ws.close();
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
