const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

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
  console.log("NUTRIFLEXS SHOPPING CART DRAWER REDESIGN E2E VERIFICATION");
  console.log("================================================================================");

  // Launch Chrome CDP
  console.log("\n1. Launching Chrome in headless mode...");
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9297",
    "--user-data-dir=/tmp/chrome-test-cart-drawer",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let cdpRes = null;
  for (let attempt = 1; attempt <= 12; attempt++) {
    await wait(800);
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
    let msgId = 1;

    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (event) => {
          const data = JSON.parse(event.data);
          if (data.id === id) {
            ws.removeEventListener("message", handler);
            const r = data.result;
            resolve(r?.result !== undefined ? r.result : r);
          }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
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

    async function evaluate(expression) {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.value;
    }

    async function captureScreenshot(filename) {
      const res = await send("Page.captureScreenshot", { format: "png" });
      const targetPath = path.join(ARTIFACTS_DIR, filename);
      fs.writeFileSync(targetPath, Buffer.from(res.data, "base64"));
      console.log(`📸 Screenshot saved: ${filename}`);
      return targetPath;
    }

    // Set Desktop Viewport 1280x850
    await setViewport(1280, 850, false);

    // Navigate to /menu and ensure fresh cart
    console.log("\n2. Navigating to http://localhost:3000/menu...");
    await send("Page.navigate", { url: "http://localhost:3000/menu" });
    await wait(1000);
    await evaluate(`localStorage.clear()`);
    await send("Page.navigate", { url: "http://localhost:3000/menu" });

    // Wait for food cards to load from database
    for (let i = 0; i < 20; i++) {
      await wait(600);
      const cardCount = await evaluate(`document.querySelectorAll('div[class*="group bg-white rounded-3xl"]').length`);
      if (cardCount && cardCount > 0) break;
    }

    const foodCardsCount = await evaluate(`document.querySelectorAll('div[class*="group bg-white rounded-3xl"]').length`);
    console.log(`Found ${foodCardsCount} products on menu`);
    assert(foodCardsCount >= 2, "Menu page loaded products from database");

    // 3. Test Direct Add to Cart Functionality (without opening details page)
    console.log("\n3. Testing direct 'Add' button on food card...");
    const directAddResult = await evaluate(`
      (() => {
        // Find first Add button on a food card
        const addButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === 'Add');
        if (addButtons.length > 0) {
          addButtons[0].click();
          return { clicked: true, buttonCount: addButtons.length };
        }
        return { clicked: false, buttonCount: 0 };
      })()
    `);
    assert(directAddResult.clicked, "Direct 'Add' button clicked on product card");

    // Wait for cart drawer to slide in
    await wait(1000);

    const isDrawerOpen = await evaluate(`
      Boolean(document.querySelector('#cart-drawer-title'))
    `);
    assert(isDrawerOpen, "Cart drawer opened immediately upon clicking Add button");

    const cartItemNames = await evaluate(`
      Array.from(document.querySelectorAll('#cart-drawer-title ~ * h4, [role="dialog"] h4')).map(h => h.innerText.trim())
    `);
    console.log("Cart item names in drawer:", cartItemNames);
    assert(cartItemNames.length === 1, "Directly added item appeared in cart drawer");

    // Check cart count
    const headerCount = await evaluate(`
      document.querySelector('[role="dialog"] .font-heading.font-extrabold.text-xs')?.innerText || ''
    `);
    assert(headerCount === "1", "Cart drawer item count reflects 1 item");

    // 4. Test adding a SECOND product directly from menu
    console.log("\n4. Adding a second product directly from menu...");
    // Close drawer via close button first
    await evaluate(`
      const closeBtn = document.querySelector('button[aria-label="Close cart drawer"]');
      if (closeBtn) closeBtn.click();
    `);
    await wait(600);

    // Click second product's Add button
    await evaluate(`
      const addButtons = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === 'Add');
      if (addButtons.length > 1) {
        addButtons[1].click();
      }
    `);
    await wait(1000);

    const cartItemsAfterSecondAdd = await evaluate(`
      Array.from(document.querySelectorAll('[role="dialog"] h4')).map(h => h.innerText.trim())
    `);
    console.log("Cart items after adding second product:", cartItemsAfterSecondAdd);
    assert(cartItemsAfterSecondAdd.length === 2, "Second product added directly from menu without page navigation");

    // 5. Test Quantity Controls & Live Calculations
    console.log("\n5. Testing quantity stepper (+ / -)...");
    const initialSubtotal = await evaluate(`
      document.querySelector('[role="dialog"] .space-y-2.text-xs span.font-bold')?.innerText || ''
    `);
    console.log("Initial subtotal:", initialSubtotal);

    // Click '+' on first item
    await evaluate(`
      const plusBtns = Array.from(document.querySelectorAll('[role="dialog"] button[aria-label*="Increase"]'));
      if (plusBtns[0]) plusBtns[0].click();
    `);
    await wait(600);

    const qtyAfterPlus = await evaluate(`
      document.querySelectorAll('[role="dialog"] span.text-xs.font-extrabold')[0]?.innerText || ''
    `);
    console.log("Quantity of first item after +:", qtyAfterPlus);
    assert(qtyAfterPlus === "2", "Quantity increased to 2");

    const updatedSubtotal = await evaluate(`
      document.querySelector('[role="dialog"] .space-y-2.text-xs span.font-bold')?.innerText || ''
    `);
    console.log("Subtotal after increasing quantity:", updatedSubtotal);
    assert(initialSubtotal !== updatedSubtotal, "Subtotal recalculated dynamically upon quantity change");

    // Click '-' to decrease quantity back to 1
    await evaluate(`
      const minusBtns = Array.from(document.querySelectorAll('[role="dialog"] button[aria-label*="Decrease"]'));
      if (minusBtns[0]) minusBtns[0].click();
    `);
    await wait(600);

    const qtyAfterMinus = await evaluate(`
      document.querySelectorAll('[role="dialog"] span.text-xs.font-extrabold')[0]?.innerText || ''
    `);
    assert(qtyAfterMinus === "1", "Quantity decreased back to 1");

    // 6. Test Trainer Referral Code
    console.log("\n6. Testing trainer referral code...");
    await evaluate(`
      (() => {
        function setReactInput(input, value) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
          setter.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const input = document.querySelector('input[placeholder*="Trainer Referral"]');
        if (input) {
          setReactInput(input, "NUTRI-ARJUN");
        }
        const applyBtns = Array.from(document.querySelectorAll('[role="dialog"] button')).filter(b => b.innerText.trim() === 'Apply');
        if (applyBtns[0]) applyBtns[0].click();
      })()
    `);
    await wait(800);

    const hasTrainerDiscount = await evaluate(`
      document.body.innerText.includes("Trainer Referral 10% Discount Applied")
    `);
    assert(hasTrainerDiscount, "Trainer referral 10% discount badge applied");

    // Capture screenshot of cart with trainer discount
    await captureScreenshot("cart_drawer_trainer_discount.png");

    // 7. Verify CTA Hierarchy & Visual Alignment in Footer
    console.log("\n7. Verifying CTA hierarchy order in footer...");
    const footerElements = await evaluate(`
      (() => {
        const footer = document.querySelector('[role="dialog"] .border-t.border-nutri-border.shadow-lg');
        if (!footer) return null;
        const text = footer.innerText;
        const subtotalIdx = text.indexOf("Subtotal");
        const payableIdx = text.indexOf("Payable Amount");
        const checkoutIdx = text.indexOf("PROCEED TO CHECKOUT");
        const continueIdx = text.indexOf("Continue Shopping");
        const pickupIdx = text.indexOf("Express Kiosk Pickup");
        return {
          subtotalIdx,
          payableIdx,
          checkoutIdx,
          continueIdx,
          pickupIdx,
          isOrdered: subtotalIdx < payableIdx && payableIdx < checkoutIdx && checkoutIdx < continueIdx && continueIdx < pickupIdx
        };
      })()
    `);
    console.log("Footer CTA order analysis:", footerElements);
    assert(footerElements && footerElements.isOrdered, "Footer CTA hierarchy follows exact strict order: 1. Subtotal -> 2. Payable Amount -> 3. PROCEED TO CHECKOUT -> 4. Continue Shopping -> 5. Pickup Info");

    // Capture comprehensive desktop screenshot
    await captureScreenshot("cart_drawer_desktop_items.png");

    // 8. Test the Redesigned "Continue Shopping" Secondary Button
    console.log("\n8. Testing Continue Shopping button...");
    const continueBtnProps = await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.innerText.includes('Continue Shopping'));
        if (!btn) return null;
        const style = window.getComputedStyle(btn);
        return {
          text: btn.innerText.trim(),
          hasIcon: Boolean(btn.querySelector('svg')),
          width: btn.offsetWidth,
          isFullWidth: btn.classList.contains('w-full'),
          border: style.borderWidth,
          borderRadius: style.borderRadius
        };
      })()
    `);
    console.log("Continue Shopping button properties:", continueBtnProps);
    assert(continueBtnProps !== null, "Continue Shopping secondary button rendered");
    assert(continueBtnProps.isFullWidth, "Continue Shopping button is full width matching checkout button");
    assert(continueBtnProps.hasIcon, "Continue Shopping button contains shopping bag icon");

    // Click "Continue Shopping"
    console.log("Clicking Continue Shopping button...");
    await evaluate(`
      const btn = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.innerText.includes('Continue Shopping'));
      if (btn) btn.click();
    `);
    await wait(800);

    // Verify cart drawer closed
    const isDrawerClosed = await evaluate(`
      document.querySelector('#cart-drawer-title') === null
    `);
    assert(isDrawerClosed, "Cart drawer closed upon clicking Continue Shopping");

    // Verify user is on /menu and cart items are preserved
    const currentPath = await evaluate(`window.location.pathname`);
    console.log("Current path after Continue Shopping:", currentPath);
    assert(currentPath === "/menu", "User remains on /menu page after continuing shopping");

    // Verify cart badge in header still has items preserved!
    const headerCartBadge = await evaluate(`
      document.querySelector('header button span[class*="rounded-full"]')?.innerText || ''
    `);
    console.log("Header cart badge count:", headerCartBadge);
    assert(headerCartBadge === "2", "Cart items and quantities are strictly preserved (not cleared)!");

    // 9. Mobile Viewport Test (375x720)
    console.log("\n9. Testing mobile viewport responsiveness (375x720)...");
    await setViewport(375, 720, true);
    await wait(1000);

    // Open cart drawer on mobile by clicking cart button in header
    await evaluate(`
      const cartBtn = document.querySelector('header button[aria-label*="cart"], header button[aria-label*="Cart"], header button:has(svg.lucide-shopping-bag), header button:has(svg.lucide-shopping-basket)');
      if (cartBtn) cartBtn.click();
      else {
        // Fallback: click any header button with a number badge
        const badge = Array.from(document.querySelectorAll('header button')).find(b => b.querySelector('span'));
        if (badge) badge.click();
      }
    `);
    await wait(1000);

    const isMobileDrawerOpen = await evaluate(`
      Boolean(document.querySelector('#cart-drawer-title'))
    `);
    assert(isMobileDrawerOpen, "Cart drawer opened smoothly on mobile viewport");

    // Capture mobile screenshot
    await captureScreenshot("cart_drawer_mobile.png");

    // 10. Test Proceed to Checkout Transition
    console.log("\n10. Testing Proceed to Checkout transition...");
    await evaluate(`
      const checkoutBtn = Array.from(document.querySelectorAll('[role="dialog"] button')).find(b => b.innerText.includes('PROCEED TO CHECKOUT'));
      if (checkoutBtn) checkoutBtn.click();
    `);
    await wait(1500);

    const checkoutPath = await evaluate(`window.location.pathname`);
    console.log("Path after clicking Proceed to Checkout:", checkoutPath);
    assert(checkoutPath === "/checkout", "Proceed to Checkout navigates seamlessly to /checkout");

    console.log("\n================================================================================");
    console.log("🎉 ALL SHOPPING CART DRAWER E2E TESTS PASSED SUCCESSFULLY!");
    console.log("================================================================================");

    ws.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

runE2E().catch((err) => {
  console.error("FATAL ERROR in E2E runner:", err);
  process.exit(1);
});
