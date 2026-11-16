const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifySignupUI() {
  console.log("=== VERIFYING SIGNUP PAGE IN BROWSER ===");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9288",
    "--user-data-dir=/tmp/chrome-test-signup-profile",
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

    console.log("Navigating to /signup...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 950,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/signup" });
    await wait(2500);

    const shot = await send("Page.captureScreenshot", { format: "png" });
    const shotPath = path.join(ARTIFACTS_DIR, "signup_page_restored_desktop.png");
    fs.writeFileSync(shotPath, Buffer.from(shot.data, "base64"));
    console.log("  ✓ Saved screenshot:", shotPath);

    ws.close();
  } finally {
    chrome.kill();
  }
  console.log("=== SIGNUP UI VERIFIED ===");
}

verifySignupUI().catch((err) => {
  console.error("UI Test Error:", err);
  process.exit(1);
});

