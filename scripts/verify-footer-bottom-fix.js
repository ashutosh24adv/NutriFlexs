const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9328",
    "--user-data-dir=/tmp/chrome-footer-test-" + Date.now(),
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  let res = null;
  for (let attempt = 1; attempt <= 20; attempt++) {
    await wait(500);
    try {
      res = await fetch("http://127.0.0.1:9328/json");
      if (res.ok) break;
    } catch (e) {}
  }

  if (!res || !res.ok) {
    chrome.kill();
    throw new Error("Could not connect to Chrome on port 9328");
  }

  try {
    const tabs = await res.json();
    const pageTab = tabs.find((t) => t.type === "page");
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

    await new Promise((resolve) => ws.addEventListener("open", resolve));
    await send("Page.enable");
    await send("Runtime.enable");

    // 1. Desktop 1280x950
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 950,
      deviceScaleFactor: 2,
      mobile: false,
    });

    await send("Page.navigate", { url: "http://localhost:3000/" });
    await wait(2500);

    // Scroll to very bottom
    await send("Runtime.evaluate", {
      expression: "window.scrollTo(0, document.body.scrollHeight)",
    });
    await wait(800);

    const desktopCheck = (
      await send("Runtime.evaluate", {
        expression: `(() => {
          const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
          const mainBg = getComputedStyle(document.querySelector('main')).backgroundColor;
          const footer = document.querySelector('footer');
          const footerBg = footer ? getComputedStyle(footer).backgroundColor : null;
          const footerWidth = footer ? footer.getBoundingClientRect().width : 0;
          return JSON.stringify({ htmlBg, mainBg, footerBg, footerWidth, innerWidth: window.innerWidth });
        })()`,
      })
    ).result.value;
    console.log("Desktop styles check:", desktopCheck);

    const desktopShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "footer_bottom_desktop.png"),
      Buffer.from(desktopShot.data, "base64")
    );

    // 2. Mobile 390x844
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });

    await send("Page.navigate", { url: "http://localhost:3000/faq" });
    await wait(2000);

    await send("Runtime.evaluate", {
      expression: "window.scrollTo(0, document.body.scrollHeight)",
    });
    await wait(800);

    const mobileCheck = (
      await send("Runtime.evaluate", {
        expression: `(() => {
          const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
          const footer = document.querySelector('footer');
          const footerBg = footer ? getComputedStyle(footer).backgroundColor : null;
          const footerWidth = footer ? footer.getBoundingClientRect().width : 0;
          return JSON.stringify({ htmlBg, footerBg, footerWidth, innerWidth: window.innerWidth });
        })()`,
      })
    ).result.value;
    console.log("Mobile styles check:", mobileCheck);

    const mobileShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "footer_bottom_mobile.png"),
      Buffer.from(mobileShot.data, "base64")
    );

    ws.close();
    chrome.kill();
    process.exit(0);
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

run();
