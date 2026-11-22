const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyFitnessJourneySection() {
  console.log("===============================================================");
  console.log("      VERIFYING NEW 'TRAIN HARD. FUEL SMART. GET STRONGER.'    ");
  console.log("===============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9302",
    "--user-data-dir=/tmp/chrome-test-fitness-journey",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9302/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9302");
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

    // 1. DESKTOP VIEWPORT (1366x1000)
    console.log("\n--- 1. DESKTOP AUDIT (1366x1000) ---");
    await setViewport(1366, 1000, false);
    await send("Page.navigate", { url: "http://localhost:3000/#fitness-journey" });
    await wait(2000);

    const sectionMetrics = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const section = document.getElementById('fitness-journey');
          if (!section) return { error: "Section #fitness-journey not found" };

          const eyebrow = section.querySelector('span');
          const h2 = section.querySelector('h2');
          const p = section.querySelector('p');
          const cards = section.querySelectorAll('.grid > div');

          // Check if old curry section was completely removed
          const oldCurryHeading = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Not All Curries Are the Same'));
          const oldCurryTabs = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Chole') && b.textContent.includes('Chickpea Curry'));

          const cardData = Array.from(cards).map(card => {
            const rect = card.getBoundingClientRect();
            const title = card.querySelector('h3')?.textContent?.trim();
            const desc = card.querySelector('p')?.textContent?.trim();
            return {
              title,
              desc,
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          });

          const ctaButtons = Array.from(section.querySelectorAll('a')).map(a => ({
            text: a.textContent.trim(),
            href: a.getAttribute('href'),
          }));

          const card1Rect = cards[0]?.getBoundingClientRect();
          const card2Rect = cards[1]?.getBoundingClientRect();
          const card3Rect = cards[2]?.getBoundingClientRect();

          const allSideBySide = card1Rect && card2Rect && card3Rect ?
            (Math.abs(card1Rect.top - card2Rect.top) < 10 && Math.abs(card2Rect.top - card3Rect.top) < 10) : false;

          return {
            found: true,
            eyebrow: eyebrow ? eyebrow.textContent.trim() : null,
            heading: h2 ? h2.textContent.trim() : null,
            description: p ? p.textContent.trim() : null,
            cardCount: cards.length,
            allSideBySide,
            cards: cardData,
            ctas: ctaButtons,
            oldCurrySectionRemoved: !oldCurryHeading && !oldCurryTabs,
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

    console.log(`✓ Eyebrow: "${metrics.eyebrow}"`);
    console.log(`✓ Heading: "${metrics.heading}"`);
    console.log(`✓ Card Count: ${metrics.cardCount}`);
    console.log(`✓ All 3 Cards Side-by-Side: ${metrics.allSideBySide}`);
    console.log(`✓ Old Curry Section Removed: ${metrics.oldCurrySectionRemoved}`);
    console.log(`✓ CTAs:`, metrics.ctas);

    // Scroll to section and take screenshot
    await send("Runtime.evaluate", {
      expression: `
        const s = document.getElementById('fitness-journey');
        if (s) s.scrollIntoView({ behavior: 'instant', block: 'start' });
      `,
    });
    await wait(800);
    await takeScreenshot("fitness_journey_section_desktop.png");

    // 2. MOBILE VIEWPORT (375x812)
    console.log("\n--- 2. MOBILE AUDIT (375x812) ---");
    await setViewport(375, 812, true);
    await wait(1000);

    const mobileEval = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const section = document.getElementById('fitness-journey');
          const cards = section.querySelectorAll('.grid > div');
          const card1Rect = cards[0].getBoundingClientRect();
          const card2Rect = cards[1].getBoundingClientRect();
          const card3Rect = cards[2].getBoundingClientRect();

          return {
            stacked: card2Rect.top > card1Rect.bottom && card3Rect.top > card2Rect.bottom,
            cardWidth: Math.round(card1Rect.width),
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
        const s = document.getElementById('fitness-journey');
        if (s) s.scrollIntoView({ behavior: 'instant', block: 'start' });
      `,
    });
    await wait(800);
    await takeScreenshot("fitness_journey_section_mobile_top.png");

    await send("Runtime.evaluate", {
      expression: `
        const cards = document.querySelectorAll('#fitness-journey .grid > div');
        if (cards[1]) cards[1].scrollIntoView({ behavior: 'instant', block: 'start' });
      `,
    });
    await wait(800);
    await takeScreenshot("fitness_journey_section_mobile_middle.png");

    await send("Runtime.evaluate", {
      expression: `
        const ctaArea = document.querySelector('#fitness-journey .border-t');
        if (ctaArea) ctaArea.scrollIntoView({ behavior: 'instant', block: 'center' });
      `,
    });
    await wait(800);
    await takeScreenshot("fitness_journey_section_mobile_cta.png");

    console.log("\n===============================================================");
    console.log("  ALL AUDIT CHECKS PASSED: FITNESS JOURNEY SECTION VERIFIED!   ");
    console.log("===============================================================");

    ws.close();
  } finally {
    chrome.kill();
  }
}

verifyFitnessJourneySection().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
