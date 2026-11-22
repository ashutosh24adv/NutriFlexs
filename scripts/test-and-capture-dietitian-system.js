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
  console.log("   NUTRIFLEXS CONSULT A DIETITIAN SYSTEM - COMPREHENSIVE E2E TEST  ");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------
  // STEP 1: PUBLIC DISCOVERY & FILTERING APIS
  // ----------------------------------------------------------------
  console.log("--- 1. Testing Dietitian Discovery & Filter APIs ---");
  const resAll = await fetch(`${BASE_URL}/api/dietitians`);
  const dataAll = await resAll.json();
  console.log(`✓ /api/dietitians: success=${dataAll.success}, count=${dataAll.dietitians?.length}`);
  if (!dataAll.success || dataAll.dietitians.length < 2) {
    throw new Error(`Expected at least 2 verified dietitians, got ${dataAll.dietitians?.length}`);
  }

  const ananya = dataAll.dietitians.find((d) => d.fullName?.includes("Ananya"));
  const kavita = dataAll.dietitians.find((d) => d.fullName?.includes("Kavita"));
  if (!ananya || !kavita) {
    throw new Error("Dr. Ananya Sharma or Kavita Reddy not found in verified dietitians!");
  }
  console.log(`✓ Verified Dietitians identified: Dr. Ananya Sharma (${ananya.id}), Kavita Reddy (${kavita.id})`);

  // Filter by specialization
  const resSpec = await fetch(`${BASE_URL}/api/dietitians?specialization=${encodeURIComponent("PCOS / Hormonal Health")}`);
  const dataSpec = await resSpec.json();
  console.log(`✓ Filter by PCOS / Hormonal Health specialization: count=${dataSpec.dietitians?.length} (Expected >= 1)`);
  if (!dataSpec.dietitians.some((d) => d.fullName?.includes("Ananya"))) {
    throw new Error("PCOS filter did not return Dr. Ananya Sharma");
  }

  // Filter by Max Fee
  const resFee = await fetch(`${BASE_URL}/api/dietitians?maxFee=650`);
  const dataFee = await resFee.json();
  console.log(`✓ Filter by maxFee=650: count=${dataFee.dietitians?.length}`);
  if (!dataFee.dietitians.some((d) => d.fullName?.includes("Kavita")) || dataFee.dietitians.some((d) => d.fullName?.includes("Ananya"))) {
    throw new Error("maxFee filter did not filter correctly (Kavita fee: 599, Ananya fee: 799)");
  }

  // Single Profile API
  const resProfile = await fetch(`${BASE_URL}/api/dietitians/${ananya.id}`);
  const dataProfile = await resProfile.json();
  console.log(`✓ /api/dietitians/${ananya.id}: success=${dataProfile.success}, qualifications="${dataProfile.dietitian?.qualifications}"`);
  if (!dataProfile.success || !dataProfile.dietitian?.bio) {
    throw new Error("Failed to load dietitian profile details with bio");
  }

  // Available Slots API: pick next weekday so dayOfWeek is 1-5
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  const targetDate = d.toISOString().split("T")[0];
  const resSlots = await fetch(`${BASE_URL}/api/dietitians/${ananya.id}/slots?date=${targetDate}`);
  const dataSlots = await resSlots.json();
  console.log(`✓ /api/dietitians/${ananya.id}/slots?date=${targetDate}: slots count=${dataSlots.slots?.length}`);
  if (!dataSlots.success || dataSlots.slots.length === 0) {
    throw new Error("No available slots returned for dietitian");
  }
  const chosenSlot = dataSlots.slots[0];
  console.log(`✓ Selected slot for testing: ${chosenSlot}`);

  // ----------------------------------------------------------------
  // STEP 2: CUSTOMER SIGNUP / LOGIN & APPOINTMENT BOOKING
  // ----------------------------------------------------------------
  console.log("\n--- 2. Testing Customer Appointment Booking & Concurrency ---");
  const customerEmail = "diet.customer.test@nutriflexs.com";
  const customerPassword = "Customer@NutriFlexs2026!";

  // Register customer (or ignore if already exists)
  await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Aakash Patel",
      email: customerEmail,
      phone: "+919876500123",
      password: customerPassword,
      portal: "customer",
    }),
  });

  // Login as Customer
  const custAuth = await login(customerEmail, customerPassword, "customer");
  console.log(`✓ Customer login cookies acquired: ${Boolean(custAuth.cookies)}`);

  // Book Appointment
  const bookRes = await fetch(`${BASE_URL}/api/consultations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: custAuth.cookies,
    },
    body: JSON.stringify({
      dietitianId: ananya.id,
      scheduledDate: targetDate,
      timeSlot: chosenSlot,
      consultationType: "ONLINE",
      primaryConcern: "Muscle building, sports endurance, and post-workout meal planning.",
      healthNotes: "Mild lactose sensitivity",
    }),
  });
  const bookData = await bookRes.json();
  console.log(`✓ Booking 1: status=${bookRes.status}, success=${bookData.success}, consultationId=${bookData.consultation?.id}`);
  if (!bookData.success || !bookData.consultation?.id) {
    throw new Error(`Failed to book appointment: ${JSON.stringify(bookData)}`);
  }
  const consultationId = bookData.consultation.id;

  // TEST DOUBLE-BOOKING CONCURRENCY REJECTION
  console.log("   Testing double-booking prevention for identical slot...");
  const doubleBookRes = await fetch(`${BASE_URL}/api/consultations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: custAuth.cookies,
    },
    body: JSON.stringify({
      dietitianId: ananya.id,
      scheduledDate: targetDate,
      timeSlot: chosenSlot,
      consultationType: "ONLINE",
      primaryConcern: "Trying to double book same slot",
    }),
  });
  const doubleBookData = await doubleBookRes.json();
  console.log(`✓ Double-booking status=${doubleBookRes.status}, error="${doubleBookData.error}"`);
  if (doubleBookRes.status !== 409 && doubleBookRes.status !== 400) {
    throw new Error(`Expected 409 Conflict or 400 Bad Request for double booking, got ${doubleBookRes.status}`);
  }
  console.log("✓ Double-booking prevention enforced successfully!");

  // ----------------------------------------------------------------
  // STEP 3: PRIVATE MESSAGING & FOOD PHOTO SHARING
  // ----------------------------------------------------------------
  console.log("\n--- 3. Testing Private Messaging & Food Photo Sharing ---");
  // Customer sends greeting and food photo
  const msg1Res = await fetch(`${BASE_URL}/api/consultations/${consultationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: custAuth.cookies,
    },
    body: JSON.stringify({
      content: "Hello Dr. Ananya! Looking forward to our session. Here is a picture of my typical pre-workout meal.",
      imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80",
    }),
  });
  const msg1Data = await msg1Res.json();
  console.log(`✓ Customer message sent: success=${msg1Data.success}, content="${msg1Data.message?.content}"`);

  // Dietitian Login
  const dietitianAuth = await login("ananya.dietitian@nutriflexs.com", "Dietitian@NutriFlexs2026!", "dietitian");
  console.log(`✓ Dietitian Dr. Ananya login cookies acquired: ${Boolean(dietitianAuth.cookies)}`);

  // Dietitian replies
  const msg2Res = await fetch(`${BASE_URL}/api/consultations/${consultationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: dietitianAuth.cookies,
    },
    body: JSON.stringify({
      content: "Hello Aakash! Excellent choice of complex carbs. I will design a structured high-protein diet plan tailored to your training schedule.",
    }),
  });
  const msg2Data = await msg2Res.json();
  console.log(`✓ Dietitian reply sent: success=${msg2Data.success}`);

  // Fetch messages thread
  const threadRes = await fetch(`${BASE_URL}/api/consultations/${consultationId}/messages`, {
    headers: { Cookie: custAuth.cookies },
  });
  const threadData = await threadRes.json();
  console.log(`✓ Thread messages count=${threadData.messages?.length}`);
  if (threadData.messages.length < 2) {
    throw new Error("Chat thread missing messages");
  }

  // ----------------------------------------------------------------
  // STEP 4: DIET PLAN STUDIO & NUTRITION TRACKER LOGGING
  // ----------------------------------------------------------------
  console.log("\n--- 4. Testing Diet Plan Authoring & Nutrition Tracker Logging ---");
  const customerId = bookData.consultation.customerId;

  const planRes = await fetch(`${BASE_URL}/api/diet-plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: dietitianAuth.cookies,
    },
    body: JSON.stringify({
      consultationId,
      customerId,
      title: "NutriFlexs Elite Hypertrophy & Performance Fuel",
      dailyCalorieTarget: 2450,
      proteinTargetGrams: 165,
      carbsTargetGrams: 250,
      fatsTargetGrams: 65,
      notes: "Consume meals 2 hours before resistance training. Stay hydrated with 3.5L of water daily.",
      foodsToLimit: "Deep-fried snacks, processed sugar beverages, excessive salt.",
      meals: [
        {
          mealType: "BREAKFAST",
          foodName: "Rolled Oats with Whey Protein, Chia Seeds & Blueberries",
          servingSize: "1 large bowl (300g)",
          quantity: 1,
          unit: "bowl",
          calories: 460,
          protein: 34,
          carbohydrates: 58,
          fat: 10,
          dietitianTip: "Soak chia seeds overnight for maximum omega-3 absorption.",
        },
        {
          mealType: "LUNCH",
          foodName: "Grilled High-Protein Paneer & Herb Quinoa Bowl",
          servingSize: "1 bowl (350g)",
          quantity: 1,
          unit: "bowl",
          calories: 640,
          protein: 42,
          carbohydrates: 62,
          fat: 18,
          dietitianTip: "Use low-fat paneer or tofu if aiming for leaner body composition.",
        },
        {
          mealType: "SNACKS",
          foodName: "Greek Yogurt with Roasted Almonds & Honey",
          servingSize: "1 cup (200g)",
          quantity: 1,
          unit: "cup",
          calories: 280,
          protein: 20,
          carbohydrates: 24,
          fat: 9,
          dietitianTip: "Perfect 4 PM snack to maintain positive nitrogen balance.",
        },
        {
          mealType: "DINNER",
          foodName: "Soya Chunk & Vegetable Curry with Steamed Brown Rice",
          servingSize: "1 plate (400g)",
          quantity: 1,
          unit: "plate",
          calories: 580,
          protein: 40,
          carbohydrates: 70,
          fat: 12,
          dietitianTip: "Light dinner rich in BCAAs for overnight muscle repair.",
        },
      ],
    }),
  });
  const planData = await planRes.json();
  const plan = planData.plan || planData.dietPlan;
  console.log(`✓ Diet Plan created: success=${planData.success}, planId=${plan?.id}, mealsCount=${plan?.meals?.length}`);
  if (!planData.success || !plan?.id) {
    throw new Error(`Failed to create diet plan: ${JSON.stringify(planData)}`);
  }
  const createdPlanId = plan.id;
  const lunchMeal = plan.meals.find((m) => m.mealType === "LUNCH");

  // Customer logs lunch meal to Nutrition Tracker
  console.log("   Logging prescribed Lunch meal to Customer Food Diary...");
  const logMealRes = await fetch(`${BASE_URL}/api/diet-plans/${createdPlanId}/log-meal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: custAuth.cookies,
    },
    body: JSON.stringify({ mealId: lunchMeal.id }),
  });
  const logMealData = await logMealRes.json();
  console.log(`✓ Meal logged to tracker: success=${logMealData.success}, logId=${logMealData.foodLog?.id}, foodName="${logMealData.foodLog?.foodNameSnapshot}"`);
  if (!logMealData.success || !logMealData.foodLog?.id) {
    throw new Error(`Failed to log prescribed meal to FoodLog: ${JSON.stringify(logMealData)}`);
  }

  // Verify Active Diet Plan for Customer API
  const custPlansRes = await fetch(`${BASE_URL}/api/diet-plans`, {
    headers: { Cookie: custAuth.cookies },
  });
  const custPlansData = await custPlansRes.json();
  console.log(`✓ Active customer plan title: "${custPlansData.activePlan?.title}", targets: ${custPlansData.activePlan?.dailyCalorieTarget} kcal, ${custPlansData.activePlan?.proteinTargetGrams}g Protein`);
  if (!custPlansData.activePlan) {
    throw new Error("Active diet plan not returned for customer");
  }

  // ----------------------------------------------------------------
  // STEP 5: SUPER ADMIN DIETITIAN VERIFICATION
  // ----------------------------------------------------------------
  console.log("\n--- 5. Testing Admin Dietitian Verification Workflow ---");
  const adminAuth = await login("ashusahuadmin@gmail.com", "password@123", "admin");
  console.log(`✓ Super Admin login cookies acquired: ${Boolean(adminAuth.cookies)}`);

  const adminListRes = await fetch(`${BASE_URL}/api/admin/dietitians`, {
    headers: { Cookie: adminAuth.cookies },
  });
  const adminListData = await adminListRes.json();
  console.log(`✓ Admin dietitians list: count=${adminListData.dietitians?.length}`);

  const rohan = adminListData.dietitians.find((d) => d.fullName?.includes("Rohan"));
  if (!rohan) {
    throw new Error("Applicant Rohan Mehta not found in admin list!");
  }
  console.log(`✓ Found pending applicant Rohan Mehta (id=${rohan.id}, status=${rohan.verificationStatus}, isVerified=${rohan.isVerified})`);

  // Admin approves Rohan
  const approveRes = await fetch(`${BASE_URL}/api/admin/dietitians`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminAuth.cookies,
    },
    body: JSON.stringify({
      id: rohan.id,
      status: "APPROVED",
    }),
  });
  const approveData = await approveRes.json();
  console.log(`✓ Admin approved Rohan: status=${approveData.dietitian?.verificationStatus}, isVerified=${approveData.dietitian?.isVerified}`);
  if (!approveData.success || !approveData.dietitian?.isVerified) {
    throw new Error("Admin approval failed to set isVerified=true");
  }

  // ----------------------------------------------------------------
  // STEP 6: CAPTURE MULTI-DEVICE SCREENSHOTS VIA CHROME CDP
  // ----------------------------------------------------------------
  console.log("\n--- 6. Capturing Multi-Device Screenshots via Chrome CDP ---");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9297",
    "--user-data-dir=/tmp/chrome-test-dietitians-v1",
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
    await send("Network.enable");

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

    async function injectCookies(cookieHeader) {
      if (!cookieHeader) return;
      const parts = cookieHeader.split(";").map((p) => p.trim());
      for (const part of parts) {
        const eqIdx = part.indexOf("=");
        if (eqIdx > 0) {
          const name = part.slice(0, eqIdx);
          const value = part.slice(eqIdx + 1);
          await send("Network.setCookie", {
            name,
            value,
            domain: "localhost",
            path: "/",
          });
        }
      }
    }

    // 1. Desktop Dietitian Discovery (1366x768)
    console.log("1. Capturing Desktop Dietitian Discovery (/dietitians, 1366x768)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 768,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Network.clearBrowserCookies");
    await send("Page.navigate", { url: `${BASE_URL}/dietitians` });
    await evaluateWait(`() => document.querySelectorAll('button').length > 5`, 12000);
    await wait(1000);
    let shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "dietitian_discovery_desktop.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved dietitian_discovery_desktop.png");

    // 2. Desktop Dietitian Profile & Booking (1366x768)
    console.log(`2. Capturing Desktop Dietitian Profile & Booking (/dietitians/${ananya.id})...`);
    await send("Page.navigate", { url: `${BASE_URL}/dietitians/${ananya.id}` });
    await evaluateWait(`() => document.body.innerText.includes('Book Consultation')`, 12000);
    await wait(1000);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "dietitian_profile_booking_desktop.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved dietitian_profile_booking_desktop.png");

    // 3. Customer Dashboard (/consultations) with active plan & appointment
    console.log("3. Capturing Customer Consultations Dashboard (/consultations)...");
    await injectCookies(custAuth.cookies);
    await send("Page.navigate", { url: `${BASE_URL}/consultations` });
    await evaluateWait(`() => document.body.innerText.includes('Appointments')`, 12000);
    await wait(1200);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "customer_consultations_dashboard.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved customer_consultations_dashboard.png");

    // 4. Private Messaging Room (/consultations/[id]/chat)
    console.log(`4. Capturing Private Consultation Chat (/consultations/${consultationId}/chat)...`);
    await send("Page.navigate", { url: `${BASE_URL}/consultations/${consultationId}/chat` });
    await evaluateWait(`() => document.body.innerText.includes('NutriFlexs Consultation Room')`, 12000);
    await wait(1200);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "consultation_private_chat.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved consultation_private_chat.png");

    // 5. Dietitian Clinical Portal (/dietitian)
    console.log("5. Capturing Dietitian Clinical Portal & Studio (/dietitian)...");
    await send("Network.clearBrowserCookies");
    await injectCookies(dietitianAuth.cookies);
    await send("Page.navigate", { url: `${BASE_URL}/dietitian` });
    await evaluateWait(`() => document.body.innerText.includes('Dietitian Clinical Workspace')`, 12000);
    await wait(1200);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "dietitian_portal_studio.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved dietitian_portal_studio.png");

    // 6. Admin Dietitians Verification (/admin)
    console.log("6. Capturing Super Admin Dietitians Verification (/admin)...");
    await send("Network.clearBrowserCookies");
    await injectCookies(adminAuth.cookies);
    await send("Page.navigate", { url: `${BASE_URL}/admin` });
    await evaluateWait(`() => document.body.innerText.includes('NutriFlexs Operations Suite')`, 12000);
    // Click "Dietitians" tab
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dietitians'));
          if (btn) btn.click();
        })()
      `,
    });
    await evaluateWait(`() => document.body.innerText.includes('Dietitians & Nutrition Clinical Staff')`, 8000);
    await wait(1000);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "admin_dietitians_verification.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved admin_dietitians_verification.png");

    // 7. Mobile Dietitian Discovery (375x812)
    console.log("7. Capturing Mobile Dietitian Discovery (/dietitians, 375x812)...");
    await send("Network.clearBrowserCookies");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await send("Page.navigate", { url: `${BASE_URL}/dietitians` });
    await evaluateWait(`() => document.querySelectorAll('button').length > 3`, 12000);
    await wait(1000);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "dietitian_discovery_mobile.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved dietitian_discovery_mobile.png");

    console.log("\n==================================================================");
    console.log("   ALL DIETITIAN SYSTEM TESTS & SCREENSHOTS COMPLETED SUCCESSFULLY! ");
    console.log("==================================================================");
  } finally {
    chrome.kill("SIGKILL");
  }
}

run().catch((err) => {
  console.error("❌ Test script failed:", err);
  process.exit(1);
});
