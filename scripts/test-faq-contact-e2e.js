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

async function runTests() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS FAQ & CONTACT US PAGES E2E AND BACKEND VERIFICATION");
  console.log("================================================================================");

  // 1. BACKEND API VERIFICATION FOR CONTACT SUBMISSIONS
  console.log("\n1. Testing /api/contact validation and Neon DB persistence...");

  // Test 1.1: Invalid input rejection
  const invalidRes = await fetch("http://localhost:3000/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "",
      email: "not-an-email",
      message: "short",
    }),
  });
  assert(invalidRes.status === 400, "API rejects invalid contact input with HTTP 400");
  const invalidData = await invalidRes.json();
  assert(invalidData.success === false, "API returns success: false for invalid input");

  // Test 1.2: Valid submission
  const testEmail = `contact_test_${Date.now()}@example.com`;
  const validMessage = "I would like to inquire about placing custom weekly meal orders for our corporate team.";

  const validRes = await fetch("http://localhost:3000/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Rahul Verma",
      email: testEmail,
      phone: "+91 98765 43210",
      category: "General Enquiry",
      message: validMessage,
    }),
  });
  assert(validRes.status === 201, "API creates contact submission with HTTP 201");
  const validData = await validRes.json();
  assert(validData.success === true, "API returns success: true");
  assert(Boolean(validData.submissionId), `API returned submission ID: ${validData.submissionId}`);

  // Test 1.3: Database persistence check in Neon PostgreSQL
  const dbSubmission = await prisma.contactSubmission.findUnique({
    where: { id: validData.submissionId },
  });
  assert(dbSubmission !== null, "Contact submission found in Neon PostgreSQL database");
  assert(dbSubmission.email === testEmail.toLowerCase(), `Saved email matches: ${dbSubmission.email}`);
  assert(dbSubmission.category === "General Enquiry", `Saved category matches: ${dbSubmission.category}`);
  assert(dbSubmission.status === "NEW", `Initial status defaults to NEW: ${dbSubmission.status}`);

  // Test 1.4: Duplicate prevention within 3 minutes
  const dupRes = await fetch("http://localhost:3000/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Rahul Verma",
      email: testEmail,
      category: "General Enquiry",
      message: validMessage,
    }),
  });
  const dupData = await dupRes.json();
  assert(dupData.isDuplicate === true, "Duplicate submission prevented within 3 minutes");

  // 2. BROWSER AUTOMATION VIA CHROME CDP
  console.log("\n2. Launching Chrome CDP for visual and interaction testing...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9296",
    "--user-data-dir=/tmp/chrome-test-faq-contact",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9296/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9296");

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

    // 3. TEST FAQ PAGE DESKTOP
    console.log("\n3. Testing FAQ Page on Desktop (1280px)...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000/faq" });
    await wait(2500);

    const faqContent = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          const questions = document.querySelectorAll('button[aria-expanded]');
          return {
            hasTitle: text.includes("Frequently Asked Questions"),
            hasSearch: document.querySelector('input[type="text"]') !== null,
            questionCount: questions.length,
            hasGeneral: text.includes("What is NutriFlexs"),
            hasOrderFood: text.includes("kind of food can I order"),
            hasTracking: text.includes("homemade Indian food")
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   FAQ Page inspection:", faqContent?.value);
    assert(faqContent?.value?.hasTitle, "FAQ page hero heading verified");
    assert(faqContent?.value?.hasSearch, "FAQ search input verified");
    assert(faqContent?.value?.questionCount >= 20, `Rendered ${faqContent?.value?.questionCount} FAQ questions`);

    // Test search filter
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const searchInput = document.querySelector('input[type="text"]');
          if (searchInput) {
            searchInput.value = "Indian";
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()
      `,
    });
    await wait(800);

    const searchResult = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const questions = Array.from(document.querySelectorAll('button[aria-expanded]'));
          return {
            filteredCount: questions.length,
            firstMatch: questions[0]?.textContent?.trim()
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Search result for 'Indian':", searchResult?.value);
    assert(searchResult?.value?.filteredCount > 0, "Search filter returned matching results");

    // Clear search
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const searchInput = document.querySelector('input[type="text"]');
          if (searchInput) {
            searchInput.value = "";
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()
      `,
    });
    await wait(800);

    // Expand accordion question 4 (What kind of food can I order?)
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button[aria-expanded]'));
          const q4 = buttons.find(b => b.textContent && b.textContent.includes("kind of food can I order"));
          if (q4) q4.click();
        })()
      `,
    });
    await wait(800);
    await takeScreenshot("faq_page_desktop_verified.png");

    // 4. TEST FAQ PAGE MOBILE
    console.log("\n4. Testing FAQ Page on Mobile (390px)...");
    await setViewport(390, 844, true);
    await send("Page.navigate", { url: "http://localhost:3000/faq" });
    await wait(2000);
    await takeScreenshot("faq_page_mobile_verified.png");

    // 5. TEST CONTACT US PAGE DESKTOP
    console.log("\n5. Testing Contact Us Page on Desktop (1280px)...");
    await setViewport(1280, 950, false);
    await send("Page.navigate", { url: "http://localhost:3000/contact" });
    await wait(2500);

    const contactCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          return {
            hasTitle: text.includes("Let's Talk!"),
            hasGeneralCard: text.includes("General Enquiries"),
            hasOrderCard: text.includes("Order Support"),
            hasNutritionCard: text.includes("Nutrition Support"),
            hasPartnershipCard: text.includes("Business Partnerships"),
            hasForm: document.querySelector('form') !== null
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Contact Page inspection:", contactCheck?.value);
    assert(contactCheck?.value?.hasTitle, "Contact page hero heading verified ('Let's Talk!')");
    assert(contactCheck?.value?.hasGeneralCard, "General Enquiries card present");
    assert(contactCheck?.value?.hasOrderCard, "Order Support card present");
    assert(contactCheck?.value?.hasNutritionCard, "Nutrition Support card present");
    assert(contactCheck?.value?.hasPartnershipCard, "Business Partnerships card present");
    assert(contactCheck?.value?.hasForm, "Contact form present");

    // Fill and submit the form in browser
    console.log("   Filling and submitting browser contact form...");
    const formSubmitResult = await send("Runtime.evaluate", {
      expression: `
        (() => {
          function setReactInput(input, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          function setReactTextarea(input, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }

          const nameInput = document.getElementById("name");
          const emailInput = document.getElementById("email");
          const phoneInput = document.getElementById("phone");
          const msgInput = document.getElementById("message");
          const form = document.querySelector('form');

          if (nameInput && emailInput && msgInput && form) {
            setReactInput(nameInput, "Pooja Hegde");
            setReactInput(emailInput, "pooja.hegde@fitnessclub.com");
            if (phoneInput) setReactInput(phoneInput, "+91 99887 76655");
            setReactTextarea(msgInput, "We would like to partner with NutriFlexs to install an express kiosk at our Indiranagar fitness center.");
            form.querySelector('button[type="submit"]').click();
            return { submitted: true };
          }
          return { submitted: false };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Browser form submitted:", formSubmitResult?.value);
    await wait(3000);

    // Verify submission success screen
    const successScreenCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          return {
            hasThankYou: text.includes("Thank You for Reaching Out!"),
            hasReceivedMsg: text.includes("Your message has been received"),
            hasReference: text.includes("Reference ID:"),
            hasReturnBtn: text.includes("Return to NutriFlexs")
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Success screen check:", successScreenCheck?.value);
    assert(successScreenCheck?.value?.hasThankYou, "Success screen displayed: 'Thank You for Reaching Out!'");
    assert(successScreenCheck?.value?.hasReceivedMsg, "Confirmation message displayed");
    assert(successScreenCheck?.value?.hasReference, "Submission reference ID displayed");
    await takeScreenshot("contact_page_desktop_submitted.png");

    // 6. TEST CONTACT US PAGE MOBILE
    console.log("\n6. Testing Contact Us Page on Mobile (390px)...");
    await setViewport(390, 844, true);
    await send("Page.navigate", { url: "http://localhost:3000/contact" });
    await wait(2000);
    await takeScreenshot("contact_page_mobile_verified.png");

    console.log("\n================================================================================");
    console.log("✅ ALL FAQ AND CONTACT US E2E TESTS PASSED SUCCESSFULLY!");
    console.log("================================================================================");
    ws.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

runTests()
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

