const http = require("http");

async function fetchPage(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ status: res.statusCode, body: data });
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  console.log("==================================================================");
  console.log("🌿 TESTING NUTRIFLEXS /about STORYTELLING-BASED ABOUT US PAGE");
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
    const { status, body } = await fetchPage("http://localhost:3000/about");
    assert(status === 200, `/about returns HTTP 200 (actual: ${status})`);

    // SECTION 1: HERO
    assert(
      body.includes("Fuel Your Ambition") && body.includes("Nourish Your Potential"),
      "Section 1 Hero: Contains headline 'Fuel Your Ambition. Nourish Your Potential.'"
    );
    assert(
      body.includes("what you eat after a workout matters just as much as the effort you put into it"),
      "Section 1 Hero: Contains required supporting narrative"
    );
    assert(
      body.includes("Explore Our Menu") && body.includes('href="/menu"'),
      "Section 1 Hero: Contains 'Explore Our Menu' CTA linking to /menu"
    );
    assert(
      body.includes("Find a Nearby Gym") && body.includes('href="/gyms"'),
      "Section 1 Hero: Contains 'Find a Nearby Gym' CTA linking to /gyms"
    );

    // SECTION 2: MISSION, VISION & AIM
    assert(
      body.includes("Our Mission, Vision &amp; Aim") || body.includes("Our Mission, Vision & Aim"),
      "Section 2: Contains heading 'Our Mission, Vision & Aim'"
    );
    assert(
      body.includes("OUR MISSION") &&
      body.includes("Make quality fitness nutrition convenient, accessible and enjoyable"),
      "Section 2: Contains Card 1 'OUR MISSION' with exact text"
    );
    assert(
      body.includes("OUR VISION") &&
      body.includes("Build a world where healthy eating and fitness go hand in hand"),
      "Section 2: Contains Card 2 'OUR VISION' with exact text"
    );
    assert(
      body.includes("OUR AIM") &&
      body.includes("Bring thoughtfully prepared meals and refreshing beverages closer to fitness communities"),
      "Section 2: Contains Card 3 'OUR AIM' with exact text"
    );

    // SECTION 3: FROM WORKOUT TO THE RIGHT FUEL
    assert(
      body.includes("From Workout to the Right Fuel"),
      "Section 3: Contains heading 'From Workout to the Right Fuel'"
    );
    assert(
      body.includes("Every fitness journey requires consistency, effort and the right nutrition") &&
      body.includes("gap between finishing a workout and finding a nutritious meal") &&
      body.includes("Because your effort in the gym deserves better fuel outside it too"),
      "Section 3: Contains full origin story problem explanation"
    );
    assert(
      body.includes("WORKOUT") &&
      body.includes("ORDER") &&
      body.includes("FRESH PREPARATION") &&
      body.includes("PICKUP"),
      "Section 3: Contains visual journey (WORKOUT → ORDER → FRESH PREPARATION → PICKUP)"
    );

    // SECTION 4: MEET OUR FOUNDER
    assert(
      body.includes("Meet the Mind Behind NutriFlexs"),
      "Section 4: Contains heading 'Meet the Mind Behind NutriFlexs'"
    );
    assert(
      body.includes("Every meaningful idea begins with a problem worth solving"),
      "Section 4: Contains supporting introduction"
    );
    assert(
      body.includes("Good nutrition shouldn&#x27;t require a compromise") ||
      body.includes("Good nutrition shouldn't require a compromise") ||
      body.includes("Good nutrition shouldn"),
      "Section 4: Contains personal philosophy quote highlight"
    );
    assert(
      body.includes("Founder Portrait Slot") || body.includes("Founder Photograph"),
      "Section 4: Contains non-fabricated editable placeholder structure for founder"
    );

    // SECTION 5: PEOPLE WHO MAKE IT HAPPEN
    assert(
      body.includes("People Who Make It Happen"),
      "Section 5: Contains heading 'People Who Make It Happen'"
    );
    assert(
      body.includes("Behind every good meal is a team that cares about preparation, quality"),
      "Section 5: Contains team description"
    );
    assert(
      body.includes("Kitchen &amp; Food Preparation") || body.includes("Kitchen & Food Preparation"),
      "Section 5: Contains Kitchen & Food Preparation team role"
    );
    assert(
      body.includes("Nutrition &amp; Menu Development") || body.includes("Nutrition & Menu Development"),
      "Section 5: Contains Nutrition & Menu Development team role"
    );
    assert(
      body.includes("Kiosk &amp; Outlet Operations") || body.includes("Kiosk & Outlet Operations"),
      "Section 5: Contains Kiosk & Outlet Operations team role"
    );
    assert(
      body.includes("Gym &amp; Trainer Community") || body.includes("Gym & Trainer Community"),
      "Section 5: Contains Gym & Trainer Community partner role"
    );

    // SECTION 6: HOW WE BRING NUTRITION CLOSER
    assert(
      body.includes("From Preparation to Pickup"),
      "Section 6: Contains heading 'From Preparation to Pickup'"
    );
    assert(
      body.includes("THOUGHTFUL MENU") &&
      body.includes("FRESH PREPARATION") &&
      body.includes("QUICK PICKUP") &&
      body.includes("TRACK YOUR NUTRITION"),
      "Section 6: Contains all 4 connected operational steps in sequence"
    );

    // SECTION 7: OUR NUTRITION PHILOSOPHY
    assert(
      body.includes("Real Food. Real Fuel."),
      "Section 7: Contains heading 'Real Food. Real Fuel.'"
    );
    assert(
      body.includes("We believe better nutrition starts with understanding what goes into your food"),
      "Section 7: Contains philosophy description"
    );
    assert(
      body.includes("Thoughtful Ingredients") &&
      body.includes("Transparent Nutrition") &&
      body.includes("Fitness-Focused Choices") &&
      body.includes("Convenient Access"),
      "Section 7: Contains all 4 visual principles"
    );

    // SECTION 8: CLOSING CTA
    assert(
      body.includes("Your Fitness Journey Deserves Better Fuel."),
      "Section 8: Contains closing CTA heading 'Your Fitness Journey Deserves Better Fuel.'"
    );
    assert(
      body.includes("Make every workout count. Find your fuel with NutriFlexs."),
      "Section 8: Contains closing description"
    );

    // VERIFY ORDER OF SECTIONS
    const heroPos = body.indexOf("Fuel Your Ambition");
    const missionPos = body.indexOf("mission-vision-aim");
    const originPos = body.indexOf("From Workout to the Right Fuel");
    const founderPos = body.indexOf("Meet the Mind Behind NutriFlexs");
    const teamPos = body.indexOf("People Who Make It Happen");
    const processPos = body.indexOf("From Preparation to Pickup");
    const philosophyPos = body.indexOf("Real Food. Real Fuel.");
    const ctaPos = body.lastIndexOf("Your Fitness Journey Deserves Better Fuel.");

    assert(
      heroPos < missionPos &&
      missionPos < originPos &&
      originPos < founderPos &&
      founderPos < teamPos &&
      teamPos < processPos &&
      processPos < philosophyPos &&
      philosophyPos < ctaPos,
      "All 8 sections appear in the exact required chronological order"
    );

  } catch (err) {
    console.error("  ❌ UNHANDLED ERROR in test suite:", err);
    failed++;
  }

  console.log("==================================================================");
  console.log(`📊 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

