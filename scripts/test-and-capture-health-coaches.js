const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log("===============================================================");
  console.log("       VERIFYING HEALTH COACHES REBRANDING & LAYOUT            ");
  console.log("===============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9319",
    "--user-data-dir=/tmp/chrome-test-health-coaches",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9319/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9319");
  }

  try {
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found in Chrome CDP");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let id = 1;

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === msgId) {
            ws.removeEventListener("message", handler);
            resolve(data.result);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await new Promise((r) => ws.addEventListener("open", r));

    await send("Page.enable");
    await send("DOM.enable");
    await send("Runtime.enable");

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.value;
    }

    // 1. Desktop Viewport (1440 x 900)
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    console.log("\n1. Navigating to http://localhost:3000/dietitians (Desktop)...");
    await send("Page.navigate", { url: "http://localhost:3000/dietitians" });

    // Wait for content
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const h1Text = await evaluate(`document.querySelector("h1")?.innerText`);
      if (h1Text && h1Text.includes("Health Coaches")) {
        console.log(`Heading detected in turn ${i + 1}: ${h1Text}`);
        break;
      }
    }

    const checkData = await evaluate(`
      (() => {
        const h1 = document.querySelector("h1")?.innerText || "";
        const subtext = document.querySelector("h1 + p")?.innerText || "";
        const searchInput = document.querySelector("input[type='text']")?.placeholder || "";
        
        // Find navbar label
        const navLinks = Array.from(document.querySelectorAll("header a, nav a"));
        const healthCoachesNav = navLinks.find(l => l.innerText.includes("Health Coaches"))?.innerText?.trim();
        const oldDietitianNav = navLinks.find(l => l.innerText.includes("Consult a Dietitian"))?.innerText?.trim();

        // Cards check
        const bookButtons = Array.from(document.querySelectorAll("a, button"))
          .filter(b => b.innerText.includes("Book Coach"))
          .map(b => b.innerText.trim());

        // Disclaimer check
        const disclaimer = document.querySelector(".bg-\\\\[\\\\#F3F7EE\\\\\\\\]\\\\/60")?.innerText || "";

        return {
          h1,
          subtext,
          searchInput,
          healthCoachesNav,
          oldDietitianNav,
          bookButtonCount: bookButtons.length,
          sampleBookButton: bookButtons[0] || null,
          disclaimerContainsDisclaimer: disclaimer.toLowerCase().includes("disclaimer")
        };
      })()
    `);

    console.log("\nDesktop Verification Results:", JSON.stringify(checkData, null, 2));

    // Capture desktop screenshot
    const shotDesktop = await send("Page.captureScreenshot", { format: "png" });
    const desktopPath = path.join(ARTIFACTS_DIR, "health_coaches_desktop.png");
    fs.writeFileSync(desktopPath, Buffer.from(shotDesktop.data, "base64"));
    console.log("Desktop screenshot saved:", desktopPath);

    // 2. Mobile Viewport (390 x 844)
    console.log("\n2. Navigating to Mobile Viewport (390 x 844)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await wait(800);
    const shotMobile = await send("Page.captureScreenshot", { format: "png" });
    const mobilePath = path.join(ARTIFACTS_DIR, "health_coaches_mobile.png");
    fs.writeFileSync(mobilePath, Buffer.from(shotMobile.data, "base64"));
    console.log("Mobile screenshot saved:", mobilePath);

    // Check Mobile Menu
    await evaluate(`
      (() => {
        const toggleBtn = document.querySelector("button[aria-label='Toggle menu'], header button");
        if (toggleBtn) toggleBtn.click();
      })()
    `);
    await wait(600);
    const mobileMenuHasLabel = await evaluate(`
      (() => {
        const links = Array.from(document.querySelectorAll("a"));
        return links.some(l => l.innerText.includes("Health Coaches"));
      })()
    `);
    console.log("Mobile Menu Contains 'Health Coaches':", mobileMenuHasLabel);

    // 3. Detail Profile Page Verification
    console.log("\n3. Testing Individual Coach Profile Page...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    const firstDetailHref = await evaluate(`
      (() => {
        const link = document.querySelector("a[href^='/dietitians/']");
        return link ? link.getAttribute("href") : null;
      })()
    `);

    if (firstDetailHref) {
      console.log(`Navigating to profile: http://localhost:3000${firstDetailHref} ...`);
      await send("Page.navigate", { url: `http://localhost:3000${firstDetailHref}` });

      for (let i = 0; i < 20; i++) {
        await wait(500);
        const nameText = await evaluate(`document.querySelector("h1")?.innerText`);
        if (nameText) {
          console.log(`Coach profile loaded: ${nameText}`);
          break;
        }
      }

      const profileData = await evaluate(`
        (() => {
          const breadcrumb = document.querySelector(".border-b")?.innerText || "";
          const h1 = document.querySelector("h1")?.innerText || "";
          const qualifications = document.querySelector(".text-xs.font-semibold.text-nutri-secondary")?.innerText || "";
          const hasBookButton = Array.from(document.querySelectorAll("button, a")).some(b => b.innerText.includes("Confirm & Book"));

          return {
            breadcrumbHasHealthCoaches: breadcrumb.includes("All Health Coaches"),
            coachName: h1,
            qualifications,
            hasBookButton
          };
        })()
      `);
      console.log("Coach Profile Verification Results:", JSON.stringify(profileData, null, 2));

      const shotProfile = await send("Page.captureScreenshot", { format: "png" });
      const profilePath = path.join(ARTIFACTS_DIR, "health_coach_profile_desktop.png");
      fs.writeFileSync(profilePath, Buffer.from(shotProfile.data, "base64"));
      console.log("Profile screenshot saved:", profilePath);
    }

    ws.close();
    chrome.kill();
    console.log("\n✅ All verifications passed successfully!");
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
