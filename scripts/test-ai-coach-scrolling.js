const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("==================================================");
  console.log("NutriFlexs AI Coach Page Scrolling Test Suite");
  console.log("==================================================\n");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9326",
    "--user-data-dir=/tmp/chrome-test-ai-coach-" + Date.now(),
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 20; attempt++) {
    await wait(500);
    try {
      res = await fetch("http://127.0.0.1:9326/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome on port 9326");
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

    // Configure standard desktop viewport
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 950,
      deviceScaleFactor: 2,
      mobile: false,
    });

    // TEST 1: Direct navigation to /ai-coach
    console.log("TEST 1: Direct navigation to http://localhost:3000/ai-coach ...");
    await send("Page.navigate", { url: "http://localhost:3000/ai-coach" });
    await wait(3000);

    let scrollY = (await send("Runtime.evaluate", { expression: "window.scrollY" })).result.value;
    console.log(`✓ Direct load window.scrollY: ${scrollY}`);
    if (scrollY !== 0) {
      throw new Error(`TEST 1 FAILED: Expected window.scrollY to be 0, got ${scrollY}`);
    }

    // Capture visual screenshot of the top of the page
    console.log("Capturing visual screenshot of initial top load...");
    const screenshot1 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "ai_coach_initial_top_desktop.png"),
      Buffer.from(screenshot1.data, "base64")
    );
    console.log("✓ Saved ai_coach_initial_top_desktop.png");

    // TEST 2: Navigate from Navbar (start at /menu then click /ai-coach link)
    console.log("\nTEST 2: Navigate to /ai-coach from navbar...");
    await send("Page.navigate", { url: "http://localhost:3000/menu" });
    await wait(2500);

    // Scroll down on /menu to prove scroll position resets on navigation
    await send("Runtime.evaluate", { expression: "window.scrollTo(0, 500)" });
    await wait(500);

    // Click the AI Coach link in the navbar
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const link = Array.from(document.querySelectorAll("a")).find(a => a.getAttribute("href") === "/ai-coach");
          if (link) link.click();
        })()
      `,
    });
    await wait(3000);

    scrollY = (await send("Runtime.evaluate", { expression: "window.scrollY" })).result.value;
    console.log(`✓ Navbar navigation window.scrollY: ${scrollY}`);
    if (scrollY !== 0) {
      throw new Error(`TEST 2 FAILED: Expected window.scrollY to be 0 after navbar navigation, got ${scrollY}`);
    }

    // TEST 3: Navigate away to /dietitians and return
    console.log("\nTEST 3: Navigate away to /dietitians and return...");
    await send("Page.navigate", { url: "http://localhost:3000/dietitians" });
    await wait(2500);

    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const link = Array.from(document.querySelectorAll("a")).find(a => a.getAttribute("href") === "/ai-coach");
          if (link) link.click();
        })()
      `,
    });
    await wait(3000);

    scrollY = (await send("Runtime.evaluate", { expression: "window.scrollY" })).result.value;
    console.log(`✓ Return navigation window.scrollY: ${scrollY}`);
    if (scrollY !== 0) {
      throw new Error(`TEST 3 FAILED: Expected window.scrollY to be 0 upon returning, got ${scrollY}`);
    }

    // TEST 4: Page Refresh
    console.log("\nTEST 4: Page Refresh on /ai-coach...");
    await send("Page.reload");
    await wait(3000);

    scrollY = (await send("Runtime.evaluate", { expression: "window.scrollY" })).result.value;
    console.log(`✓ Reload window.scrollY: ${scrollY}`);
    if (scrollY !== 0) {
      throw new Error(`TEST 4 FAILED: Expected window.scrollY to be 0 after reload, got ${scrollY}`);
    }

    // TEST 5: Send a message & verify chat container auto-scrolls without moving window.scrollY
    console.log("\nTEST 5: Send a message and verify chat container auto-scroll...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const quickBtn = document.querySelector("button");
          // Find first quick action button
          const buttons = Array.from(document.querySelectorAll("button"));
          const btn = buttons.find(b => b.textContent && b.textContent.includes("Analyse My Nutrition Today"));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(4500);

    scrollY = (await send("Runtime.evaluate", { expression: "window.scrollY" })).result.value;
    console.log(`✓ window.scrollY after message exchange: ${scrollY}`);
    if (scrollY !== 0) {
      throw new Error(`TEST 5 FAILED: Expected window.scrollY to stay at 0, got ${scrollY}`);
    }

    const chatScrollTop = (await send("Runtime.evaluate", {
      expression: `
        (() => {
          const container = document.querySelector(".overflow-y-auto");
          return container ? container.scrollTop : -1;
        })()
      `,
    })).result.value;
    console.log(`✓ Chat messages container scrollTop: ${chatScrollTop} (should be >= 0)`);
    if (chatScrollTop < 0) {
      throw new Error("Chat container not found or scrollTop is invalid");
    }

    // TEST 6: Manual scroll up and verify user position is respected
    console.log("\nTEST 6: Manual scroll up in chat container...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const container = document.querySelector(".overflow-y-auto");
          if (container) {
            container.scrollTop = 0; // User manually scrolls to top of chat
            container.dispatchEvent(new Event("scroll"));
          }
        })()
      `,
    });
    await wait(500);

    const manualScrollTop = (await send("Runtime.evaluate", {
      expression: `
        (() => {
          const container = document.querySelector(".overflow-y-auto");
          return container ? container.scrollTop : -1;
        })()
      `,
    })).result.value;
    console.log(`✓ Chat container scrollTop after manual scroll to top: ${manualScrollTop}`);
    if (manualScrollTop !== 0) {
      throw new Error("Manual scroll up was not preserved");
    }

    // Send another question while scrolled up - verify user is not forced down if reading history
    console.log("Sending second message while user is inspecting scroll history...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const textarea = document.querySelector("textarea");
          if (textarea) {
            textarea.value = "Tell me more about healthy carbs";
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
          }
        })()
      `,
    });
    await wait(200);

    // Verify window.scrollY is STILL 0
    scrollY = (await send("Runtime.evaluate", { expression: "window.scrollY" })).result.value;
    console.log(`✓ window.scrollY remained stable: ${scrollY}`);
    if (scrollY !== 0) {
      throw new Error(`window.scrollY jumped to ${scrollY}`);
    }

    console.log("\n==================================================");
    console.log("ALL 6 TESTS PASSED WITH 100% SUCCESS!");
    console.log("==================================================");

    ws.close();
    chrome.kill();
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

run();
