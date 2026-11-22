const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyPassFooter() {
  console.log("===============================================================");
  console.log("   VERIFYING NUTRIFLEXS PASSES FOOTER CONSISTENCY & ALIGNMENT   ");
  console.log("===============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9307",
    "--user-data-dir=/tmp/chrome-test-pass-footer",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9307/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9307");
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

    async function inspectFooter(url, label) {
      console.log(`\n--- Inspecting Footer on ${label} (${url}) ---`);
      await send("Page.navigate", { url });
      await wait(3500);

      const footerInfo = await evaluate(`
        (() => {
          const footer = document.querySelector("footer");
          if (!footer) return { exists: false };
          const rect = footer.getBoundingClientRect();
          const links = Array.from(footer.querySelectorAll("a")).map(a => ({
            text: a.innerText.trim(),
            href: a.getAttribute("href")
          }));
          const logo = footer.querySelector("img, svg");
          const brandText = footer.innerText;
          const style = window.getComputedStyle(footer);
          return {
            exists: true,
            hasLogo: !!logo,
            hasBrandDescription: brandText.includes("unified nutrition platform"),
            hasCopyright: brandText.includes("2026 NutriFlexs Inc. All rights reserved"),
            hasOrderFood: links.some(l => l.href === "/menu"),
            hasTrackNutrition: links.some(l => l.href === "/nutrition"),
            hasPasses: links.some(l => l.href === "/pass"),
            hasNearbyGyms: links.some(l => l.href === "/gyms"),
            hasAboutUs: links.some(l => l.href === "/about"),
            hasFAQ: links.some(l => l.href === "/faq"),
            hasContactUs: links.some(l => l.href === "/contact"),
            hasBlog: links.some(l => l.href === "/blog"),
            backgroundColor: style.backgroundColor,
            color: style.color,
            width: rect.width,
            height: rect.height,
            top: rect.top + window.scrollY,
            linksCount: links.length
          };
        })()
      `);

      console.log(`${label} Footer Details:`, JSON.stringify(footerInfo, null, 2));
      return footerInfo;
    }

    // Inspect Home, Menu, and Passes
    const homeFooter = await inspectFooter("http://localhost:3000/", "Home Page");
    const menuFooter = await inspectFooter("http://localhost:3000/menu", "Menu Page");
    const passFooter = await inspectFooter("http://localhost:3000/pass", "Passes Page");

    if (!passFooter.exists) {
      throw new Error("Footer does NOT exist on /pass!");
    }

    console.log("\n=======================================================");
    console.log("              FOOTER VERIFICATION CHECKS               ");
    console.log("=======================================================");
    console.log("Passes Footer Exists:", passFooter.exists ? "PASSED" : "FAILED");
    console.log("Passes Has NutriFlexs Logo:", passFooter.hasLogo ? "PASSED" : "FAILED");
    console.log("Passes Has Brand Description:", passFooter.hasBrandDescription ? "PASSED" : "FAILED");
    console.log("Passes Has Order Food Link:", passFooter.hasOrderFood ? "PASSED" : "FAILED");
    console.log("Passes Has Track Nutrition Link:", passFooter.hasTrackNutrition ? "PASSED" : "FAILED");
    console.log("Passes Has NutriFlexs Pass Link:", passFooter.hasPasses ? "PASSED" : "FAILED");
    console.log("Passes Has Nearby Gyms Link:", passFooter.hasNearbyGyms ? "PASSED" : "FAILED");
    console.log("Passes Has About Us Link:", passFooter.hasAboutUs ? "PASSED" : "FAILED");
    console.log("Passes Has FAQs Link:", passFooter.hasFAQ ? "PASSED" : "FAILED");
    console.log("Passes Has Contact Us Link:", passFooter.hasContactUs ? "PASSED" : "FAILED");
    console.log("Passes Has Copyright Line:", passFooter.hasCopyright ? "PASSED" : "FAILED");
    console.log("Consistent Background with Home:", passFooter.backgroundColor === homeFooter.backgroundColor ? "PASSED" : "FAILED");
    console.log("Consistent Link Count with Home:", passFooter.linksCount === homeFooter.linksCount ? "PASSED" : "FAILED");

    // Capture screenshots across viewports for Passes page and comparison
    const viewports = [
      { width: 1366, height: 900, name: "desktop" },
      { width: 768, height: 1024, name: "tablet" },
      { width: 375, height: 812, name: "mobile" },
    ];

    for (const vp of viewports) {
      console.log(`\nCapturing Passes page footer screenshot for ${vp.name} (${vp.width}x${vp.height})...`);
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.name === "mobile",
      });

      await send("Page.navigate", { url: "http://localhost:3000/pass" });
      await wait(3500);

      // Scroll to the bottom to view the passes cards ending and the footer starting
      await evaluate(`
        (() => {
          const footer = document.querySelector("footer");
          if (footer) {
            footer.scrollIntoView({ behavior: "instant", block: "end" });
          } else {
            window.scrollTo(0, document.body.scrollHeight);
          }
        })()
      `);
      await wait(1000);

      const shot = await send("Page.captureScreenshot", { format: "png" });
      const imgPath = path.join(ARTIFACTS_DIR, `pass_page_footer_${vp.name}.png`);
      fs.writeFileSync(imgPath, Buffer.from(shot.data, "base64"));
      console.log(`Saved screenshot to ${imgPath}`);
    }

    // Capture Home page footer for direct visual comparison
    console.log("\nCapturing Home page footer screenshot for comparison...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(3000);
    await evaluate(`
      (() => {
        const footer = document.querySelector("footer");
        if (footer) {
          footer.scrollIntoView({ behavior: "instant", block: "end" });
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      })()
    `);
    await wait(1000);
    const homeShot = await send("Page.captureScreenshot", { format: "png" });
    const homeImgPath = path.join(ARTIFACTS_DIR, "home_page_footer_comparison.png");
    fs.writeFileSync(homeImgPath, Buffer.from(homeShot.data, "base64"));
    console.log(`Saved screenshot to ${homeImgPath}`);

    // Capture Menu page footer for direct visual comparison
    console.log("\nCapturing Menu page footer screenshot for comparison...");
    await send("Page.navigate", { url: "http://localhost:3000/menu" });
    await wait(3000);
    await evaluate(`
      (() => {
        const footer = document.querySelector("footer");
        if (footer) {
          footer.scrollIntoView({ behavior: "instant", block: "end" });
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      })()
    `);
    await wait(1000);
    const menuShot = await send("Page.captureScreenshot", { format: "png" });
    const menuImgPath = path.join(ARTIFACTS_DIR, "menu_page_footer_comparison.png");
    fs.writeFileSync(menuImgPath, Buffer.from(menuShot.data, "base64"));
    console.log(`Saved screenshot to ${menuImgPath}`);

    ws.close();
    chrome.kill();
    console.log("\nAll footer verification checks completed successfully!");
  } catch (err) {
    chrome.kill();
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

verifyPassFooter();
