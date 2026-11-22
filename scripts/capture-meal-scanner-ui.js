const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";
const PORT = 9228;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  const timestamp = Date.now();
  const testEmail = `scanner_real_${timestamp}@nutriflexs.test`;
  const testPass = "Password123!";

  console.log("1. Creating test customer:", testEmail);
  const regRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Scanner Real Tester",
      email: testEmail,
      password: testPass,
    }),
  });
  const regData = await regRes.json();
  console.log("Registered:", regData.success);

  // Set onboarding complete so it doesn't redirect to onboarding
  await prisma.user.update({
    where: { email: testEmail },
    data: {
      hasCompletedNutritionOnboarding: true,
      nutritionOnboardingStep: 19,
    },
  });

  // Login via NextAuth credentials endpoint to get cookies
  console.log("2. Authenticating via NextAuth endpoint...");
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
      password: testPass,
      portal: "customer",
      redirect: "false",
      json: "true",
    }),
    redirect: "manual",
  });

  const setCookies = loginRes.headers.getSetCookie?.() || [loginRes.headers.get("set-cookie") || ""];

  // Launch headless Chrome
  console.log("3. Launching Headless Chrome...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1440,900",
  ]);

  await wait(2000);

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json`);
    const tabs = await listRes.json();
    const wsUrl = tabs[0].webSocketDebuggerUrl;

    const ws = new globalThis.WebSocket(wsUrl);
    let msgId = 1;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (event) => {
          const res = JSON.parse(event.data);
          if (res.id === id) {
            ws.removeEventListener("message", handler);
            if (res.error) reject(res.error);
            else resolve(res.result !== undefined ? res.result : res);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
      });

    await new Promise((r) => ws.addEventListener("open", r, { once: true }));

    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");
    await send("Network.enable");

    // Inject cookies into browser
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
    console.log("Cookies injected successfully.");

    // Navigate to /nutrition
    console.log("4. Navigating to http://localhost:3000/nutrition...");
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    await wait(3500);

    // Click "Scan Your Meal"
    console.log("5. Clicking 'Scan Your Meal' button...");
    const clickRes = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent && (b.textContent.includes('Scan Your Meal') || b.textContent.includes('Scan Meal')));
          if (btn) {
            btn.click();
            return { found: true, text: btn.textContent.trim() };
          }
          return { found: false, availableButtons: buttons.map(b => b.textContent?.trim()).filter(Boolean) };
        })()
      `,
      returnByValue: true,
    });
    console.log("Click result:", clickRes.result?.value);
    await wait(1500);

    // Capture open modal screenshot
    const shot1 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "ai_meal_scanner_modal_localhost.png"),
      Buffer.from(shot1.data, "base64")
    );
    console.log("Saved ai_meal_scanner_modal_localhost.png");

    // Click "Try Sample Indian Thali Scan (Quick Demo)" inside modal
    console.log("6. Clicking 'Try Sample Indian Thali Scan' inside modal...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent && b.textContent.includes('Try Sample Indian Thali Scan'));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })()
      `,
    });
    // Wait for analysis to complete and render editable confirmation view
    console.log("Waiting for analysis screen to render...");
    for (let i = 0; i < 20; i++) {
      await wait(1000);
      const check = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Add to Food Diary'));
            return !!btn;
          })()
        `,
        returnByValue: true,
      });
      if (check.result?.value) {
        console.log("Analysis screen ready after", (i + 1), "seconds!");
        break;
      }
    }
    await wait(1000);

    // Capture analysis confirmation view with AI estimation notice
    const shot2 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "ai_meal_scanner_analysis_localhost.png"),
      Buffer.from(shot2.data, "base64")
    );
    console.log("Saved ai_meal_scanner_analysis_localhost.png");

    ws.close();
  } catch (err) {
    console.error("Capture error:", err);
  } finally {
    chrome.kill();
    await prisma.$disconnect();
  }
}

capture();
