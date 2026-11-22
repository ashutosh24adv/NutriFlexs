const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log("===============================================================");
  console.log("   VERIFYING DIETITIAN PAGE HERO SECTION REMOVAL & LAYOUT      ");
  console.log("===============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9315",
    "--user-data-dir=/tmp/chrome-test-dietitians-hero-v2",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9315/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9315");
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

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.value;
    }

    // 1. Desktop Viewport (1440 x 900)
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    console.log("\nNavigating to http://localhost:3000/dietitians ...");
    await send("Page.navigate", { url: "http://localhost:3000/dietitians" });

    // Wait for dietitian cards to populate
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const count = await evaluate(`document.querySelectorAll(".group.bg-white.rounded-3xl").length`);
      if (count > 0) {
        console.log(`Dietitian cards loaded in turn ${i + 1}: ${count} cards found`);
        break;
      }
    }

    const checkData = await evaluate(`
      (() => {
        const bodyText = document.body.innerText;
        const hasHeroBadge = bodyText.includes("EXPERT CLINICAL NUTRITION");
        const hasHeroHeading = bodyText.includes("Expert Nutrition Guidance, Built Around You.");
        const hasHeroDesc = bodyText.includes("Connect 1-on-1 with certified clinical dietitians");
        const hasAdminVerifiedHighlight = bodyText.includes("Admin-Verified Credentials");
        const hasFormatsHighlight = bodyText.includes("Online & Kiosk In-Person Formats");
        const hasSyncHighlight = bodyText.includes("Direct Food Diary Sync");

        const header = document.querySelector("header");
        const headerRect = header ? header.getBoundingClientRect() : null;

        const searchInput = document.querySelector('input[placeholder*=\"Search dietitians\"]');
        const searchRect = searchInput ? searchInput.getBoundingClientRect() : null;

        const feeSelect = document.querySelector('select[aria-label*=\"consultation fee\"]');
        const expSelect = document.querySelector('select[aria-label*=\"clinical experience\"]');
        const langSelect = document.querySelector('select[aria-label*=\"consultation language\"]');

        const focusPills = Array.from(document.querySelectorAll("button")).filter(b => 
          ["All", "Weight Management", "Sports Nutrition", "PCOS / Hormonal Health"].includes(b.textContent.trim())
        );

        const dietitianCards = document.querySelectorAll(".group.bg-white.rounded-3xl");
        const cardNames = Array.from(dietitianCards).map(c => c.querySelector("h3") ? c.querySelector("h3").textContent : "");

        return {
          removedElements: {
            hasHeroBadge,
            hasHeroHeading,
            hasHeroDesc,
            hasAdminVerifiedHighlight,
            hasFormatsHighlight,
            hasSyncHighlight,
          },
          layout: {
            headerBottom: headerRect ? headerRect.bottom : null,
            searchTop: searchRect ? searchRect.top : null,
            distanceFromHeader: (searchRect && headerRect) ? (searchRect.top - headerRect.bottom) : null,
          },
          filtersPresent: {
            hasSearchInput: !!searchInput,
            hasFeeSelect: !!feeSelect,
            hasExpSelect: !!expSelect,
            hasLangSelect: !!langSelect,
            focusPillCount: focusPills.length,
          },
          dietitianCardCount: dietitianCards.length,
          cardNames,
        };
      })()
    `);

    console.log("\nDesktop Verification Results:", JSON.stringify(checkData, null, 2));

    const rem = checkData.removedElements;
    const allHeroElementsRemoved = !rem.hasHeroBadge && !rem.hasHeroHeading && !rem.hasHeroDesc &&
      !rem.hasAdminVerifiedHighlight && !rem.hasFormatsHighlight && !rem.hasSyncHighlight;

    console.log("\n--- Verification Summary ---");
    console.log("All Hero elements removed:", allHeroElementsRemoved ? "PASSED" : "FAILED");
    console.log("Search toolbar is immediately below header:", (checkData.layout.distanceFromHeader > 0 && checkData.layout.distanceFromHeader < 80) ? `PASSED (${checkData.layout.distanceFromHeader.toFixed(1)}px)` : "CHECK");
    console.log("Filters present:", Object.values(checkData.filtersPresent).every(Boolean) ? "PASSED" : "FAILED");
    console.log(`Dietitian cards rendered: ${checkData.dietitianCardCount} cards found (${checkData.cardNames.join(", ")})`);

    // Capture desktop screenshot
    console.log("\nCapturing Desktop Dietitians page screenshot...");
    const desktopShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 1440, height: 900, scale: 2 },
    });
    const desktopImgPath = path.join(ARTIFACTS_DIR, "dietitians_page_no_hero_desktop.png");
    fs.writeFileSync(desktopImgPath, Buffer.from(desktopShot.data, "base64"));
    console.log(`Saved desktop screenshot to ${desktopImgPath}`);

    // 2. Mobile Viewport (393 x 852 - iPhone 16)
    await send("Emulation.setDeviceMetricsOverride", {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      mobile: true,
    });

    await wait(1500);

    const mobileData = await evaluate(`
      (() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const searchInput = document.querySelector('input[placeholder*=\"Search dietitians\"]');
        const cards = document.querySelectorAll(".group.bg-white.rounded-3xl");

        return {
          noHorizontalOverflow: scrollWidth <= docWidth,
          hasSearchInput: !!searchInput,
          cardCount: cards.length,
          docWidth,
          scrollWidth,
        };
      })()
    `);

    console.log("\nMobile Verification Results:", JSON.stringify(mobileData, null, 2));

    const mobileShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 393, height: 852, scale: 2 },
    });
    const mobileImgPath = path.join(ARTIFACTS_DIR, "dietitians_page_no_hero_mobile.png");
    fs.writeFileSync(mobileImgPath, Buffer.from(mobileShot.data, "base64"));
    console.log(`Saved mobile screenshot to ${mobileImgPath}`);

    console.log("\n=======================================================");
    console.log("             ALL VERIFICATION CHECKS COMPLETE          ");
    console.log("=======================================================");

  } finally {
    chrome.kill();
  }
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
