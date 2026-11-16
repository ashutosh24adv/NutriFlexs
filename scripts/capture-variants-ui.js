const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureVariantsUI() {
  console.log("📸 Launching Chrome DevTools protocol to capture Indian Food Variants UI...");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9255",
    "--disable-gpu",
    "--window-size=1280,1050",
    "about:blank",
  ]);

  await wait(1800);

  try {
    const res = await fetch("http://127.0.0.1:9255/json");
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
    await send("Runtime.enable");

    // 1. Navigate to /nutrition
    console.log("Navigating to http://localhost:3000/nutrition...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    await wait(3000);

    // 2. Open Add Food Modal
    console.log("Opening Add Food modal...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const addFoodBtn = buttons.find(b => b.innerText && b.innerText.includes("Add Food"));
          if (addFoodBtn) addFoodBtn.click();
        })()
      `,
    });
    await wait(1200);

    // 3. Type "Chole" using React 18 native value setter
    console.log("Typing 'Chole' in food search...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const input = document.querySelector('input[placeholder*="Search foods"]');
          if (input) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeSetter.call(input, "Chole");
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        })()
      `,
    });
    await wait(2000);

    // 4. Click on Chole result item to expand the Smart Indian Food Variant selector panel
    console.log("Clicking on Chole / Chana Masala...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const divs = Array.from(document.querySelectorAll("div.cursor-pointer"));
          const choleCard = divs.find(el => el.innerText && el.innerText.includes("Chole / Chana Masala"));
          if (choleCard) choleCard.click();
        })()
      `,
    });
    await wait(1500);

    // 5. Click "More Main" composition button
    console.log("Selecting 'More Main' composition button...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const moreMainBtn = buttons.find(b => b.innerText && b.innerText.includes("More Main"));
          if (moreMainBtn) moreMainBtn.click();
        })()
      `,
    });
    await wait(1200);

    // 6. Capture Desktop Screenshot
    console.log("Capturing Desktop screenshot...");
    const desktopData = await send("Page.captureScreenshot", { format: "png" });
    const desktopPath = path.join(ARTIFACTS_DIR, "indian_food_variants_modal_desktop.png");
    fs.writeFileSync(desktopPath, Buffer.from(desktopData.data, "base64"));
    console.log(`Saved: ${desktopPath}`);

    // 7. Set Mobile Viewport & Capture Mobile Screenshot
    console.log("Capturing Mobile screenshot (390x844)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await wait(1000);

    const mobileData = await send("Page.captureScreenshot", { format: "png" });
    const mobilePath = path.join(ARTIFACTS_DIR, "indian_food_variants_modal_mobile.png");
    fs.writeFileSync(mobilePath, Buffer.from(mobileData.data, "base64"));
    console.log(`Saved: ${mobilePath}`);

    chrome.kill();
    console.log("🎉 UI screenshots successfully captured!");
    process.exit(0);
  } catch (err) {
    console.error("Capture error:", err);
    chrome.kill();
    process.exit(1);
  }
}

captureVariantsUI();
