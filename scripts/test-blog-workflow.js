const http = require("http");

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  console.log("==================================================================");
  console.log("📰 TESTING NUTRIFLEXS BLOG SECTION (TWO-COLUMN FEED & DETAIL)");
  console.log("==================================================================");

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

  try {
    // -------------------------------------------------------------
    // TEST 1: MAIN BLOG FEED (/blog)
    // -------------------------------------------------------------
    console.log("\n1. Verifying Main Blog Feed (/blog):");
    const { status: blogStatus, body: blogHtml } = await fetchUrl("http://localhost:3000/blog");

    assert(blogStatus === 200, `/blog loads with HTTP 200 (actual: ${blogStatus})`);
    assert(
      blogHtml.includes("NUTRIFLEXS JOURNAL") || blogHtml.includes("Fuel for Thought"),
      "Contains NutriFlexs Journal heading banner"
    );
    assert(
      blogHtml.includes("lg:col-span-4") && blogHtml.includes("lg:col-span-8"),
      "Responsive two-column layout present (Left sidebar + Main feed)"
    );

    // Left sidebar widgets
    assert(
      blogHtml.includes("Recent Articles"),
      "Left Sidebar Widget 1: Contains 'Recent Articles'"
    );
    assert(
      blogHtml.includes("Categories") && blogHtml.includes("All Categories"),
      "Left Sidebar Widget 2: Contains 'Categories' list"
    );
    assert(
      blogHtml.includes("Featured Fuel") || blogHtml.includes("Gym Kiosk Fuel"),
      "Left Sidebar Widget 3: Contains 'Featured Fuel' products"
    );
    assert(
      blogHtml.includes("5-Min Kiosk Pickup"),
      "Left Sidebar Widget 4: Contains '5-Min Kiosk Pickup' promo"
    );

    // Main article feed items
    assert(
      blogHtml.includes("The Post-Workout Protein Window: Science vs. Fiction"),
      "Feed renders real article title from Neon PostgreSQL"
    );
    assert(
      blogHtml.includes("Dr. Ananya Rao") || blogHtml.includes("Karthik Verma"),
      "Feed renders author metadata"
    );
    assert(
      blogHtml.includes("min read"),
      "Feed renders read time metadata"
    );
    assert(
      blogHtml.includes("Read Full Article"),
      "Feed renders 'Read Full Article' link"
    );

    // Pagination
    assert(
      blogHtml.includes("Previous") && blogHtml.includes("Next"),
      "Pagination bar rendered with Previous and Next controls"
    );
    assert(
      blogHtml.includes("page=2") || blogHtml.includes('">1</') || blogHtml.includes('">2</'),
      "Pagination links to actual page numbers"
    );

    // -------------------------------------------------------------
    // TEST 2: PAGINATION PAGE 2 (/blog?page=2)
    // -------------------------------------------------------------
    console.log("\n2. Verifying Pagination on Page 2 (/blog?page=2):");
    const { status: page2Status, body: page2Html } = await fetchUrl("http://localhost:3000/blog?page=2");
    assert(page2Status === 200, `/blog?page=2 loads with HTTP 200`);
    assert(
      page2Html.includes("Micro-Habits for Active Lifestyles") ||
      page2Html.includes("The Role of Nitric Oxide in Stamina"),
      "Page 2 renders secondary page articles from Neon PostgreSQL"
    );

    // -------------------------------------------------------------
    // TEST 3: CATEGORY FILTERING (/blog?category=Hydration+%26+Juices)
    // -------------------------------------------------------------
    console.log("\n3. Verifying Category Filtering (/blog?category=Hydration+%26+Juices):");
    const { status: catStatus, body: catHtml } = await fetchUrl(
      "http://localhost:3000/blog?category=Hydration%20%26%20Juices"
    );
    assert(catStatus === 200, `/blog?category=... loads with HTTP 200`);
    assert(
      catHtml.includes("Electrolytes &amp; Cold-Pressed Hydration") ||
      catHtml.includes("Electrolytes & Cold-Pressed Hydration"),
      "Filtered feed displays articles matching the selected category"
    );

    // -------------------------------------------------------------
    // TEST 4: ARTICLE DETAIL PAGE (/blog/[slug])
    // -------------------------------------------------------------
    console.log("\n4. Verifying Article Detail Page (/blog/[slug]):");
    const testSlug = "post-workout-protein-window-science-vs-fiction";
    const { status: detailStatus, body: detailHtml } = await fetchUrl(
      `http://localhost:3000/blog/${testSlug}`
    );

    assert(detailStatus === 200, `/blog/${testSlug} loads with HTTP 200`);
    assert(
      detailHtml.includes("Home") &&
      detailHtml.includes("Blog") &&
      detailHtml.includes("Strength &amp; Recovery"),
      "Article Detail: Breadcrumbs navigation rendered"
    );
    assert(
      detailHtml.includes("The Post-Workout Protein Window: Science vs. Fiction"),
      "Article Detail: Full article title rendered"
    );
    assert(
      detailHtml.includes("Dr. Ananya Rao"),
      "Article Detail: Author name rendered"
    );
    assert(
      detailHtml.includes("Understanding Post-Workout Recovery") &&
      detailHtml.includes("The Leucine Trigger &amp; Protein Quality"),
      "Article Detail: Formatted article content and subheadings rendered"
    );
    assert(
      detailHtml.includes("Related Articles"),
      "Article Detail: 'Related Articles' section rendered"
    );
    assert(
      detailHtml.includes("Refuel Clean at NutriFlexs Kiosks") ||
      detailHtml.includes("Fuel Recommended For This Routine"),
      "Article Detail: Relevant NutriFlexs product recommendations rendered"
    );
    assert(
      detailHtml.includes("Back to All Articles"),
      "Article Detail: 'Back to All Articles' link rendered"
    );

    // -------------------------------------------------------------
    // TEST 5: 404 ON INVALID SLUG
    // -------------------------------------------------------------
    console.log("\n5. Verifying 404 for Non-Existent Article Slug:");
    const { status: notFoundStatus } = await fetchUrl(
      "http://localhost:3000/blog/non-existent-random-article-slug"
    );
    assert(
      notFoundStatus === 404,
      `Non-existent article slug returns HTTP 404 (actual: ${notFoundStatus})`
    );

    // -------------------------------------------------------------
    // TEST 6: BACKEND JSON API (/api/blog)
    // -------------------------------------------------------------
    console.log("\n6. Verifying Backend Blog API (/api/blog):");
    const { status: apiStatus, body: apiBody } = await fetchUrl(
      "http://localhost:3000/api/blog?page=1&limit=4"
    );
    assert(apiStatus === 200, `/api/blog returns HTTP 200`);
    const apiJson = JSON.parse(apiBody);
    assert(apiJson.success === true, `API returns success: true`);
    assert(Array.isArray(apiJson.articles) && apiJson.articles.length === 4, `API returns paginated articles array of 4`);
    assert(apiJson.totalPages === 2, `API calculates totalPages = 2 for 6 articles at limit 4`);
    assert(apiJson.recentArticles?.length > 0, `API returns recentArticles for sidebar`);
    assert(apiJson.featuredProducts?.length > 0, `API returns featuredProducts for sidebar`);

  } catch (err) {
    console.error("  ❌ UNHANDLED ERROR in test suite:", err);
    failed++;
  }

  console.log("\n==================================================================");
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

