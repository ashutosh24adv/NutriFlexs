const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ARTIFACTS_DIR = "/Users/ashu/.gemini/antigravity/brain/4edce154-be6d-4a56-a188-45b956dcf84c";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { startsWith: "misc_snack_tester_" } },
    orderBy: { createdAt: "desc" }
  });
  if (!user) return;

  const aloo = await prisma.foodItem.findFirst({ where: { name: "Aloo Bhujia" } });
  const todayKey = new Date().toISOString().split("T")[0];
  
  await prisma.foodLog.deleteMany({ where: { userId: user.id } });
  await prisma.foodLog.create({
    data: {
      userId: user.id,
      foodItemId: aloo.id,
      foodNameSnapshot: aloo.name,
      servingUnitSnapshot: "packet",
      quantity: 1,
      unit: "packet",
      mealType: "SNACKS",
      dateKey: todayKey,
      gramsCalculated: 35,
      calories: 203,
      protein: 2.8,
      carbohydrates: 14.7,
      fat: 14.7,
    }
  });

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--headless=new",
    "--remote-debugging-port=9224",
    "--no-sandbox",
    "--disable-gpu",
  ]);
  await new Promise(r => setTimeout(r, 1500));

  const chromeVer = await new Promise((res, rej) => {
    http.get("http://127.0.0.1:9224/json/version", r => {
      let d = ""; r.on("data", c => d += c); r.on("end", () => res(JSON.parse(d)));
    }).on("error", rej);
  });

  const ws = new globalThis.WebSocket(chromeVer.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (m, p = {}) => new Promise(r => {
    const cur = id++;
    const h = (e) => {
      const j = JSON.parse(e.data);
      if (j.id === cur) {
        ws.removeEventListener("message", h);
        r(j.result);
      }
    };
    ws.addEventListener("message", h);
    ws.send(JSON.stringify({ id: cur, method: m, params: p }));
  });

  await send("Network.enable");
  await send("Page.enable");
  
  const sessionToken = "session-snap-" + Date.now();
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 86400000),
    }
  });

  await send("Network.setCookie", {
    name: "next-auth.session-token",
    value: sessionToken,
    domain: "localhost",
    path: "/",
    httpOnly: true,
  });

  // Desktop
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });

  await send("Page.navigate", { url: "http://localhost:3000/nutrition" });
  await new Promise(r => setTimeout(r, 3500));

  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
        const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
        if (eveningCard) eveningCard.scrollIntoView({ behavior: "instant", block: "center" });
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const desktopShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, "evening_snacks_misc_desktop.png"), Buffer.from(desktopShot.data, "base64"));

  // Mobile
  await send("Emulation.setDeviceMetricsOverride", {
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await new Promise(r => setTimeout(r, 1000));

  await send("Runtime.evaluate", {
    expression: `
      (() => {
        const cards = Array.from(document.querySelectorAll("div.bg-white.border.border-nutri-border.rounded-3xl"));
        const eveningCard = cards.find(c => c.textContent.includes("Evening Snacks"));
        if (eveningCard) eveningCard.scrollIntoView({ behavior: "instant", block: "center" });
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const mobileShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, "evening_snacks_misc_mobile.png"), Buffer.from(mobileShot.data, "base64"));

  chrome.kill();
  await prisma.$disconnect();
  console.log("Captured updated centered screenshots!");
}

main().catch(console.error);
