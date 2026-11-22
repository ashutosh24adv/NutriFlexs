const fs = require("fs");

async function verifyAllFormats() {
  const envContent = fs.readFileSync(".env", "utf8");
  const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
  const key = match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null;

  // We have:
  // 1. burger.jpg (JPEG)
  // 2. salad-bowl.png (PNG)
  // Let's create a WebP test image using burger buffer if needed or convert
  const jpegBuffer = fs.readFileSync("public/images/test-meals/burger.jpg");
  const pngBuffer = fs.readFileSync("public/images/test-meals/salad-bowl.png");

  // Minimal valid 1x1 WebP
  const webpBuffer = Buffer.from("UklGRlIAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAADABAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==", "base64");

  const prompt = `You are a nutritionist. Identify foods. Return ONLY valid JSON:
{
  "mealTitle": "Meal Name",
  "items": [
    {
      "foodName": "Food Item",
      "category": "Main",
      "estimatedWeightGrams": 150,
      "servingUnit": "piece",
      "quantity": 1,
      "confidence": 0.9,
      "isGravy": false,
      "description": "Description",
      "estimatedCalories": 200,
      "estimatedProtein": 10,
      "estimatedCarbs": 20,
      "estimatedFat": 5
    }
  ]
}`;

  const tests = [
    { name: "JPEG (Burger)", mime: "image/jpeg", buf: jpegBuffer },
    { name: "PNG (Salad Bowl)", mime: "image/png", buf: pngBuffer },
    { name: "WebP", mime: "image/webp", buf: webpBuffer }
  ];

  const models = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite"];

  for (const m of models) {
    console.log(`\n=================== MODEL: ${m} ===================`);
    for (const t of tests) {
      console.log(`Testing format: ${t.name} (${Math.round(t.buf.length / 1024)} KB) ...`);
      const start = Date.now();
      try {
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
                      mimeType: t.mime,
                      data: t.buf.toString("base64")
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2
            }
          }),
          signal: AbortSignal.timeout(15000)
        });
        const dur = Date.now() - start;
        const text = await res.text();
        if (res.ok) {
          const parsed = JSON.parse(text);
          const candidateText = parsed.candidates[0].content.parts[0].text;
          const json = JSON.parse(candidateText);
          console.log(`✅ ${t.name}: SUCCESS in ${dur}ms! Title: "${json.mealTitle}", Items: ${json.items?.length}`);
        } else {
          console.log(`❌ ${t.name}: FAILED in ${dur}ms! Status ${res.status}:`, text.slice(0, 150));
        }
      } catch (err) {
        console.log(`💥 ${t.name}: EXCEPTION in ${Date.now() - start}ms:`, err.message);
      }
    }
  }
}

verifyAllFormats().catch(console.error);
