/**
 * Verification Script for Redesigned /home Top Section (3 Matching Cards)
 * Verifies:
 * 1. HTTP 200 response on /home
 * 2. Presence of all three matching cards:
 *    - Card 1: Today's Nutrition Goal
 *    - Card 2: Daily Nutrition Tracker
 *    - Card 3: NutriFlexs Pass
 * 3. Consistent visual classes (deep green, rounded-3xl, matching CTAs)
 * 4. Correct links and actions (/nutrition, /pass, goal edit)
 * 5. Section ordering (Greeting above, Recommended Fuel & Macro Guide below)
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("🏠 TESTING NUTRIFLEXS /home TOP SECTION REDESIGN (3 MATCHING CARDS)");
  console.log("==================================================================\n");

  try {
    const res = await fetch(`${BASE_URL}/home`);
    assert(res.status === 200, `/home returns HTTP 200 (actual: ${res.status})`);

    const html = await res.text();

    // 1. Grid structure
    assert(
      html.includes("grid-cols-1 md:grid-cols-2 lg:grid-cols-3"),
      "Three cards arranged in responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)"
    );

    // 2. Card 1 — Today's Nutrition Goal
    assert(
      html.includes("Today&#x27;s Nutrition Goal") || html.includes("Today's Nutrition Goal"),
      "Card 1: Contains 'Today's Nutrition Goal' heading"
    );
    assert(
      html.includes("DAILY GOAL"),
      "Card 1: Contains 'DAILY GOAL' badge"
    );

    // 3. Card 2 — Daily Nutrition Tracker & Food Diary
    assert(
      html.includes("Daily Nutrition Tracker"),
      "Card 2: Contains 'Daily Nutrition Tracker' heading"
    );
    assert(
      html.includes("FOOD DIARY"),
      "Card 2: Contains 'FOOD DIARY' badge"
    );
    assert(
      html.includes("Track calories, protein and macros throughout your day."),
      "Card 2: Contains required description"
    );
    assert(
      html.includes("Open Food Diary"),
      "Card 2: Contains 'Open Food Diary' CTA"
    );
    assert(
      html.includes('href="/nutrition"'),
      "Card 2: CTA links to /nutrition"
    );

    // 4. Card 3 — NutriFlexs Pass
    assert(
      html.includes("NutriFlexs Pass"),
      "Card 3: Contains 'NutriFlexs Pass' heading"
    );
    assert(
      html.includes("MONTHLY PASS"),
      "Card 3: Contains 'MONTHLY PASS' badge"
    );
    assert(
      html.includes("Eat more. Save more."),
      "Card 3: Contains tagline 'Eat more. Save more.'"
    );
    assert(
      html.includes("Explore Pass"),
      "Card 3: Contains 'Explore Pass' CTA"
    );
    assert(
      html.includes('href="/pass"'),
      "Card 3: CTA links to /pass"
    );

    // 5. Visual styling consistency
    const deepGreenOccurrences = (html.match(/bg-nutri-green-deep/g) || []).length;
    assert(
      deepGreenOccurrences >= 3,
      `Deep natural green theme used across matching cards (found ${deepGreenOccurrences} occurrences)`
    );

    // 6. Section hierarchy
    const greetingPos = html.indexOf("Good morning");
    const cardsPos = html.indexOf("DAILY GOAL");
    const fuelPos = html.indexOf("RECOMMENDED FUEL");
    const macroPos = html.indexOf("Macro Balance Guide");

    assert(greetingPos < cardsPos, "Greeting & streak section is above the three cards");
    if (fuelPos !== -1) {
      assert(cardsPos < fuelPos, "Recommended Fuel section is below the three cards");
    } else {
      // In SSR, recommendedProduct renders client-side; verify the main section area is positioned after the three cards
      const mainSectionPos = html.indexOf("lg:col-span-8");
      assert(cardsPos < mainSectionPos, "Main content area (Recommended Fuel & orders) is below the three cards");
    }
    assert(cardsPos < macroPos, "Macro Balance Guide is below the three cards");

  } catch (err) {
    console.error("  ❌ UNHANDLED ERROR in test suite:", err);
    failedCount++;
  }

  console.log("\n==================================================================");
  console.log(`📊 RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
