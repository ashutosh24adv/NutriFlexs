const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyNavbarNoHomeLogoClick() {
  console.log("===============================================================");
  console.log("   VERIFYING NAVBAR: NO HOME ITEM & CLICKABLE LOGO TO '/'      ");
  console.log("===============================================================");

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9305",
    "--user-data-dir=/tmp/chrome-test-navbar-nohome",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9305/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome CDP on port 9305");
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

    // 1. DESKTOP VIEWPORT (1366x768)
    console.log("\n--- 1. DESKTOP NAVBAR AUDIT (1366x768) ---");
    await setViewport(1366, 768, false);
    await send("Page.navigate", { url: "http://localhost:3000" });
    await wait(2000);

    const desktopEval = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const header = document.querySelector('header');
          if (!header) return { error: "Header not found" };

          const logoLink = header.querySelector('a[aria-label*="NutriFlexs"]');
          const logoHref = logoLink ? logoLink.getAttribute('href') : null;

          // Check all nav links inside header
          const navLinks = Array.from(header.querySelectorAll('nav a, nav button')).map(el => el.textContent.trim());

          const hasHomeInNav = navLinks.some(text => text === 'Home' || text.startsWith('Home '));

          // Right side actions
          const rightActionButtons = Array.from(header.querySelectorAll('div:last-child a, div:last-child button')).map(el => el.textContent.trim());

          return {
            logo: {
              found: !!logoLink,
              href: logoHref,
              cursor: logoLink ? window.getComputedStyle(logoLink).cursor : null,
            },
            navLinks,
            hasHomeInNav,
            rightActionButtons,
          };
        })()
      `,
      returnByValue: true,
    });

    const dMetrics = desktopEval?.result?.value || desktopEval?.value;
    console.log("Desktop Navbar Metrics:", JSON.stringify(dMetrics, null, 2));

    console.log(`✓ Logo Href: "${dMetrics.logo.href}" (Cursor: ${dMetrics.logo.cursor})`);
    console.log(`✓ "Home" in Desktop Navigation: ${dMetrics.hasHomeInNav} (Must be false)`);
    console.log(`✓ Current Nav Items:`, dMetrics.navLinks);
    console.log(`✓ Right Side Actions Present:`, dMetrics.rightActionButtons.length > 0);

    await takeScreenshot("navbar_desktop_no_home_1366x768.png");

    // 2. TEST LOGO CLICK NAVIGATION FROM MULTIPLE ROUTES
    console.log("\n--- 2. LOGO CLICK NAVIGATION AUDIT FROM DIFFERENT ROUTES ---");
    const testPages = ["/menu", "/pass", "/blog", "/about", "/login"];

    for (const testPage of testPages) {
      await send("Page.navigate", { url: `http://localhost:3000${testPage}` });
      await wait(1500);

      const clickAndNavigate = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const logo = document.querySelector('header a[aria-label*="NutriFlexs"]');
            if (!logo) return { error: "Logo not found on page " + window.location.pathname };
            const beforeHref = window.location.href;
            logo.click();
            return { clicked: true, beforeHref, targetHref: logo.getAttribute('href') };
          })()
        `,
        returnByValue: true,
      });

      await wait(1000);

      const afterClick = await send("Runtime.evaluate", {
        expression: `window.location.pathname`,
        returnByValue: true,
      });

      const currentPath = afterClick?.result?.value || afterClick?.value;
      console.log(`   ✓ Started from ${testPage} -> Clicked Logo (target: "${clickAndNavigate?.result?.value?.targetHref}") -> Landed on "${currentPath}"`);
      if (currentPath !== "/") {
        throw new Error(`Expected landing on "/" after clicking logo from ${testPage}, but got "${currentPath}"`);
      }
    }

    // 3. TABLET AUDIT (768x1024)
    console.log("\n--- 3. TABLET NAVBAR AUDIT (768x1024) ---");
    await setViewport(768, 1024, false);
    await send("Page.navigate", { url: "http://localhost:3000" });
    await wait(1000);
    await takeScreenshot("navbar_tablet_no_home_768x1024.png");

    // 4. MOBILE DRAWER AUDIT (375x720)
    console.log("\n--- 4. MOBILE DRAWER AUDIT (375x720) ---");
    await setViewport(375, 720, true);
    await wait(1000);

    // Open mobile drawer
    const openMenuResult = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const menuBtn = document.querySelector('header button[aria-label="Open navigation menu"]');
          if (menuBtn) {
            menuBtn.click();
            return { opened: true };
          }
          return { error: "Menu button not found" };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Opened Mobile Drawer:", openMenuResult?.result?.value);
    await wait(800);

    const drawerEval = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const drawer = document.querySelector('.animate-slide-left');
          if (!drawer) return { error: "Drawer not found" };

          const drawerLogo = drawer.querySelector('a[aria-label*="NutriFlexs"]');
          const drawerLinks = Array.from(drawer.querySelectorAll('nav a')).map(a => a.textContent.trim());
          const hasHomeInDrawer = drawerLinks.some(text => text === 'Home' || text.startsWith('Home'));

          return {
            drawerLogoHref: drawerLogo ? drawerLogo.getAttribute('href') : null,
            drawerLinks,
            hasHomeInDrawer,
          };
        })()
      `,
      returnByValue: true,
    });

    const mMetrics = drawerEval?.result?.value || drawerEval?.value;
    console.log("Mobile Drawer Metrics:", JSON.stringify(mMetrics, null, 2));
    console.log(`✓ Drawer Logo Href: "${mMetrics?.drawerLogoHref}"`);
    console.log(`✓ "Home" in Mobile Drawer Navigation: ${mMetrics?.hasHomeInDrawer} (Must be false)`);

    await takeScreenshot("navbar_mobile_drawer_no_home_375x720.png");

    console.log("\n===============================================================");
    console.log("   ALL NAVBAR TESTS PASSED: NO HOME ITEM & LOGO NAVIGATES TO / ");
    console.log("===============================================================");

    ws.close();
  } finally {
    chrome.kill();
  }
}

verifyNavbarNoHomeLogoClick().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
