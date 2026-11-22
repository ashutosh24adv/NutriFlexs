const fs = require("fs");

async function testAllImages() {
  const images = [
    { file: "burger.jpg", mime: "image/jpeg" },
    { file: "dal-rice-roti.jpg", mime: "image/jpeg" },
    { file: "indian-thali.jpg", mime: "image/jpeg" },
    { file: "salad.jpg", mime: "image/jpeg" },
    { file: "salad-bowl.png", mime: "image/png" },
  ];

  for (const img of images) {
    const filePath = `public/images/test-meals/${img.file}`;
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping missing ${filePath}`);
      continue;
    }
    const buf = fs.readFileSync(filePath);
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing image: ${img.file} (${Math.round(buf.length / 1024)} KB, ${img.mime})`);

    const formData = new FormData();
    formData.append("image", new Blob([buf], { type: img.mime }), img.file);

    const startTime = Date.now();
    try {
      const res = await fetch("http://localhost:3000/api/nutrition/analyze-image", {
        method: "POST",
        body: formData,
      });
      const duration = Date.now() - startTime;
      console.log(`HTTP Status: ${res.status} ${res.statusText} (${duration}ms)`);
      const data = await res.json();
      if (data.success) {
        console.log(`✅ Success! Title: "${data.mealTitle}", Items: ${data.detectedItems?.length}`);
      } else {
        console.log(`❌ Failed! Code: ${data.code}, Error: ${data.error}`);
      }
    } catch (err) {
      console.error(`💥 Request error for ${img.file}:`, err.message);
    }
  }
}

testAllImages().catch(console.error);
