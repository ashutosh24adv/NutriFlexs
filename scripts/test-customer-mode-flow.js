const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testCustomerModeFlow() {
  console.log("=== TESTING CUSTOMER AUTHENTICATION & TWO-MODE SWITCHER ===");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9277",
    "--user-data-dir=/tmp/chrome-test-mode-profile",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await wait(1000);
    try {
      res = await fetch("http://127.0.0.1:9277/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9277");

  try {
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    let id = 1;
    const send = (method, params = {}) => {
      const msgId = ++id;
      return new Promise((resolve) => {
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === msgId) {
            ws.removeEventListener("message", handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await new Promise((resolve) => (ws.onopen = resolve));
    await send("Page.enable");
    await send("Runtime.enable");

    // 1. Visit Login Page
    console.log("1. Visiting /login...");
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await wait(2000);

    // Verify login page text
    const loginText = await send("Runtime.evaluate", {
      expression: "document.body.innerText",
    });
    console.log("   Login title check:", loginText.result.value.includes("Welcome to NutriFlexs"));
    console.log("   Login subtitle check:", loginText.result.value.includes("Your food and nutrition journey starts here."));

    // 2. Visit Signup Page
    console.log("2. Visiting /signup...");
    await send("Page.navigate", { url: "http://localhost:3000/signup" });
    await wait(2000);

    const signupText = await send("Runtime.evaluate", {
      expression: "document.body.innerText",
    });
    console.log("   Signup title check:", signupText.result.value.includes("Start Your Healthier Journey"));
    console.log("   Signup subtitle check:", signupText.result.value.includes("One account for healthy food ordering and smarter nutrition tracking."));

    // 3. Test Mode Switcher in LocalStorage
    console.log("3. Testing Mode Switcher in LocalStorage...");
    await send("Runtime.evaluate", {
      expression: `
        localStorage.setItem("nutriflexs_active_mode", "track");
      `,
    });
    const storedMode = await send("Runtime.evaluate", {
      expression: `localStorage.getItem("nutriflexs_active_mode")`,
    });
    console.log("   Stored mode in localStorage:", storedMode.result.value);

    // 4. Visit Nutrition Page (Track Mode)
    console.log("4. Visiting /nutrition...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    await wait(2000);
    const nutritionText = await send("Runtime.evaluate", {
      expression: "document.body.innerText",
    });
    console.log("   Nutrition Page loaded successfully:", nutritionText.result.value.includes("Nutrition") || nutritionText.result.value.includes("Calories"));

    ws.close();
    console.log("=== CUSTOMER FLOW VERIFICATION COMPLETE ===");
  } finally {
    chrome.kill();
  }
}

testCustomerModeFlow().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

