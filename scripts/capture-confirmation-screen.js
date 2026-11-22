const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureConfirmationScreen() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9325",
    "--user-data-dir=/tmp/chrome-test-scanner-confirmation",
    "--disable-gpu",
    "about:blank",
  ]);

  await wait(1500);
  const cdpRes = await fetch("http://127.0.0.1:9325/json");
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

  // Click on "Scan Meal"
  await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      const scanBtn = buttons.find(b => b.innerText && (b.innerText.includes("Scan Meal") || b.innerText.includes("AI Scanner") || b.innerText.includes("Scan with AI")));
      if (scanBtn) scanBtn.click();
    })()
  `);
  await wait(1500);

  // Click "Analyze Meal with AI" using sample/file upload
  console.log("Triggering sample scan in modal to verify confirmation screen...");
  await evaluate(`
    (() => {
      const sampleBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Try with Sample Photo") || b.innerText.includes("Sample"));
      if (sampleBtn) {
        sampleBtn.click();
        return;
      }
      const analyzeBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("Analyze Meal with AI"));
      if (analyzeBtn) analyzeBtn.click();
    })()
  `);

  console.log("Waiting for analysis screen...");
  for (let i = 0; i < 20; i++) {
    await wait(1000);
    const hasConfirmationScreen = await evaluate(`
      (() => {
        return !!document.querySelector("button")?.innerText?.includes("Confirm & Log") || Array.from(document.querySelectorAll("h2, h3, h4")).some(h => h.innerText.includes("Meal Analysis") || h.innerText.includes("Detected Items"));
      })()
    `);
    if (hasConfirmationScreen) {
      console.log(`Confirmation screen detected in turn ${i + 1}!`);
      break;
    }
  }

  await wait(1500);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const confPath = path.join(ARTIFACTS_DIR, "ai_meal_scanner_confirmation_verified.png");
  fs.writeFileSync(confPath, Buffer.from(shot.data, "base64"));
  console.log("Saved confirmation screenshot:", confPath);

  ws.close();
  chrome.kill();
}

captureConfirmationScreen().catch(console.error);
