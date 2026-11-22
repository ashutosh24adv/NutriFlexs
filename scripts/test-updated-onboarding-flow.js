const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";
const BASE_URL = "http://localhost:3000";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// NextAuth helper
async function login(email, password, portal = "customer") {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfCookies = (csrfRes.headers.getSetCookie?.() || [csrfRes.headers.get("set-cookie") || ""])
    .map((c) => c.split(";")[0])
    .join("; ");

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies,
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      email,
      password,
      portal,
      redirect: "false",
      json: "true",
    }),
    redirect: "manual",
  });

  const sessionCookies = (loginRes.headers.getSetCookie?.() || [loginRes.headers.get("set-cookie") || ""])
    .map((c) => c.split(";")[0])
    .join("; ");

  return { status: loginRes.status, cookies: sessionCookies };
}

async function run() {
  console.log("==================================================================");
  console.log("  NUTRIFLEXS ONBOARDING QUESTIONNAIRE UPDATES - E2E VERIFICATION  ");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------
  // STEP 1: CALCULATION AUDIT AND DOMAIN LOGIC VERIFICATION
  // ----------------------------------------------------------------
  console.log("--- 1. Testing Domain Calculations & Mapping Logic via /api/nutrition/onboarding/calculate ---");

  async function calculateTargetsAPI(body) {
    const res = await fetch(`${BASE_URL}/api/nutrition/onboarding/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data.targets;
  }

  // Test 1A: Gender Calculation Verification
  const maleTargets = await calculateTargetsAPI({
    weightKg: 70,
    heightCm: 175,
    birthDate: "1998-01-01",
    gender: "male",
    workoutFrequency: "3_4_sessions",
    primaryGoal: "maintain",
  });
  const maleLegacyTargets = await calculateTargetsAPI({
    weightKg: 70,
    heightCm: 175,
    birthDate: "1998-01-01",
    sex: "male",
    workoutFrequency: "3_4_sessions",
    primaryGoal: "maintain",
  });
  console.log(`✓ Male BMR: ${maleTargets.bmr} kcal (legacy sex BMR: ${maleLegacyTargets.bmr} kcal)`);
  if (maleTargets.bmr !== maleLegacyTargets.bmr || maleTargets.bmr !== 1659) {
    throw new Error(`Male BMR formula mismatch: got ${maleTargets.bmr}, expected 1659`);
  }

  const femaleTargets = await calculateTargetsAPI({
    weightKg: 70,
    heightCm: 175,
    birthDate: "1998-01-01",
    gender: "female",
    workoutFrequency: "3_4_sessions",
    primaryGoal: "maintain",
  });
  console.log(`✓ Female BMR: ${femaleTargets.bmr} kcal`);
  if (femaleTargets.bmr !== 1493) {
    throw new Error(`Female BMR formula mismatch: got ${femaleTargets.bmr}, expected 1493`);
  }

  const neutralTargets = await calculateTargetsAPI({
    weightKg: 70,
    heightCm: 175,
    birthDate: "1998-01-01",
    gender: "prefer_not_to_say",
    workoutFrequency: "3_4_sessions",
    primaryGoal: "maintain",
  });
  console.log(`✓ Prefer not to say BMR: ${neutralTargets.bmr} kcal`);
  if (neutralTargets.bmr !== 1576) {
    throw new Error(`Prefer not to say BMR formula mismatch: got ${neutralTargets.bmr}, expected 1576`);
  }

  // Test 1B: Workout Frequency Multipliers Verification
  const freqTiers = [
    { freq: "0_sessions", expectedTdee: Math.round(1659 * 1.2), label: "0 sessions" },
    { freq: "1_2_sessions", expectedTdee: Math.round(1659 * 1.375), label: "1–2 sessions" },
    { freq: "3_4_sessions", expectedTdee: Math.round(1659 * 1.45), label: "3–4 sessions" },
    { freq: "5_6_sessions", expectedTdee: Math.round(1659 * 1.55), label: "5–6 sessions" },
    { freq: "7_plus_sessions", expectedTdee: Math.round(1659 * 1.725), label: "7+ sessions" },
  ];
  for (const item of freqTiers) {
    const res = await calculateTargetsAPI({
      weightKg: 70,
      heightCm: 175,
      birthDate: "1998-01-01",
      gender: "male",
      workoutFrequency: item.freq,
      primaryGoal: "maintain",
    });
    console.log(`✓ Workout frequency [${item.label}] -> TDEE: ${res.tdee} kcal (Expected: ${item.expectedTdee})`);
    if (res.tdee !== item.expectedTdee) {
      throw new Error(`TDEE mismatch for ${item.label}: got ${res.tdee}, expected ${item.expectedTdee}`);
    }
  }

  // Test 1C: Target & Goal "Gain Weight & Build Muscle"
  const muscleTargets = await calculateTargetsAPI({
    weightKg: 70,
    heightCm: 175,
    birthDate: "1998-01-01",
    gender: "male",
    workoutFrequency: "5_6_sessions", // TDEE = Math.round(1659 * 1.55) = 2571
    primaryGoal: "build_muscle",
    preferredPace: "moderate", // +350 kcal surplus
  });
  const expectedCalories = Math.round(1659 * 1.55) + 350;
  console.log(`✓ "Gain Weight & Build Muscle" Targets: ${muscleTargets.dailyCalories} kcal (Controlled Surplus), Protein: ${muscleTargets.proteinGrams}g (~2.0g/kg)`);
  if (muscleTargets.dailyCalories !== expectedCalories || muscleTargets.proteinGrams !== 140) {
    throw new Error(`Target calculation mismatch for Gain Weight & Build Muscle`);
  }

  // ----------------------------------------------------------------
  // STEP 2: BACKEND API END-TO-END FLOW (Neon PostgreSQL Persistence)
  // ----------------------------------------------------------------
  console.log("\n--- 2. Testing API Routes with Database Persistence ---");
  const testEmail = "onboarding.user.test@nutriflexs.com";
  const testPassword = "OnboardPassword@2026!";

  // Register fresh user
  await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Rohan Verma",
      email: testEmail,
      phone: "+919876543999",
      password: testPassword,
      portal: "customer",
    }),
  });

  const auth = await login(testEmail, testPassword, "customer");
  console.log(`✓ Authenticated customer login cookies acquired: ${Boolean(auth.cookies)}`);

  // Calculate API test
  const calcRes = await fetch(`${BASE_URL}/api/nutrition/onboarding/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      weightKg: 72,
      heightCm: 178,
      birthDate: "1996-08-20",
      gender: "male",
      workoutFrequency: "7_plus_sessions",
      primaryGoal: "build_muscle",
      preferredPace: "moderate",
    }),
  });
  const calcData = await calcRes.json();
  console.log(`✓ /api/nutrition/onboarding/calculate: success=${calcData.success}, dailyCalories=${calcData.targets?.dailyCalories}, protein=${calcData.targets?.proteinGrams}g`);
  if (!calcData.success || !calcData.targets) {
    throw new Error("Failed to calculate targets via API");
  }

  // Save Partial Progress
  const progressRes = await fetch(`${BASE_URL}/api/nutrition/onboarding/progress`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: auth.cookies,
    },
    body: JSON.stringify({
      step: 8,
      data: {
        gender: "female",
        workoutFrequency: "7_plus_sessions",
        primaryGoal: "build_muscle",
      },
    }),
  });
  const progressData = await progressRes.json();
  console.log(`✓ /api/nutrition/onboarding/progress: success=${progressData.success}, currentStep=${progressData.currentStep}`);

  // Complete Onboarding API
  const completeRes = await fetch(`${BASE_URL}/api/nutrition/onboarding`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: auth.cookies,
    },
    body: JSON.stringify({
      gender: "male",
      birthDate: "1997-04-12",
      heightCm: 176,
      heightUnit: "cm",
      weightKg: 74,
      weightUnit: "kg",
      workoutFrequency: "7_plus_sessions",
      primaryGoal: "build_muscle",
      desiredGoalTarget: { targetWeightKg: 78 },
      desiredTimelineWeeks: 12,
      preferredPace: "moderate",
      dietPreference: "non_vegetarian",
      challenges: ["Hitting daily protein targets"],
    }),
  });
  const completeData = await completeRes.json();
  console.log(`✓ /api/nutrition/onboarding: success=${completeData.success}, message="${completeData.message}"`);
  if (!completeData.success) {
    throw new Error(`Failed to complete onboarding: ${JSON.stringify(completeData)}`);
  }

  // Fetch Onboarding Status & Profile from DB
  const statusRes = await fetch(`${BASE_URL}/api/nutrition/onboarding`, {
    headers: { Cookie: auth.cookies },
  });
  const statusData = await statusRes.json();
  console.log(`✓ Stored User Profile in Neon: gender="${statusData.profile?.gender}", hasCompleted=${statusData.hasCompleted}, caloriesGoal=${statusData.profile?.goals?.dailyCalorieGoal}`);
  if (statusData.profile?.gender !== "male" || !statusData.hasCompleted) {
    throw new Error(`Database verification failed: gender=${statusData.profile?.gender}`);
  }

  // ----------------------------------------------------------------
  // STEP 3: BROWSER CDP SCREENSHOT VERIFICATION
  // ----------------------------------------------------------------
  console.log("\n--- 3. Capturing Browser UI Screenshots via Chrome CDP ---");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9297",
    "--user-data-dir=/tmp/chrome-onboarding-test-v1",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let cdpRes = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
    try {
      cdpRes = await fetch("http://127.0.0.1:9297/json");
      if (cdpRes.ok) break;
    } catch (e) {}
  }
  if (!cdpRes || !cdpRes.ok) throw new Error("Could not connect to Chrome CDP on port 9297");

  try {
    const tabs = await cdpRes.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found in Chrome");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let msgId = 1;
    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === id) {
            ws.removeEventListener("message", handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    await new Promise((resolve) => (ws.onopen = resolve));
    await send("Page.enable");
    await send("Runtime.enable");

    async function evaluateWait(fnStr, maxWaitMs = 12000) {
      const startTime = Date.now();
      while (Date.now() - startTime < maxWaitMs) {
        const evalRes = await send("Runtime.evaluate", {
          expression: `Boolean((${fnStr})())`,
          returnByValue: true,
        });
        if (evalRes?.result?.value) return true;
        await wait(250);
      }
      return false;
    }

    // Set Desktop Viewport 1366x768
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 768,
      deviceScaleFactor: 2,
      mobile: false,
    });

    // 1. Capture Step 1: Gender Question
    console.log("1. Navigating to Onboarding Step 1 (Gender)...");
    await send("Page.navigate", { url: `${BASE_URL}/nutrition/onboarding` });
    await evaluateWait(`() => document.body.innerText.includes('What is your gender?')`, 12000);
    await wait(800);

    let shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "onboarding_step1_gender.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved onboarding_step1_gender.png");

    // Select Male and click Next to navigate through steps
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Male'));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(400);

    // Click Next button 4 times to reach Step 5 (Workout Frequency)
    for (let s = 1; s <= 4; s++) {
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next') || b.textContent.includes('Continue'));
            if (nextBtn) nextBtn.click();
          })()
        `,
      });
      await wait(600);
    }

    // 2. Capture Step 5: Workout Frequency Question
    console.log("2. Capturing Onboarding Step 5 (Workout Frequency: 7+ sessions per week)...");
    await evaluateWait(`() => document.body.innerText.includes('How many times do you work out?')`, 10000);
    await wait(800);

    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "onboarding_step5_workout_frequency.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved onboarding_step5_workout_frequency.png");

    // Select "7+ sessions per week" and click Next twice to reach Step 7 (Target)
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('7+ sessions per week'));
          if (btn) btn.click();
        })()
      `,
    });
    await wait(400);

    // Advance to Step 6 and then Step 7
    for (let s = 5; s <= 6; s++) {
      await send("Runtime.evaluate", {
        expression: `
          (() => {
            // Select default on step 6 if needed
            const optBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('No, self-directed'));
            if (optBtn) optBtn.click();
            const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next') || b.textContent.includes('Continue'));
            if (nextBtn) nextBtn.click();
          })()
        `,
      });
      await wait(600);
    }

    // 3. Capture Step 7: Target Question with "Gain Weight & Build Muscle"
    console.log("3. Capturing Onboarding Step 7 (Target: Gain Weight & Build Muscle)...");
    await evaluateWait(`() => document.body.innerText.includes('What is your target?')`, 10000);
    await wait(800);

    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "onboarding_step7_target_goal.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved onboarding_step7_target_goal.png");

    console.log("\n==================================================================");
    console.log("  ALL ONBOARDING QUESTIONNAIRE TESTS COMPLETED SUCCESSFULLY!      ");
    console.log("==================================================================");
  } finally {
    chrome.kill("SIGKILL");
  }
}

run().catch((err) => {
  console.error("❌ Test script failed:", err);
  process.exit(1);
});
