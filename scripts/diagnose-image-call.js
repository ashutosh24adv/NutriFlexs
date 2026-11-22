const fs = require("fs");

async function testImageCall() {
  const envContent = fs.readFileSync(".env", "utf8");
  const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
  const key = match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null;

  // Read a real image from public/images/test-meals/burger.jpg
  const imageBuffer = fs.readFileSync("public/images/test-meals/burger.jpg");
  console.log("Image read: burger.jpg, size:", imageBuffer.length, "bytes");

  const geminiPrompt = `Identify the food in this photo. Return ONLY a valid JSON object conforming to:
{
  "mealTitle": "Burger",
  "items": [
    {
      "foodName": "Cheeseburger",
      "category": "Sandwiches & Burgers",
      "estimatedWeightGrams": 220,
      "servingUnit": "piece",
      "quantity": 1,
      "confidence": 0.95,
      "isGravy": false,
      "description": "Grilled burger with bun and patty",
      "estimatedCalories": 450,
      "estimatedProtein": 22,
      "estimatedCarbs": 38,
      "estimatedFat": 20
    }
  ]
}`;

  const modelsToTest = [
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest"
  ];

  for (const model of modelsToTest) {
    console.log(`\nTesting model: ${model} with exact route payload...`);
    const startTime = Date.now();
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: geminiPrompt },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: imageBuffer.toString("base64"),
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        }
      );

      const duration = Date.now() - startTime;
      console.log(`Response status: ${response.status} ${response.statusText} (${duration}ms)`);
      const body = await response.text();
      console.log("Response body:", body.slice(0, 500));
    } catch (err) {
      console.error("Error:", err);
    }
  }
}

testImageCall().catch(console.error);
