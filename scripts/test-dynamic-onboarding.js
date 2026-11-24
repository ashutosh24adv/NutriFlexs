const assert = require("assert");
const { PrismaClient } = require("@prisma/client");
const {
  getActiveFlow,
  pruneIrrelevantAnswers,
  validateQuestionNode,
} = require("/tmp/onboarding-test/onboarding-engine.js");

const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("NutriFlexs Dynamic Conditional Onboarding Test Suite");
  console.log("==================================================\n");

  // 1. Weight Loss branch
  console.log("1. Testing Weight Loss branch...");
  const loseFlow = getActiveFlow({
    primaryGoal: "lose_weight",
    workoutFrequency: "3_4_sessions",
    dietPreference: "vegetarian",
    hasAllergies: "no",
    dietitianConsultation: "no",
  });
  assert(loseFlow.includes("target_weight"), "Lose weight must ask target_weight");
  assert(loseFlow.includes("weight_loss_pace"), "Lose weight must ask weight_loss_pace");
  assert(loseFlow.includes("goal_timeline"), "Lose weight must ask goal_timeline");
  assert(loseFlow.includes("goal_realism"), "Lose weight must include goal_realism");
  assert(loseFlow.includes("weight_challenges"), "Lose weight must ask weight_challenges");
  assert(!loseFlow.includes("muscle_focus"), "Lose weight must NOT ask muscle_focus");
  assert(!loseFlow.includes("gym_access"), "Lose weight must NOT ask gym_access");
  assert(!loseFlow.includes("maintain_focus"), "Lose weight must NOT ask maintain_focus");
  assert(!loseFlow.includes("fitness_objective"), "Lose weight must NOT ask fitness_objective");
  console.log(`✓ Weight Loss flow verified (${loseFlow.length} active nodes)`);

  // 2. Gain Weight & Build Muscle branch
  console.log("2. Testing Gain Weight & Build Muscle branch...");
  const gainFlow = getActiveFlow({
    primaryGoal: "gain_weight_build_muscle",
    workoutFrequency: "5_6_sessions",
    dietPreference: "non_vegetarian",
    hasAllergies: "no",
    dietitianConsultation: "no",
  });
  assert(gainFlow.includes("target_weight"), "Gain weight must ask target_weight");
  assert(gainFlow.includes("muscle_focus"), "Gain weight must ask muscle_focus");
  assert(gainFlow.includes("gym_access"), "Gain weight must ask gym_access");
  assert(!gainFlow.includes("weight_loss_pace"), "Gain weight must NOT ask weight_loss_pace");
  assert(!gainFlow.includes("weight_challenges"), "Gain weight must NOT ask weight_challenges");
  console.log(`✓ Gain Weight & Build Muscle flow verified (${gainFlow.length} active nodes)`);

  // 3. Maintain Weight branch
  console.log("3. Testing Maintain Weight branch...");
  const maintainFlow = getActiveFlow({
    primaryGoal: "maintain",
    workoutFrequency: "1_2_sessions",
    dietPreference: "no_specific",
    hasAllergies: "no",
    dietitianConsultation: "prefer_not_to_say",
  });
  assert(maintainFlow.includes("current_weight"), "Maintain must ask current_weight");
  assert(maintainFlow.includes("maintain_focus"), "Maintain must ask maintain_focus");
  assert(maintainFlow.includes("nutrition_challenges"), "Maintain must ask nutrition_challenges");
  assert(!maintainFlow.includes("target_weight"), "Maintain must NOT ask target_weight");
  assert(!maintainFlow.includes("goal_timeline"), "Maintain must NOT ask goal_timeline");
  console.log(`✓ Maintain Weight flow verified (${maintainFlow.length} active nodes)`);

  // 4. Improve Fitness & Body Composition branch
  console.log("4. Testing Improve Fitness & Body Composition branch...");
  const fitnessFlow = getActiveFlow({
    primaryGoal: "improve_fitness",
    workoutFrequency: "3_4_sessions",
    dietPreference: "eggetarian",
    hasAllergies: "no",
    dietitianConsultation: "no",
  });
  assert(fitnessFlow.includes("fitness_objective"), "Fitness must ask fitness_objective");
  assert(fitnessFlow.includes("activity_level"), "Fitness must ask activity_level");
  assert(fitnessFlow.includes("lifestyle_challenges"), "Fitness must ask lifestyle_challenges");
  assert(!fitnessFlow.includes("target_weight"), "Fitness must NOT ask target_weight");
  console.log(`✓ Improve Fitness flow verified (${fitnessFlow.length} active nodes)`);

  // 5. Zero workout sessions
  console.log("5. Testing Zero workout sessions branch...");
  const zeroFlow = getActiveFlow({
    primaryGoal: "lose_weight",
    workoutFrequency: "0_sessions",
    planningToStartExercise: "yes_soon",
  });
  assert(zeroFlow.includes("planning_to_start_exercise"), "0 sessions must ask planning_to_start_exercise");
  assert(zeroFlow.includes("starter_activity_type"), "Planning to start must ask starter_activity_type");
  assert(!zeroFlow.includes("workout_intensity"), "0 sessions must NOT ask workout_intensity");
  assert(!zeroFlow.includes("workout_duration"), "0 sessions must NOT ask workout_duration");
  console.log("✓ Zero workout sessions branch verified");

  // 6. 7+ workout sessions
  console.log("6. Testing 7+ workout sessions branch...");
  const highVolFlow = getActiveFlow({
    primaryGoal: "gain_weight_build_muscle",
    workoutFrequency: "7_plus_sessions",
  });
  assert(highVolFlow.includes("workout_intensity"), "7+ sessions must ask workout_intensity");
  assert(highVolFlow.includes("rest_recovery_days"), "7+ sessions must ask rest_recovery_days");
  assert(highVolFlow.includes("workout_type"), "7+ sessions must ask workout_type");
  assert(!highVolFlow.includes("planning_to_start_exercise"), "7+ sessions must NOT ask planning_to_start");
  assert(!highVolFlow.includes("workout_duration"), "7+ sessions must NOT ask 1-4 session duration");
  console.log("✓ 7+ workout sessions branch verified");

  // 7, 8, 9. Diet preferences (Vegetarian, Vegan, Non-veg, No specific)
  console.log("7-9. Testing Dietary branches (Vegetarian, Vegan, Non-vegetarian, No specific)...");
  for (const diet of ["vegetarian", "vegan", "eggetarian", "non_vegetarian"]) {
    const f = getActiveFlow({ dietPreference: diet });
    assert(f.includes("protein_sources"), `${diet} must include protein_sources`);
  }
  const noSpecFlow = getActiveFlow({ dietPreference: "no_specific" });
  assert(!noSpecFlow.includes("protein_sources"), "no_specific must skip protein_sources");
  console.log("✓ All dietary branches verified");

  // 10. Dietary restrictions / allergies
  console.log("10. Testing Dietary restrictions / allergies branch...");
  const allergyYesFlow = getActiveFlow({ hasAllergies: "yes" });
  const allergyNoFlow = getActiveFlow({ hasAllergies: "no" });
  assert(allergyYesFlow.includes("allergy_details"), "hasAllergies=yes must ask allergy_details");
  assert(!allergyNoFlow.includes("allergy_details"), "hasAllergies=no must skip allergy_details");
  console.log("✓ Allergy branching verified");

  // 11. Existing dietitian consultation
  console.log("11. Testing Dietitian consultation branch...");
  const dietYesFlow = getActiveFlow({ dietitianConsultation: "yes" });
  const dietNoFlow = getActiveFlow({ dietitianConsultation: "no" });
  assert(dietYesFlow.includes("following_diet_plan"), "Dietitian=yes must ask following_diet_plan");
  assert(dietYesFlow.includes("share_existing_targets"), "Dietitian=yes must ask share_existing_targets");
  assert(!dietYesFlow.includes("want_personalized_guidance"), "Dietitian=yes must skip want_personalized_guidance");
  assert(dietNoFlow.includes("want_personalized_guidance"), "Dietitian=no must ask want_personalized_guidance");
  assert(!dietNoFlow.includes("following_diet_plan"), "Dietitian=no must skip following_diet_plan");
  console.log("✓ Dietitian consultation branching verified");

  // 12. Changing answers midway & pruning irrelevant answers
  console.log("12. Testing changing answers midway & pruning irrelevant answers...");
  const initialAnswers = {
    gender: "male",
    weightKg: 75,
    primaryGoal: "gain_weight_build_muscle",
    muscleFocus: "muscle_building",
    gymAccess: "commercial_gym",
    workoutFrequency: "0_sessions",
    planningToStartExercise: "yes_soon",
    starterActivityType: "gym_strength",
    dietPreference: "vegetarian",
    proteinSources: ["Paneer", "Tofu"],
  };
  // User changes primaryGoal -> lose_weight, workoutFrequency -> 7_plus_sessions, dietPreference -> no_specific
  const changed = {
    ...initialAnswers,
    primaryGoal: "lose_weight",
    workoutFrequency: "7_plus_sessions",
    dietPreference: "no_specific",
  };
  const newFlow = getActiveFlow(changed);
  const pruned = pruneIrrelevantAnswers(changed, newFlow);
  assert.strictEqual(pruned.weightKg, 75, "Relevant weightKg must be preserved");
  assert.strictEqual(pruned.gender, "male", "Relevant gender must be preserved");
  assert.strictEqual(pruned.muscleFocus, null, "Irrelevant muscleFocus must be cleared");
  assert.strictEqual(pruned.gymAccess, null, "Irrelevant gymAccess must be cleared");
  assert.strictEqual(pruned.planningToStartExercise, null, "Irrelevant planningToStartExercise must be cleared");
  assert.strictEqual(pruned.starterActivityType, null, "Irrelevant starterActivityType must be cleared");
  assert.deepStrictEqual(pruned.proteinSources, [], "Irrelevant proteinSources must be cleared");
  console.log("✓ Mid-flow pruning & preservation verified");

  // Validation check: only validates active branch questions
  assert.strictEqual(validateQuestionNode("target_weight", { primaryGoal: "lose_weight", weightKg: 70, desiredGoalTarget: { targetWeightKg: 75 } }) !== null, true);
  assert.strictEqual(validateQuestionNode("target_weight", { primaryGoal: "lose_weight", weightKg: 70, desiredGoalTarget: { targetWeightKg: 64 } }), null);

  // 13. API Calculation & Neon DB Save/Resume Test
  console.log("\n13. Testing Calculation API & Neon PostgreSQL Save/Resume...");
  const calcRes = await fetch("http://localhost:3000/api/nutrition/onboarding/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gender: "male",
      birthDate: "1996-04-10",
      heightCm: 175,
      weightKg: 82,
      primaryGoal: "lose_weight",
      desiredGoalTarget: { targetWeightKg: 70 },
      desiredTimelineWeeks: 4, // Aggressive: 12kg in 4 weeks = 3kg/wk!
      preferredPace: "moderate",
      workoutFrequency: "3_4_sessions",
    }),
  });
  const calcJson = await calcRes.json();
  assert(calcJson.success, "Calculate API should succeed");
  assert.strictEqual(calcJson.targets.hasCompleteMetrics, true);
  assert.strictEqual(calcJson.targets.feasibilityAssessment.isRealistic, false, "12kg in 4 weeks should be flagged unrealistic");
  assert(calcJson.targets.feasibilityAssessment.recommendedTimelineWeeks >= 24, "Should recommend >=24 weeks");
  console.log(`✓ Realism check verified: 12kg in 4 wks flagged unrealistic, recommended ${calcJson.targets.feasibilityAssessment.recommendedTimelineWeeks} wks`);

  // Test missing metrics (Prefer not to say) does NOT fabricate BMR/TDEE
  const missingRes = await fetch("http://localhost:3000/api/nutrition/onboarding/calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gender: "prefer_not_to_say",
      birthDateSkipped: true,
      heightSkipped: true,
      weightKg: 65,
      primaryGoal: "maintain",
      workoutFrequency: "1_2_sessions",
    }),
  });
  const missingJson = await missingRes.json();
  assert.strictEqual(missingJson.targets.hasCompleteMetrics, false, "Should report incomplete metrics");
  assert.strictEqual(missingJson.targets.dailyCalories, null, "Should not fabricate dailyCalories when height/age missing");
  console.log("✓ Missing metrics safety verified (no fabricated default calculations)");

  // Test DB save & resume round-trip
  let testUser = await prisma.user.findFirst({
    where: { email: "test_dynamic_onboarding@nutriflexs.com" },
  });
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: "test_dynamic_onboarding@nutriflexs.com",
        name: "Dynamic Onboarding Tester",
        role: "CUSTOMER",
      },
    });
  }

  const partialPayload = {
    currentNodeId: "protein_sources",
    gender: "female",
    primaryGoal: "gain_weight_build_muscle",
    weightKg: 55,
    dietPreference: "vegan",
  };
  await prisma.user.update({
    where: { id: testUser.id },
    data: {
      nutritionOnboardingStep: 11,
      nutritionOnboardingData: partialPayload,
    },
  });

  const fetched = await prisma.user.findUnique({
    where: { id: testUser.id },
    select: { nutritionOnboardingStep: true, nutritionOnboardingData: true },
  });
  assert.strictEqual(fetched.nutritionOnboardingData.currentNodeId, "protein_sources");
  assert.strictEqual(fetched.nutritionOnboardingData.dietPreference, "vegan");
  console.log("✓ Save & resume persistence in Neon PostgreSQL verified");

  // Cleanup test user
  await prisma.user.delete({ where: { id: testUser.id } });
  await prisma.$disconnect();

  console.log("\n==================================================");
  console.log("ALL 13 ONBOARDING SCENARIOS PASSED 100%!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("\n❌ Test Failed:", err);
  process.exit(1);
});
