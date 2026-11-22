const fs = require("fs");

async function check() {
  const envContent = fs.readFileSync(".env", "utf8");
  const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
  const key = match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null;
  console.log("GEMINI_API_KEY found:", !!key, "Length:", key ? key.length : 0);

  const modelMatch = envContent.match(/^GEMINI_MODEL=(.*)$/m);
  console.log("GEMINI_MODEL configured in .env:", modelMatch ? modelMatch[1].trim() : "None");

  if (!key) {
    console.error("No GEMINI_API_KEY found in .env");
    return;
  }

  console.log("\nQuerying Gemini API /v1beta/models ...");
  const startTime = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const duration = Date.now() - startTime;
  console.log(`Status: ${res.status} ${res.statusText} (${duration}ms)`);

  const bodyText = await res.text();
  try {
    const data = JSON.parse(bodyText);
    if (data.models) {
      console.log(`Found ${data.models.length} total models.`);
      const contentModels = data.models
        .filter((m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
        .map((m) => m.name.replace("models/", ""));
      console.log("GenerateContent models:\n", contentModels.join(", "));
    } else {
      console.log("Error response from Gemini API:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("Failed to parse JSON response:", bodyText.slice(0, 500));
  }
}

check().catch(console.error);
