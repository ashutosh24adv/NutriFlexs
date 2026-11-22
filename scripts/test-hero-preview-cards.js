const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyHeroPreviewCards() {
  console.log("===============================================================");
  console.log("   VERIFYING HERO PREVIEW CARDS (FOOD & NUTRITION DASHBOARD)   ");
  console.log("===============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9309",
    "--user-data-dir=/tmp/chrome-test-hero-cards",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9309/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9309");
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

    // 1. Desktop Viewport (1366 x 900)
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    console.log("\nNavigating to http://localhost:3000/ ...");
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(3500);

    const cardDetails = await evaluate(`
      (() => {
        const heroSection = document.querySelector("section");
        if (!heroSection) return { error: "Hero section not found" };

        const cardsContainer = heroSection.querySelector(".grid.grid-cols-1.sm\\\\:grid-cols-2");
        if (!cardsContainer) return { error: "Cards grid container not found" };

        const cards = Array.from(cardsContainer.children);
        if (cards.length < 2) return { error: "Expected 2 cards in hero" };

        const card1 = cards[0];
        const card2 = cards[1];

        const rect1 = card1.getBoundingClientRect();
        const rect2 = card2.getBoundingClientRect();

        const text1 = card1.textContent;
        const text2 = card2.textContent;

        const hasOldLink1 = text1.includes("Order at Gym Kiosk");
        const hasOldLink2 = text2.includes("Open Interactive Food Diary");

        const hasOrderFoodLabel = text1.includes("ORDER FOOD");
        const hasPickupBadge = text1.includes("5-Min Pickup");
        const hasChickenTitle = text1.includes("Grilled Chicken & Quinoa Bowl");
        const hasPrice = text1.includes("₹250");
        const hasProtein = text1.includes("32g Protein");
        const hasCalories = text1.includes("430 kcal");

        const hasTrackNutritionLabel = text2.includes("TRACK NUTRITION");
        const hasLiveDiary = text2.includes("Live Diary");
        const hasDailyCalories = text2.includes("Daily Calories") && text2.includes("1,650");
        const hasRemaining = text2.includes("450 kcal left");
        const hasChole = text2.includes("Chole – Mostly Chickpeas");
        const hasCholeKcal = text2.includes("218 kcal");
        const hasCholeProtein = text2.includes("12.8g Protein");
        const hasCholeBowl = text2.includes("Medium bowl (150g)");
        const hasMacros = text2.includes("Protein") && text2.includes("128g") && text2.includes("Carbs") && text2.includes("165g") && text2.includes("Fats") && text2.includes("42g");
        const hasMealHistory = text2.includes("Lunch") && text2.includes("2 items logged");

        return {
          card1: {
            width: rect1.width,
            height: rect1.height,
            top: rect1.top,
            bottom: rect1.bottom,
            hasOldLink: hasOldLink1,
            hasOrderFoodLabel,
            hasPickupBadge,
            hasChickenTitle,
            hasPrice,
            hasProtein,
            hasCalories,
          },
          card2: {
            width: rect2.width,
            height: rect2.height,
            top: rect2.top,
            bottom: rect2.bottom,
            hasOldLink: hasOldLink2,
            hasTrackNutritionLabel,
            hasLiveDiary,
            hasDailyCalories,
            hasRemaining,
            hasChole,
            hasCholeKcal,
            hasCholeProtein,
            hasCholeBowl,
            hasMacros,
            hasMealHistory,
          },
          exactHeightMatch: Math.abs(rect1.height - rect2.height) < 1,
          exactTopAlignment: Math.abs(rect1.top - rect2.top) < 1,
          exactBottomAlignment: Math.abs(rect1.bottom - rect2.bottom) < 1,
          gapBetweenCards: rect2.left - rect1.right,
        };
      })()
    `);

    console.log("\nHero Preview Cards Details:", JSON.stringify(cardDetails, null, 2));

    if (cardDetails.error) {
      throw new Error(cardDetails.error);
    }

    console.log("\n=======================================================");
    console.log("            HERO PREVIEW CARDS VERIFICATION            ");
    console.log("=======================================================");
    console.log("Card 1 'Order at Gym Kiosk →' REMOVED:", !cardDetails.card1.hasOldLink ? "PASSED" : "FAILED");
    console.log("Card 2 'Open Interactive Food Diary →' REMOVED:", !cardDetails.card2.hasOldLink ? "PASSED" : "FAILED");
    console.log("Both Cards Exact Height Match:", cardDetails.exactHeightMatch ? `PASSED (${cardDetails.card1.height.toFixed(1)}px)` : "FAILED");
    console.log("Both Cards Top Alignment Match:", cardDetails.exactTopAlignment ? `PASSED (top: ${cardDetails.card1.top.toFixed(1)}px)` : "FAILED");
    console.log("Both Cards Bottom Alignment Match:", cardDetails.exactBottomAlignment ? `PASSED (bottom: ${cardDetails.card1.bottom.toFixed(1)}px)` : "FAILED");
    console.log("Card 1 Order Food & Pickup Badges Intact:", (cardDetails.card1.hasOrderFoodLabel && cardDetails.card1.hasPickupBadge) ? "PASSED" : "FAILED");
    console.log("Card 1 Food Details (Chicken, ₹250, 32g Protein, 430 kcal):", (cardDetails.card1.hasChickenTitle && cardDetails.card1.hasPrice && cardDetails.card1.hasProtein && cardDetails.card1.hasCalories) ? "PASSED" : "FAILED");
    console.log("Card 2 Header (TRACK NUTRITION + Live Diary):", (cardDetails.card2.hasTrackNutritionLabel && cardDetails.card2.hasLiveDiary) ? "PASSED" : "FAILED");
    console.log("Card 2 Daily Calories & Progress (1,650 / 2,100, 450 kcal left):", (cardDetails.card2.hasDailyCalories && cardDetails.card2.hasRemaining) ? "PASSED" : "FAILED");
    console.log("Card 2 Chole Entry (Chole, 218 kcal, 12.8g Protein, 150g bowl):", (cardDetails.card2.hasChole && cardDetails.card2.hasCholeKcal && cardDetails.card2.hasCholeProtein && cardDetails.card2.hasCholeBowl) ? "PASSED" : "FAILED");
    console.log("Card 2 Macro Summary (Protein 128g, Carbs 165g, Fats 42g):", cardDetails.card2.hasMacros ? "PASSED" : "FAILED");
    console.log("Card 2 Meal History Preview (Lunch 2 items logged):", cardDetails.card2.hasMealHistory ? "PASSED" : "FAILED");

    // Capture desktop hero preview cards screenshot
    console.log("\nCapturing Desktop Hero Preview Cards screenshot...");
    const desktopClip = await evaluate(`
      (() => {
        const hero = document.querySelector("section");
        const rect = hero.getBoundingClientRect();
        return { x: 0, y: Math.max(0, rect.top), width: 1366, height: Math.min(rect.height + 60, 750) };
      })()
    `);

    const desktopShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: desktopClip.x, y: desktopClip.y, width: desktopClip.width, height: desktopClip.height, scale: 2 },
    });
    const desktopImgPath = path.join(ARTIFACTS_DIR, "hero_preview_cards_desktop_1366x900.png");
    fs.writeFileSync(desktopImgPath, Buffer.from(desktopShot.data, "base64"));
    console.log(`Saved desktop screenshot to ${desktopImgPath}`);

    // Capture zoomed crop of just the two cards side-by-side
    const cardsCrop = await evaluate(`
      (() => {
        const cardsContainer = document.querySelector("section .grid.grid-cols-1.sm\\\\:grid-cols-2");
        const rect = cardsContainer.getBoundingClientRect();
        return { x: Math.max(0, rect.left - 10), y: Math.max(0, rect.top - 10), width: rect.width + 20, height: rect.height + 20 };
      })()
    `);
    const cardsShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: cardsCrop.x, y: cardsCrop.y, width: cardsCrop.width, height: cardsCrop.height, scale: 2 },
    });
    const cardsImgPath = path.join(ARTIFACTS_DIR, "hero_preview_cards_side_by_side.png");
    fs.writeFileSync(cardsImgPath, Buffer.from(cardsShot.data, "base64"));
    console.log(`Saved cards side-by-side screenshot to ${cardsImgPath}`);

    // 2. Tablet Viewport (768 x 1024)
    console.log("\nTesting Tablet Viewport (768 x 1024)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(2500);

    const tabletCrop = await evaluate(`
      (() => {
        const cardsContainer = document.querySelector("section .grid.grid-cols-1.sm\\\\:grid-cols-2");
        const rect = cardsContainer.getBoundingClientRect();
        return { x: 0, y: Math.max(0, rect.top - 20), width: 768, height: rect.height + 40 };
      })()
    `);
    const tabletShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: tabletCrop.x, y: tabletCrop.y, width: tabletCrop.width, height: tabletCrop.height, scale: 2 },
    });
    const tabletImgPath = path.join(ARTIFACTS_DIR, "hero_preview_cards_tablet_768x1024.png");
    fs.writeFileSync(tabletImgPath, Buffer.from(tabletShot.data, "base64"));
    console.log(`Saved tablet screenshot to ${tabletImgPath}`);

    // 3. Mobile Viewport (375 x 812)
    console.log("\nTesting Mobile Viewport (375 x 812)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(2500);

    const mobileCrop = await evaluate(`
      (() => {
        const cardsContainer = document.querySelector("section .grid.grid-cols-1.sm\\\\:grid-cols-2");
        const rect = cardsContainer.getBoundingClientRect();
        return { x: 0, y: Math.max(0, rect.top - 20), width: 375, height: rect.height + 40 };
      })()
    `);
    const mobileShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: mobileCrop.x, y: mobileCrop.y, width: mobileCrop.width, height: mobileCrop.height, scale: 2 },
    });
    const mobileImgPath = path.join(ARTIFACTS_DIR, "hero_preview_cards_mobile_375x812.png");
    fs.writeFileSync(mobileImgPath, Buffer.from(mobileShot.data, "base64"));
    console.log(`Saved mobile screenshot to ${mobileImgPath}`);

    ws.close();
    chrome.kill();
    console.log("\nAll Hero Preview Cards checks completed successfully!");
  } catch (err) {
    chrome.kill();
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

verifyHeroPreviewCards();
