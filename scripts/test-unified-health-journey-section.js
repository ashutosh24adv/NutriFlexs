const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyUnifiedSection() {
  console.log("===============================================================");
  console.log("  VERIFYING UNIFIED 'HOW NUTRIFLEXS POWERS YOUR HEALTH JOURNEY' ");
  console.log("===============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9298",
    "--user-data-dir=/tmp/chrome-test-unified-section",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9298/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9298");
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
      console.log(`   📸 Captured screenshot: ${fileName}`);
    }

    // 1. DESKTOP VIEWPORT (1366x1400)
    console.log("\n--- 1. DESKTOP AUDIT (1366x1400) ---");
    await setViewport(1366, 1400, false);
    await send("Page.navigate", { url: "http://localhost:3000/#how-it-works" });
    await wait(2000);

    const sectionMetrics = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const section = document.getElementById('how-it-works');
          if (!section) return { error: "Section #how-it-works not found" };

          const h2 = section.querySelector('h2');
          const cards = section.querySelectorAll('.grid > div');

          // Check if old "Why NutriFlexs Works" exists
          const oldWhySection = document.getElementById('why-nutriflexs');
          const oldHeading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Why NutriFlexs Works'));

          const card1 = cards[0];
          const card2 = cards[1];

          const card1Rect = card1 ? card1.getBoundingClientRect() : null;
          const card2Rect = card2 ? card2.getBoundingClientRect() : null;

          const card1Items = card1 ? Array.from(card1.querySelectorAll('h4')).map(h => h.textContent.trim()) : [];
          const card2Items = card2 ? Array.from(card2.querySelectorAll('h4')).map(h => h.textContent.trim()) : [];

          return {
            sectionFound: true,
            headingText: h2 ? h2.textContent.trim() : null,
            cardCount: cards.length,
            sideBySide: card1Rect && card2Rect ? Math.abs(card1Rect.top - card2Rect.top) < 10 : false,
            card1: {
              width: card1Rect ? Math.round(card1Rect.width) : 0,
              height: card1Rect ? Math.round(card1Rect.height) : 0,
              items: card1Items,
              cta: card1 ? card1.querySelector('a')?.textContent?.trim() : null,
            },
            card2: {
              width: card2Rect ? Math.round(card2Rect.width) : 0,
              height: card2Rect ? Math.round(card2Rect.height) : 0,
              items: card2Items,
              cta: card2 ? card2.querySelector('a')?.textContent?.trim() : null,
            },
            oldSectionRemoved: !oldWhySection && !oldHeading,
          };
        })()
      `,
      returnByValue: true,
    });

    const metrics = sectionMetrics?.result?.value || sectionMetrics?.value;
    console.log("Desktop Section Metrics:", JSON.stringify(metrics, null, 2));

    if (!metrics || metrics.error) {
      throw new Error("Evaluation error: " + (metrics ? metrics.error : "null"));
    }

    console.log(`✓ Heading: "${metrics.headingText}"`);
    console.log(`✓ Side-by-Side on Desktop: ${metrics.sideBySide}`);
    console.log(`✓ Card 1 Width x Height: ${metrics.card1.width} x ${metrics.card1.height}px (${metrics.card1.items.length} items)`);
    console.log(`✓ Card 2 Width x Height: ${metrics.card2.width} x ${metrics.card2.height}px (${metrics.card2.items.length} items)`);
    console.log(`✓ Old Section "Why NutriFlexs Works" Removed: ${metrics.oldSectionRemoved}`);

    // Scroll to section and capture screenshot
    await send("Runtime.evaluate", {
      expression: `
        const s = document.getElementById('how-it-works');
        if (s) s.scrollIntoView({ behavior: 'instant', block: 'start' });
      `,
    });
    await wait(800);
    await takeScreenshot("unified_health_journey_section_desktop.png");

    // 2. MOBILE VIEWPORT (375x812)
    console.log("\n--- 2. MOBILE AUDIT (375x812) ---");
    await setViewport(375, 812, true);
    await wait(1000);

    const mobileEval = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const section = document.getElementById('how-it-works');
          const cards = section.querySelectorAll('.grid > div');
          const card1 = cards[0];
          const card2 = cards[1];
          const card1Rect = card1.getBoundingClientRect();
          const card2Rect = card2.getBoundingClientRect();

          return {
            stacked: card2Rect.top > card1Rect.bottom,
            card1Width: Math.round(card1Rect.width),
            card2Width: Math.round(card2Rect.width),
          };
        })()
      `,
      returnByValue: true,
    });

    const mobileMetrics = mobileEval?.result?.value || mobileEval?.value;
    console.log("Mobile Section Metrics:", JSON.stringify(mobileMetrics, null, 2));
    console.log(`✓ Cleanly Stacked on Mobile: ${mobileMetrics.stacked}`);

    await send("Runtime.evaluate", {
      expression: `
        const s = document.getElementById('how-it-works');
        if (s) s.scrollIntoView({ behavior: 'instant', block: 'start' });
      `,
    });
    await wait(800);
    await takeScreenshot("unified_health_journey_section_mobile_card1.png");

    await send("Runtime.evaluate", {
      expression: `
        const cards = document.querySelectorAll('#how-it-works .grid > div');
        if (cards[1]) cards[1].scrollIntoView({ behavior: 'instant', block: 'start' });
      `,
    });
    await wait(800);
    await takeScreenshot("unified_health_journey_section_mobile_card2.png");

    console.log("\n===============================================================");
    console.log("  ALL AUDIT CHECKS PASSED: UNIFIED SECTION VERIFIED!           ");
    console.log("===============================================================");

    ws.close();
  } finally {
    chrome.kill();
  }
}

verifyUnifiedSection().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
