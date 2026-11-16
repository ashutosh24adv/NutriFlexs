const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  console.log("Launching Chrome CDP for CSS Design System verification...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9297",
    "--user-data-dir=/tmp/chrome-test-css-system",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
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

    // 1. Landing Page Desktop (1280px)
    console.log("1. Capturing Landing Page Desktop (1280px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 850,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000" });
    await wait(2500);
    const snapLanding = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "css_system_landing_desktop.png"), Buffer.from(snapLanding.data, "base64"));
    console.log("   📸 Saved css_system_landing_desktop.png");

    // 2. FAQ Page Desktop (1280px)
    console.log("2. Capturing FAQ Page Desktop (1280px)...");
    await send("Page.navigate", { url: "http://localhost:3000/faq" });
    await wait(2000);
    const snapFaq = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "css_system_faq_desktop.png"), Buffer.from(snapFaq.data, "base64"));
    console.log("   📸 Saved css_system_faq_desktop.png");

    // 3. Contact Us Page Desktop (1280px)
    console.log("3. Capturing Contact Us Page Desktop (1280px)...");
    await send("Page.navigate", { url: "http://localhost:3000/contact" });
    await wait(2000);
    const snapContact = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "css_system_contact_desktop.png"), Buffer.from(snapContact.data, "base64"));
    console.log("   📸 Saved css_system_contact_desktop.png");

    // 4. Contact Us Page Mobile (390px)
    console.log("4. Capturing Contact Us Page Mobile (390px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send("Page.navigate", { url: "http://localhost:3000/contact" });
    await wait(2000);
    const snapContactMobile = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "css_system_contact_mobile.png"), Buffer.from(snapContactMobile.data, "base64"));
    console.log("   📸 Saved css_system_contact_mobile.png");

    // 5. FAQ Page Mobile (390px)
    console.log("5. Capturing FAQ Page Mobile (390px)...");
    await send("Page.navigate", { url: "http://localhost:3000/faq" });
    await wait(2000);
    const snapFaqMobile = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "css_system_faq_mobile.png"), Buffer.from(snapFaqMobile.data, "base64"));
    console.log("   📸 Saved css_system_faq_mobile.png");

    ws.close();
    chrome.kill("SIGTERM");
    console.log("All CSS verification screenshots captured successfully!");
  } catch (err) {
    chrome.kill("SIGTERM");
    throw err;
  }
}

captureScreenshots().catch((err) => {
  console.error("Screenshot error:", err);
  process.exit(1);
});
