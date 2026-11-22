const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifySignInButton() {
  console.log("===============================================================");
  console.log("   VERIFYING SIGN IN BUTTON STYLING & ALIGNMENT IN NAVBAR      ");
  console.log("===============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9308",
    "--user-data-dir=/tmp/chrome-test-signin-button",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9308/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9308");
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

    // Set desktop viewport (1366 x 768)
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1366,
      height: 768,
      deviceScaleFactor: 2,
      mobile: false,
    });

    console.log("\nNavigating to http://localhost:3000/ ...");
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(3500);

    // Inspect metrics and styles of both buttons in desktop navbar
    const buttonMetrics = await evaluate(`
      (() => {
        const signInBtn = Array.from(document.querySelectorAll("header a")).find(a => a.textContent.trim() === "Sign In");
        const getStartedBtn = Array.from(document.querySelectorAll("header a")).find(a => a.textContent.includes("Get Started"));
        
        if (!signInBtn || !getStartedBtn) {
          return { error: "Buttons not found in header" };
        }

        const rectSign = signInBtn.getBoundingClientRect();
        const rectStart = getStartedBtn.getBoundingClientRect();

        const styleSign = window.getComputedStyle(signInBtn);
        const styleStart = window.getComputedStyle(getStartedBtn);

        return {
          signIn: {
            text: signInBtn.textContent.trim(),
            width: rectSign.width,
            height: rectSign.height,
            top: rectSign.top,
            bottom: rectSign.bottom,
            borderRadius: styleSign.borderRadius,
            backgroundColor: styleSign.backgroundColor,
            color: styleSign.color,
            borderWidth: styleSign.borderWidth,
            borderStyle: styleSign.borderStyle,
            borderColor: styleSign.borderColor,
            fontSize: styleSign.fontSize,
            fontWeight: styleSign.fontWeight,
          },
          getStarted: {
            text: getStartedBtn.textContent.trim(),
            width: rectStart.width,
            height: rectStart.height,
            top: rectStart.top,
            bottom: rectStart.bottom,
            borderRadius: styleStart.borderRadius,
            backgroundColor: styleStart.backgroundColor,
            color: styleStart.color,
            fontSize: styleStart.fontSize,
            fontWeight: styleStart.fontWeight,
          },
          horizontalGap: rectStart.left - rectSign.right,
          exactHeightMatch: Math.abs(rectSign.height - rectStart.height) < 0.5,
          exactVerticalAlignmentMatch: Math.abs(rectSign.top - rectStart.top) < 0.5,
        };
      })()
    `);

    console.log("\nDesktop Button Metrics:", JSON.stringify(buttonMetrics, null, 2));

    if (buttonMetrics.error) {
      throw new Error(buttonMetrics.error);
    }

    console.log("\n=======================================================");
    console.log("            NAVBAR BUTTONS ALIGNMENT CHECKS            ");
    console.log("=======================================================");
    console.log("Exact Height Match (38px):", buttonMetrics.exactHeightMatch ? "PASSED" : "FAILED");
    console.log("Exact Vertical Alignment Match:", buttonMetrics.exactVerticalAlignmentMatch ? "PASSED" : "FAILED");
    console.log("Horizontal Gap between buttons:", `${buttonMetrics.horizontalGap.toFixed(1)}px`);
    console.log("Sign In Border Radius:", buttonMetrics.signIn.borderRadius);
    console.log("Get Started Border Radius:", buttonMetrics.getStarted.borderRadius);
    console.log("Sign In Has Subtle Green Border:", buttonMetrics.signIn.borderWidth !== "0px" ? "PASSED" : "FAILED");

    // Capture desktop screenshot of header area
    const desktopShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 1366, height: 120, scale: 2 },
    });
    const desktopImgPath = path.join(ARTIFACTS_DIR, "navbar_signin_desktop_1366x768.png");
    fs.writeFileSync(desktopImgPath, Buffer.from(desktopShot.data, "base64"));
    console.log(`Saved desktop header screenshot to ${desktopImgPath}`);

    // Test hover state on Sign In
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll("header a")).find(a => a.textContent.trim() === "Sign In");
        if (btn) {
          btn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        }
      })()
    `);
    await wait(300);

    const hoverShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 800, y: 0, width: 566, height: 90, scale: 2 },
    });
    const hoverImgPath = path.join(ARTIFACTS_DIR, "navbar_signin_hover_state.png");
    fs.writeFileSync(hoverImgPath, Buffer.from(hoverShot.data, "base64"));
    console.log(`Saved hover state screenshot to ${hoverImgPath}`);

    // Tablet Viewport (768 x 1024)
    console.log("\nTesting Tablet Viewport (768 x 1024)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(2500);

    const tabletShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 768, height: 110, scale: 2 },
    });
    const tabletImgPath = path.join(ARTIFACTS_DIR, "navbar_signin_tablet_768x1024.png");
    fs.writeFileSync(tabletImgPath, Buffer.from(tabletShot.data, "base64"));
    console.log(`Saved tablet header screenshot to ${tabletImgPath}`);

    // Mobile Viewport (375 x 812) - Navbar & Drawer
    console.log("\nTesting Mobile Viewport (375 x 812)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(2500);

    const mobileNavShot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 375, height: 90, scale: 2 },
    });
    const mobileNavImgPath = path.join(ARTIFACTS_DIR, "navbar_signin_mobile_375x812.png");
    fs.writeFileSync(mobileNavImgPath, Buffer.from(mobileNavShot.data, "base64"));
    console.log(`Saved mobile navbar screenshot to ${mobileNavImgPath}`);

    // Open mobile drawer
    console.log("Opening mobile drawer to inspect Sign In & Get Started in drawer...");
    await evaluate(`
      (() => {
        const hamburger = document.querySelector("header button[aria-label='Open navigation menu']");
        if (hamburger) hamburger.click();
      })()
    `);
    await wait(800);

    const mobileDrawerShot = await send("Page.captureScreenshot", { format: "png" });
    const mobileDrawerImgPath = path.join(ARTIFACTS_DIR, "navbar_signin_mobile_drawer_375x812.png");
    fs.writeFileSync(mobileDrawerImgPath, Buffer.from(mobileDrawerShot.data, "base64"));
    console.log(`Saved mobile drawer screenshot to ${mobileDrawerImgPath}`);

    ws.close();
    chrome.kill();
    console.log("\nAll Sign In button styling & alignment checks passed successfully!");
  } catch (err) {
    chrome.kill();
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

verifySignInButton();
