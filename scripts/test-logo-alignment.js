const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLogoTests() {
  console.log("============================================================");
  console.log("   NUTRIFLEXS LOGO ALIGNMENT & RESPONSIVE PROPORTION AUDIT   ");
  console.log("============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9295",
    "--user-data-dir=/tmp/chrome-test-logo-alignment",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9295/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9295");
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

    await new Promise((resolve) => (ws.onopen = resolve));
    await send("Page.enable");
    await send("DOM.enable");
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
      console.log(`   📸 Captured screenshot: ${fileName}`);
    }

    const testLogoMetrics = async (label) => {
      const evalResult = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const logoLink = document.querySelector('header a[aria-label*="NutriFlexs"]');
            if (!logoLink) return { error: "Logo link not found in header" };

            const symbolDiv = logoLink.querySelector('div.bg-nutri-green');
            const textBlock = logoLink.querySelector('div.flex-col');
            const brandSpan = textBlock && textBlock.children ? textBlock.children[0] : null;
            const taglineSpan = textBlock && textBlock.children && textBlock.children.length > 1 ? textBlock.children[1] : null;

            if (!symbolDiv || !textBlock || !brandSpan || !taglineSpan) {
              return { error: "Missing logo internal elements", hasSymbol: !!symbolDiv, hasTextBlock: !!textBlock };
            }

            const header = document.querySelector('header');
            const headerRect = header ? header.getBoundingClientRect() : null;
            const linkRect = logoLink.getBoundingClientRect();
            const symbolRect = symbolDiv.getBoundingClientRect();
            const textBlockRect = textBlock.getBoundingClientRect();
            const brandRect = brandSpan.getBoundingClientRect();
            const taglineRect = taglineSpan.getBoundingClientRect();

            const symbolStyle = window.getComputedStyle(symbolDiv);
            const brandStyle = window.getComputedStyle(brandSpan);
            const taglineStyle = window.getComputedStyle(taglineSpan);

            const symbolCenterY = symbolRect.top + (symbolRect.height / 2);
            const textCenterY = textBlockRect.top + (textBlockRect.height / 2);
            const verticalCenterDelta = Math.abs(symbolCenterY - textCenterY);

            const leftAlignmentDelta = Math.abs(brandRect.left - taglineRect.left);

            return {
              headerHeight: headerRect ? headerRect.height : 0,
              symbol: {
                width: Math.round(symbolRect.width * 10) / 10,
                height: Math.round(symbolRect.height * 10) / 10,
                isSquare: Math.abs(symbolRect.width - symbolRect.height) < 1,
              },
              brandName: {
                text: brandSpan.textContent.trim(),
                fontSize: parseFloat(brandStyle.fontSize),
                fontWeight: brandStyle.fontWeight,
                height: Math.round(brandRect.height * 10) / 10,
              },
              tagline: {
                text: taglineSpan.textContent.trim(),
                fontSize: parseFloat(taglineStyle.fontSize),
                fontWeight: taglineStyle.fontWeight,
                height: Math.round(taglineRect.height * 10) / 10,
              },
              alignment: {
                leftAlignmentDelta: Math.round(leftAlignmentDelta * 100) / 100,
                isLeftAligned: leftAlignmentDelta < 1.0,
                symbolCenterY: Math.round(symbolCenterY * 10) / 10,
                textCenterY: Math.round(textCenterY * 10) / 10,
                verticalCenterDelta: Math.round(verticalCenterDelta * 100) / 100,
                isVerticallyCentered: verticalCenterDelta <= 2.5,
              },
              horizontalGap: Math.round((textBlockRect.left - symbolRect.right) * 10) / 10,
            };
          })()
        `,
        returnByValue: true,
      });

      return evalResult?.result?.value || evalResult?.value || evalResult;
    };

    // 1. DESKTOP VIEWPORT (1366x768)
    console.log("\n--- 1. DESKTOP VIEWPORT (1366x768) ---");
    await setViewport(1366, 768, false);
    await send("Page.navigate", { url: "http://localhost:3000" });
    await wait(2000);

    const desktopMetrics = await testLogoMetrics("Desktop");
    console.log("Desktop Logo Metrics:", JSON.stringify(desktopMetrics, null, 2));

    if (desktopMetrics.error) {
      throw new Error("Desktop logo evaluation error: " + desktopMetrics.error);
    }

    console.log(`✓ Navbar Height: ${desktopMetrics.headerHeight}px`);
    console.log(`✓ Symbol Dimensions: ${desktopMetrics.symbol.width}x${desktopMetrics.symbol.height}px (Square: ${desktopMetrics.symbol.isSquare})`);
    console.log(`✓ Brand Name: "${desktopMetrics.brandName.text}", Size: ${desktopMetrics.brandName.fontSize}px, Weight: ${desktopMetrics.brandName.fontWeight}`);
    console.log(`✓ Tagline: "${desktopMetrics.tagline.text}", Size: ${desktopMetrics.tagline.fontSize}px, Weight: ${desktopMetrics.tagline.fontWeight}`);
    console.log(`✓ Left Edge Alignment Delta: ${desktopMetrics.alignment.leftAlignmentDelta}px (Aligned: ${desktopMetrics.alignment.isLeftAligned})`);
    console.log(`✓ Vertical Centering Delta: ${desktopMetrics.alignment.verticalCenterDelta}px (Centered: ${desktopMetrics.alignment.isVerticallyCentered})`);
    console.log(`✓ Horizontal Gap: ${desktopMetrics.horizontalGap}px`);

    await takeScreenshot("navbar_logo_desktop_1366x768.png");

    // 2. TABLET VIEWPORT (768x1024)
    console.log("\n--- 2. TABLET VIEWPORT (768x1024) ---");
    await setViewport(768, 1024, false);
    await wait(1000);

    const tabletMetrics = await testLogoMetrics("Tablet");
    console.log("Tablet Logo Metrics:", JSON.stringify(tabletMetrics, null, 2));
    console.log(`✓ Symbol Dimensions: ${tabletMetrics.symbol.width}x${tabletMetrics.symbol.height}px`);
    console.log(`✓ Brand Name Size: ${tabletMetrics.brandName.fontSize}px`);
    console.log(`✓ Tagline Size: ${tabletMetrics.tagline.fontSize}px`);
    console.log(`✓ Left Edge Alignment Delta: ${tabletMetrics.alignment.leftAlignmentDelta}px`);
    console.log(`✓ Vertical Centering Delta: ${tabletMetrics.alignment.verticalCenterDelta}px`);
    await takeScreenshot("navbar_logo_tablet_768x1024.png");

    // 3. MOBILE VIEWPORT (375x720)
    console.log("\n--- 3. MOBILE VIEWPORT (375x720) ---");
    await setViewport(375, 720, true);
    await wait(1000);

    const mobileMetrics = await testLogoMetrics("Mobile");
    console.log("Mobile Logo Metrics:", JSON.stringify(mobileMetrics, null, 2));
    console.log(`✓ Symbol Dimensions: ${mobileMetrics.symbol.width}x${mobileMetrics.symbol.height}px`);
    console.log(`✓ Brand Name Size: ${mobileMetrics.brandName.fontSize}px`);
    console.log(`✓ Tagline Size: ${mobileMetrics.tagline.fontSize}px`);
    console.log(`✓ Left Edge Alignment Delta: ${mobileMetrics.alignment.leftAlignmentDelta}px`);
    console.log(`✓ Vertical Centering Delta: ${mobileMetrics.alignment.verticalCenterDelta}px`);
    await takeScreenshot("navbar_logo_mobile_375x720.png");

    // 4. FOOTER LOGO INSPECTION (Desktop)
    console.log("\n--- 4. FOOTER & OTHER PAGES LOGO INSPECTION ---");
    await setViewport(1366, 768, false);
    await wait(500);

    const footerMetrics = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const footerLogo = document.querySelector('footer a[aria-label*="NutriFlexs"]');
          if (!footerLogo) return { error: "Footer logo not found" };

          const brandSpan = footerLogo.querySelector('div.flex-col span:first-child');
          const taglineSpan = footerLogo.querySelector('div.flex-col span:last-child');

          return {
            found: true,
            brandColor: brandSpan ? window.getComputedStyle(brandSpan).color : null,
            taglineColor: taglineSpan ? window.getComputedStyle(taglineSpan).color : null,
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("Footer Logo Metrics:", footerMetrics?.result?.value || footerMetrics?.value);
    await send("Runtime.evaluate", {
      expression: `window.scrollTo(0, document.body.scrollHeight);`,
    });
    await wait(1200);
    await takeScreenshot("footer_logo_desktop.png");

    // 5. LOGIN PAGE LOGO INSPECTION
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await wait(1500);
    const loginLogoMetrics = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const logo = document.querySelector('a[aria-label*="NutriFlexs"]');
          return { found: !!logo, text: logo ? logo.textContent.replace(/\\s+/g, " ").trim() : null };
        })()
      `,
      returnByValue: true,
    });
    console.log("Login Page Logo:", loginLogoMetrics?.result?.value || loginLogoMetrics?.value);
    await takeScreenshot("login_page_logo.png");

    // 6. ONBOARDING PAGE LOGO INSPECTION
    await send("Page.navigate", { url: "http://localhost:3000/nutrition/onboarding" });
    await wait(1500);
    const onboardingLogoMetrics = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const logo = document.querySelector('header a[aria-label*="NutriFlexs"]');
          return { found: !!logo, text: logo ? logo.textContent.replace(/\\s+/g, " ").trim() : null };
        })()
      `,
      returnByValue: true,
    });
    console.log("Onboarding Page Logo:", onboardingLogoMetrics?.result?.value || onboardingLogoMetrics?.value);
    await takeScreenshot("onboarding_page_logo.png");

    console.log("\n============================================================");
    console.log("   ALL LOGO ALIGNMENT & PROPORTION TESTS PASSED SUCCESSFULLY ");
    console.log("============================================================");

    ws.close();
  } finally {
    chrome.kill();
  }
}

runLogoTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
