const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log("=== NUTRIFLEXS LANDING PAGE & BRAND REPOSITIONING TEST ===");

  // 1. Check Homepage HTML
  console.log("\n[1] Verifying Homepage (/) Content...");
  const homeRes = await fetch("http://localhost:3000/");
  if (!homeRes.ok) {
    throw new Error(`Failed to fetch /: status ${homeRes.status}`);
  }
  const homeHtml = await homeRes.text();

  const assertions = [
    { label: 'New Tagline: "Eat Smart. Track Better."', test: homeHtml.includes("Eat Smart. Track Better.") },
    { label: 'Hero Headline: "Your Healthier Lifestyle, All in One Place."', test: homeHtml.includes("Your Healthier Lifestyle,") && homeHtml.includes("All in One Place.") },
    { label: 'Supporting Text: "Discover healthy food, track every meal"', test: homeHtml.includes("Discover healthy food, track every meal") },
    { label: 'Dual CTA 1: "Explore Food"', test: homeHtml.includes("Explore Food") && homeHtml.includes("/menu") },
    { label: 'Dual CTA 2: "Track Nutrition"', test: homeHtml.includes("Track Nutrition") && homeHtml.includes("/nutrition") },
    { label: 'Primary Experience Card 1: "Eat Better with NutriFlexs"', test: homeHtml.includes("Eat Better with NutriFlexs") },
    { label: 'Primary Experience Card 2: "Know What You Eat"', test: homeHtml.includes("Know What You Eat") },
    { label: 'Nav Link: "Home"', test: homeHtml.includes("Home") },
    { label: 'Nav Link: "Order Food"', test: homeHtml.includes("Order Food") },
    { label: 'Nav Link: "Track Nutrition"', test: homeHtml.includes("Track Nutrition") },
    { label: 'Nav Link: "NutriFlexs Pass"', test: homeHtml.includes("NutriFlexs Pass") },
    { label: 'Nav Link: "Nearby Gyms"', test: homeHtml.includes("Nearby Gyms") },
    { label: 'Nav Link: "Blog"', test: homeHtml.includes("Blog") },
    { label: 'Nav Link: "About Us"', test: homeHtml.includes("About Us") },
    { label: 'Nav Action: "Sign In"', test: homeHtml.includes("Sign In") },
    { label: 'Nav Action: "Get Started →"', test: homeHtml.includes("Get Started →") },
    { label: 'Indian Food Gravy Dilemma Section', test: homeHtml.includes("Solving the Gravy vs Main Dish Dilemma") || homeHtml.includes("Chole") },
    { label: 'AI Meal Scanner Section', test: homeHtml.includes("Snap, Recognize, Track in 2 Seconds") },
    { label: 'Trainer Partner Section', test: homeHtml.includes("Partner with NutriFlexs &amp; Fuel Your Clients") || homeHtml.includes("Trainer") },
    { label: 'NutriFlexs Journal / Blog Section', test: homeHtml.includes("NUTRIFLEXS JOURNAL") || homeHtml.includes("Science-Backed Nutrition") },
    { label: 'FAQ Section with Two-Mode Questions', test: homeHtml.includes("Can I order food and track my nutrition with the same account?") },
  ];

  let failedCount = 0;
  for (const a of assertions) {
    if (a.test) {
      console.log(`  ✓ ${a.label}`);
    } else {
      console.error(`  ✗ FAIL: ${a.label}`);
      failedCount++;
    }
  }

  // 2. Check Customer Login Messaging
  console.log("\n[2] Verifying Login Page (/login) Messaging...");
  const loginRes = await fetch("http://localhost:3000/login");
  const loginHtml = await loginRes.text();
  const loginTitleMatch = loginHtml.includes("Welcome to NutriFlexs");
  const loginSubtitleMatch = loginHtml.includes("Your food and nutrition journey starts here.");
  console.log(`  ${loginTitleMatch ? "✓" : "✗"} Login Heading: "Welcome to NutriFlexs"`);
  console.log(`  ${loginSubtitleMatch ? "✓" : "✗"} Login Subtitle: "Your food and nutrition journey starts here."`);
  if (!loginTitleMatch || !loginSubtitleMatch) failedCount++;

  // 3. Check Customer Signup Messaging
  console.log("\n[3] Verifying Signup Page (/signup) Messaging...");
  const signupRes = await fetch("http://localhost:3000/signup");
  const signupHtml = await signupRes.text();
  const signupTitleMatch = signupHtml.includes("Start Your Healthier Journey");
  const signupSubtitleMatch = signupHtml.includes("One account for healthy food ordering and smarter nutrition tracking.");
  console.log(`  ${signupTitleMatch ? "✓" : "✗"} Signup Heading: "Start Your Healthier Journey"`);
  console.log(`  ${signupSubtitleMatch ? "✓" : "✗"} Signup Subtitle: "One account for healthy food ordering and smarter nutrition tracking."`);
  if (!signupTitleMatch || !signupSubtitleMatch) failedCount++;

  // 4. Check Menu & Nutrition routes
  console.log("\n[4] Verifying Order Food (/menu) and Track Nutrition (/nutrition) routes...");
  const menuRes = await fetch("http://localhost:3000/menu");
  const nutritionRes = await fetch("http://localhost:3000/nutrition");
  console.log(`  ${menuRes.status === 200 ? "✓" : "✗"} /menu HTTP ${menuRes.status}`);
  console.log(`  ${nutritionRes.status === 200 ? "✓" : "✗"} /nutrition HTTP ${nutritionRes.status}`);
  if (menuRes.status !== 200 || nutritionRes.status !== 200) failedCount++;

  if (failedCount > 0) {
    throw new Error(`Verification failed with ${failedCount} errors.`);
  }
  console.log("\n🎉 ALL HTML & ROUTE ASSERTIONS PASSED!");

  // 5. Capture Screenshots via Chrome DevTools Protocol
  console.log("\n[5] Capturing Screenshots via Chrome CDP...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9266",
    "--user-data-dir=/tmp/chrome-test-cdp-profile",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  chrome.stdout.on("data", (d) => console.log("chrome stdout:", d.toString()));
  chrome.stderr.on("data", (d) => console.log("chrome stderr:", d.toString()));

  let res = null;
  for (let attempt = 1; attempt <= 10; attempt++) {
    await wait(1000);
    try {
      res = await fetch("http://127.0.0.1:9266/json");
      if (res.ok) {
        console.log(`Connected to Chrome CDP on attempt ${attempt}`);
        break;
      }
    } catch (e) {
      // retry
    }
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9266");

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
    await send("DOM.enable");

    // Capture Desktop Landing Page (1280x950)
    console.log("  📸 Capturing Desktop Landing Page (1280px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 950,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(3000);

    const desktopShot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const desktopPath = path.join(ARTIFACTS_DIR, "landing_page_repositioned_desktop.png");
    fs.writeFileSync(desktopPath, Buffer.from(desktopShot.data, "base64"));
    console.log(`  ✓ Saved: ${desktopPath}`);

    // Capture Mobile Landing Page (390x844 iPhone)
    console.log("  📸 Capturing Mobile Landing Page (390px)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(2500);

    const mobileShot = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    const mobilePath = path.join(ARTIFACTS_DIR, "landing_page_repositioned_mobile.png");
    fs.writeFileSync(mobilePath, Buffer.from(mobileShot.data, "base64"));
    console.log(`  ✓ Saved: ${mobilePath}`);

    ws.close();
  } finally {
    chrome.kill();
  }

  console.log("\n=== TEST & VERIFICATION COMPLETE: ALL SUCCESS! ===");
}

runVerification().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
