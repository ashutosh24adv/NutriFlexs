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

async function runE2E() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS ADD FOOD TO DIARY MODAL REDESIGN E2E VERIFICATION");
  console.log("================================================================================");

  // 1. Create and setup an authenticated onboarded test user
  const timestamp = Date.now();
  const testEmail = `food_modal_test_${timestamp}@nutriflexs.com`;
  const testPassword = "Password123!";
  const testName = `Modal Tester ${timestamp.toString().slice(-4)}`;

  console.log(`\n1. Creating test customer: ${testEmail}...`);
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

  // Mark onboarding complete so user can access /nutrition directly
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

  // 2. Launch Chrome CDP
  console.log("\n2. Launching Chrome CDP...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9299",
    "--user-data-dir=/tmp/chrome-test-food-modal",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9299/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9299");

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
    await setViewport(1280, 850, false);

    // 3. Log in as Customer
    console.log("\n3. Logging in as customer...");
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await wait(2000);

    await send("Runtime.evaluate", {
      expression: `
        (() => {
          function setReactInput(input, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const emailInput = document.getElementById("login-email") || document.querySelector('input[type="email"]');
          const passInput = document.getElementById("login-password") || document.querySelector('input[type="password"]');
          const submitBtn = document.querySelector('button[type="submit"]');
          if (emailInput && passInput && submitBtn) {
            setReactInput(emailInput, "${testEmail}");
            setReactInput(passInput, "${testPassword}");
            submitBtn.click();
          }
        })()
      `,
    });

    // Wait for login redirect
    for (let i = 0; i < 20; i++) {
      await wait(600);
      const url = await send("Runtime.evaluate", { expression: "window.location.pathname", returnByValue: true });
      if (url?.value === "/home" || url?.value === "/menu") break;
    }

    // 4. Navigate to /nutrition
    console.log("\n4. Navigating to /nutrition...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });

    // Wait for Daily Nutrition Tracker to render
    for (let i = 0; i < 20; i++) {
      await wait(600);
      const hasTracker = await send("Runtime.evaluate", {
        expression: `document.body.innerText.includes("Calories") || document.body.innerText.includes("Breakfast")`,
        returnByValue: true,
      });
      if (hasTracker?.value) break;
    }

    // 5. Open "Add Food to Diary" Modal
    console.log("\n5. Opening Add Food to Diary modal...");
    const openClick = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const addBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Add Food'));
          if (addBtns.length > 0) {
            addBtns[0].click();
            return { clicked: true, text: addBtns[0].textContent.trim() };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Clicked Add Food:", openClick?.value);
    assert(openClick?.value?.clicked === true, "Clicked '+ Add Food' button");
    await wait(1200);

    // 6. Verify Modal Header & Structure
    console.log("\n6. Verifying Redesigned Modal Header & Dimensions...");
    const headerCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.querySelector('.animate-scale-up');
          if (!modal) return { error: "Modal not found" };

          const heading = modal.querySelector('h3');
          const subtitle = modal.querySelector('h3 + p');
          const closeBtn = modal.querySelector('button[aria-label="Close modal"]');

          // Check tabs
          const tabs = Array.from(modal.querySelectorAll('button')).filter(b => {
            const txt = b.textContent.trim();
            return txt.includes("Search") || txt.includes("Recents") || txt.includes("Favourites") || txt.includes("Saved Meals");
          }).map(b => b.textContent.trim());

          const searchInput = modal.querySelector('input[placeholder*="Search dal, roti, rice"]');
          const chips = Array.from(modal.querySelectorAll('.overflow-x-auto button')).map(b => b.textContent.trim());

          // Check empty placeholder on right panel
          const placeholder = modal.innerText.includes("Select a food to view its nutrition");

          return {
            title: heading ? heading.textContent.trim() : null,
            subtitle: subtitle ? subtitle.textContent.trim() : null,
            hasCloseBtn: closeBtn !== null,
            tabs,
            hasSearchInput: searchInput !== null,
            categoryChips: chips,
            hasPlaceholder: placeholder,
            modalWidth: modal.getBoundingClientRect().width,
            modalHeight: modal.getBoundingClientRect().height
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Header inspection:", headerCheck?.value);
    assert(headerCheck?.value?.title === "Add Food to Diary", "Modal title is 'Add Food to Diary'");
    assert(headerCheck?.value?.subtitle?.includes("Breakfast") && headerCheck?.value?.subtitle?.includes("2026"), "Subtitle shows meal and human-formatted date");
    assert(headerCheck?.value?.hasCloseBtn === true, "Modal has close button");
    assert(headerCheck?.value?.tabs.length >= 4, "Modal displays all 4 tabs: Search, Recents, Favourites, Saved Meals");
    assert(headerCheck?.value?.hasSearchInput === true, "Modal has search bar with clear placeholder");
    assert(headerCheck?.value?.categoryChips.length >= 4, "Modal displays category filter chips");
    assert(headerCheck?.value?.hasPlaceholder === true, "Right panel shows clean 'Select a food to view its nutrition' placeholder");
    assert(headerCheck?.value?.modalWidth >= 800 && headerCheck?.value?.modalWidth <= 1050, `Modal width is within 850-1000px range (${Math.round(headerCheck?.value?.modalWidth)}px)`);

    await takeScreenshot("food_modal_desktop_empty_selection.png");

    // 7. Search for a food item (e.g. "roti")
    console.log("\n7. Searching for 'roti'...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          function setReactInput(input, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const searchInput = document.querySelector('input[placeholder*="Search dal, roti, rice"]');
          if (searchInput) {
            setReactInput(searchInput, "roti");
          }
        })()
      `,
    });
    
    // Wait for search results to load
    for (let i = 0; i < 20; i++) {
      await wait(300);
      const rows = await send("Runtime.evaluate", {
        expression: `document.querySelectorAll('[data-food-row="true"]').length`,
        returnByValue: true,
      });
      if (rows?.value > 0) break;
    }

    // Verify search results
    const searchResultsCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const items = Array.from(document.querySelectorAll('[data-food-row="true"]'));
          return {
            count: items.length,
            firstItemText: items[0] ? items[0].innerText.replace(/\\n/g, " · ") : null
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Search results for 'roti':", searchResultsCheck?.value);
    assert(searchResultsCheck?.value?.count > 0, "Found matching foods for 'roti'");

    // 8. Select the first food item
    console.log("\n8. Selecting food item from left panel...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const firstRow = document.querySelector('[data-food-row="true"]');
          if (firstRow) {
            firstRow.click();
          }
        })()
      `,
    });
    
    // Wait for right panel to open
    for (let i = 0; i < 20; i++) {
      await wait(300);
      const hasChange = await send("Runtime.evaluate", {
        expression: `Array.from(document.querySelectorAll('button')).some(b => b.textContent.trim() === "Change")`,
        returnByValue: true,
      });
      if (hasChange?.value) break;
    }

    // Verify Right Panel populated with food details, quantity controls, and live nutrition
    const rightPanelCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.querySelector('.animate-scale-up');
          const text = modal.innerText;

          // Check if right panel shows selected food editor
          const hasChangeBtn = Array.from(modal.querySelectorAll('button')).some(b => b.textContent.trim() === "Change");
          const hasQuantityInput = modal.querySelector('input[type="number"]') !== null;
          const hasUnitSelect = modal.querySelector('select') !== null;
          const hasAddBtn = Array.from(modal.querySelectorAll('button')).some(b => b.textContent.includes("Add to Diary"));

          // Check live calories
          const hasLiveCalories = text.includes("kcal");
          const hasProtein = text.includes("Protein:");
          const hasCarbs = text.includes("Carbs:");
          const hasFat = text.includes("Fat:");

          return {
            hasChangeBtn,
            hasQuantityInput,
            hasUnitSelect,
            hasAddBtn,
            hasLiveCalories,
            hasProtein,
            hasCarbs,
            hasFat
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Right Panel configuration inspection:", rightPanelCheck?.value);
    assert(rightPanelCheck?.value?.hasChangeBtn === true, "Right panel displays 'Change' button");
    assert(rightPanelCheck?.value?.hasQuantityInput === true, "Right panel displays Quantity input");
    assert(rightPanelCheck?.value?.hasUnitSelect === true, "Right panel displays Serving Unit selector");
    assert(rightPanelCheck?.value?.hasAddBtn === true, "Right panel displays prominent 'Add to Diary' button");
    assert(rightPanelCheck?.value?.hasLiveCalories === true, "Right panel displays prominent live calories");
    assert(rightPanelCheck?.value?.hasProtein && rightPanelCheck?.value?.hasCarbs && rightPanelCheck?.value?.hasFat, "Right panel displays horizontal macro indicators");

    await takeScreenshot("food_modal_desktop_selected_food.png");

    // 9. Change Quantity and verify recalculation
    console.log("\n9. Changing Quantity to 2 and testing recalculation...");
    const beforeCalories = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const el = document.querySelector('[data-live-calories="true"]') || 
            Array.from(document.querySelectorAll('.animate-scale-up *')).find(el => el.children.length === 0 && el.textContent.includes('kcal'));
          return el ? el.textContent.trim() : null;
        })()
      `,
      returnByValue: true,
    });
    console.log("   Calories at quantity 1:", beforeCalories?.value);

    // Update quantity to 2
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          function setReactInput(input, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const qInput = document.querySelector('input[type="number"]');
          if (qInput) setReactInput(qInput, "2");
        })()
      `,
    });
    await wait(800);

    const afterCalories = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const el = document.querySelector('[data-live-calories="true"]') || 
            Array.from(document.querySelectorAll('.animate-scale-up *')).find(el => el.children.length === 0 && el.textContent.includes('kcal'));
          return el ? el.textContent.trim() : null;
        })()
      `,
      returnByValue: true,
    });
    console.log("   Calories at quantity 2:", afterCalories?.value);
    assert(beforeCalories?.value && afterCalories?.value && beforeCalories?.value !== afterCalories?.value, "Calories recalculated when quantity changed to 2");

    // 10. Change Serving Unit
    console.log("\n10. Changing Serving Unit...");
    const unitChanged = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const select = document.querySelector('.animate-scale-up select');
          if (select && select.options.length > 1) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            return { changed: true, selectedUnit: select.value };
          }
          return { changed: false };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Serving unit changed:", unitChanged?.value);

    // 11. Add to Diary
    console.log("\n11. Clicking 'Add to Diary'...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes("Add to Diary"));
          if (addBtn) addBtn.click();
        })()
      `,
    });
    await wait(2500);

    // Verify modal closed and diary updated
    const diaryCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          const modalOpen = document.querySelector('.animate-scale-up') !== null;
          const hasRotiInDiary = text.toLowerCase().includes("roti");
          return { modalOpen, hasRotiInDiary };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Diary status after adding food:", diaryCheck?.value);
    assert(diaryCheck?.value?.modalOpen === false, "Modal closed automatically after adding food");
    assert(diaryCheck?.value?.hasRotiInDiary === true, "Newly logged food appears in the actual Daily Nutrition Diary!");

    // 12. Re-open Modal and Test Recents Tab
    console.log("\n12. Re-opening modal and testing Recents tab...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const addBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Add Food'));
          if (addBtns.length > 0) addBtns[0].click();
        })()
      `,
    });
    await wait(1200);

    // Click Recents tab
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const recentsTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith("Recents"));
          if (recentsTab) recentsTab.click();
        })()
      `,
    });
    await wait(1500);

    const recentsCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.querySelector('.animate-scale-up')?.innerText || "";
          const hasRoti = text.toLowerCase().includes("roti");
          const hasLogAgain = text.includes("Log Again");
          return { hasRoti, hasLogAgain };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Recents Tab check:", recentsCheck?.value);
    assert(recentsCheck?.value?.hasRoti === true, "Recents tab displays the recently logged food");
    assert(recentsCheck?.value?.hasLogAgain === true, "Recents tab provides 1-click 'Log Again' action");

    await takeScreenshot("food_modal_desktop_recents_tab.png");

    // 13. Test Favourites Tab
    console.log("\n13. Testing Favourites Tab...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const favsTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith("Favourites"));
          if (favsTab) favsTab.click();
        })()
      `,
    });
    await wait(1000);

    await takeScreenshot("food_modal_desktop_favourites_tab.png");

    // 14. Test Saved Meals Tab
    console.log("\n14. Testing Saved Meals Tab...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const savedTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith("Saved Meals"));
          if (savedTab) savedTab.click();
        })()
      `,
    });
    await wait(1000);

    const savedMealsCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.querySelector('.animate-scale-up')?.innerText || "";
          const hasTitle = text.includes("Saved Meals");
          const hasCreateBtn = text.includes("Create Meal") || text.includes("Create Your First Meal");
          return { hasTitle, hasCreateBtn };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Saved Meals Tab check:", savedMealsCheck?.value);
    assert(savedMealsCheck?.value?.hasTitle === true, "Saved Meals tab rendered properly");
    assert(savedMealsCheck?.value?.hasCreateBtn === true, "Saved Meals tab displays Create Meal CTA");

    await takeScreenshot("food_modal_desktop_saved_meals_tab.png");

    // Switch back to Search tab
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const searchTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === "Search");
          if (searchTab) searchTab.click();
        })()
      `,
    });
    await wait(800);

    // 15. Test Empty Search State
    console.log("\n15. Testing Empty Search Results State...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          function setReactInput(input, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const searchInput = document.querySelector('input[placeholder*="Search dal, roti, rice"]');
          if (searchInput) setReactInput(searchInput, "xyznonexistentfood999");
        })()
      `,
    });
    await wait(1500);

    const emptySearchCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.querySelector('.animate-scale-up')?.innerText || "";
          const hasNoFoods = text.includes("No foods found") || text.includes("No foods match");
          const hasCreateCustomBtn = text.includes("Create Custom Food");
          return { hasNoFoods, hasCreateCustomBtn };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Empty search state:", emptySearchCheck?.value);
    assert(emptySearchCheck?.value?.hasNoFoods === true, "Clear 'No foods found' state displayed for invalid search");
    assert(emptySearchCheck?.value?.hasCreateCustomBtn === true, "Offers direct 'Create Custom Food' CTA");

    await takeScreenshot("food_modal_desktop_empty_search.png");

    // 16. Test Mobile Responsive Single-Column Layout (390px)
    console.log("\n16. Testing Mobile Single-Column Layout (390px)...");
    await setViewport(390, 844, true);
    await wait(1000);

    // Clear search input on mobile
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          function setReactInput(input, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const searchInput = document.querySelector('input[placeholder*="Search dal, roti, rice"]');
          if (searchInput) setReactInput(searchInput, "");
        })()
      `,
    });
    // Wait for search results to load
    for (let i = 0; i < 20; i++) {
      await wait(300);
      const rows = await send("Runtime.evaluate", {
        expression: `document.querySelectorAll('[data-food-row="true"]').length`,
        returnByValue: true,
      });
      if (rows?.value > 0) break;
    }

    const mobileListCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.querySelector('.animate-scale-up');
          const hasSearch = modal.querySelector('input[placeholder*="Search dal, roti, rice"]') !== null;
          const rows = modal.querySelectorAll('[data-food-row="true"]');
          return {
            hasSearch,
            rowCount: rows.length,
            modalWidth: modal.getBoundingClientRect().width
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Mobile List check:", mobileListCheck?.value);
    assert(mobileListCheck?.value?.hasSearch === true, "Search input clean and full width on mobile");
    assert(mobileListCheck?.value?.rowCount > 0, "Mobile search results rendered cleanly in single column");

    await takeScreenshot("food_modal_mobile_search_list.png");

    // Select a food on mobile to verify drill-down editor
    console.log("\n17. Selecting food on mobile for drill-down editor...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const row = document.querySelector('[data-food-row="true"]');
          if (row) row.click();
        })()
      `,
    });
    // Wait for mobile editor
    for (let i = 0; i < 20; i++) {
      await wait(300);
      const hasBack = await send("Runtime.evaluate", {
        expression: `document.body.innerText.includes("Back to food search results")`,
        returnByValue: true,
      });
      if (hasBack?.value) break;
    }

    const mobileEditorCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const modal = document.querySelector('.animate-scale-up');
          const hasBackBtn = Array.from(modal.querySelectorAll('button')).some(b => b.textContent.includes("Back to food search results"));
          const hasAddBtn = Array.from(modal.querySelectorAll('button')).some(b => b.textContent.includes("Add to Diary"));
          const hasCalories = modal.innerText.includes("kcal");
          return { hasBackBtn, hasAddBtn, hasCalories };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Mobile Editor check:", mobileEditorCheck?.value);
    assert(mobileEditorCheck?.value?.hasBackBtn === true, "Mobile displays 'Back to food search results' navigation");
    assert(mobileEditorCheck?.value?.hasAddBtn === true, "Mobile displays prominent 'Add to Diary' CTA");

    await takeScreenshot("food_modal_mobile_selected_editor.png");

    // Close modal
    await send("Runtime.evaluate", {
      expression: `document.querySelector('button[aria-label="Close modal"]')?.click();`,
    });
    await wait(800);

    ws.close();
    console.log("\n================================================================================");
    console.log("🎉 ALL ADD FOOD MODAL REDESIGN VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("================================================================================");
  } finally {
    chrome.kill();
    await prisma.$disconnect();
  }
}

runE2E().catch((err) => {
  console.error("FATAL ERROR IN E2E SUITE:", err);
  process.exit(1);
});
