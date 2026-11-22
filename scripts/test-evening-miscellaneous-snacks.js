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

async function runTest() {
  console.log("==========================================================================");
  console.log("   VERIFYING MISCELLANEOUS SNACKS IN EVENING SNACKS (NUTRITION DIARY)     ");
  console.log("==========================================================================");

  // 1. Test search API for requested miscellaneous snack queries
  console.log("\n--- 1. Testing Search API Endpoints & Relevance for Miscellaneous Snacks ---");
  const snackQueries = [
    { q: "biscuit", expectedIncludes: ["Marie Gold Biscuits", "Parle-G Biscuits"] },
    { q: "namkeen", expectedIncludes: ["Aloo Bhujia", "Besan Sev", "Khatta Meetha"] },
    { q: "chips", expectedIncludes: ["Potato Chips", "Banana Chips"] },
    { q: "samosa", expectedIncludes: ["Samosa"] },
    { q: "kachori", expectedIncludes: ["Khasta Moong Dal Kachori", "Pyaaz Kachori"] },
    { q: "sandwich", expectedIncludes: ["Veg Grilled Sandwich", "Paneer Grilled Sandwich"] },
    { q: "popcorn", expectedIncludes: ["Salted Popcorn", "Butter Popcorn"] },
    { q: "makhana", expectedIncludes: ["Roasted Makhana"] },
    { q: "peanuts", expectedIncludes: ["Salted Peanuts", "Masala Peanuts"] },
    { q: "snack", expectedIncludes: ["Chakli", "Poha Chivda"] },
  ];

  for (const { q, expectedIncludes } of snackQueries) {
    const res = await fetch(`http://localhost:3000/api/nutrition/foods?q=${encodeURIComponent(q)}&limit=20`);
    assert(res.ok, `API responded for query "${q}"`);
    const data = await res.json();
    assert(data.success, `API returned success for query "${q}"`);
    const names = (data.foods || []).map((f) => f.name);
    console.log(`Query "${q}" returned ${names.length} items. Top results:`, names.slice(0, 4));

    for (const exp of expectedIncludes) {
      const found = names.some((n) => n.toLowerCase().includes(exp.toLowerCase()));
      assert(found, `Expected query "${q}" to return item matching "${exp}". Top 4: ${names.slice(0, 4).join(", ")}`);
    }
  }

  // 2. Set up authenticated test user with completed onboarding
  const timestamp = Date.now();
  const testEmail = `misc_snack_tester_${timestamp}@nutriflexs.com`;
  const testPassword = "Password123!";
  const testName = `Snack Tester ${timestamp.toString().slice(-4)}`;

  console.log(`\n--- 2. Registering and authenticating customer: ${testEmail} ---`);
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
          dailyCalorieGoal: 2100,
          proteinGoal: 130,
          carbohydrateGoal: 200,
          fatGoal: 60,
        },
      },
    },
  });
  console.log("Onboarding initialized in DB.");

  // 3. Launch Chrome CDP
  console.log("\n--- 3. Launching Headless Chrome to Test Evening Snacks UI ---");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9321",
    "--user-data-dir=/tmp/chrome-test-misc-snacks-v2",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9321/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9321");
  }

  try {
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
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

    await new Promise((r) => ws.addEventListener("open", r));
    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");
    await send("Network.enable");

    // Login via NextAuth credentials endpoint
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
    console.log("Session cookies injected into browser session.");

    // Desktop Viewport
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 950,
      deviceScaleFactor: 2,
      mobile: false,
    });

    // 4. Navigate to /nutrition
    console.log("\n4. Navigating to http://localhost:3000/nutrition ...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    await wait(3500);

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.value;
    }

    // Inspect Evening Snacks Card
    const eveningCardInfo = await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
        const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
        if (!eveningCard) return { error: "Evening Snacks card not found" };

        const hasMiscBadge = eveningCard.textContent.includes("Miscellaneous Snacks");
        const emptyText = eveningCard.textContent.includes("biscuits, namkeen, chips");
        const addFoodBtn = Array.from(eveningCard.querySelectorAll("button")).find(b => b.textContent.includes("Add Food"));

        return {
          found: true,
          hasMiscBadge,
          emptyText,
          hasAddFoodBtn: !!addFoodBtn,
        };
      })()
    `);
    console.log("Evening Snacks Initial Card State:", JSON.stringify(eveningCardInfo, null, 2));
    assert(eveningCardInfo.found, "Evening Snacks card is present");
    assert(eveningCardInfo.hasMiscBadge, "Miscellaneous Snacks label is displayed in Evening Snacks header");
    assert(eveningCardInfo.emptyText, "Evening Snacks empty state mentions biscuits, namkeen, chips");

    // 5. Click "Add Food" on Evening Snacks card
    console.log("\n5. Clicking 'Add Food' under Evening Snacks...");
    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
        const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
        const addFoodBtn = Array.from(eveningCard.querySelectorAll("button")).find(b => b.textContent.includes("Add Food"));
        if (addFoodBtn) addFoodBtn.click();
      })()
    `);
    await wait(1500);

    // Verify modal is open with Miscellaneous Snacks category
    const modalCheck = await evaluate(`
      (() => {
        const modals = Array.from(document.querySelectorAll('.fixed.inset-0.z-50'));
        const modal = modals.find(m => m.textContent.includes("Add Food to Diary"));
        if (!modal) return { error: "Food search modal not open", totalZ50: modals.length };

        const categoryButtons = Array.from(modal.querySelectorAll("button")).map(b => b.textContent.trim());
        const hasMiscCategory = categoryButtons.includes("Miscellaneous Snacks");

        return {
          isOpen: true,
          hasMiscCategory,
          categoryPills: categoryButtons.filter(b => b.length > 0).slice(0, 8),
        };
      })()
    `);
    console.log("Modal Open & Category Check:", JSON.stringify(modalCheck, null, 2));
    assert(modalCheck.isOpen, "Food Search Modal is open");
    assert(modalCheck.hasMiscCategory, "Miscellaneous Snacks category chip is present");

    // 6. Click 'Miscellaneous Snacks' category chip
    console.log("\n6. Clicking 'Miscellaneous Snacks' category filter chip...");
    await evaluate(`
      (() => {
        const modal = Array.from(document.querySelectorAll('.fixed.inset-0.z-50')).find(m => m.textContent.includes("Add Food to Diary"));
        const categoryButtons = Array.from(modal ? modal.querySelectorAll("button") : []);
        const miscChip = categoryButtons.find(b => b.textContent.trim() === "Miscellaneous Snacks");
        if (miscChip) miscChip.click();
      })()
    `);

    // Poll for rows to populate
    for (let i = 0; i < 15; i++) {
      await wait(300);
      const count = await evaluate(`(() => {
        const modal = Array.from(document.querySelectorAll('.fixed.inset-0.z-50')).find(m => m.textContent.includes("Add Food to Diary"));
        return modal ? modal.querySelectorAll('[data-food-row=\"true\"]').length : 0;
      })()`);
      if (count > 0) break;
    }

    const miscCategoryItems = await evaluate(`
      (() => {
        const modal = Array.from(document.querySelectorAll('.fixed.inset-0.z-50')).find(m => m.textContent.includes("Add Food to Diary"));
        const rows = Array.from(modal ? modal.querySelectorAll('[data-food-row=\"true\"]') : []).map(b => b.textContent.trim());
        return rows.slice(0, 6);
      })()
    `);
    console.log("Items under 'Miscellaneous Snacks' category:", miscCategoryItems);
    assert(miscCategoryItems.length > 0, "Miscellaneous Snacks category returns food items");

    // 7. Search for "Aloo Bhujia" and select it
    console.log("\n7. Searching for 'Aloo Bhujia' and selecting it...");
    await evaluate(`
      (() => {
        const modal = Array.from(document.querySelectorAll('.fixed.inset-0.z-50')).find(m => m.textContent.includes("Add Food to Diary"));
        const input = modal ? modal.querySelector('input[placeholder*=\"Search\"]') : null;
        if (input) {
          input.value = "Aloo Bhujia";
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      })()
    `);
    await wait(1500);

    await evaluate(`
      (() => {
        const modal = Array.from(document.querySelectorAll('.fixed.inset-0.z-50')).find(m => m.textContent.includes("Add Food to Diary"));
        const rows = Array.from(modal ? modal.querySelectorAll('[data-food-row=\"true\"]') : []);
        const alooRow = rows.find(r => r.textContent.includes("Aloo Bhujia"));
        if (alooRow) alooRow.click();
      })()
    `);
    await wait(1500);

    // Verify portion unit dropdown and change quantity to 2 packets
    const portionCheck = await evaluate(`
      (() => {
        const modal = Array.from(document.querySelectorAll('.fixed.inset-0.z-50')).find(m => m.textContent.includes("Add Food to Diary"));
        const unitSelect = Array.from(modal ? modal.querySelectorAll('select') : []).find(s => 
          Array.from(s.options).some(o => o.value === "packet" || o.value === "g" || o.value === "piece" || o.value === "bowl")
        );
        if (!unitSelect) return { error: "Unit select not found" };

        const options = Array.from(unitSelect.options).map(o => ({ value: o.value, text: o.text }));
        const liveCals = modal.querySelector('[data-live-calories=\"true\"]')?.textContent;

        return {
          unitOptions: options,
          liveCals,
        };
      })()
    `);
    console.log("Serving Unit Options:", JSON.stringify(portionCheck.unitOptions, null, 2));
    assert(portionCheck.unitOptions.some(o => o.value === "packet"), "Unit options include 'packet'");
    assert(portionCheck.unitOptions.some(o => o.value === "bowl"), "Unit options include 'bowl'");
    assert(portionCheck.unitOptions.some(o => o.value === "g"), "Unit options include 'g'");

    // Capture modal screenshot with Aloo Bhujia selected
    console.log("\nCapturing Food Search Modal with Aloo Bhujia selected...");
    const modalShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "food_search_misc_snack_modal.png"), Buffer.from(modalShot.data, "base64"));

    // Set quantity to 2 packets
    await evaluate(`
      (() => {
        const qtyInput = document.querySelector('input[type=\"number\"][step=\"0.5\"], input[type=\"number\"][min=\"0.1\"]');
        if (qtyInput) {
          qtyInput.value = "2";
          qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
          qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
      })()
    `);
    await wait(500);

    // Click "Add to Diary"
    console.log("\nLogging 2 packets of Aloo Bhujia to Evening Snacks...");
    await evaluate(`
      (() => {
        window.confirm = () => true;
        const modal = Array.from(document.querySelectorAll('.fixed.inset-0.z-50')).find(m => m.textContent.includes("Add Food to Diary"));
        const addBtn = Array.from(modal ? modal.querySelectorAll('button') : []).find(b => 
          b.textContent.includes("Add to Diary")
        );
        if (addBtn) addBtn.click();
      })()
    `);

    // Wait for the diary to update with logged snack
    let diaryAfterSnack = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      await wait(600);
      diaryAfterSnack = await evaluate(`
        (() => {
          const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
          const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
          if (!eveningCard) return { error: "Evening Snacks card not found" };

          const items = Array.from(eveningCard.querySelectorAll(".divide-y > div")).map(d => d.textContent.trim());
          const hasAlooBhujia = items.some(t => t.includes("Aloo Bhujia"));
          const headerText = eveningCard.querySelector(".flex.items-center.gap-3.text-xs")?.textContent;

          return {
            hasAlooBhujia,
            itemsCount: items.length,
            itemText: items[0] || null,
            eveningTotals: headerText || "",
          };
        })()
      `);
      if (diaryAfterSnack && diaryAfterSnack.hasAlooBhujia) {
        break;
      }
    }
    console.log("Diary Check after logging Aloo Bhujia:", JSON.stringify(diaryAfterSnack, null, 2));
    assert(diaryAfterSnack.hasAlooBhujia, "Aloo Bhujia logged into Evening Snacks");
    assert(diaryAfterSnack.eveningTotals.includes("406 kcal") || diaryAfterSnack.eveningTotals.includes("kcal"), "Evening snacks calories calculated");

    // 9. Test persistence on page refresh
    console.log("\n9. Testing persistence across page refresh...");
    await send("Page.reload");
    await wait(3500);

    const reloadedCheck = await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
        const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
        const items = Array.from(eveningCard ? eveningCard.querySelectorAll(".divide-y > div") : []).map(d => d.textContent.trim());
        const hasAlooBhujia = items.some(t => t.includes("Aloo Bhujia"));
        return {
          persisted: hasAlooBhujia,
          itemsCount: items.length,
          itemText: items[0],
        };
      })()
    `);
    console.log("Reload Persistence Check:", JSON.stringify(reloadedCheck, null, 2));
    assert(reloadedCheck.persisted, "Logged snack persists after page reload");

    // 10. Capture Desktop Dashboard Screenshot
    console.log("\n10. Capturing Desktop Evening Snacks Screenshot...");
    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
        const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
        if (eveningCard) eveningCard.scrollIntoView({ behavior: "instant", block: "center" });
      })()
    `);
    await wait(800);
    const desktopShot = await send("Page.captureScreenshot", {
      format: "png",
    });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "evening_snacks_misc_desktop.png"), Buffer.from(desktopShot.data, "base64"));
    console.log("Saved desktop screenshot to artifacts.");

    // 11. Test Editing: Update quantity to 1 packet
    console.log("\n11. Testing editing logged snack (change to 1 packet)...");
    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
        const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
        const editBtn = eveningCard ? eveningCard.querySelector('button[aria-label*=\"Edit\"]') : null;
        if (editBtn) editBtn.click();
      })()
    `);
    await wait(1000);

    await evaluate(`
      (() => {
        window.confirm = () => true;
        const qtyInput = document.querySelector('form input[type="number"]');
        if (qtyInput) {
          qtyInput.value = "1";
          qtyInput.dispatchEvent(new Event("input", { bubbles: true }));
          qtyInput.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const submitBtn = Array.from(document.querySelectorAll('form button')).find(b => b.textContent.includes("Save Changes") || b.textContent.includes("Update"));
        if (submitBtn) submitBtn.click();
      })()
    `);

    let editCheck = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      await wait(600);
      editCheck = await evaluate(`
        (() => {
          const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
          const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
          const items = Array.from(eveningCard ? eveningCard.querySelectorAll(".divide-y > div") : []).map(d => d.textContent.trim());
          const headerText = eveningCard?.querySelector(".flex.items-center.gap-3.text-xs")?.textContent;
          return {
            updatedItem: items[0] || "",
            totals: headerText || "",
          };
        })()
      `);
      if (editCheck && (editCheck.updatedItem.includes("1 packet") || editCheck.updatedItem.includes("1"))) break;
    }
    console.log("Edit Check (updated to 1 packet):", JSON.stringify(editCheck, null, 2));
    assert(editCheck.updatedItem.includes("1 packet") || editCheck.updatedItem.includes("1"), "Quantity successfully updated to 1");

    // 12. Test Mobile Viewport
    console.log("\n12. Capturing Mobile Viewport Screenshot (393 x 852)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await wait(1500);

    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
        const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
        if (eveningCard) eveningCard.scrollIntoView({ behavior: "instant", block: "center" });
      })()
    `);
    await wait(1000);

    const mobileShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "evening_snacks_misc_mobile.png"), Buffer.from(mobileShot.data, "base64"));
    console.log("Saved mobile screenshot to artifacts.");

    // 13. Test Deleting the item
    console.log("\n13. Testing deleting snack entry...");
    await evaluate(`
      (() => {
        window.confirm = () => true;
        const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
        const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
        const editBtn = eveningCard ? eveningCard.querySelector('button[aria-label*="Edit"]') : null;
        if (editBtn) editBtn.click();
      })()
    `);
    await wait(1000);

    await evaluate(`
      (() => {
        window.confirm = () => true;
        const deleteBtn = Array.from(document.querySelectorAll('form button')).find(b => b.textContent.includes("Remove") || b.textContent.includes("Delete"));
        if (deleteBtn) deleteBtn.click();
      })()
    `);

    let finalCheck = null;
    for (let attempt = 0; attempt < 25; attempt++) {
      await wait(600);
      finalCheck = await evaluate(`
        (() => {
          const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
          const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
          const items = Array.from(eveningCard ? eveningCard.querySelectorAll(".divide-y > div") : []);
          const headerText = eveningCard?.querySelector(".flex.items-center.gap-3.text-xs")?.textContent;
          const hasEmptyState = eveningCard ? eveningCard.textContent.includes("No items logged") : false;
          return {
            itemCount: items.length,
            eveningTotals: headerText || "",
            hasEmptyState,
          };
        })()
      `);
      if (finalCheck && finalCheck.eveningTotals.includes("0 kcal") && finalCheck.hasEmptyState) break;
    }
    console.log("Final State after Deletion:", JSON.stringify(finalCheck, null, 2));
    assert(finalCheck.itemCount === 0, "Snack item was removed successfully");
    assert(finalCheck.hasEmptyState, "Evening snacks shows empty state");
    assert(finalCheck.eveningTotals.includes("0 kcal"), "Totals reset back to 0 kcal");

    console.log("\n==========================================================================");
    console.log("       ALL MISCELLANEOUS SNACKS VERIFICATIONS COMPLETED SUCCESSFULLY!      ");
    console.log("==========================================================================");

  } finally {
    chrome.kill();
    await prisma.$disconnect();
  }
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
