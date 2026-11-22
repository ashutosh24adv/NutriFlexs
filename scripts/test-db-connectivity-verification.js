process.loadEnvFile(".env");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ["error"] });

async function verifyAll() {
  console.log("===============================================================");
  console.log("      NUTRIFLEXS NEON POSTGRESQL CONNECTIVITY VERIFICATION     ");
  console.log("===============================================================");

  // 1. Direct Prisma Connectivity
  console.log("\n[1/4] Testing Direct Prisma Connectivity & Tables...");
  const t0 = Date.now();
  await prisma.$connect();
  const connectMs = Date.now() - t0;
  console.log(`✓ Prisma successfully connected to Neon in ${connectMs}ms`);

  const [products, categories, blogPosts, usersCount, ordersCount] = await Promise.all([
    prisma.product.findMany({
      where: { isAvailable: true },
      include: { category: true },
      take: 5,
    }),
    prisma.category.findMany({
      orderBy: { displayOrder: "asc" },
    }),
    prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
      take: 5,
    }),
    prisma.user.count(),
    prisma.order.count(),
  ]);

  console.log(`✓ Products query passed: ${products.length} samples retrieved (e.g., "${products[0]?.name}")`);
  console.log(`✓ Categories query passed: ${categories.length} categories retrieved (${categories.map(c => c.name).join(", ")})`);
  console.log(`✓ Blog posts query passed: ${blogPosts.length} samples retrieved (e.g., "${blogPosts[0]?.title}")`);
  console.log(`✓ Existing user data intact: ${usersCount} users in database`);
  console.log(`✓ Existing orders intact: ${ordersCount} orders in database`);

  // 2. HTTP API Endpoints on localhost
  console.log("\n[2/4] Testing HTTP API Endpoints on http://localhost:3000...");
  
  const resProds = await fetch("http://localhost:3000/api/products");
  const dataProds = await resProds.json();
  if (dataProds.success && dataProds.products && dataProds.products.length > 0) {
    console.log(`✓ /api/products returned 200 OK with ${dataProds.products.length} products`);
  } else {
    throw new Error(`/api/products failed: ${JSON.stringify(dataProds)}`);
  }

  const resCats = await fetch("http://localhost:3000/api/categories");
  const dataCats = await resCats.json();
  if (dataCats.success && dataCats.categories && dataCats.categories.length > 0) {
    console.log(`✓ /api/categories returned 200 OK with ${dataCats.categories.length} categories`);
  } else {
    throw new Error(`/api/categories failed: ${JSON.stringify(dataCats)}`);
  }

  // 3. Pages Rendering
  console.log("\n[3/4] Testing Page HTTP Rendering on http://localhost:3000...");
  
  const resMenu = await fetch("http://localhost:3000/menu");
  const menuText = await resMenu.text();
  if (resMenu.status === 200 && (menuText.includes("NutriFlexs Fuel Menu") || menuText.includes("Fuel Menu"))) {
    console.log("✓ Menu page (/menu) loaded with HTTP 200 OK");
  } else {
    throw new Error(`Menu page failed: HTTP ${resMenu.status}`);
  }

  const resBlog = await fetch("http://localhost:3000/blog");
  const blogText = await resBlog.text();
  if (resBlog.status === 200 && blogText.includes("Blog &amp; Nutrition Insights")) {
    console.log("✓ Blog page (/blog) loaded with HTTP 200 OK");
  } else {
    throw new Error(`Blog page failed: HTTP ${resBlog.status}`);
  }

  const firstBlogSlug = blogPosts[0]?.slug;
  if (firstBlogSlug) {
    const resSlug = await fetch(`http://localhost:3000/blog/${firstBlogSlug}`);
    if (resSlug.status === 200) {
      console.log(`✓ Blog detail page (/blog/${firstBlogSlug}) loaded with HTTP 200 OK`);
    } else {
      throw new Error(`Blog detail page failed: HTTP ${resSlug.status}`);
    }
  }

  // 4. Security Verification
  console.log("\n[4/4] Security Verification: No Database Credentials Leaked...");
  const rawHost = "ep-lively-band-a5x2j7sa-pooler.us-east-2.aws.neon.tech";
  const prodsStr = JSON.stringify(dataProds);
  const catsStr = JSON.stringify(dataCats);
  if (!prodsStr.includes(rawHost) && !catsStr.includes(rawHost)) {
    console.log("✓ API responses do not expose internal database hostnames");
  } else {
    throw new Error("Security Alert: Database host exposed in client API responses!");
  }

  console.log("\n===============================================================");
  console.log("          ALL DATABASE CONNECTIVITY TESTS PASSED!              ");
  console.log("===============================================================");

  await prisma.$disconnect();
  process.exit(0);
}

verifyAll().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
