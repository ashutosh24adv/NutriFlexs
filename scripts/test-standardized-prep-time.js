/**
 * E2E Verification Script for Standardized Food Preparation Time (5 min)
 */

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runE2E() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS STANDARDIZED FOOD PREPARATION TIME (5 MIN) VERIFICATION");
  console.log("================================================================================");

  // 1. Launch Chrome CDP
  console.log("\n1. Launching Chrome CDP...");
  const chromePort = 9235;
  const chrome = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      `--remote-debugging-port=${chromePort}`,
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1280,950",
    ]
  );

  let res;
  for (let i = 0; i < 30; i++) {
    await wait(400);
    try {
      res = await fetch(`http://127.0.0.1:${chromePort}/json`);
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP");

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
            resolve(data.result?.result !== undefined ? data.result.result : data.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await new Promise((resolve) => (ws.onopen = resolve));
    await send("Page.enable");
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
      console.log(`   📸 Saved artifact: ${fileName}`);
    }

    // Set Desktop Viewport
    await setViewport(1280, 950, false);

    // 2. Navigate to /menu
    console.log("\n2. Navigating to http://localhost:3000/menu...");
    await send("Page.navigate", { url: "http://localhost:3000/menu" });

    // Wait for products to load from PostgreSQL
    for (let i = 0; i < 30; i++) {
      await wait(600);
      const ready = await send("Runtime.evaluate", {
        expression: `document.querySelectorAll('.group.bg-white').length > 0`,
        returnByValue: true,
      });
      if (ready?.value) break;
    }

    // 3. Inspect All Products on /menu
    console.log("\n3. Inspecting all food cards on /menu for '5 min' prep badge...");
    const cardsCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          try {
            const cards = Array.from(document.querySelectorAll('.group.bg-white'));
            const results = cards.map(c => {
              const name = c.querySelector('h3')?.textContent.trim();
              const badge = c.querySelector('[data-testid="prep-time-badge"]');
              const badgeText = badge ? badge.textContent.trim() : null;
              const hasClock = badge?.querySelector('svg') !== null;
              return { name, badgeText, hasClock };
            });
            return {
              totalCards: cards.length,
              results
            };
          } catch (e) {
            return { error: e.message, stack: e.stack };
          }
        })()
      `,
      returnByValue: true,
    });

    console.log(`   Found ${cardsCheck?.value?.totalCards} food cards on /menu:`);
    cardsCheck?.value?.results.forEach((r, idx) => {
      console.log(`   [${idx + 1}] ${r.name} -> "${r.badgeText}" (Clock icon: ${r.hasClock})`);
    });

    assert(cardsCheck?.value?.totalCards > 0, "Food cards loaded on /menu");
    const allFiveMin = cardsCheck?.value?.results.every((r) => r.badgeText === "5 min");
    const allHaveClock = cardsCheck?.value?.results.every((r) => r.hasClock);
    const noneHaveTilde = cardsCheck?.value?.results.every((r) => !r.badgeText?.includes("~"));
    const noneHaveOtherTimes = cardsCheck?.value?.results.every(
      (r) => !r.badgeText?.includes("2 min") && !r.badgeText?.includes("3 min") && !r.badgeText?.includes("4 min")
    );

    assert(allFiveMin, "Every food card badge text is exactly '5 min'");
    assert(allHaveClock, "Every food card badge contains the clock icon");
    assert(noneHaveTilde, "No food card badge contains the approximate '~' symbol");
    assert(noneHaveOtherTimes, "No food card displays 2 min, 3 min or 4 min");

    await takeScreenshot("menu_prep_time_all_categories_desktop.png");

    // 4. Test Category Filtering (e.g. Juices, Bowls, etc.)
    console.log("\n4. Testing Category filter chips to verify dynamically filtered items...");
    const categoryBtns = await send("Runtime.evaluate", {
      expression: `
        Array.from(document.querySelectorAll('.overflow-x-auto button, div.flex.gap-2 button'))
          .map(b => b.textContent.trim())
          .filter(t => t.length > 0)
      `,
      returnByValue: true,
    });
    console.log("   Available category buttons:", categoryBtns?.value);

    // Click each category button and verify items display "5 min"
    const catList = categoryBtns?.value || [];
    for (const catName of catList.slice(1, 4)) {
      console.log(`   Filtering by category: "${catName}"...`);
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const target = btns.find(b => b.textContent.trim() === "${catName}");
            if (target) target.click();
          })()
        `,
      });
      await wait(600);

      const filteredCheck = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const cards = Array.from(document.querySelectorAll('.group.bg-white'));
            const badges = cards.map(c => c.querySelector('[data-testid="prep-time-badge"]')?.textContent.trim());
            return { count: cards.length, badges };
          })()
        `,
        returnByValue: true,
      });
      console.log(`     -> ${filteredCheck?.value?.count} cards loaded:`, filteredCheck?.value?.badges);
      if (filteredCheck?.value?.count > 0) {
        assert(
          filteredCheck?.value?.badges.every((b) => b === "5 min"),
          `All products in "${catName}" display exactly '5 min'`
        );
      }
    }

    // Switch back to "All Fuel"
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const target = btns.find(b => b.textContent.trim().includes("All"));
          if (target) target.click();
        })()
      `,
    });
    await wait(600);

    // 5. Open Product Detail Modal to verify modal prep time
    console.log("\n5. Testing Product Detail Modal for prep time...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const firstCard = document.querySelector('.group.bg-white');
          if (firstCard) firstCard.click();
        })()
      `,
    });
    await wait(800);

    const modalCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.querySelector('[data-testid="product-detail-modal"]');
          if (!modal) return { open: false };
          const prepBadge = modal.querySelector('[data-testid="product-modal-prep-time"]');
          return {
            open: true,
            prepText: prepBadge ? prepBadge.textContent.trim() : null
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Modal prep time check:", modalCheck?.value);
    assert(modalCheck?.value?.open === true, "Product detail modal opened");
    assert(modalCheck?.value?.prepText?.includes("5 min"), "Modal displays '5 min preparation'");
    assert(!modalCheck?.value?.prepText?.includes("~"), "Modal does not contain '~'");

    await takeScreenshot("menu_product_modal_prep_time_desktop.png");

    // Close modal
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const closeBtn = document.querySelector('[data-testid="product-detail-modal"] button');
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await wait(600);

    // 6. Test Responsive Mobile Viewport (390px)
    console.log("\n6. Testing Mobile Viewport (390px)...");
    await setViewport(390, 844, true);
    await wait(1000);

    const mobileCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll('.group.bg-white'));
          const badges = cards.map(c => c.querySelector('[data-testid="prep-time-badge"]')?.textContent.trim());
          const allFive = badges.every(b => b === "5 min");
          return { count: cards.length, allFive, badgesSample: badges.slice(0, 4) };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Mobile Viewport Check:", mobileCheck?.value);
    assert(mobileCheck?.value?.count > 0, "Mobile menu cards rendered");
    assert(mobileCheck?.value?.allFive === true, "Every mobile card badge is exactly '5 min'");

    await takeScreenshot("menu_prep_time_mobile.png");

    ws.close();
    console.log("\n================================================================================");
    console.log("🎉 ALL PREPARATION TIME (5 MIN) VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("================================================================================");
  } finally {
    chrome.kill();
  }
}

runE2E().catch((err) => {
  console.error("FATAL ERROR IN E2E SUITE:", err);
  process.exit(1);
});
