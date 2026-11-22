const fs = require("fs");

async function testFastVisionModels() {
  const envContent = fs.readFileSync(".env", "utf8");
  const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
  const key = match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null;

  const imageBuffer = fs.readFileSync("public/images/test-meals/burger.jpg");
  const base64Image = imageBuffer.toString("base64");

  const prompt = "Identify the food item and estimate calories. Return JSON with mealTitle and items list.";

  const models = [
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
  ];

  for (const m of models) {
    const start = Date.now();
    try {
      console.log(`\nTesting ${m}...`);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      const dur = Date.now() - start;
      const text = await res.text();
      let parsed = {};
      try { parsed = JSON.parse(text); } catch {}

      if (res.ok) {
        console.log(`✅ [${dur}ms] ${m} SUCCESS! Response snippet:`, text.slice(0, 150));
      } else {
        console.log(`❌ [${dur}ms] ${m} FAILED! Status: ${res.status}, error:`, parsed?.error?.message || text.slice(0, 150));
      }
    } catch (e) {
      console.log(`⏱️ [${Date.now() - start}ms] ${m} EXCEPTION:`, e.message);
    }
  }
}

testFastVisionModels().catch(console.error);
