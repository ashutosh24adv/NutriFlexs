/**
 * E2E Verification Script for Redesigned Gravy Intelligence and Trainer Partnership Sections
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
  console.log("NUTRIFLEXS GRAVY INTELLIGENCE & TRAINER PARTNERSHIP REDESIGN VERIFICATION");
  console.log("================================================================================");

  // 1. Launch Chrome CDP
  console.log("\n1. Launching Chrome CDP...");
  const chromePort = 9234;
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

    // 2. Navigate to Landing Page
    console.log("\n2. Navigating to http://localhost:3000...");
    await send("Page.navigate", { url: "http://localhost:3000" });
    
    // Wait for landing page to render
    for (let i = 0; i < 30; i++) {
      await wait(500);
      const ready = await send("Runtime.evaluate", {
        expression: `document.getElementById('indian-nutrition-innovation') !== null`,
        returnByValue: true,
      });
      if (ready?.value) break;
    }

    // 3. Inspect Section One: Gravy vs Main Dish Intelligence
    console.log("\n3. Inspecting Section One: Gravy vs Main Dish Intelligence...");
    await send("Runtime.evaluate", {
      expression: `document.getElementById('indian-nutrition-innovation')?.scrollIntoView({ behavior: 'instant', block: 'center' });`,
    });
    await wait(1000);

    const s1Check = await send("Runtime.evaluate", {
      expression: `
        (() => {
          try {
            const section = document.getElementById('indian-nutrition-innovation');
            if (!section) return { error: "Section not found" };

            const innerCard = section.firstElementChild;
            const bg = window.getComputedStyle(innerCard).backgroundColor;

            const badge = section.querySelector('span');
            const badgeText = badge ? badge.textContent.trim() : null;

            const heading = section.querySelector('h2');
            const headingText = heading ? heading.textContent.trim() : null;
            const headingColor = heading ? window.getComputedStyle(heading).color : null;

            const buttons = Array.from(section.querySelectorAll('button')).map(b => b.textContent.trim());

            const cards = Array.from(section.querySelectorAll('article'));
            const cardCount = cards.length;

            const firstCardTitle = cards[0]?.querySelector('h4')?.textContent.trim();
            const firstCardKcal = cards[0]?.innerText.includes("kcal");

            const hasPortionStrip = section.innerText.includes("Bowl-to-Gram Weights");

            const tryTrackerBtn = section.querySelector('a[href="/nutrition"] button');
            const tryTrackerText = tryTrackerBtn ? tryTrackerBtn.textContent.trim() : null;

            return {
              bg,
              badgeText,
              headingText,
              headingColor,
              buttons,
              cardCount,
              firstCardTitle,
              firstCardKcal,
              hasPortionStrip,
              hasTryTrackerBtn: tryTrackerBtn !== null,
              tryTrackerText
            };
          } catch (err) {
            return { error: err.message, stack: err.stack };
          }
        })()
      `,
      returnByValue: true,
    });

    console.log("   Section One Inspection:", s1Check?.value);
    assert(s1Check?.value?.badgeText?.includes("NUTRITION INTELLIGENCE"), "Section One displays 'NUTRITION INTELLIGENCE' badge");
    assert(s1Check?.value?.headingText === "Not All Curries Are the Same.", "Section One displays heading 'Not All Curries Are the Same.'");
    assert(s1Check?.value?.headingColor === "rgb(17, 17, 17)", "Heading is charcoal (#111111) and NOT white text on dark background");
    assert(s1Check?.value?.cardCount === 3, "Displays exactly 3 comparison cards");
    assert(s1Check?.value?.hasPortionStrip === true, "Displays portion conversion weight strip");
    assert(s1Check?.value?.hasTryTrackerBtn === true, "Displays 'Try Nutrition Tracker →' CTA");

    // 4. Test Dish Selector Interaction (Chole -> Dal -> Paneer)
    console.log("\n4. Testing Dish Selector interactive switching...");

    // Click "Dal (Yellow Lentils)"
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const dalBtn = Array.from(document.querySelectorAll('#indian-nutrition-innovation button')).find(b => b.textContent.includes('Dal'));
          if (dalBtn) dalBtn.click();
        })()
      `,
    });
    await wait(600);

    const dalCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll('#indian-nutrition-innovation article'));
          const titles = cards.map(c => c.querySelector('h4')?.textContent.trim());
          return { titles };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Dal Selected cards:", dalCheck?.value);
    assert(dalCheck?.value?.titles?.some(t => t.includes("Dal – Thick")), "Selecting Dal updates cards with 'Dal – Thick'");

    // Click "Paneer Butter Masala"
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const paneerBtn = Array.from(document.querySelectorAll('#indian-nutrition-innovation button')).find(b => b.textContent.includes('Paneer'));
          if (paneerBtn) paneerBtn.click();
        })()
      `,
    });
    await wait(600);

    const paneerCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll('#indian-nutrition-innovation article'));
          const titles = cards.map(c => c.querySelector('h4')?.textContent.trim());
          return { titles };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Paneer Selected cards:", paneerCheck?.value);
    assert(paneerCheck?.value?.titles?.some(t => t.includes("Paneer Butter Masala")), "Selecting Paneer updates cards with 'Paneer Butter Masala'");

    // Switch back to Chole for the canonical screenshot
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const choleBtn = Array.from(document.querySelectorAll('#indian-nutrition-innovation button')).find(b => b.textContent.includes('Chole'));
          if (choleBtn) choleBtn.click();
        })()
      `,
    });
    await wait(600);

    await takeScreenshot("redesigned_gravy_intelligence_desktop.png");

    // 5. Inspect Section Two: Trainer Partnership
    console.log("\n5. Inspecting Section Two: Trainer Partnership...");
    await send("Runtime.evaluate", {
      expression: `document.getElementById('trainers')?.scrollIntoView({ behavior: 'instant', block: 'center' });`,
    });
    await wait(1000);

    const s2Check = await send("Runtime.evaluate", {
      expression: `
        (() => {
          try {
            const section = document.getElementById('trainers');
            if (!section) return { error: "Trainer section not found" };

            const badge = section.querySelector('span');
            const badgeText = badge ? badge.textContent.trim() : null;

            const heading = section.querySelector('h2');
            const headingText = heading ? heading.textContent.trim() : null;
            const headingColor = heading ? window.getComputedStyle(heading).color : null;

            // Check primary CTA
            const ctaLink = section.querySelector('a[href="/trainer"]');
            const ctaBtn = ctaLink ? ctaLink.querySelector('button') : null;
            const ctaBtnText = ctaBtn ? ctaBtn.textContent.trim() : null;
            const ctaBtnBg = ctaBtn ? window.getComputedStyle(ctaBtn).backgroundColor : null;

            // Check secondary link
            const secLink = section.querySelector('a[href*="/signup?portal=trainer"]');
            const secLinkText = secLink ? secLink.textContent.trim() : null;

            // Check right-hand perks card
            const perksCard = Array.from(section.querySelectorAll('div')).find(d => d.textContent.includes('Trainer Partner Perks'));
            const perksCardTitle = perksCard?.querySelector('p')?.textContent.trim();
            const perksItems = Array.from(perksCard?.querySelectorAll('li') || []).map(li => li.textContent.trim());

            return {
              badgeText,
              headingText,
              headingColor,
              hasCta: ctaBtn !== null,
              ctaBtnText,
              ctaBtnBg,
              hasSecLink: secLink !== null,
              secLinkText,
              perksCardTitle,
              perksItems
            };
          } catch (err) {
            return { error: err.message, stack: err.stack };
          }
        })()
      `,
      returnByValue: true,
    });

    console.log("   Section Two Inspection:", s2Check?.value);
    assert(s2Check?.value?.badgeText?.includes("FOR FITNESS TRAINERS & COACHES"), "Section Two displays 'FOR FITNESS TRAINERS & COACHES' badge");
    assert(s2Check?.value?.headingText?.includes("Partner with NutriFlexs & Fuel Your Clients"), "Section Two displays 'Partner with NutriFlexs & Fuel Your Clients' heading");
    assert(s2Check?.value?.headingColor === "rgb(17, 17, 17)", "Heading is charcoal (#111111) and NOT white text on navy/purple");
    assert(s2Check?.value?.ctaBtnBg === "rgb(47, 125, 22)", "Primary CTA is NutriFlexs Primary Green (#2F7D16) and NOT purple");
    assert(s2Check?.value?.hasSecLink === true, "Displays 'Register as a Certified Trainer' secondary link");
    assert(s2Check?.value?.perksItems?.length === 3, "Perks card displays exactly 3 partner benefits");
    assert(s2Check?.value?.perksItems?.some(item => item.includes("10% discount")), "Perks includes 10% discount");
    assert(s2Check?.value?.perksItems?.some(item => item.includes("Free post-workout meals")), "Perks includes Free post-workout meals");
    assert(s2Check?.value?.perksItems?.some(item => item.includes("compliance insights")), "Perks includes Nutrition compliance insights");

    await takeScreenshot("redesigned_trainer_partnership_desktop.png");

    // 6. Test Responsive Mobile Viewport (390px)
    console.log("\n6. Testing Responsive Mobile Viewport (390px)...");
    await setViewport(390, 844, true);
    await wait(1000);

    // Scroll to Gravy section on mobile
    await send("Runtime.evaluate", {
      expression: `document.getElementById('indian-nutrition-innovation')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await wait(800);

    const mobileS1 = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const section = document.getElementById('indian-nutrition-innovation');
          const cards = section.querySelectorAll('article');
          const box = section.getBoundingClientRect();
          return {
            cardCount: cards.length,
            overflowX: document.documentElement.scrollWidth > window.innerWidth,
            width: box.width
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Mobile Section One:", mobileS1?.value);
    assert(mobileS1?.value?.overflowX === false, "No horizontal overflow on mobile for Section One");

    await takeScreenshot("redesigned_gravy_intelligence_mobile.png");

    // Scroll to Trainer section on mobile
    await send("Runtime.evaluate", {
      expression: `document.getElementById('trainers')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await wait(800);

    const mobileS2 = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const section = document.getElementById('trainers');
          const box = section.getBoundingClientRect();
          return {
            overflowX: document.documentElement.scrollWidth > window.innerWidth,
            width: box.width
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Mobile Section Two:", mobileS2?.value);
    assert(mobileS2?.value?.overflowX === false, "No horizontal overflow on mobile for Section Two");

    await takeScreenshot("redesigned_trainer_partnership_mobile.png");

    ws.close();
    console.log("\n================================================================================");
    console.log("🎉 ALL GRAVY INTELLIGENCE & TRAINER REDESIGN VERIFICATIONS PASSED!");
    console.log("================================================================================");
  } finally {
    chrome.kill();
  }
}

runE2E().catch((err) => {
  console.error("FATAL ERROR IN E2E SUITE:", err);
  process.exit(1);
});
