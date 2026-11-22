const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
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

async function runVerification() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS FOOD SEARCH & SUGGESTIONS VERIFICATION");
  console.log("================================================================================");

  // 1. Test search API for requested example queries
  const testQueries = [
    { q: "dal", expectedIncludes: ["Dal Tadka", "Dal Fry"] },
    { q: "rice", expectedIncludes: ["White Rice", "Brown Rice", "Jeera Rice"] },
    { q: "chicken", expectedIncludes: ["Chicken Breast", "Chicken Curry", "Chicken Tikka"] },
    { q: "paneer", expectedIncludes: ["Paneer Bhurji", "Paneer Paratha", "Fresh Paneer"] },
    { q: "chai", expectedIncludes: ["Chai with Milk & Sugar"] },
    { q: "tea", expectedIncludes: ["Green Tea (Unsweetened)", "Chai with Milk & Sugar"] },
    { q: "chapati", expectedIncludes: ["Roti / Phulka", "Chapati with Ghee"] },
    { q: "dahi", expectedIncludes: ["Curd / Dahi"] },
    { q: "egg", expectedIncludes: ["Boiled Whole Egg", "Boiled Egg White"] },
    { q: "   dal    tadka   ", expectedIncludes: ["Dal Tadka"] },
  ];

  console.log("\n--- 1. Testing Search API Endpoints & Relevance Ranking ---");
  for (const { q, expectedIncludes } of testQueries) {
    const res = await fetch(`http://localhost:3000/api/nutrition/foods?q=${encodeURIComponent(q)}&limit=20`);
    assert(res.ok, `API responded successfully for query "${q}"`);
    const data = await res.json();
    assert(data.success, `API returned success: true for query "${q}"`);
    const names = (data.foods || []).map((f) => f.name);
    console.log(`Query "${q}" returned ${names.length} items. Top results:`, names.slice(0, 5));

    for (const exp of expectedIncludes) {
      const found = names.some((n) => n.toLowerCase().includes(exp.toLowerCase()));
      assert(found, `Expected query "${q}" to return item matching "${exp}". Found in: ${names.slice(0, 5).join(", ")}`);
    }
  }

  // 2. Create authenticated test customer with onboarding completed
  const timestamp = Date.now();
  const testEmail = `food_search_tester_${timestamp}@nutriflexs.com`;
  const testPassword = "Password123!";
  const testName = `Search Tester ${timestamp.toString().slice(-4)}`;

  console.log(`\n--- 2. Setting up test customer: ${testEmail} ---`);
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
  assert(regRes.ok && regData.success, "Test customer created successfully");

  await prisma.user.update({
    where: { email: testEmail },
    data: {
      hasCompletedNutritionOnboarding: true,
      nutritionOnboardingStep: 4,
      nutritionOnboardingCompletedAt: new Date(),
      nutritionGoal: {
        create: {
          dailyCalorieGoal: 2200,
          proteinGoal: 140,
          carbohydrateGoal: 220,
          fatGoal: 65,
        },
      },
    },
  });
  console.log("Onboarding marked as completed for test user.");

  // 3. Launch Chrome CDP for UI Inspection
  console.log("\n--- 3. Launching Headless Chrome to Inspect UI & Capture Screenshots ---");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9288",
    "--user-data-dir=/tmp/chrome-test-food-search",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9288/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9288");

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
            const r = data.result;
            resolve(r?.result !== undefined ? r.result : r);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await new Promise((resolve) => ws.addEventListener("open", resolve));
    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");
    await send("Network.enable");

    // Login via API to get session cookie reliably
    console.log("\nLogging in customer via NextAuth API...");
    const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
    const csrfData = await csrfRes.json();
    const csrfCookies = (csrfRes.headers.getSetCookie?.() || [csrfRes.headers.get("set-cookie") || ""])
      .map((c) => c.split(";")[0])
      .join("; ");

    const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: csrfCookies,
      },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: testEmail,
        password: testPassword,
        portal: "customer",
        redirect: "false",
        json: "true",
      }),
      redirect: "manual",
    });

    const setCookies = loginRes.headers.getSetCookie?.() || [loginRes.headers.get("set-cookie") || ""];
    for (const cookieStr of setCookies) {
      const parts = cookieStr.split(";")[0].split("=");
      const name = parts[0]?.trim();
      const value = parts.slice(1).join("=").trim();
      if (name && value) {
        await send("Network.setCookie", {
          name,
          value,
          domain: "localhost",
          path: "/",
        });
      }
    }
    console.log("Session cookies set in browser.");

    // Desktop Viewport
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 920,
      deviceScaleFactor: 2,
      mobile: false,
    });

    // Navigate to /nutrition
    console.log("Navigating directly to /nutrition...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    await wait(3500);

    const pageInfo = await send("Runtime.evaluate", {
      expression: `(() => ({
        url: window.location.href,
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
        title: document.title,
        heading: document.querySelector('h1, h2, h3')?.textContent
      }))()`,
      returnByValue: true,
    });
    console.log("Current page info on /nutrition:", pageInfo?.value);

    // Open Add Food modal
    const openClick = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const addBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Add Food'));
          if (addBtns.length > 0) {
            addBtns[0].click();
            return { clicked: true, text: addBtns[0].textContent.trim() };
          }
          return { clicked: false, allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()) };
        })()
      `,
      returnByValue: true,
    });
    console.log("Clicked Add Food:", openClick?.value);
    assert(openClick?.value?.clicked === true, "Clicked '+ Add Food' button");
    await wait(1500);

    // 1. Initial State Screenshot (empty search, popular staples banner)
    console.log("\nCapturing Initial State Screenshot (empty search, popular staples banner)...");
    const initScreenshot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "food_search_initial_state_desktop.png"),
      Buffer.from(initScreenshot.data, "base64")
    );
    console.log("Saved: food_search_initial_state_desktop.png");

    // Helper to set input value and trigger React synthetic events
    async function searchFor(term) {
      await send("Runtime.evaluate", {
        expression: `(() => {
          function setReactInput(input, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const input = document.querySelector('input[placeholder*="Search dal, roti, rice"]');
          if (input) {
            setReactInput(input, "${term}");
            return true;
          }
          return false;
        })()`,
      });

      // Poll up to 4s for debounced fetch and render
      for (let i = 0; i < 20; i++) {
        await wait(200);
        const count = await send("Runtime.evaluate", {
          expression: `document.querySelectorAll('[data-food-row="true"]').length`,
          returnByValue: true,
        });
        if (count?.value > 0) break;
      }
    }

    // 2. Type "chicken" into search input
    console.log("\nTyping 'chicken' into search input...");
    await searchFor("chicken");
    await wait(800);

    // Inspect suggestion rows content
    const rawChickenRows = await send("Runtime.evaluate", {
      expression: `(() => {
        const rows = Array.from(document.querySelectorAll('[data-food-row="true"]'));
        return rows.map(r => ({
          title: r.innerText.split('\\n')[0].trim(),
          fullText: r.innerText
        }));
      })()`,
      returnByValue: true,
    });

    const chickenRows = Array.isArray(rawChickenRows) ? rawChickenRows : (rawChickenRows?.value || []);
    console.log(`Found ${chickenRows.length} chicken suggestions:`);
    chickenRows.slice(0, 4).forEach((r, idx) => {
      console.log(` [${idx + 1}] ${r.title}`);
    });

    assert(
      chickenRows.length > 0,
      "Found chicken suggestions in UI list"
    );

    // Click on the first chicken suggestion (e.g. Chicken Tikka)
    console.log("Selecting first chicken suggestion...");
    await send("Runtime.evaluate", {
      expression: `(() => {
        const row = document.querySelector('[data-food-row="true"]');
        if (row) {
          row.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });

    await wait(800);

    // Capture Chicken Suggestion + Selected state Screenshot
    const chickenScreenshot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "food_search_chicken_results_desktop.png"),
      Buffer.from(chickenScreenshot.data, "base64")
    );
    console.log("Saved: food_search_chicken_results_desktop.png");

    // 3. Type "dal"
    console.log("\nTyping 'dal' into search input...");
    await searchFor("dal");
    await wait(800);

    // Click Dal Tadka
    await send("Runtime.evaluate", {
      expression: `(() => {
        const rows = Array.from(document.querySelectorAll('[data-food-row="true"]'));
        const dalRow = rows.find(r => r.innerText.includes('Dal Tadka')) || rows[0];
        if (dalRow) {
          dalRow.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true,
    });

    await wait(800);

    const dalScreenshot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "food_search_dal_results_desktop.png"),
      Buffer.from(dalScreenshot.data, "base64")
    );
    console.log("Saved: food_search_dal_results_desktop.png");

    // 4. Test "chai"
    console.log("\nTyping 'chai' into search input...");
    await searchFor("chai");
    await wait(1200);

    const rawChaiResults = await send("Runtime.evaluate", {
      expression: `(() => {
        const rows = Array.from(document.querySelectorAll('[data-food-row="true"]'));
        return rows.map(r => r.innerText);
      })()`,
      returnByValue: true,
    });
    const chaiList = Array.isArray(rawChaiResults) ? rawChaiResults : (rawChaiResults?.value || []);
    console.log("Chai suggestions found:", chaiList.map(t => t.split('\n').filter(Boolean)[0] || t));
    assert(
      chaiList.some((n) => n.toLowerCase().includes("chai")),
      "Chai search returned chai item"
    );

    // 5. Test No Results State (e.g. "xyz123nomatch")
    console.log("\nTesting No Results State with 'xyz123nomatch'...");
    await send("Runtime.evaluate", {
      expression: `(() => {
        function setReactInput(input, value) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const input = document.querySelector('input[placeholder*="Search dal, roti, rice"]');
        if (input) {
          setReactInput(input, "xyz123nomatch");
        }
      })()`,
    });

    await wait(1500);

    const rawNoResultsText = await send("Runtime.evaluate", {
      expression: `(() => {
        const el = Array.from(document.querySelectorAll('p, div')).find(e => e.innerText.includes('No matching foods found'));
        return el ? el.innerText : null;
      })()`,
      returnByValue: true,
    });
    const noResultsText = (typeof rawNoResultsText === 'string') ? rawNoResultsText : rawNoResultsText?.value;
    console.log("No results indicator found:", noResultsText);
    assert(noResultsText !== null && noResultsText !== undefined, "Found 'No matching foods found' message");

    const noResultsScreenshot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "food_search_no_results_desktop.png"),
      Buffer.from(noResultsScreenshot.data, "base64")
    );
    console.log("Saved: food_search_no_results_desktop.png");

    // 6. Mobile Viewport Test (iPhone 14 Pro: 393 x 852)
    console.log("\n--- 4. Testing Mobile Layout (393 x 852) ---");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      mobile: true,
    });

    // Reset search to "paneer"
    await searchFor("paneer");
    await wait(1000);

    const mobileScreenshot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "food_search_paneer_mobile.png"),
      Buffer.from(mobileScreenshot.data, "base64")
    );
    console.log("Saved: food_search_paneer_mobile.png");

    ws.close();
  } finally {
    chrome.kill();
    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log("ALL FOOD SEARCH AND SUGGESTION VERIFICATIONS COMPLETED SUCCESSFULLY!");
  console.log("================================================================================");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
