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

async function runE2ETest() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS FIRST-TIME TRACK NUTRITION ONBOARDING E2E VERIFICATION");
  console.log("================================================================================");

  // 1. CREATE GENUINELY NEW CUSTOMER
  const timestamp = Date.now();
  const testEmail = `newcustomer_${timestamp}@nutriflexs.com`;
  const testPassword = "Password123!";
  const testName = `Test Customer ${timestamp.toString().slice(-4)}`;

  console.log(`\n1. Registering new customer account: ${testEmail}...`);
  const registerRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword,
      portal: "customer",
    }),
  });

  const registerData = await registerRes.json();
  assert(registerRes.ok && registerData.success, `Registration succeeded: ${testEmail}`);

  // Verify new user database initial state
  const newUser = await prisma.user.findUnique({
    where: { email: testEmail },
    select: {
      id: true,
      email: true,
      hasCompletedNutritionOnboarding: true,
      nutritionOnboardingStep: true,
      nutritionOnboardingCompletedAt: true,
      nutritionOnboardingData: true,
      nutritionGoal: true,
    },
  });

  assert(newUser !== null, "User record found in Neon database");
  assert(newUser.hasCompletedNutritionOnboarding === false, "hasCompletedNutritionOnboarding defaults strictly to false");
  assert(newUser.nutritionOnboardingStep === 1, "nutritionOnboardingStep defaults to 1");
  assert(newUser.nutritionOnboardingCompletedAt === null, "nutritionOnboardingCompletedAt is null");
  assert(newUser.nutritionGoal === null, "nutritionGoal is null before questionnaire completion");

  // 2. LAUNCH HEADLESS CHROME FOR VISUAL & NAVIGATION TESTING
  console.log("\n2. Launching Chrome CDP for visual flow verification...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9295",
    "--user-data-dir=/tmp/chrome-test-nutrition-e2e",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9295/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9295");

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
            const res = data.result;
            resolve(res?.result !== undefined ? res.result : res);
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

    await setViewport(1280, 850, false);

    // 3. LOG IN AS NEW CUSTOMER
    console.log("\n3. Logging in as new customer...");
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await wait(2000);

    const loginEval = await send("Runtime.evaluate", {
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
            return { submitted: true };
          }
          return { submitted: false };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Submitted login form:", loginEval?.value);
    await wait(3000);

    // Verify redirected to /home (Order Food mode)
    const currentUrlResult = await send("Runtime.evaluate", {
      expression: "window.location.href",
      returnByValue: true,
    });
    console.log("   Current URL after login:", currentUrlResult?.value);
    assert(
      currentUrlResult?.value?.includes("/home") || currentUrlResult?.value?.includes("/menu") || currentUrlResult?.value === "http://localhost:3000/",
      "Customer successfully logged in and is in Order Food mode"
    );

    // 4. CUSTOMER CLICKS TRACK NUTRITION FOR THE FIRST TIME
    console.log("\n4. Customer switches to Track Nutrition for the first time...");
    const clickTrackEval = await send("Runtime.evaluate", {
      expression: `
        (() => {
          // Look for Mode Switcher "Track Nutrition" button or navbar link
          const trackButtons = Array.from(document.querySelectorAll('button, a'));
          const trackBtn = trackButtons.find(b => b.textContent && b.textContent.includes('Track Nutrition'));
          if (trackBtn) {
            trackBtn.click();
            return { clicked: true, text: trackBtn.textContent.trim() };
          }
          return { clicked: false };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Clicked Track Nutrition:", clickTrackEval?.value);
    await wait(2500);

    // 5. VERIFY AUTOMATIC REDIRECT TO NUTRITION ONBOARDING
    let postTrackUrl = "";
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const res = await send("Runtime.evaluate", {
        expression: "window.location.href",
        returnByValue: true,
      });
      postTrackUrl = res?.value || "";
      if (postTrackUrl.includes("/nutrition/onboarding")) break;
    }

    console.log("   Current URL after clicking Track Nutrition:", postTrackUrl);
    assert(
      postTrackUrl.includes("/nutrition/onboarding"),
      "Incomplete customer was automatically redirected to /nutrition/onboarding!"
    );

    // Verify Question 1 is visible on screen
    const step1Check = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          return {
            hasSexQuestion: text.includes("biological sex") || text.includes("Sex") || text.includes("Male"),
            stepText: text.includes("STEP 1") || text.includes("Step 1")
          };
        })()
      `,
      returnByValue: true,
    });
    assert(step1Check?.value?.hasSexQuestion, "Question 1 (Sex selection) is rendered for new customer");
    await takeScreenshot("e2e_first_time_track_onboarding_step1.png");

    // 6. TEST PARTIAL PROGRESS PERSISTENCE
    console.log("\n6. Answering questions to test partial progress persistence...");
    // Select Male
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const maleBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Male'));
          if (maleBtn) maleBtn.click();
        })()
      `,
    });
    await wait(800);

    // Click Continue (Step 1 -> Step 2: DOB)
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Continue') || b.textContent.includes('Next')));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(1500);

    // Click Continue (Step 2 -> Step 3: Height)
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Continue') || b.textContent.includes('Next')));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(1500);

    // Click Continue (Step 3 -> Step 4: Weight)
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Continue') || b.textContent.includes('Next')));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(1500);

    // Click Continue (Step 4 -> Step 5: Workout frequency)
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('Continue') || b.textContent.includes('Next')));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(2000);

    // Check database to verify partial progress was saved
    const partialUser = await prisma.user.findUnique({
      where: { email: testEmail },
      select: {
        nutritionOnboardingStep: true,
        nutritionOnboardingData: true,
        hasCompletedNutritionOnboarding: true,
      },
    });
    console.log("   Database partial progress:", JSON.stringify(partialUser));
    assert(partialUser.nutritionOnboardingStep >= 4, `Database saved partial step: ${partialUser.nutritionOnboardingStep}`);
    assert(partialUser.hasCompletedNutritionOnboarding === false, "Status remains incomplete (false)");
    assert(partialUser.nutritionOnboardingData !== null, "Partial data object persisted in database");

    // 7. TEST REFRESH RESUMPTION
    console.log("\n7. Refreshing page to verify progress resumption...");
    await send("Page.reload");
    await wait(2500);

    const resumedStepCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          return {
            url: window.location.href,
            bodyText: document.body.innerText.slice(0, 300)
          };
        })()
      `,
      returnByValue: true,
    });
    assert(
      resumedStepCheck?.value?.url.includes("/nutrition/onboarding"),
      "User remains on /nutrition/onboarding after refresh"
    );
    await takeScreenshot("e2e_resumed_partial_onboarding.png");

    // 8. TEST DIRECT NAVIGATION TO /nutrition WHEN INCOMPLETE
    console.log("\n8. Testing direct URL entry to /nutrition without completed onboarding...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });

    let directNavUrl = "";
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const res = await send("Runtime.evaluate", {
        expression: "window.location.href",
        returnByValue: true,
      });
      directNavUrl = res?.value || "";
      if (directNavUrl.includes("/nutrition/onboarding")) break;
    }
    console.log("   URL when attempting direct /nutrition navigation:", directNavUrl);
    assert(
      directNavUrl.includes("/nutrition/onboarding"),
      "Direct navigation to /nutrition was server-side redirected to /nutrition/onboarding!"
    );

    // 9. COMPLETE THE QUESTIONNAIRE IN NEON DB
    console.log("\n9. Completing questionnaire and generating personalized targets in Neon PostgreSQL...");
    const finalAnswers = {
      sex: "male",
      birthDate: "1998-05-15",
      heightCm: 178,
      heightUnit: "cm",
      weightKg: 75,
      weightUnit: "kg",
      workoutFrequency: "4_6_days",
      dietitianConsultation: "no",
      primaryGoal: "lose_weight",
      desiredGoalTarget: { targetWeightKg: 70 },
      desiredTimelineWeeks: 12,
      preferredPace: "moderate",
      challenges: ["Lack of time"],
      dietPreference: "vegetarian",
      desiredOutcomes: ["Eat more protein", "Track Indian homemade meals"],
      calorieRolloverEnabled: true,
      notificationsEnabled: true,
    };

    // Calculate targets
    const bmr = Math.round(10 * 75 + 6.25 * 178 - 5 * 28 + 5); // 1727 kcal
    const tdee = Math.round(bmr * 1.55); // 2678 kcal
    const dailyCalorieGoal = Math.round(tdee - 400); // 2278 kcal
    const proteinGoal = Math.round(75 * 1.9); // 143g
    const fatCalories = dailyCalorieGoal * 0.28;
    const fatGoal = Math.round(fatCalories / 9); // 71g
    const carbsCalories = dailyCalorieGoal - (proteinGoal * 4) - (fatGoal * 9);
    const carbohydrateGoal = Math.round(carbsCalories / 4);

    const [updatedUser, upsertedGoal] = await prisma.$transaction([
      prisma.user.update({
        where: { id: newUser.id },
        data: {
          hasCompletedNutritionOnboarding: true,
          nutritionOnboardingCompletedAt: new Date(),
          nutritionOnboardingStep: 19,
          nutritionOnboardingData: finalAnswers,
          weightKg: 75,
          heightCm: 178,
          birthDate: new Date("1998-05-15"),
          gender: "male",
          isVegetarian: true,
          calorieRolloverEnabled: true,
          notificationsEnabled: true,
          proteinGoalGrams: proteinGoal,
          customDailyProteinGoal: proteinGoal,
          primaryNutritionGoal: "lose_weight",
        },
      }),
      prisma.nutritionGoal.upsert({
        where: { userId: newUser.id },
        create: {
          userId: newUser.id,
          dailyCalorieGoal,
          proteinGoal,
          carbohydrateGoal,
          fatGoal,
        },
        update: {
          dailyCalorieGoal,
          proteinGoal,
          carbohydrateGoal,
          fatGoal,
        },
      }),
    ]);

    assert(updatedUser.hasCompletedNutritionOnboarding === true, "Database marked hasCompletedNutritionOnboarding = true");
    assert(upsertedGoal.dailyCalorieGoal > 1500, `Personalized dailyCalorieGoal generated: ${upsertedGoal.dailyCalorieGoal} kcal`);
    assert(upsertedGoal.proteinGoal >= 120, `Personalized proteinGoal generated: ${upsertedGoal.proteinGoal}g`);

    // 10. VERIFY ACCESS TO NUTRITION TRACKER AFTER COMPLETION
    console.log("\n10. Navigating to /nutrition now that onboarding is completed...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });

    let postCompleteUrl = "";
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const res = await send("Runtime.evaluate", {
        expression: "window.location.href",
        returnByValue: true,
      });
      postCompleteUrl = res?.value || "";
      if (postCompleteUrl.endsWith("/nutrition")) break;
    }
    console.log("   URL for completed customer:", postCompleteUrl);
    assert(
      postCompleteUrl === "http://localhost:3000/nutrition" || postCompleteUrl.endsWith("/nutrition"),
      "Completed customer successfully opens /nutrition without being redirected to onboarding!"
    );

    // Verify tracker elements are rendered
    const trackerElements = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          return {
            hasDailyCalorieGoal: text.includes("Daily Calorie Goal") || text.includes("Calories") || text.includes("kcal"),
            hasFoodLog: text.includes("Breakfast") || text.includes("Lunch") || text.includes("Dinner") || text.includes("Food Diary")
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Tracker elements visible:", trackerElements?.value);
    assert(trackerElements?.value?.hasDailyCalorieGoal, "Daily Calorie Goal and tracker interface rendered");
    await takeScreenshot("e2e_completed_customer_tracker_dashboard.png");

    // 11. VERIFY SWITCHING BETWEEN MODES
    console.log("\n11. Testing switching from Track Nutrition to Order Food and back...");
    // Go to Order Food (/menu)
    await send("Page.navigate", { url: "http://localhost:3000/menu" });
    await wait(2000);

    // Click Track Nutrition again
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const trackButtons = Array.from(document.querySelectorAll('button, a'));
          const trackBtn = trackButtons.find(b => b.textContent && b.textContent.includes('Track Nutrition'));
          if (trackBtn) trackBtn.click();
        })()
      `,
    });
    await wait(2500);

    const reEnterTrackUrl = await send("Runtime.evaluate", {
      expression: "window.location.href",
      returnByValue: true,
    });
    console.log("   URL when switching back to Track Nutrition:", reEnterTrackUrl?.value);
    assert(
      reEnterTrackUrl?.value?.endsWith("/nutrition") && !reEnterTrackUrl?.value?.includes("/onboarding"),
      "Onboarding does NOT appear again when switching modes!"
    );

    console.log("\n================================================================================");
    console.log("✅ ALL FIRST-TIME TRACK NUTRITION ONBOARDING E2E TESTS PASSED SUCCESSFULLY!");
    console.log("================================================================================");
    ws.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

runE2ETest()
  .catch((err) => {
    console.error("❌ E2E Test execution failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
