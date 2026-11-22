const fs = require("fs");

async function checkModelQuotas() {
  const envContent = fs.readFileSync(".env", "utf8");
  const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
  const key = match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null;

  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-2.5-pro",
    "gemini-pro-latest",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
  ];

  console.log("Testing quota across available vision models...");
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 }
        }),
        signal: AbortSignal.timeout(6000)
      });
      const text = await res.text();
      let parsed = {};
      try { parsed = JSON.parse(text); } catch {}
      if (res.ok) {
        console.log(`✅ Model ${m}: HTTP 200 OK!`);
      } else {
        const code = parsed?.error?.code || res.status;
        const msg = parsed?.error?.message?.slice(0, 100) || text.slice(0, 100);
        console.log(`❌ Model ${m}: HTTP ${code} - ${msg}`);
      }
    } catch (e) {
      console.log(`⏱️ Model ${m}: ${e.name} ${e.message}`);
    }
  }
}

checkModelQuotas().catch(console.error);
