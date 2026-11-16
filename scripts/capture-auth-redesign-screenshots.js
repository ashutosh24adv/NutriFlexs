const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  console.log("=== CAPTURING AUTH REDESIGN SCREENSHOTS ===");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9299",
    "--user-data-dir=/tmp/chrome-test-auth-screenshots",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await wait(1000);
    try {
      res = await fetch("http://127.0.0.1:9299/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9299");

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

    // 1. Desktop Signup Page (1280x950)
    console.log("1. Capturing Desktop Signup (1280px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 950,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/signup" });
    await wait(2500);
    let shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "auth_signup_redesigned_desktop.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved auth_signup_redesigned_desktop.png");

    // 2. Mobile Signup Page (390x844 iPhone)
    console.log("2. Capturing Mobile Signup (390px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await send("Page.navigate", { url: "http://localhost:3000/signup" });
    await wait(2000);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "auth_signup_redesigned_mobile.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved auth_signup_redesigned_mobile.png");

    // 3. Desktop Login Page (1280x950)
    console.log("3. Capturing Desktop Login (1280px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 950,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await wait(2500);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "auth_login_redesigned_desktop.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved auth_login_redesigned_desktop.png");

    // 4. Mobile Login Page (390x844 iPhone)
    console.log("4. Capturing Mobile Login (390px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await wait(2000);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "auth_login_redesigned_mobile.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved auth_login_redesigned_mobile.png");

    // 5. Desktop Super Admin Signup Page (1280x950)
    console.log("5. Capturing Desktop Admin Signup (1280px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 950,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/signup?portal=admin" });
    await wait(2000);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "auth_admin_signup_redesigned_desktop.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved auth_admin_signup_redesigned_desktop.png");

    ws.close();
  } finally {
    chrome.kill();
  }
  console.log("=== ALL AUTH SCREENSHOTS CAPTURED SUCCESSFULLY ===");
}

captureScreenshots().catch((err) => {
  console.error("Screenshot Capture Failed:", err);
  process.exit(1);
});

