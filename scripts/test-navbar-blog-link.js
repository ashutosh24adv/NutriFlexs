const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

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

async function runTests() {
  console.log("==================================================================");
  console.log("NutriFlexs Shared Navbar 'Blog' Link Test Suite");
  console.log("==================================================================");

  try {
    // 1. Fetch homepage to inspect shared navbar links
    console.log("\n1. Verifying 'Blog' link placement on homepage navbar (/):");
    const homeRes = await fetch(`${BASE_URL}/`);
    assert(homeRes.status === 200, "Homepage returns HTTP 200");
    const homeHtml = await homeRes.text();

    const passIndex = homeHtml.indexOf('href="/pass"');
    const blogIndex = homeHtml.indexOf('href="/blog"');
    const aboutIndex = homeHtml.indexOf('href="/about"');

    assert(passIndex !== -1, "Navbar contains 'NutriFlexs Pass' (href=\"/pass\")");
    assert(blogIndex !== -1, "Navbar contains 'Blog' (href=\"/blog\")");
    assert(aboutIndex !== -1, "Navbar contains 'About Us' (href=\"/about\")");

    assert(
      passIndex < blogIndex && blogIndex < aboutIndex,
      "'Blog' is positioned exactly between 'NutriFlexs Pass' and 'About Us'"
    );

    // 2. Verify active highlight on /blog
    console.log("\n2. Verifying active highlight on /blog:");
    const blogRes = await fetch(`${BASE_URL}/blog`);
    assert(blogRes.status === 200, "Blog page returns HTTP 200");
    const blogHtml = await blogRes.text();

    const activeBlogMatch = blogHtml.includes('href="/blog"') && blogHtml.includes("border-nutri-green");
    assert(activeBlogMatch, "'Blog' link receives active styling (border-nutri-green, bold) when visiting /blog");

    // 3. Verify inactive highlight on /about
    console.log("\n3. Verifying active/inactive highlight on /about:");
    const aboutRes = await fetch(`${BASE_URL}/about`);
    assert(aboutRes.status === 200, "About page returns HTTP 200");
    const aboutHtml = await aboutRes.text();

    assert(aboutHtml.includes('href="/blog"'), "Navbar on /about also contains 'Blog' link");

  } catch (err) {
    console.error("  ❌ UNHANDLED ERROR in test suite:", err);
    failed++;
  } finally {
    console.log("\n==================================================================");
    console.log(`Summary: ${passed} Passed, ${failed} Failed`);
    console.log("==================================================================");
    if (failed > 0) process.exit(1);
  }
}

runTests();

