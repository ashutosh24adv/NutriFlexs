const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";
const BASE_URL = "http://localhost:3000";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureAdmin() {
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
  const tokenMatch = sessionCookies.match(/next-auth\.session-token=([^;]+)/);

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9296",
    "--user-data-dir=/tmp/chrome-test-admin-diet-goals",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let cdpRes = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await wait(1000);
    try {
      cdpRes = await fetch("http://127.0.0.1:9296/json");
      if (cdpRes.ok) break;
    } catch (e) {}
  }
  if (!cdpRes || !cdpRes.ok) throw new Error("Could not connect to Chrome CDP");

  try {
    const tabs = await cdpRes.json();
    const pageTab = tabs.find((t) => t.type === "page");
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

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

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

    // Wait for the admin page to load and stats to arrive
    for (let i = 0; i < 20; i++) {
      const hasProdTab = await send("Runtime.evaluate", {
        expression: `Boolean(Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Product Catalog')))`,
        returnByValue: true,
      });
      if (hasProdTab?.result?.value) break;
      await wait(500);
    }

    await wait(1500);

    // Click Product Catalog button
    await send("Runtime.evaluate", {
      expression: `
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Product Catalog'));
        if (btn) btn.click();
      `,
    });

    // Wait until table rows exist
    for (let i = 0; i < 20; i++) {
      const rowCount = await send("Runtime.evaluate", {
        expression: `document.querySelectorAll('tbody tr').length`,
        returnByValue: true,
      });
      if (rowCount?.result?.value >= 10) break;
      await wait(500);
    }
    await wait(1000);

    const shot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, "admin_product_catalog_diet_goals.png"), Buffer.from(shot.data, "base64"));
    console.log("✓ Saved admin_product_catalog_diet_goals.png");

    ws.close();
  } finally {
    chrome.kill();
  }
}

captureAdmin().catch(console.error);
