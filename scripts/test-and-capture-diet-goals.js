const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";
const BASE_URL = "http://localhost:3000";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log("=== STEP 1: VERIFYING BACKEND API ENDPOINTS ===");

  const resAll = await fetch(`${BASE_URL}/api/products`);
  const dataAll = await resAll.json();
  console.log(`✓ /api/products: success=${dataAll.success}, count=${dataAll.products?.length}`);
  if (!dataAll.success || dataAll.products?.length !== 13) {
    throw new Error(`Expected 13 products, got ${dataAll.products?.length}`);
  }

  // Check dietGoals
  const missingGoals = dataAll.products.filter((p) => !Array.isArray(p.dietGoals) || p.dietGoals.length === 0);
  if (missingGoals.length > 0) {
    throw new Error(`Found products missing dietGoals: ${missingGoals.map((p) => p.name).join(", ")}`);
  }
  console.log(`✓ All 13 products have assigned dietGoals in database.`);

  const resLoss = await fetch(`${BASE_URL}/api/products?dietGoal=WEIGHT_LOSS`);
  const dataLoss = await resLoss.json();
  console.log(`✓ /api/products?dietGoal=WEIGHT_LOSS: count=${dataLoss.products?.length} (expected 9)`);

  const resGain = await fetch(`${BASE_URL}/api/products?dietGoal=WEIGHT_GAIN`);
  const dataGain = await resGain.json();
  console.log(`✓ /api/products?dietGoal=WEIGHT_GAIN: count=${dataGain.products?.length} (expected 6)`);

  const resMaint = await fetch(`${BASE_URL}/api/products?dietGoal=WEIGHT_MAINTENANCE`);
  const dataMaint = await resMaint.json();
  console.log(`✓ /api/products?dietGoal=WEIGHT_MAINTENANCE: count=${dataMaint.products?.length} (expected 13)`);

  const resGainVeg = await fetch(`${BASE_URL}/api/products?dietGoal=WEIGHT_GAIN&isVeg=true`);
  const dataGainVeg = await resGainVeg.json();
  console.log(`✓ /api/products?dietGoal=WEIGHT_GAIN&isVeg=true: count=${dataGainVeg.products?.length} (expected 3)`);

  console.log("\n=== STEP 2: VERIFYING ADMIN CLASSIFICATION MANAGEMENT API ===");
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfCookies = csrfRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies,
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      email: "admin@nutriflexs.com",
      password: "Admin@NutriFlexs2026!",
      portal: "admin",
      callbackUrl: `${BASE_URL}/admin`,
      redirect: "false",
      json: "true",
    }),
    redirect: "manual",
  });

  const sessionCookies = loginRes.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  console.log(`✓ Admin authenticated successfully.`);

  const targetProduct = dataAll.products.find((p) => p.name.includes("ABC Stamina"));
  const patchRes = await fetch(`${BASE_URL}/api/admin/products/${targetProduct.id}/dietary`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookies,
    },
    body: JSON.stringify({
      dietGoals: ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE", "WEIGHT_GAIN"],
    }),
  });
  const patchData = await patchRes.json();
  console.log(`✓ Admin PATCH add goal: success=${patchData.success}, new goals: [${patchData.product?.dietGoals?.join(", ")}]`);

  // Revert back
  const revertRes = await fetch(`${BASE_URL}/api/admin/products/${targetProduct.id}/dietary`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookies,
    },
    body: JSON.stringify({
      dietGoals: ["WEIGHT_LOSS", "WEIGHT_MAINTENANCE"],
    }),
  });
  const revertData = await revertRes.json();
  console.log(`✓ Admin PATCH revert: success=${revertData.success}, restored goals: [${revertData.product?.dietGoals?.join(", ")}]`);

  console.log("\n=== STEP 3: CAPTURING BROWSER SCREENSHOTS VIA CHROME CDP ===");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9297",
    "--user-data-dir=/tmp/chrome-test-diet-goals-v2",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let cdpRes = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await wait(1000);
    try {
      cdpRes = await fetch("http://127.0.0.1:9297/json");
      if (cdpRes.ok) break;
    } catch (e) {}
  }
  if (!cdpRes || !cdpRes.ok) throw new Error("Could not connect to Chrome CDP on port 9297");

  try {
    const tabs = await cdpRes.json();
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
    await send("Network.enable");

    async function evaluateWait(fnStr, maxWaitMs = 10000) {
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

    // 1. Desktop: Menu All Goals (1366x768)
    console.log("1. Navigating to Desktop Menu (1366x768)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 768,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: `${BASE_URL}/menu` });
    await evaluateWait(`() => document.querySelectorAll('[data-testid="food-card"]').length === 13`, 12000);
    await wait(1000);

    let shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "menu_diet_goals_desktop_all.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved menu_diet_goals_desktop_all.png");

    // 2. Desktop: Click "Weight Loss" Filter Tab
    console.log("2. Capturing Desktop Menu (Weight Loss Filter)...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Weight Loss'));
          if (btn) btn.click();
        })()
      `,
    });
    await evaluateWait(`() => document.querySelectorAll('[data-testid="food-card"]').length === 9`, 5000);
    await wait(800);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "menu_diet_goals_desktop_weight_loss.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved menu_diet_goals_desktop_weight_loss.png");

    // 3. Desktop: Click "Weight Gain" Filter Tab
    console.log("3. Capturing Desktop Menu (Weight Gain Filter)...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Weight Gain'));
          if (btn) btn.click();
        })()
      `,
    });
    await evaluateWait(`() => document.querySelectorAll('[data-testid="food-card"]').length === 6`, 5000);
    await wait(800);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "menu_diet_goals_desktop_weight_gain.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved menu_diet_goals_desktop_weight_gain.png");

    // 4. Desktop: Open Product Modal to see Fitness Goals Supported
    console.log("4. Capturing Product Detail Modal with Diet Goals...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const card = document.querySelector('[data-testid="food-card"]');
          if (card) card.click();
        })()
      `,
    });
    await evaluateWait(`() => Boolean(document.querySelector('[data-testid="product-detail-modal"]'))`, 5000);
    await wait(800);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "menu_diet_goals_modal_fitness_goals.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved menu_diet_goals_modal_fitness_goals.png");

    // Close modal
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const closeBtn = document.querySelector('[data-testid="product-detail-modal"] button');
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await wait(500);

    // 5. Tablet: 768x1024
    console.log("5. Capturing Tablet Menu (768x1024)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btnAll = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('All Goals'));
          if (btnAll) btnAll.click();
        })()
      `,
    });
    await evaluateWait(`() => document.querySelectorAll('[data-testid="food-card"]').length === 13`, 5000);
    await wait(800);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "menu_diet_goals_tablet.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved menu_diet_goals_tablet.png");

    // 6. Mobile: 375x812
    console.log("6. Capturing Mobile Menu (375x812)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await wait(800);
    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "menu_diet_goals_mobile.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved menu_diet_goals_mobile.png");

    // 7. Admin Catalog Page (1366x850)
    console.log("7. Capturing Admin Catalog with Diet Goals...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 850,
      deviceScaleFactor: 2,
      mobile: false,
    });

    const tokenMatch = sessionCookies.match(/next-auth\.session-token=([^;]+)/);
    if (tokenMatch) {
      await send("Network.setCookie", {
        name: "next-auth.session-token",
        value: tokenMatch[1],
        domain: "localhost",
        path: "/",
        httpOnly: true,
      });
    }

    await send("Page.navigate", { url: `${BASE_URL}/admin` });
    await evaluateWait(`() => Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Product Catalog'))`, 10000);

    // Click "Product Catalog" tab
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const prodTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Product Catalog'));
          if (prodTab) prodTab.click();
        })()
      `,
    });

    // Wait until products table rows are populated
    await evaluateWait(`() => document.querySelectorAll('tbody tr').length >= 13`, 12000);
    await wait(1000);

    shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "admin_product_catalog_diet_goals.png"), Buffer.from(shot.data, "base64"));
    console.log("   ✓ Saved admin_product_catalog_diet_goals.png");

    ws.close();
  } finally {
    chrome.kill();
  }

  console.log("\n=== ALL TESTS AND SCREENSHOTS COMPLETED SUCCESSFULLY! ===");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
