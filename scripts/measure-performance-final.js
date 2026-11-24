/**
 * NutriFlexs Final Performance Verification Script
 * Measures response times across all key optimized routes & compares with baseline.
 */

const http = require("http");

function measureHttpRequest(path) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = http.get(`http://localhost:3000${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        const totalDurationMs = Date.now() - startTime;
        resolve({
          path,
          statusCode: res.statusCode,
          durationMs: totalDurationMs,
          payloadBytes: Buffer.byteLength(data, "utf8"),
          cacheControl: res.headers["cache-control"] || "none",
        });
      });
    });

    req.on("error", (err) => {
      resolve({
        path,
        error: err.message,
        durationMs: Date.now() - startTime,
      });
    });
  });
}

async function runFinalBenchmark() {
  console.log("=================================================");
  console.log("       NutriFlexs Post-Optimisation Benchmark     ");
  console.log("=================================================\n");

  const endpoints = [
    { path: "/", baselineMs: 1864 },
    { path: "/blog", baselineMs: 5055 },
    { path: "/blog?category=Nutrition", baselineMs: 977 },
    { path: "/menu", baselineMs: 231 },
    { path: "/dietitians", baselineMs: 125 },
    { path: "/gyms", baselineMs: 233 },
    { path: "/api/blog", baselineMs: 1049 },
    { path: "/api/products", baselineMs: 2459 },
    { path: "/api/categories", baselineMs: 567 },
    { path: "/api/gyms", baselineMs: 1117 },
    { path: "/api/dietitians", baselineMs: 1628 },
    { path: "/api/nutrition/categories", baselineMs: 862 },
    { path: "/api/nutrition/foods?q=chicken", baselineMs: 2019 },
  ];

  console.log(
    "Route / Endpoint".padEnd(35) +
    "Baseline".padEnd(12) +
    "Optimised".padEnd(12) +
    "Improvement".padEnd(15) +
    "Payload"
  );
  console.log("-".repeat(85));

  for (const item of endpoints) {
    // Run twice: first to prime any cold cache if needed, second to measure steady state
    await measureHttpRequest(item.path);
    const result = await measureHttpRequest(item.path);

    const improvementPct = Math.round(
      ((item.baselineMs - result.durationMs) / item.baselineMs) * 100
    );
    const improvementStr =
      improvementPct > 0 ? `+${improvementPct}% faster` : `${improvementPct}%`;

    console.log(
      item.path.padEnd(35) +
      `${item.baselineMs} ms`.padEnd(12) +
      `${result.durationMs} ms`.padEnd(12) +
      improvementStr.padEnd(15) +
      `${(result.payloadBytes / 1024).toFixed(1)} KB`
    );
  }

  console.log("-".repeat(85));
  console.log("Benchmark complete.\n");
}

runFinalBenchmark().catch(console.error);
