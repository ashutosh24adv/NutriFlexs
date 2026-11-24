/**
 * NutriFlexs Performance Baseline Benchmark Script
 * Measures API latency, TTFB, and database query durations.
 */

const http = require("http");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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
          contentType: res.headers["content-type"] || "",
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

async function runBenchmark() {
  console.log("=================================================");
  console.log("       NutriFlexs Performance Baseline Benchmark ");
  console.log("=================================================\n");

  const endpoints = [
    "/",
    "/blog",
    "/blog?category=Nutrition",
    "/menu",
    "/dietitians",
    "/gyms",
    "/api/blog",
    "/api/products",
    "/api/categories",
    "/api/gyms",
    "/api/dietitians",
    "/api/nutrition/categories",
    "/api/nutrition/foods?q=chicken",
  ];

  console.log("--- 1. HTTP Endpoints & Route Latencies ---");
  for (const endpoint of endpoints) {
    const result = await measureHttpRequest(endpoint);
    console.log(
      `[${result.statusCode || "ERR"}] ${endpoint.padEnd(32)}: ${String(result.durationMs).padStart(5)} ms | ${(result.payloadBytes ? (result.payloadBytes / 1024).toFixed(1) + " KB" : "-")}`
    );
  }

  console.log("\n--- 2. Direct Prisma / Neon PostgreSQL Query Latency ---");
  
  // 1. Blog posts listing
  const t1 = Date.now();
  await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 4,
  });
  console.log(`Prisma: blogPost.findMany (take: 4)          : ${String(Date.now() - t1).padStart(5)} ms`);

  // 2. Blog category group by
  const t2 = Date.now();
  await prisma.blogPost.groupBy({
    by: ["category"],
    where: { isPublished: true },
    _count: { id: true },
  });
  console.log(`Prisma: blogPost.groupBy category           : ${String(Date.now() - t2).padStart(5)} ms`);

  // 3. Products list with relations
  const t3 = Date.now();
  await prisma.product.findMany({
    where: { isAvailable: true },
    include: {
      category: true,
      ingredients: { include: { ingredient: true } },
      dietGoals: true,
    },
  });
  console.log(`Prisma: product.findMany (all relations)     : ${String(Date.now() - t3).padStart(5)} ms`);

  // 4. Gyms list with outlets
  const t4 = Date.now();
  await prisma.gym.findMany({
    where: { isActive: true },
    include: { outlets: { where: { isActive: true } } },
  });
  console.log(`Prisma: gym.findMany (active with outlets)   : ${String(Date.now() - t4).padStart(5)} ms`);

  // 5. Dietitians with reviews & availabilities
  const t5 = Date.now();
  await prisma.dietitianProfile.findMany({
    where: { isVerified: true },
    include: {
      availabilities: { where: { isAvailable: true } },
      reviews: { where: { isApproved: true }, take: 3 },
    },
  });
  console.log(`Prisma: dietitianProfile.findMany (with rels): ${String(Date.now() - t5).padStart(5)} ms`);

  // 6. Food categories distinct
  const t6 = Date.now();
  await prisma.foodItem.findMany({
    where: { isActive: true, isCustom: false },
    select: { category: true },
    distinct: ["category"],
  });
  console.log(`Prisma: foodItem distinct categories        : ${String(Date.now() - t6).padStart(5)} ms`);

  // 7. Food search with insensitive contains
  const t7 = Date.now();
  await prisma.foodItem.findMany({
    where: {
      isActive: true,
      name: { contains: "chicken", mode: "insensitive" },
    },
    take: 50,
  });
  console.log(`Prisma: foodItem search (contains 'chicken') : ${String(Date.now() - t7).padStart(5)} ms`);

  await prisma.$disconnect();
}

runBenchmark().catch(console.error);
