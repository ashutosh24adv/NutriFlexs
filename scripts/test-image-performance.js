/**
 * test-image-performance.js
 * Validates image optimization, response times, transfer sizes, and rendering.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https");
    const client = isHttps ? https : http;
    const req = client.get(url, { headers }, (res) => {
      let data = [];
      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(data),
        });
      });
    });
    req.on("error", reject);
  });
}

async function run() {
  console.log("==================================================================");
  console.log("🚀 TESTING HOMEPAGE PRODUCT IMAGE OPTIMIZATION & PERFORMANCE");
  console.log("==================================================================\n");

  // 1. Verify /home page loads with HTTP 200
  console.log("1. Verifying /home HTML:");
  const homeRes = await fetchUrl("http://localhost:3000/home");
  assert(homeRes.statusCode === 200, `Homepage loads with HTTP 200 (actual: ${homeRes.statusCode})`);
  const homeHtml = homeRes.body.toString("utf-8");
  assert(homeHtml.includes("ABC Stamina Rebuilder"), "Homepage SSR/initial HTML includes 'ABC Stamina Rebuilder'");
  assert(homeHtml.includes("RECOMMENDED FUEL"), "Homepage includes 'RECOMMENDED FUEL' badge");
  assert(homeHtml.includes("abc-stamina-rebuilder.webp"), "Homepage references optimized WebP image source");

  // 2. Test Local WebP Asset Serving
  console.log("\n2. Testing Local WebP Static Asset (/images/products/abc-stamina-rebuilder.webp):");
  const localWebpRes = await fetchUrl("http://localhost:3000/images/products/abc-stamina-rebuilder.webp");
  assert(localWebpRes.statusCode === 200, `Local WebP asset loads with HTTP 200 (actual: ${localWebpRes.statusCode})`);
  const webpSize = localWebpRes.body.length;
  console.log(`     File size: ${Math.round(webpSize / 1024 * 10) / 10} KB (${webpSize} bytes)`);
  assert(webpSize < 12000, `WebP image is compact (< 12 KB, actual: ${(webpSize / 1024).toFixed(1)} KB)`);

  // 3. Test Next.js Optimized Image Endpoint
  console.log("\n3. Testing Next.js Image Optimization Pipeline:");
  const startTime = Date.now();
  const nextImgRes = await fetchUrl(
    "http://localhost:3000/_next/image?url=%2Fimages%2Fproducts%2Fabc-stamina-rebuilder.webp&w=384&q=80",
    { Accept: "image/avif,image/webp,*/*" }
  );
  const duration = Date.now() - startTime;
  assert(nextImgRes.statusCode === 200, `Next.js image route returns HTTP 200 (actual: ${nextImgRes.statusCode})`);
  const contentType = nextImgRes.headers["content-type"];
  assert(contentType.includes("webp") || contentType.includes("avif"), `Optimized format delivered: ${contentType}`);
  const optimizedSize = nextImgRes.body.length;
  console.log(`     Delivered Size: ${(optimizedSize / 1024).toFixed(1)} KB (${optimizedSize} bytes)`);
  console.log(`     Response Time: ${duration}ms`);
  assert(optimizedSize < 10000, `Optimized transfer payload < 10 KB (actual: ${(optimizedSize / 1024).toFixed(1)} KB)`);

  // 4. Test Warm Cache Speed
  console.log("\n4. Testing Warm Cache Performance:");
  const warmStart = Date.now();
  const warmRes = await fetchUrl(
    "http://localhost:3000/_next/image?url=%2Fimages%2Fproducts%2Fabc-stamina-rebuilder.webp&w=384&q=80",
    {
      Accept: "image/avif,image/webp,*/*",
      "If-None-Match": nextImgRes.headers["etag"],
    }
  );
  const warmDuration = Date.now() - warmStart;
  assert(warmRes.statusCode === 304 || warmRes.statusCode === 200, `Warm request returns 304 Not Modified or 200 (actual: ${warmRes.statusCode})`);
  console.log(`     Warm Response Time: ${warmDuration}ms`);
  assert(warmDuration < 50, `Warm cache response is near-instant (< 50ms, actual: ${warmDuration}ms)`);

  // 5. Comparison against Original Upstream Unsplash Image
  console.log("\n5. Performance Comparison vs Original:");
  const originalSize = 35302; // 34.5 KB JPEG from Unsplash
  const reduction = Math.round((1 - (optimizedSize / originalSize)) * 100);
  console.log(`     Original Unsplash JPEG size: ${(originalSize / 1024).toFixed(1)} KB`);
  console.log(`     Optimized Local WebP size: ${(optimizedSize / 1024).toFixed(1)} KB`);
  console.log(`     Total Payload Reduction: ${reduction}%`);
  assert(reduction > 70, `Transfer size reduced by more than 70% (actual: ${reduction}%)`);

  console.log("\n==================================================================");
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

