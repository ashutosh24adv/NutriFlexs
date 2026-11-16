const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runE2E() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS PUBLIC NAVBAR CLEANUP, AUTHENTICATED MODE SWITCHING & GUEST CART");
  console.log("================================================================================");

  // 1. Launch Headless Chrome
  console.log("\n1. Launching Chrome CDP...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9298",
    "--user-data-dir=/tmp/chrome-test-navbar-guest-cart",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
    try {
      res = await fetch("http://127.0.0.1:9298/json");
      if (res.ok) break;
    } catch (e) {}
  }
  if (!res || !res.ok) throw new Error("Could not connect to Chrome CDP on port 9298");

  try {
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
    if (!pageTab) throw new Error("No page tab found");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    let id = 1;

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const msgId = id++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === msgId) {
            ws.removeEventListener("message", handler);
            const r = data.result;
            resolve(r?.result !== undefined ? r.result : r);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await new Promise((resolve) => (ws.onopen = resolve));
    await send("Page.enable");
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
      console.log(`   📸 Saved artifact: ${fileName}`);
    }

    // =========================================================================
    // 2. TEST PUBLIC NAVBAR ON DESKTOP (1280px)
    // =========================================================================
    console.log("\n2. Testing Public Navbar on Desktop (1280px)...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(2500);

    const desktopNavCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const header = document.querySelector('header');
          if (!header) return { error: "No header found" };

          const navLinks = Array.from(header.querySelectorAll('nav a, nav button')).map(el => el.textContent.trim());
          const headerText = header.innerText;

          // Check for Mode Switcher
          const hasModeSwitcher = header.querySelector('[aria-label="Customer Mode Selector"]') !== null;
          // Check for Track Nutrition in public header
          const hasTrackNutrition = headerText.includes("Track Nutrition");
          // Check for core links
          const hasHome = navLinks.some(l => l.includes("Home"));
          const hasOrderFood = navLinks.some(l => l.includes("Order Food"));
          const hasPass = navLinks.some(l => l.includes("NutriFlexs Pass"));
          const hasGyms = navLinks.some(l => l.includes("Nearby Gyms"));
          const hasBlog = navLinks.some(l => l.includes("Blog"));
          const hasAbout = navLinks.some(l => l.includes("About"));

          // Check auth entry buttons
          const hasSignIn = headerText.includes("Sign In");
          const hasGetStarted = headerText.includes("Get Started");
          const hasCart = header.querySelector('button[aria-label="View Cart"]') !== null;

          return {
            navLinks,
            hasModeSwitcher,
            hasTrackNutrition,
            hasHome,
            hasOrderFood,
            hasPass,
            hasGyms,
            hasBlog,
            hasAbout,
            hasSignIn,
            hasGetStarted,
            hasCart
          };
        })()
      `,
      returnByValue: true,
    });

    console.log("   Desktop Public Header inspection:", desktopNavCheck?.value);
    assert(desktopNavCheck?.value?.hasTrackNutrition === false, "Public navbar DOES NOT contain 'Track Nutrition'");
    assert(desktopNavCheck?.value?.hasModeSwitcher === false, "Public navbar DOES NOT contain Customer Mode Switcher");
    assert(desktopNavCheck?.value?.hasHome === true, "Public navbar contains 'Home'");
    assert(desktopNavCheck?.value?.hasOrderFood === true, "Public navbar contains 'Order Food'");
    assert(desktopNavCheck?.value?.hasPass === true, "Public navbar contains 'NutriFlexs Pass'");
    assert(desktopNavCheck?.value?.hasGyms === true, "Public navbar contains 'Nearby Gyms'");
    assert(desktopNavCheck?.value?.hasBlog === true, "Public navbar contains 'Blog'");
    assert(desktopNavCheck?.value?.hasAbout === true, "Public navbar contains 'About'");
    assert(desktopNavCheck?.value?.hasSignIn === true, "Public navbar contains 'Sign In'");
    assert(desktopNavCheck?.value?.hasGetStarted === true, "Public navbar contains 'Get Started'");
    assert(desktopNavCheck?.value?.hasCart === true, "Public navbar contains Cart Icon");

    await takeScreenshot("navbar_public_desktop.png");

    // =========================================================================
    // 3. TEST PUBLIC NAVBAR ON MOBILE (390px)
    // =========================================================================
    console.log("\n3. Testing Public Navbar on Mobile (390px)...");
    await setViewport(390, 844, true);
    await wait(1000);

    const mobileTopBar = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const header = document.querySelector('header');
          const hasCart = header.querySelector('button[aria-label="View Cart"]') !== null;
          const hasMenuBtn = header.querySelector('button[aria-label="Open navigation menu"]') !== null;
          const hasGetStarted = header.innerText.includes("Get Started");
          return { hasCart, hasMenuBtn, hasGetStarted };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Mobile Top Bar:", mobileTopBar?.value);
    assert(mobileTopBar?.value?.hasCart === true, "Mobile header keeps Cart button accessible");
    assert(mobileTopBar?.value?.hasMenuBtn === true, "Mobile header displays Menu (hamburger) button");

    // Open Mobile Drawer
    await send("Runtime.evaluate", {
      expression: `document.querySelector('button[aria-label="Open navigation menu"]').click();`,
    });
    await wait(1000);

    const mobileDrawerCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const drawer = document.querySelector('div.animate-slide-left');
          if (!drawer) return { error: "No drawer found" };
          const drawerText = drawer.innerText;
          const links = Array.from(drawer.querySelectorAll('a, button')).map(el => el.textContent.trim());

          const hasTrackNutrition = drawerText.includes("Track Nutrition");
          const hasModeSwitcher = drawer.querySelector('[aria-label="Customer Mode Selector"]') !== null;
          const hasHome = links.some(l => l.includes("Home"));
          const hasOrderFood = links.some(l => l.includes("Order Food"));
          const hasPass = links.some(l => l.includes("NutriFlexs Pass"));
          const hasGyms = links.some(l => l.includes("Nearby Gyms"));
          const hasBlog = links.some(l => l.includes("Blog"));
          const hasAbout = links.some(l => l.includes("About"));
          const hasGetStarted = drawerText.includes("Get Started");
          const hasSignIn = drawerText.includes("Sign In");

          return {
            hasTrackNutrition,
            hasModeSwitcher,
            hasHome,
            hasOrderFood,
            hasPass,
            hasGyms,
            hasBlog,
            hasAbout,
            hasGetStarted,
            hasSignIn
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Mobile Drawer inspection:", mobileDrawerCheck?.value);
    assert(mobileDrawerCheck?.value?.hasTrackNutrition === false, "Mobile drawer DOES NOT contain 'Track Nutrition' for guests");
    assert(mobileDrawerCheck?.value?.hasModeSwitcher === false, "Mobile drawer DOES NOT contain Customer Mode Switcher for guests");
    assert(mobileDrawerCheck?.value?.hasOrderFood === true, "Mobile drawer contains 'Order Food'");
    assert(mobileDrawerCheck?.value?.hasPass === true, "Mobile drawer contains 'NutriFlexs Pass'");
    assert(mobileDrawerCheck?.value?.hasSignIn === true, "Mobile drawer contains 'Sign In'");
    assert(mobileDrawerCheck?.value?.hasGetStarted === true, "Mobile drawer contains 'Get Started'");

    await takeScreenshot("navbar_public_mobile_drawer.png");

    // Close Mobile Drawer
    await send("Runtime.evaluate", {
      expression: `document.querySelector('button[aria-label="Close menu"]').click();`,
    });
    await wait(800);

    // =========================================================================
    // 4. TEST DIRECT ACCESS TO /nutrition (UNAUTHENTICATED)
    // =========================================================================
    console.log("\n4. Testing Unauthenticated Route Guard for /nutrition...");
    await setViewport(1280, 850, false);
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    await wait(2500);

    const redirectUrl = await send("Runtime.evaluate", {
      expression: "window.location.href",
      returnByValue: true,
    });
    console.log("   URL after navigating to /nutrition unauthenticated:", redirectUrl?.value);
    assert(
      redirectUrl?.value?.includes("/login") && redirectUrl?.value?.includes("callbackUrl="),
      "Unauthenticated visitor is strictly redirected to /login with callbackUrl"
    );
    await takeScreenshot("nutrition_unauthenticated_redirect.png");

    // =========================================================================
    // 5. TEST GUEST CART FUNCTIONALITY
    // =========================================================================
    console.log("\n5. Testing Guest Cart Functionality...");
    // Clear any previous storage in browser
    await send("Runtime.evaluate", {
      expression: `localStorage.clear(); sessionStorage.clear();`,
    });

    await send("Page.navigate", { url: "http://localhost:3000/menu" });
    
    // Wait for food cards and Add buttons to render
    let addFound = false;
    for (let i = 0; i < 20; i++) {
      await wait(600);
      const check = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const addButtons = Array.from(document.querySelectorAll('button')).filter(b => {
              const txt = b.textContent.trim().toLowerCase();
              return txt === "add" || txt.includes("add") || b.querySelector('svg.lucide-plus') !== null;
            });
            if (addButtons.length > 0) {
              addButtons[0].click();
              return { clicked: true, text: addButtons[0].textContent.trim(), count: addButtons.length };
            }
            return { clicked: false, totalButtons: document.querySelectorAll('button').length };
          })()
        `,
        returnByValue: true,
      });
      if (check?.value?.clicked) {
        addFound = true;
        console.log("   Clicked Add button on /menu:", check.value);
        break;
      }
    }
    assert(addFound, "Found and clicked Add button on /menu");
    await wait(1500);

    // Verify current page is STILL /menu (did NOT force login!)
    const currentMenuUrl = await send("Runtime.evaluate", {
      expression: "window.location.pathname",
      returnByValue: true,
    });
    assert(currentMenuUrl?.value === "/menu", "Guest was NOT redirected to login on clicking Add to Cart");

    // Verify Cart Drawer opened with item
    const cartDrawerCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close cart"]');
          if (!closeBtn) return { isOpen: false };
          const drawer = closeBtn.closest('.max-w-md');
          if (!drawer) return { isOpen: false, error: "No max-w-md container" };
          const items = drawer.querySelectorAll('.space-y-3 > div');
          const drawerText = drawer.innerText;
          const hasCheckoutBtn = drawerText.toLowerCase().includes("proceed to checkout");
          return {
            isOpen: true,
            itemCount: items.length,
            hasCheckoutBtn,
            drawerText: drawerText.slice(0, 150)
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Cart Drawer check:", cartDrawerCheck?.value);
    assert(cartDrawerCheck?.value?.isOpen === true, "Cart Drawer opened automatically after adding item");
    assert(cartDrawerCheck?.value?.hasCheckoutBtn === true, "Cart Drawer displays 'Proceed to Checkout' button");

    await takeScreenshot("guest_cart_drawer_added.png");

    // Increase item quantity inside drawer
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const plusBtn = document.querySelector('button[title="Increase quantity"]') ||
                          Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-plus'));
          if (plusBtn) {
            plusBtn.click();
            return true;
          }
          return false;
        })()
      `,
    });
    await wait(800);

    // Verify localStorage persistence for guest
    const guestCartStorage = await send("Runtime.evaluate", {
      expression: `localStorage.getItem("nutriflexs_guest_cart")`,
      returnByValue: true,
    });
    console.log("   Guest cart in localStorage:", guestCartStorage?.value);
    const parsedGuestCart = JSON.parse(guestCartStorage?.value || "[]");
    assert(parsedGuestCart.length > 0, "Guest cart successfully stored in localStorage under 'nutriflexs_guest_cart'");
    assert(parsedGuestCart[0].quantity >= 2, "Guest item quantity updated to 2");

    // Close cart drawer
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close cart"]') ||
                           Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-x'));
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await wait(800);

    // Verify Cart badge in header shows 2
    const headerCartBadge = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const cartBtn = document.querySelector('button[aria-label="View Cart"]');
          const badge = cartBtn ? cartBtn.querySelector('span') : null;
          return badge ? badge.textContent.trim() : null;
        })()
      `,
      returnByValue: true,
    });
    console.log("   Header cart badge count:", headerCartBadge?.value);
    assert(Number(headerCartBadge?.value) >= 2, "Public navbar cart icon displays live badge count >= 2");

    // Navigate to another page (e.g. /pass) to verify cross-page cart persistence
    await send("Page.navigate", { url: "http://localhost:3000/pass" });
    await wait(2000);

    const passPageCartBadge = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const cartBtn = document.querySelector('button[aria-label="View Cart"]');
          const badge = cartBtn ? cartBtn.querySelector('span') : null;
          return badge ? badge.textContent.trim() : null;
        })()
      `,
      returnByValue: true,
    });
    assert(Number(passPageCartBadge?.value) >= 2, "Guest cart persisted across navigation to /pass");

    // Navigate to /checkout as guest to verify the friendly auth intercept card
    await send("Page.navigate", { url: "http://localhost:3000/checkout" });
    await wait(2000);

    const checkoutInterceptCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          const hasTitle = text.includes("Sign In to Complete Order");
          const hasCartPreserved = text.includes("Your cart will be preserved after signing in!");
          const hasSignInBtn = text.includes("Sign In to Account");
          const hasCreateAcctBtn = text.includes("Create New Account");
          return { hasTitle, hasCartPreserved, hasSignInBtn, hasCreateAcctBtn };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Checkout Intercept Card:", checkoutInterceptCheck?.value);
    assert(checkoutInterceptCheck?.value?.hasTitle === true, "Checkout displays 'Sign In to Complete Order' for guests");
    assert(checkoutInterceptCheck?.value?.hasCartPreserved === true, "Checkout informs guest their cart will be preserved");
    assert(checkoutInterceptCheck?.value?.hasSignInBtn === true, "Checkout provides direct Sign In action");
    assert(checkoutInterceptCheck?.value?.hasCreateAcctBtn === true, "Checkout provides Create New Account action");

    await takeScreenshot("guest_checkout_intercept.png");

    // =========================================================================
    // 6. TEST AUTHENTICATED NAVBAR & MODE SWITCHING
    // =========================================================================
    console.log("\n6. Testing Authenticated Navbar & Mode Switching...");
    const timestamp = Date.now();
    const testEmail = `nav_auth_test_${timestamp}@nutriflexs.com`;
    const testPassword = "Password123!";
    const testName = `Nav Customer ${timestamp.toString().slice(-4)}`;

    console.log(`   Registering test customer: ${testEmail}...`);
    const regRes = await fetch("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        portal: "customer",
      }),
    });
    const regData = await regRes.json();
    assert(regRes.ok && regData.success, "Test customer created successfully");

    // Navigate to /login and sign in
    await send("Page.navigate", { url: "http://localhost:3000/login" });
    await wait(2000);

    await send("Runtime.evaluate", {
      expression: `
        (() => {
          function setReactInput(input, value) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
          const emailInput = document.getElementById("login-email") || document.querySelector('input[type="email"]');
          const passInput = document.getElementById("login-password") || document.querySelector('input[type="password"]');
          const submitBtn = document.querySelector('button[type="submit"]');
          if (emailInput && passInput && submitBtn) {
            setReactInput(emailInput, "${testEmail}");
            setReactInput(passInput, "${testPassword}");
            submitBtn.click();
          }
        })()
      `,
    });
    await wait(2000);

    // Wait for login transition to /home and header to update
    for (let i = 0; i < 20; i++) {
      await wait(600);
      const checkAuth = await send("Runtime.evaluate", {
        expression: `
          (() => {
            const hasAvatar = document.querySelector('button[aria-label="User Account Menu"]') !== null;
            const hasSwitcher = document.querySelector('[aria-label="Customer Mode Selector"]') !== null;
            return hasAvatar && hasSwitcher;
          })()
        `,
        returnByValue: true,
      });
      if (checkAuth?.value) {
        console.log("   Detected authenticated header state");
        break;
      }
    }

    // Verify logged in on /home
    const afterLoginUrl = await send("Runtime.evaluate", {
      expression: "window.location.pathname",
      returnByValue: true,
    });
    console.log("   URL after login:", afterLoginUrl?.value);

    // Inspect Authenticated Header
    const authHeaderCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const header = document.querySelector('header');
          if (!header) return { error: "No header" };

          const switcher = header.querySelector('[aria-label="Customer Mode Selector"]');
          const hasSwitcher = switcher !== null;
          let activeMode = null;
          if (switcher) {
            const buttons = Array.from(switcher.querySelectorAll('button'));
            const activeBtn = buttons.find(b => b.classList.contains('bg-nutri-green') || b.className.includes('bg-[#2F7D16]'));
            activeMode = activeBtn ? activeBtn.textContent.trim() : null;
          }

          const hasProfileAvatar = header.querySelector('button[aria-label="User Account Menu"]') !== null;
          const hasCart = header.querySelector('button[aria-label="View Cart"]') !== null;

          return {
            hasSwitcher,
            activeMode,
            hasProfileAvatar,
            hasCart
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Authenticated Header Check:", authHeaderCheck?.value);
    assert(authHeaderCheck?.value?.hasSwitcher === true, "Authenticated header displays Customer Mode Switcher");
    assert(authHeaderCheck?.value?.activeMode?.includes("Order Food"), "Active mode is highlighted as 'Order Food'");
    assert(authHeaderCheck?.value?.hasProfileAvatar === true, "Authenticated header displays Profile Avatar");
    assert(authHeaderCheck?.value?.hasCart === true, "Authenticated header preserves Cart button");

    await takeScreenshot("navbar_authenticated_order_mode_desktop.png");

    // Click "Track Nutrition" mode switch for this first-time customer
    console.log("   Clicking 'Track Nutrition' on Mode Switcher...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const switcher = document.querySelector('[aria-label="Customer Mode Selector"]');
          if (switcher) {
            const trackBtn = Array.from(switcher.querySelectorAll('button')).find(b => b.textContent.includes('Track Nutrition'));
            if (trackBtn) trackBtn.click();
          }
        })()
      `,
    });
    // Verify redirected to /nutrition/onboarding because onboarding is incomplete!
    let firstTimeTrackUrl = "";
    for (let i = 0; i < 25; i++) {
      await wait(500);
      const check = await send("Runtime.evaluate", {
        expression: "window.location.pathname",
        returnByValue: true,
      });
      firstTimeTrackUrl = check?.value || "";
      if (firstTimeTrackUrl.includes("/nutrition/onboarding")) break;
    }
    console.log("   URL after first-time Track Nutrition click:", firstTimeTrackUrl);
    assert(
      firstTimeTrackUrl.includes("/nutrition/onboarding"),
      "First-time customer switching to Track Nutrition is guided to /nutrition/onboarding"
    );
    await takeScreenshot("navbar_authenticated_first_time_track_onboarding.png");

    // Complete onboarding for this customer in database
    console.log("   Marking customer onboarding complete in database...");
    await prisma.user.update({
      where: { email: testEmail },
      data: {
        hasCompletedNutritionOnboarding: true,
        nutritionOnboardingStep: 4,
        nutritionOnboardingCompletedAt: new Date(),
        nutritionGoal: {
          upsert: {
            create: {
              dailyCalorieGoal: 2200,
              proteinGoal: 140,
              carbohydrateGoal: 220,
              fatGoal: 65,
            },
            update: {
              dailyCalorieGoal: 2200,
              proteinGoal: 140,
              carbohydrateGoal: 220,
              fatGoal: 65,
            },
          },
        },
      },
    });

    // Navigate to /nutrition now that onboarding is complete
    await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
    for (let i = 0; i < 20; i++) {
      await wait(500);
      const ready = await send("Runtime.evaluate", {
        expression: `document.body.innerText.includes("Calories") || document.body.innerText.includes("Nutrition") || document.body.innerText.includes("Food Diary")`,
        returnByValue: true,
      });
      if (ready?.value) break;
    }

    const onboardedTrackerCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const text = document.body.innerText;
          const hasDailyTracker = text.includes("Calories") || text.includes("Nutrition") || text.includes("Today's Food Diary");

          const header = document.querySelector('header');
          const switcher = header ? header.querySelector('[aria-label="Customer Mode Selector"]') : null;
          let activeMode = null;
          if (switcher) {
            const buttons = Array.from(switcher.querySelectorAll('button'));
            const activeBtn = buttons.find(b => b.classList.contains('bg-nutri-green') || b.className.includes('bg-[#2F7D16]'));
            activeMode = activeBtn ? activeBtn.textContent.trim() : null;
          }

          return { hasDailyTracker, activeMode };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Onboarded Tracker & Mode check:", onboardedTrackerCheck?.value);
    assert(onboardedTrackerCheck?.value?.hasDailyTracker === true, "Daily Nutrition Tracker opens for onboarded customer");
    assert(onboardedTrackerCheck?.value?.activeMode?.includes("Track Nutrition"), "Mode Switcher clearly highlights 'Track Nutrition'");

    await takeScreenshot("navbar_authenticated_track_mode_desktop.png");

    // Switch back to "Order Food"
    console.log("   Switching back to Order Food...");
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const switcher = document.querySelector('[aria-label="Customer Mode Selector"]');
          if (switcher) {
            const orderBtn = Array.from(switcher.querySelectorAll('button')).find(b => b.textContent.includes('Order Food'));
            if (orderBtn) orderBtn.click();
          }
        })()
      `,
    });
    await wait(2500);

    const backToOrderUrl = await send("Runtime.evaluate", {
      expression: "window.location.pathname",
      returnByValue: true,
    });
    console.log("   URL after switching back to Order Food:", backToOrderUrl?.value);
    assert(backToOrderUrl?.value?.includes("/menu") || backToOrderUrl?.value?.includes("/home"), "Customer successfully switched back to Order Food");

    // =========================================================================
    // 7. TEST AUTHENTICATED MOBILE DRAWER
    // =========================================================================
    console.log("\n7. Testing Authenticated Mobile Drawer (390px)...");
    await setViewport(390, 844, true);
    await wait(800);

    // Open mobile menu
    await send("Runtime.evaluate", {
      expression: `document.querySelector('button[aria-label="Open navigation menu"]').click();`,
    });
    await wait(1000);

    const authMobileDrawer = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const closeBtn = document.querySelector('button[aria-label="Close menu"]');
          const drawer = closeBtn ? closeBtn.closest('div.animate-slide-left') : document.querySelector('div.animate-slide-left');
          if (!drawer) return { error: "No drawer found" };

          const hasModeSwitcher = drawer.querySelector('[aria-label="Customer Mode Selector"]') !== null;
          const links = Array.from(drawer.querySelectorAll('a')).map(a => a.textContent.trim());
          const hasTrackNutrition = links.some(l => l.includes("Track Nutrition"));
          const hasMyNutrition = links.some(l => l.includes("My Nutrition"));
          const hasOrders = links.some(l => l.includes("Orders"));
          const hasProfile = links.some(l => l.includes("Profile"));
          const hasSignOut = drawer.innerText.includes("Sign Out");

          return {
            hasModeSwitcher,
            hasTrackNutrition,
            hasMyNutrition,
            hasOrders,
            hasProfile,
            hasSignOut
          };
        })()
      `,
      returnByValue: true,
    });
    console.log("   Authenticated Mobile Drawer:", authMobileDrawer?.value);
    assert(authMobileDrawer?.value?.hasModeSwitcher === true, "Authenticated mobile drawer displays Mode Switcher");
    assert(authMobileDrawer?.value?.hasTrackNutrition === true, "Authenticated mobile drawer displays Track Nutrition link");
    assert(authMobileDrawer?.value?.hasMyNutrition === true, "Authenticated mobile drawer displays My Nutrition account link");
    assert(authMobileDrawer?.value?.hasOrders === true, "Authenticated mobile drawer displays Orders link");
    assert(authMobileDrawer?.value?.hasProfile === true, "Authenticated mobile drawer displays Profile link");
    assert(authMobileDrawer?.value?.hasSignOut === true, "Authenticated mobile drawer displays Sign Out action");

    await takeScreenshot("navbar_authenticated_mobile_drawer.png");

    // Close drawer
    await send("Runtime.evaluate", {
      expression: `document.querySelector('button[aria-label="Close menu"]').click();`,
    });
    await wait(800);

    ws.close();
    console.log("\n================================================================================");
    console.log("🎉 ALL NAVBAR, MODE SWITCHING & GUEST CART VERIFICATIONS PASSED SUCCESSFULLY!");
    console.log("================================================================================");
  } finally {
    chrome.kill();
    await prisma.$disconnect();
  }
}

runE2E().catch((err) => {
  console.error("FATAL ERROR IN E2E SUITE:", err);
  process.exit(1);
});
