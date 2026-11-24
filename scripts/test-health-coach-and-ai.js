const http = require("http");

async function fetchJson(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, "http://127.0.0.1:3000");
    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => (rawData += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, text: rawData });
          }
        });
      }
    );

    req.on("error", (err) => reject(err));

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== NUTRIFLEXS HEALTH COACH & AI COACH INTEGRATION TESTS ===\n");
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
    }
  }

  try {
    // 1. Test GET /api/dietitians
    console.log("--- 1. Testing GET /api/dietitians ---");
    const coachesRes = await fetchJson("/api/dietitians");
    assert(coachesRes.status === 200, `Status is 200 (received ${coachesRes.status})`);
    assert(coachesRes.data.success === true, "success is true");
    assert(Array.isArray(coachesRes.data.dietitians), "dietitians is an array");
    assert(coachesRes.data.dietitians.length >= 5, `Found ${coachesRes.data.dietitians.length} coaches (expected >= 5)`);
    console.log(`Found coaches: ${coachesRes.data.dietitians.map(d => `${d.fullName} (${d.specializations?.slice(0, 2).join(", ")})`).join("; ")}`);

    // 2. Test Goal Filtering: BUILD_MUSCLE
    console.log("\n--- 2. Testing Goal Filtering: BUILD_MUSCLE ---");
    const muscleRes = await fetchJson("/api/dietitians?goal=BUILD_MUSCLE");
    assert(muscleRes.status === 200, `Status is 200 (received ${muscleRes.status})`);
    assert(muscleRes.data.dietitians.length > 0, `BUILD_MUSCLE filter returned ${muscleRes.data.dietitians.length} coaches`);
    const hasVikram = muscleRes.data.dietitians.some(c => c.fullName.includes("Vikram"));
    assert(hasVikram, "Coach Vikram Rao is included in BUILD_MUSCLE");

    // 3. Test Goal Filtering: LOSE_WEIGHT
    console.log("\n--- 3. Testing Goal Filtering: LOSE_WEIGHT ---");
    const fatLossRes = await fetchJson("/api/dietitians?goal=LOSE_WEIGHT");
    assert(fatLossRes.status === 200, `Status is 200 (received ${fatLossRes.status})`);
    const hasPriya = fatLossRes.data.dietitians.some(c => c.fullName.includes("Priya"));
    assert(hasPriya, "Coach Priya Nair is included in LOSE_WEIGHT");

    // 4. Test Coach Slot Availability
    const firstCoach = coachesRes.data.dietitians[0];
    console.log(`\n--- 4. Testing Coach Slot Availability for ${firstCoach.fullName} ---`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];
    const slotsRes = await fetchJson(`/api/dietitians/${firstCoach.id}/slots?date=${dateStr}`);
    assert(slotsRes.status === 200, `Slots status is 200 (received ${slotsRes.status})`);
    assert(slotsRes.data.success === true, "slots success is true");
    assert(Array.isArray(slotsRes.data.slots), `slots returned: ${slotsRes.data.slots?.length || 0} slots`);

    // 5. Test GET /api/ai-coach/chat (guest check)
    console.log("\n--- 5. Testing GET /api/ai-coach/chat ---");
    const chatInitRes = await fetchJson("/api/ai-coach/chat");
    assert(chatInitRes.status === 200, `AI Coach chat status is 200 (received ${chatInitRes.status})`);
    assert(chatInitRes.data.success === true, "chat success is true");
    assert(chatInitRes.data.todaySummary !== undefined, "todaySummary is present in response");

    // 6. Test POST /api/ai-coach/chat (Gemini AI inference + product recommendations)
    console.log("\n--- 6. Testing POST /api/ai-coach/chat ---");
    const testPrompt = "I just finished a heavy leg workout and need about 35g of protein. What healthy meal can I order from NutriFlexs right now?";
    console.log(`Sending message: "${testPrompt}"...`);
    const startTime = Date.now();
    const chatPostRes = await fetchJson("/api/ai-coach/chat", {
      method: "POST",
      body: {
        message: testPrompt,
      },
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Received response in ${duration}s`);

    assert(chatPostRes.status === 200, `POST /api/ai-coach/chat status is 200 (received ${chatPostRes.status})`);
    assert(chatPostRes.data.success === true, "POST success is true");
    assert(typeof chatPostRes.data.message?.content === "string", "AI message content returned");
    assert(chatPostRes.data.message?.content.length > 50, `AI message length: ${chatPostRes.data.message?.content.length} chars`);
    
    const metadata = chatPostRes.data.message?.metadata;
    console.log("\nAI Response Preview:\n" + chatPostRes.data.message.content.slice(0, 300) + "...\n");
    if (metadata) {
      console.log(`Metadata recommended products count: ${metadata.recommendedProducts?.length || 0}`);
      console.log(`Metadata recommended coaches count: ${metadata.recommendedCoaches?.length || 0}`);
      console.log(`Metadata follow-up questions: ${metadata.followUpQuestions?.length || 0}`);
    }

    console.log(`\n========================================`);
    console.log(`TEST RESULTS: ${passed}/${total} PASSED`);
    console.log(`========================================`);

  } catch (err) {
    console.error("Test execution failed with error:", err);
  }
}

runTests();
