const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9327",
    "--user-data-dir=/tmp/chrome-test-ai-coach-mob-" + Date.now(),
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 20; attempt++) {
    await wait(500);
    try {
      res = await fetch("http://127.0.0.1:9327/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome on port 9327");
  }

  try {
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
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
    await send("Runtime.enable");

    // Configure iPhone 14 mobile viewport (390x844)
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    console.log("Navigating to http://localhost:3000/ai-coach on mobile...");
    await send("Page.navigate", { url: "http://localhost:3000/ai-coach" });
    await wait(3000);

    const scrollY = (await send("Runtime.evaluate", { expression: "window.scrollY" })).result.value;
    console.log(`Mobile window.scrollY: ${scrollY}`);

    const mobileScreenshot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "ai_coach_initial_top_mobile.png"),
      Buffer.from(mobileScreenshot.data, "base64")
    );
    console.log("✓ Saved ai_coach_initial_top_mobile.png");

    ws.close();
    chrome.kill();
    process.exit(0);
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

run();
