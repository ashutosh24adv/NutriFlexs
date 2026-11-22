const fs = require("fs");

async function testLiveApi() {
  const imageBuffer = fs.readFileSync("public/images/test-meals/burger.jpg");
  const formData = new FormData();
  formData.append("image", new Blob([imageBuffer], { type: "image/jpeg" }), "burger.jpg");

  console.log("Sending POST to http://localhost:3000/api/nutrition/analyze-image ...");
  const startTime = Date.now();
  try {
    const res = await fetch("http://localhost:3000/api/nutrition/analyze-image", {
      method: "POST",
      body: formData,
    });
    const duration = Date.now() - startTime;
    console.log(`Status: ${res.status} ${res.statusText} (${duration}ms)`);
    const data = await res.json();
    console.log("Response JSON:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testLiveApi().catch(console.error);
