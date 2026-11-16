const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureScreenshots() {
  console.log("=== CAPTURING NAVBAR ABOUT DROPDOWN SCREENSHOTS ===");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9292",
    "--user-data-dir=/tmp/chrome-test-navbar-dropdown",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9292/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9292");

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

    await new Promise((resolve) => (ws.onopen = resolve));
    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");

    async function setViewport(width, height, isMobile) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: isMobile ? 3 : 2,
        mobile: isMobile,
      });
    }

    async function takeScreenshot(fileName) {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      const filePath = path.join(ARTIFACTS_DIR, fileName);
      fs.writeFileSync(filePath, Buffer.from(shot.data, "base64"));
      console.log(`   ✓ Saved ${fileName}`);
    }

    // 1. Desktop: Navbar with About dropdown open (1280x720)
    console.log("1. Capturing Desktop Navbar with About dropdown open...");
    await setViewport(1280, 720, false);
    await send("Page.navigate", { url: "http://localhost:3000" });
    await wait(2000);

    // Click on About button in navbar
    const clickResult = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll("button"));
          const aboutBtn = buttons.find(b => b.textContent && b.textContent.trim().startsWith("About"));
          if (aboutBtn) {
            aboutBtn.click();
            return { found: true, text: aboutBtn.textContent.trim() };
          }
          return { found: false };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Click About button:", clickResult?.value);
    await wait(800);
    await takeScreenshot("navbar_about_dropdown_desktop.png");

    // 2. Mobile: Drawer with About accordion expanded (390x844)
    console.log("2. Capturing Mobile Drawer with About accordion expanded...");
    await setViewport(390, 844, true);
    await send("Page.navigate", { url: "http://localhost:3000" });
    await wait(2000);

    // Click mobile menu hamburger button (aria-label="Open navigation menu")
    const mobileMenuResult = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const menuBtn = document.querySelector('button[aria-label="Open navigation menu"]');
          if (menuBtn) {
            menuBtn.click();
            return { openedMenu: true };
          }
          return { openedMenu: false };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Open mobile drawer:", mobileMenuResult?.value);
    await wait(1000);

    // Expand About accordion inside mobile drawer
    const expandAboutResult = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const drawer = document.querySelector('.animate-slide-left') || document.querySelector('.fixed.inset-0');
          if (!drawer) return { error: "Drawer container not found" };
          const drawerButtons = Array.from(drawer.querySelectorAll("button"));
          const aboutAccordionBtn = drawerButtons.find(b => b.textContent && b.textContent.includes("About"));
          if (aboutAccordionBtn) {
            aboutAccordionBtn.click();
            return {
              clicked: true,
              ariaExpandedAfter: aboutAccordionBtn.getAttribute("aria-expanded"),
              text: aboutAccordionBtn.textContent.trim()
            };
          }
          return { error: "About button in drawer not found", count: drawerButtons.length };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Expand About accordion:", JSON.stringify(expandAboutResult));
    await wait(1000);
    await takeScreenshot("navbar_about_dropdown_mobile.png");

    // 3. Desktop: Active state on /faq page (1280x720)
    console.log("3. Capturing /faq page and active navbar state...");
    await setViewport(1280, 720, false);
    await send("Page.navigate", { url: "http://localhost:3000/faq" });
    await wait(2000);
    await takeScreenshot("faq_page_desktop.png");

    // 4. Desktop: /contact page (1280x720)
    console.log("4. Capturing /contact page...");
    await setViewport(1280, 720, false);
    await send("Page.navigate", { url: "http://localhost:3000/contact" });
    await wait(2000);
    await takeScreenshot("contact_page_desktop.png");

    // 5. Desktop: /about page (1280x720) to verify existing content is intact
    console.log("5. Capturing /about page to verify content intact...");
    await setViewport(1280, 720, false);
    await send("Page.navigate", { url: "http://localhost:3000/about" });
    await wait(2000);
    await takeScreenshot("about_page_intact_desktop.png");

    console.log("\n✓ ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
    ws.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

captureScreenshots().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
