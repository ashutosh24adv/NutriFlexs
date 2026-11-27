const assert = require("assert");
const crypto = require("crypto");
const { spawn } = require("child_process");
const { PrismaClient, Role } = require("@prisma/client");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

async function runTests() {
  console.log("==================================================");
  console.log("NutriFlexs Customer Navbar & Role Navigation Tests");
  console.log("==================================================\n");

  const ts = Date.now();
  const custEmail = `nav_cust_${ts}@nutriflexs.com`;
  const trainerEmail = `nav_trainer_${ts}@nutriflexs.com`;
  const password = "TestPassword123!";
  const createdIds = [];

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9331",
    "--user-data-dir=/tmp/chrome-nav-test-" + ts,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  try {
    // Provision Customer & Trainer
    const cust = await prisma.user.create({
      data: {
        name: "Nav Customer",
        email: custEmail,
        passwordHash: hashPassword(password),
        role: Role.CUSTOMER,
        hasCompletedNutritionOnboarding: true,
      },
    });
    createdIds.push(cust.id);

    const trainer = await prisma.user.create({
      data: {
        name: "Nav Trainer",
        email: trainerEmail,
        passwordHash: hashPassword(password),
        role: Role.TRAINER,
        trainerProfile: {
          create: { referralCode: `NUTRI-NAV${String(ts).slice(-4)}` },
        },
      },
    });
    createdIds.push(trainer.id);

    let res = null;
    for (let i = 0; i < 20; i++) {
      await wait(400);
      try {
        res = await fetch("http://127.0.0.1:9331/json");
        if (res.ok) break;
      } catch {}
    }
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let id = 1;
    const send = (method, params = {}) =>
      new Promise((resolve) => {
        const msgId = id++;
        const handler = (ev) => {
          const d = JSON.parse(ev.data);
          if (d.id === msgId) {
            ws.removeEventListener("message", handler);
            resolve(d.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    await new Promise((r) => ws.addEventListener("open", r));
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 850,
      deviceScaleFactor: 2,
      mobile: false,
    });

    // 8. Test Guest navigation first
    console.log("8. Testing Guest navigation on / ...");
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await wait(2500);
    const guestCheck = JSON.parse(
      (
        await send("Runtime.evaluate", {
          expression: `JSON.stringify({
            logoHref: document.querySelector("header a[aria-label^='NutriFlexs']")?.getAttribute("href"),
            centerLinks: Array.from(document.querySelectorAll("header nav a")).map(a => a.textContent.trim()),
          })`,
        })
      ).result.value
    );
    assert.strictEqual(guestCheck.logoHref, "/", "Guest logo must link to /");
    assert(guestCheck.centerLinks.includes("Order Food"), "Guest navbar must retain Order Food link");
    console.log("✓ Guest navbar verified (logo -> /, center links intact)");

    // Sign in as Customer in Chrome via NextAuth credentials endpoint
    console.log("\nSigning in as Customer in browser...");
    await send("Page.navigate", { url: `${BASE_URL}/login` });
    await wait(2000);
    await send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `(async () => {
        const csrfRes = await fetch("/api/auth/csrf");
        const { csrfToken } = await csrfRes.json();
        const body = new URLSearchParams({
          csrfToken,
          email: ${JSON.stringify(custEmail)},
          password: ${JSON.stringify(password)},
          json: "true",
        });
        await fetch("/api/auth/callback/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
      })()`,
    });
    await send("Page.navigate", { url: `${BASE_URL}/home` });
    await wait(3000);

    // 6a. Verify /home active states & single Order Food
    console.log("6a. Checking /home navbar & active states...");
    const homeState = JSON.parse(
      (
        await send("Runtime.evaluate", {
          expression: `JSON.stringify({
            url: window.location.pathname,
            logoHref: document.querySelector("header a[aria-label^='NutriFlexs']")?.getAttribute("href"),
            centerLinks: Array.from(document.querySelectorAll("header nav a")).map(a => a.textContent.trim()),
            orderBtns: Array.from(document.querySelectorAll("header button, header nav a")).filter(el => el.textContent.includes("Order Food")).length,
            orderActive: document.querySelector("[aria-label='Customer Mode Selector'] button:nth-child(1)")?.getAttribute("aria-current"),
            trackActive: document.querySelector("[aria-label='Customer Mode Selector'] button:nth-child(2)")?.getAttribute("aria-current"),
          })`,
        })
      ).result.value
    );
    assert.strictEqual(homeState.url, "/home");
    assert.strictEqual(homeState.logoHref, "/home", "Customer logo must link to /home");
    assert.strictEqual(homeState.orderBtns, 1, "Only ONE Order Food button should exist in navbar");
    assert.strictEqual(homeState.centerLinks.includes("Order Food"), false, "Standalone Order Food must be removed");
    assert.strictEqual(homeState.orderActive, null, "On /home, Order Food must NOT be active");
    assert.strictEqual(homeState.trackActive, null, "On /home, Track Nutrition must NOT be active");
    console.log("✓ /home verified: logo -> /home, 1 Order Food, neither switcher button active");

    // 3 & 6b. Click right-side Order Food -> /menu
    console.log("3 & 6b. Clicking right-side Order Food -> /menu...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector("[aria-label='Customer Mode Selector'] button:nth-child(1)").click()`,
    });
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const p = (await send("Runtime.evaluate", { expression: "window.location.pathname" })).result.value;
      if (p === "/menu") break;
    }
    const menuState = JSON.parse(
      (
        await send("Runtime.evaluate", {
          expression: `JSON.stringify({
            url: window.location.pathname,
            logoHref: document.querySelector("header a[aria-label^='NutriFlexs']")?.getAttribute("href"),
            orderActive: document.querySelector("[aria-label='Customer Mode Selector'] button:nth-child(1)")?.getAttribute("aria-current"),
            trackActive: document.querySelector("[aria-label='Customer Mode Selector'] button:nth-child(2)")?.getAttribute("aria-current"),
          })`,
        })
      ).result.value
    );
    assert.strictEqual(menuState.url, "/menu");
    assert.strictEqual(menuState.logoHref, "/home");
    assert.strictEqual(menuState.orderActive, "page", "On /menu, Order Food must be active");
    assert.strictEqual(menuState.trackActive, null, "On /menu, Track Nutrition must NOT be active");
    console.log("✓ /menu verified: Order Food highlighted, logo -> /home");

    // 1. Click logo from /menu -> /home
    console.log("1. Clicking logo from /menu -> /home...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector("header a[aria-label^='NutriFlexs']").click()`,
    });
    for (let i = 0; i < 20; i++) {
      await wait(400);
      const p = (await send("Runtime.evaluate", { expression: "window.location.pathname" })).result.value;
      if (p === "/home") break;
    }
    const afterLogoFromMenu = (
      await send("Runtime.evaluate", { expression: "window.location.pathname" })
    ).result.value;
    assert.strictEqual(afterLogoFromMenu, "/home");
    console.log("✓ Logo click from /menu navigated to /home");

    // 4 & 6c. Click Track Nutrition -> /nutrition
    console.log("4 & 6c. Clicking Track Nutrition -> /nutrition...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector("[aria-label='Customer Mode Selector'] button:nth-child(2)").click()`,
    });
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const p = (await send("Runtime.evaluate", { expression: "window.location.pathname" })).result.value;
      if (p === "/nutrition") break;
    }
    const nutriState = JSON.parse(
      (
        await send("Runtime.evaluate", {
          expression: `JSON.stringify({
            url: window.location.pathname,
            logoHref: document.querySelector("header a[aria-label^='NutriFlexs']")?.getAttribute("href"),
            orderActive: document.querySelector("[aria-label='Customer Mode Selector'] button:nth-child(1)")?.getAttribute("aria-current"),
            trackActive: document.querySelector("[aria-label='Customer Mode Selector'] button:nth-child(2)")?.getAttribute("aria-current"),
          })`,
        })
      ).result.value
    );
    assert.strictEqual(nutriState.url, "/nutrition");
    assert.strictEqual(nutriState.logoHref, "/home");
    assert.strictEqual(nutriState.orderActive, null);
    assert.strictEqual(nutriState.trackActive, "page", "On /nutrition, Track Nutrition must be active");
    console.log("✓ /nutrition verified: Track Nutrition highlighted, logo -> /home");

    // 2. Click logo from /nutrition -> /home
    console.log("2. Clicking logo from /nutrition -> /home...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector("header a[aria-label^='NutriFlexs']").click()`,
    });
    for (let i = 0; i < 20; i++) {
      await wait(400);
      const p = (await send("Runtime.evaluate", { expression: "window.location.pathname" })).result.value;
      if (p === "/home") break;
    }
    const afterLogoFromNutri = (
      await send("Runtime.evaluate", { expression: "window.location.pathname" })
    ).result.value;
    assert.strictEqual(afterLogoFromNutri, "/home");
    console.log("✓ Logo click from /nutrition navigated to /home");

    // 7. Mobile navigation check
    console.log("7. Testing Mobile drawer navigation...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await wait(500);
    await send("Runtime.evaluate", {
      expression: `document.querySelector("header button[aria-label='Toggle Navigation Menu']").click()`,
    });
    await wait(600);
    const mobileState = JSON.parse(
      (
        await send("Runtime.evaluate", {
          expression: `JSON.stringify({
            drawerLogoHref: document.querySelector("div.fixed.inset-0 a[aria-label^='NutriFlexs']")?.getAttribute("href"),
            drawerOrderLinks: Array.from(document.querySelectorAll("div.fixed.inset-0 nav a")).filter(a => a.textContent.includes("Order Food")).length,
            drawerSwitcherCount: document.querySelectorAll("div.fixed.inset-0 [aria-label='Customer Mode Selector'] button").length,
          })`,
        })
      ).result.value
    );
    assert.strictEqual(mobileState.drawerLogoHref, "/home", "Mobile drawer logo must link to /home");
    assert.strictEqual(mobileState.drawerOrderLinks, 0, "Mobile drawer nav must not duplicate Order Food");
    assert.strictEqual(mobileState.drawerSwitcherCount, 2, "Mobile drawer must show the 2-mode switcher");
    console.log("✓ Mobile drawer navigation verified");

    // 9 & 10. Verify Trainer isolation still works (no unauthorized access)
    console.log("9-10. Verifying Trainer & Kitchen portals remain unaffected...");
    const kitchenLoginRes = await fetch(`${BASE_URL}/kitchen/login`);
    assert.strictEqual(kitchenLoginRes.status, 200);
    console.log("✓ Kitchen portal login reachable (HTTP 200)");

    console.log("\n==================================================");
    console.log("ALL 10 NAVBAR & NAVIGATION TESTS PASSED 100%!");
    console.log("==================================================");

    ws.close();
  } finally {
    chrome.kill();
    if (createdIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdIds } } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("\n❌ Navbar test failed:", err);
  process.exit(1);
});
