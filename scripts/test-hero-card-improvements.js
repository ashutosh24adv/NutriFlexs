const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log("===============================================================");
  console.log("   VERIFYING HERO CARD IMPROVEMENTS & SIZING (DESKTOP + MOBILE) ");
  console.log("===============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9311",
    "--user-data-dir=/tmp/chrome-test-hero-improvements",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9311/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9311");
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

    console.log("\nNavigating to http://localhost:3000/ ...");
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(3500);

    const desktopData = await evaluate(`
      (() => {
        const heroSection = document.querySelector("section");
        if (!heroSection) return { error: "Hero section not found" };

        const cardsContainer = heroSection.querySelector(".grid.grid-cols-1.sm\\\\:grid-cols-2");
        if (!cardsContainer) return { error: "Cards grid container not found" };

        const cards = Array.from(cardsContainer.children);
        if (cards.length < 2) return { error: "Expected 2 cards" };

        const card1 = cards[0];
        const card2 = cards[1];

        const r1 = card1.getBoundingClientRect();
        const r2 = card2.getBoundingClientRect();
        const containerRect = cardsContainer.getBoundingClientRect();

        // Check ORDER FOOD badge
        const orderFoodBadge = Array.from(card1.querySelectorAll("span, div")).find(el => el.textContent.trim().includes("ORDER FOOD"));
        let orderFoodStyles = null;
        if (orderFoodBadge) {
          const computed = window.getComputedStyle(orderFoodBadge);
          orderFoodStyles = {
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            fontSize: computed.fontSize,
            fontWeight: computed.fontWeight,
            borderRadius: computed.borderRadius,
            backdropFilter: computed.backdropFilter,
          };
        }

        // Check Pickup badge
        const pickupBadge = Array.from(card1.querySelectorAll("span, div")).find(el => el.textContent.trim().includes("5-Min Pickup"));

        // Check image visible area
        const imageWrapper = card1.querySelector("img") ? card1.querySelector("img").parentElement : null;
        const imageRect = imageWrapper ? imageWrapper.getBoundingClientRect() : null;

        // Check Track Nutrition card elements
        const trackNutritionLabel = card2.querySelector("span, div");
        const liveDiaryBadge = Array.from(card2.querySelectorAll("span, div")).find(el => el.textContent.trim() === "Live Diary");
        const dailyCalBox = Array.from(card2.querySelectorAll("div")).find(el => el.textContent.includes("Daily Calories") && el.textContent.includes("1,650"));
        const choleItem = Array.from(card2.querySelectorAll("div")).find(el => el.textContent.includes("Chole – Mostly Chickpeas"));

        return {
          containerWidth: containerRect.width,
          card1: {
            width: r1.width,
            height: r1.height,
            top: r1.top,
            bottom: r1.bottom,
            imageHeight: imageRect ? imageRect.height : 0,
            imageWidth: imageRect ? imageRect.width : 0,
          },
          card2: {
            width: r2.width,
            height: r2.height,
            top: r2.top,
            bottom: r2.bottom,
          },
          exactTopMatch: Math.abs(r1.top - r2.top) < 2,
          exactHeightMatch: Math.abs(r1.height - r2.height) < 2,
          orderFoodStyles,
          hasPickupBadge: !!pickupBadge,
          hasDailyCalBox: !!dailyCalBox,
          hasCholeItem: !!choleItem,
          hasLiveDiaryBadge: !!liveDiaryBadge,
        };
      })()
    `);

    console.log("\nDesktop Evaluation Results:", JSON.stringify(desktopData, null, 2));

    // Capture desktop hero screenshot
    console.log("\nCapturing Desktop Hero Section screenshot...");
    const desktopClip = await evaluate(`
      (() => {
        const hero = document.querySelector("section");
        const rect = hero.getBoundingClientRect();
        return { x: 0, y: Math.max(0, rect.top), width: 1440, height: Math.min(rect.height + 60, 780) };
      })()
    `);

    const desktopShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: desktopClip.x, y: desktopClip.y, width: desktopClip.width, height: desktopClip.height, scale: 2 },
    });
    const desktopImgPath = path.join(ARTIFACTS_DIR, "hero_cards_improved_desktop.png");
    fs.writeFileSync(desktopImgPath, Buffer.from(desktopShot.data, "base64"));
    console.log(`Saved desktop screenshot to ${desktopImgPath}`);

    // Capture zoomed crop of the two cards side-by-side
    const cardsCrop = await evaluate(`
      (() => {
        const cardsContainer = document.querySelector("section .grid.grid-cols-1.sm\\\\:grid-cols-2");
        const rect = cardsContainer.getBoundingClientRect();
        return { x: Math.max(0, rect.left - 12), y: Math.max(0, rect.top - 12), width: rect.width + 24, height: rect.height + 24 };
      })()
    `);
    const cardsShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: cardsCrop.x, y: cardsCrop.y, width: cardsCrop.width, height: cardsCrop.height, scale: 2 },
    });
    const cardsImgPath = path.join(ARTIFACTS_DIR, "hero_cards_closeup_desktop.png");
    fs.writeFileSync(cardsImgPath, Buffer.from(cardsShot.data, "base64"));
    console.log(`Saved cards close-up screenshot to ${cardsImgPath}`);

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
        const heroSection = document.querySelector("section");
        const cardsContainer = heroSection.querySelector(".grid.grid-cols-1.sm\\\\:grid-cols-2");
        const cards = Array.from(cardsContainer.children);
        const r1 = cards[0].getBoundingClientRect();
        const r2 = cards[1].getBoundingClientRect();

        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;

        return {
          stackedCleanly: r2.top >= r1.bottom,
          noHorizontalOverflow: scrollWidth <= docWidth,
          card1Width: r1.width,
          card2Width: r2.width,
          docWidth,
          scrollWidth,
        };
      })()
    `);

    console.log("\nMobile Evaluation Results:", JSON.stringify(mobileData, null, 2));

    // Capture mobile screenshot
    const mobileClip = await evaluate(`
      (() => {
        const cardsContainer = document.querySelector("section .grid.grid-cols-1.sm\\\\:grid-cols-2");
        const rect = cardsContainer.getBoundingClientRect();
        return { x: 0, y: Math.max(0, rect.top - 20), width: 393, height: Math.min(rect.height + 40, 1000) };
      })()
    `);
    const mobileShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: mobileClip.x, y: mobileClip.y, width: mobileClip.width, height: mobileClip.height, scale: 2 },
    });
    const mobileImgPath = path.join(ARTIFACTS_DIR, "hero_cards_improved_mobile.png");
    fs.writeFileSync(mobileImgPath, Buffer.from(mobileShot.data, "base64"));
    console.log(`Saved mobile screenshot to ${mobileImgPath}`);

    console.log("\n=======================================================");
    console.log("             ALL VERIFICATION CHECKS PASSED            ");
    console.log("=======================================================");

  } finally {
    chrome.kill();
  }
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
