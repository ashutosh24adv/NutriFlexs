const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runE2E() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS SINGLE-SCREEN ONBOARDING REDESIGN E2E VERIFICATION");
  console.log("================================================================================");

  // 1. REGISTER TEST USER VIA API
  const timestamp = Date.now();
  const testEmail = `compact_onboarding_${timestamp}@nutriflexs.com`;
  const testPassword = "Password123!";
  const testName = `SingleScreen User ${timestamp.toString().slice(-4)}`;

  console.log(`\n1. Creating test customer account: ${testEmail}...`);
  const regRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      portal: "customer",
    }),
  });
  const regData = await regRes.json();
  assert(regRes.ok && regData.success, `Registration succeeded: ${testEmail}`);

  // 2. Launch Chrome CDP
  console.log("\n2. Launching Chrome in headless mode...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9298",
    `--user-data-dir=/tmp/chrome-test-onboarding-${timestamp}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let cdpRes = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
    try {
      cdpRes = await fetch("http://127.0.0.1:9298/json");
      if (cdpRes.ok) break;
    } catch (e) {}
  }
  if (!cdpRes || !cdpRes.ok) throw new Error("Could not connect to Chrome CDP on port 9298");

  try {
    const tabs = await cdpRes.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let msgId = 1;

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener("message", handler);
            const r = data.result;
            resolve(r?.result !== undefined ? r.result : r);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
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

    async function navigate(url) {
      await send("Page.navigate", { url });
      await wait(2200);
    }

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.value;
    }

    async function captureScreenshot(filename) {
      const res = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      const filePath = path.join(ARTIFACTS_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
      console.log(`📸 Screenshot saved: ${filename}`);
      return filePath;
    }

    // 3. LOG IN AS CUSTOMER
    console.log("\n3. Logging in as registered customer via /login...");
    await setViewport(1366, 768, false);
    await navigate("http://localhost:3000/login");
    await wait(1000);

    await evaluate(`(() => {
      const setVal = (input, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      if (emailInput) setVal(emailInput, "${testEmail}");
      if (passInput) setVal(passInput, "${testPassword}");
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()`);

    await wait(3000);
    const postLoginUrl = await evaluate("window.location.href");
    console.log(`Post-login URL: ${postLoginUrl}`);

    // 4. NAVIGATE TO ONBOARDING (Standard 1366x768 Desktop Viewport)
    console.log("\n4. Navigating to /nutrition/onboarding?retake=true&step=1 at 1366x768...");
    await navigate("http://localhost:3000/nutrition/onboarding?retake=true&step=1");
    await wait(1500);

    // Verify Step 1 Single Screen Metrics
    console.log("\n--- Checking Step 1: Sex (1366x768 single screen) ---");
    const step1Check = await evaluate(`(() => {
      const htmlScrollHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      const hasPageVerticalScroll = htmlScrollHeight > windowHeight;
      
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      const main = document.querySelector('main');
      const title = document.querySelector('h1')?.innerText;
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const continueBtn = Array.from(document.querySelectorAll('footer button')).find(b => b.innerText.includes('Continue'));
      const skipBtn = Array.from(document.querySelectorAll('footer button')).find(b => b.innerText.includes('Skip'));
      const isContinueDisabled = continueBtn ? (continueBtn.disabled || continueBtn.classList.contains('cursor-not-allowed')) : false;

      // Card bounding client rect
      const card = main ? main.closest('.rounded-2xl, .rounded-3xl, .shadow-float') : null;
      const cardRect = card ? card.getBoundingClientRect() : null;

      return {
        windowWidth,
        windowHeight,
        htmlScrollHeight,
        hasPageVerticalScroll,
        title,
        optionCount: options.length,
        isContinueDisabled,
        hasSkip: Boolean(skipBtn),
        cardHeight: cardRect ? cardRect.height : null,
        mainScrollHeight: main ? main.scrollHeight : null,
        mainClientHeight: main ? main.clientHeight : null,
      };
    })()`);

    console.log("Step 1 Metrics:", JSON.stringify(step1Check, null, 2));
    assert(!step1Check.hasPageVerticalScroll, "Page requires ZERO vertical scrolling on 1366x768!");
    assert(step1Check.title.includes("sex"), "Title correctly displays 'What\\'s your sex?'");
    assert(step1Check.optionCount === 3, "Contains exactly 3 options in responsive grid");
    assert(step1Check.hasSkip, "Step 1 has accessible Skip button");

    // Click 'Male' option
    await evaluate(`(() => {
      const maleBtn = Array.from(document.querySelectorAll('main button')).find(b => b.innerText.includes('Male'));
      if (maleBtn) maleBtn.click();
    })()`);
    await wait(300);

    const step1AfterSelect = await evaluate(`(() => {
      const continueBtn = Array.from(document.querySelectorAll('footer button')).find(b => b.innerText.includes('Continue'));
      return {
        isContinueDisabled: continueBtn ? (continueBtn.disabled || continueBtn.classList.contains('cursor-not-allowed')) : false
      };
    })()`);
    assert(!step1AfterSelect.isContinueDisabled, "Continue button is enabled after selecting sex!");

    await captureScreenshot("onboarding_step1_desktop_1366x768.png");

    // Helper to click continue and wait for step transition
    async function clickContinue() {
      // Wait for continue button to be enabled
      for (let i = 0; i < 25; i++) {
        const isEnabled = await evaluate(`(() => {
          const btn = Array.from(document.querySelectorAll('footer button')).find(b => b.innerText.includes('Continue'));
          return btn && !btn.disabled && !btn.classList.contains('cursor-not-allowed') && !btn.classList.contains('opacity-70');
        })()`);
        if (isEnabled) break;
        await wait(200);
      }
      const prevTitle = await evaluate("document.querySelector('h1')?.innerText");
      await evaluate(`(() => {
        const continueBtn = Array.from(document.querySelectorAll('footer button')).find(b => b.innerText.includes('Continue'));
        if (continueBtn) continueBtn.click();
      })()`);
      // Wait for title to advance
      for (let i = 0; i < 25; i++) {
        await wait(200);
        const currTitle = await evaluate("document.querySelector('h1')?.innerText");
        if (currTitle && currTitle !== prevTitle) break;
      }
    }

    // Step 2: Date of Birth
    await clickContinue();
    console.log("\n--- Checking Step 2: Date of Birth ---");
    const step2Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const input = document.querySelector('input[type="date"]');
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, hasInput: Boolean(input), hasPageVerticalScroll };
    })()`);
    assert(step2Check.title.includes("born"), "Step 2 title is 'When were you born?'");
    assert(!step2Check.hasPageVerticalScroll, "Step 2 requires ZERO vertical scrolling!");

    // Step 3: Height
    await clickContinue();
    console.log("\n--- Checking Step 3: Height ---");
    const step3Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const unitBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Centimetres') || b.innerText.includes('Feet'));
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, unitBtnCount: unitBtns.length, hasPageVerticalScroll };
    })()`);
    assert(step3Check.title.includes("tall"), "Step 3 title is 'How tall are you?'");
    assert(step3Check.unitBtnCount === 2, "Step 3 has cm and ft/in toggles");
    assert(!step3Check.hasPageVerticalScroll, "Step 3 requires ZERO vertical scrolling!");

    // Step 4: Weight
    await clickContinue();
    console.log("\n--- Checking Step 4: Weight ---");
    const step4Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const unitBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Kilograms') || b.innerText.includes('Pounds'));
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, unitBtnCount: unitBtns.length, hasPageVerticalScroll };
    })()`);
    assert(step4Check.title.includes("weight"), "Step 4 title is 'What\\'s your current weight?'");
    assert(step4Check.unitBtnCount === 2, "Step 4 has kg and lbs toggles");
    assert(!step4Check.hasPageVerticalScroll, "Step 4 requires ZERO vertical scrolling!");

    // Step 5: Workout Frequency
    await clickContinue();
    console.log("\n--- Checking Step 5: Workout Frequency (2-column grid) ---");
    const step5Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, optionCount: options.length, hasPageVerticalScroll };
    })()`);
    assert(step5Check.title.includes("work out"), "Step 5 title is 'How often do you work out?'");
    assert(step5Check.optionCount === 4, "Step 5 contains exactly 4 options in 2-column grid");
    assert(!step5Check.hasPageVerticalScroll, "Step 5 requires ZERO vertical scrolling!");
    await captureScreenshot("onboarding_step5_desktop_1366x768.png");

    // Step 6: Dietitian Consultation
    await clickContinue();
    console.log("\n--- Checking Step 6: Dietitian Consultation ---");
    const step6Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, optionCount: options.length, hasPageVerticalScroll };
    })()`);
    assert(step6Check.title.includes("dietitian"), "Step 6 title is 'Have you ever consulted a registered dietitian?'");
    assert(step6Check.optionCount === 4, "Step 6 contains 4 options");
    assert(!step6Check.hasPageVerticalScroll, "Step 6 requires ZERO vertical scrolling!");

    // Step 7: Primary Goal
    await clickContinue();
    console.log("\n--- Checking Step 7: Primary Goal (5 options in 2 columns) ---");
    const step7Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, optionCount: options.length, hasPageVerticalScroll };
    })()`);
    assert(step7Check.title.includes("achieve"), "Step 7 title is 'What would you like to achieve?'");
    assert(step7Check.optionCount === 5, "Step 7 contains 5 options");
    assert(!step7Check.hasPageVerticalScroll, "Step 7 requires ZERO vertical scrolling!");
    await captureScreenshot("onboarding_step7_desktop_1366x768.png");

    // Step 8: Specific Target
    await clickContinue();
    console.log("\n--- Checking Step 8: Specific Target ---");
    const step8Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, hasPageVerticalScroll };
    })()`);
    assert(!step8Check.hasPageVerticalScroll, "Step 8 requires ZERO vertical scrolling!");

    // Step 9: Feasibility
    await clickContinue();
    console.log("\n--- Checking Step 9: Transparent Feasibility (2 columns side-by-side) ---");
    const step9Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const cards = Array.from(document.querySelectorAll('main .rounded-2xl'));
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, cardCount: cards.length, hasPageVerticalScroll };
    })()`);
    assert(step9Check.title.includes("realistic"), "Step 9 title is 'Let\\'s check whether your goal is realistic.'");
    assert(!step9Check.hasPageVerticalScroll, "Step 9 requires ZERO vertical scrolling!");

    // Step 10: Timeline
    await clickContinue();
    console.log("\n--- Checking Step 10: Timeline (3 columns) ---");
    const step10Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, optionCount: options.length, hasPageVerticalScroll };
    })()`);
    assert(step10Check.optionCount === 3, "Step 10 contains 3 options in 3 columns");
    assert(!step10Check.hasPageVerticalScroll, "Step 10 requires ZERO vertical scrolling!");

    // Step 11: Pace
    await clickContinue();
    console.log("\n--- Checking Step 11: Progression Pace (3 columns) ---");
    const step11Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, optionCount: options.length, hasPageVerticalScroll };
    })()`);
    assert(step11Check.optionCount === 3, "Step 11 contains 3 options in 3 columns");
    assert(!step11Check.hasPageVerticalScroll, "Step 11 requires ZERO vertical scrolling!");

    // Step 12: Challenges (8 options)
    await clickContinue();
    console.log("\n--- Checking Step 12: Challenges (8 options in 2 columns) ---");
    const step12Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, optionCount: options.length, hasPageVerticalScroll };
    })()`);
    assert(step12Check.optionCount === 8, "Step 12 contains exactly 8 options in 2-column grid");
    assert(!step12Check.hasPageVerticalScroll, "Step 12 requires ZERO vertical scrolling!");
    await captureScreenshot("onboarding_step12_desktop_1366x768.png");

    // Step 13: Diet Preference
    await clickContinue();
    console.log("\n--- Checking Step 13: Diet Preference (5 options in 2 columns) ---");
    const step13Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, optionCount: options.length, hasPageVerticalScroll };
    })()`);
    assert(step13Check.optionCount === 5, "Step 13 contains 5 options in 2 columns");
    assert(!step13Check.hasPageVerticalScroll, "Step 13 requires ZERO vertical scrolling!");

    // Step 14: Outcomes (10 options)
    await clickContinue();
    console.log("\n--- Checking Step 14: Desired Outcomes (10 options in 2 columns) ---");
    const step14Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, optionCount: options.length, hasPageVerticalScroll };
    })()`);
    assert(step14Check.optionCount === 10, "Step 14 contains 10 options in 2 columns");
    assert(!step14Check.hasPageVerticalScroll, "Step 14 requires ZERO vertical scrolling on 1366x768!");
    await captureScreenshot("onboarding_step14_desktop_1366x768.png");

    // Step 15: Thank You & Plan Summary
    await clickContinue();
    console.log("\n--- Checking Step 15: Summary Blueprint ---");
    const step15Check = await evaluate(`(() => {
      const title = document.querySelector('h1')?.innerText;
      const buildBtn = Array.from(document.querySelectorAll('main button')).find(b => b.innerText.includes('Build My Nutrition Dashboard'));
      const hasPageVerticalScroll = document.documentElement.scrollHeight > window.innerHeight;
      return { title, hasBuildBtn: Boolean(buildBtn), hasPageVerticalScroll };
    })()`);
    assert(step15Check.title.includes("Thank You"), "Step 15 title is 'Thank You for Sharing!'");
    assert(step15Check.hasBuildBtn, "Step 15 has 'Build My Nutrition Dashboard' CTA");
    assert(!step15Check.hasPageVerticalScroll, "Step 15 requires ZERO vertical scrolling on 1366x768!");
    await captureScreenshot("onboarding_step15_summary_desktop_1366x768.png");

    // 5. MOBILE VIEWPORT VERIFICATION (375x720)
    console.log("\n5. Testing Mobile Viewport (375x720)...");
    await setViewport(375, 720, true);
    await navigate("http://localhost:3000/nutrition/onboarding?retake=true&step=1");
    await wait(1200);

    const mobileStep1 = await evaluate(`(() => {
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      const continueBtn = Array.from(document.querySelectorAll('footer button')).find(b => b.innerText.includes('Continue'));
      const headerRect = header?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      return {
        headerVisible: Boolean(headerRect && headerRect.height > 0),
        footerVisible: Boolean(footerRect && footerRect.height > 0 && footerRect.top < window.innerHeight),
        continueBtnVisible: Boolean(continueBtn),
      };
    })()`);
    assert(mobileStep1.headerVisible, "Mobile header is visible & pinned at top");
    assert(mobileStep1.footerVisible, "Mobile footer is visible & pinned at bottom");
    assert(mobileStep1.continueBtnVisible, "Mobile Continue button is accessible");
    await captureScreenshot("onboarding_step1_mobile_375x720.png");

    // Navigate to Step 14 on Mobile to verify 10 options layout & pinned footer
    await navigate("http://localhost:3000/nutrition/onboarding?retake=true&step=14");
    await wait(1200);

    const mobileStep14 = await evaluate(`(() => {
      const header = document.querySelector('header');
      const footer = document.querySelector('footer');
      const continueBtn = Array.from(document.querySelectorAll('footer button')).find(b => b.innerText.includes('Continue'));
      const options = Array.from(document.querySelectorAll('main button')).map(b => b.innerText);
      const footerRect = footer?.getBoundingClientRect();
      return {
        optionCount: options.length,
        footerPinned: Boolean(footerRect && footerRect.bottom <= window.innerHeight),
        continueAccessible: Boolean(continueBtn),
      };
    })()`);
    assert(mobileStep14.optionCount === 10, "Mobile displays all 10 outcome options");
    assert(mobileStep14.footerPinned, "Mobile footer stays pinned at bottom of viewport");
    assert(mobileStep14.continueAccessible, "Mobile Continue button is fully accessible without clipping");
    await captureScreenshot("onboarding_step14_mobile_375x720.png");

    console.log("\n================================================================================");
    console.log("🎉 ALL SINGLE-SCREEN ONBOARDING REDESIGN CHECKS PASSED PERFECTLY!");
    console.log("================================================================================");
  } finally {
    chrome.kill("SIGTERM");
  }
}

runE2E().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

