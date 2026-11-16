/**
 * Automated Verification Script for NutriFlexs Personalized Nutrition Onboarding
 * Tests calculation formulas, feasibility checks, database persistence in Neon PostgreSQL,
 * partial progress resumption, and completion persistence.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Replicate pure domain calculations to test logic directly in pure Node environment
function calculateAge(birthDateStr) {
  if (!birthDateStr) return 26;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return 26;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(16, Math.min(age, 90));
}

function calculateNutritionTargets(data) {
  const weightKg = data.weightKg || 68;
  const heightCm = data.heightCm || 172;
  const age = calculateAge(data.birthDate);
  const sex = data.sex || "prefer_not_to_say";

  let bmi = null;
  let bmiCategory = null;
  if (heightCm > 0 && weightKg > 0) {
    const heightM = heightCm / 100;
    bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
    if (bmi < 18.5) bmiCategory = "Underweight";
    else if (bmi < 24.9) bmiCategory = "Normal Weight";
    else if (bmi < 29.9) bmiCategory = "Overweight";
    else bmiCategory = "Obese";
  }

  let bmr;
  if (sex === "male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (sex === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
  }
  bmr = Math.round(bmr);

  let activityMultiplier = 1.375;
  if (data.workoutFrequency === "4_6_days") {
    activityMultiplier = 1.55;
  } else if (data.workoutFrequency === "7_plus_days") {
    activityMultiplier = 1.725;
  } else if (data.workoutFrequency === "none") {
    activityMultiplier = 1.2;
  }
  const tdee = Math.round(bmr * activityMultiplier);

  let dailyCalories = tdee;
  const pace = data.preferredPace || "moderate";

  let deficit = 0;
  if (pace === "slow") deficit = 250;
  else if (pace === "moderate") deficit = 400;
  else if (pace === "fast") deficit = 550;

  if (data.primaryGoal === "lose_weight") {
    dailyCalories = tdee - deficit;
    const minCalories = sex === "female" ? 1200 : 1450;
    dailyCalories = Math.max(minCalories, dailyCalories);
  } else if (data.primaryGoal === "build_muscle") {
    const surplus = pace === "slow" ? 200 : 350;
    dailyCalories = tdee + surplus;
  } else if (data.primaryGoal === "improve_fitness") {
    dailyCalories = Math.round(tdee - 150);
  } else {
    dailyCalories = tdee;
  }
  dailyCalories = Math.round(dailyCalories);

  let proteinMultiplier = 1.8;
  if (data.primaryGoal === "build_muscle" || data.primaryGoal === "improve_fitness") {
    proteinMultiplier = 2.0;
  } else if (data.primaryGoal === "lose_weight") {
    proteinMultiplier = 1.9;
  }
  let proteinGrams = Math.round(weightKg * proteinMultiplier);
  proteinGrams = Math.max(90, Math.min(proteinGrams, 250));

  const fatCalories = dailyCalories * 0.28;
  const fatGrams = Math.round(fatCalories / 9);

  const proteinCalories = proteinGrams * 4;
  const remainingCalories = dailyCalories - proteinCalories - (fatGrams * 9);
  const carbsGrams = Math.max(50, Math.round(remainingCalories / 4));

  let targetDeltaKg = 0;
  if (data.primaryGoal === "lose_weight" && data.desiredGoalTarget?.targetWeightKg) {
    targetDeltaKg = Math.max(0, weightKg - data.desiredGoalTarget.targetWeightKg);
  } else if (data.primaryGoal === "build_muscle" && data.desiredGoalTarget?.targetWeightKg) {
    targetDeltaKg = Math.max(0, data.desiredGoalTarget.targetWeightKg - weightKg);
  }

  const timelineWeeks = data.desiredTimelineWeeks || Math.max(8, Math.round(targetDeltaKg / 0.5));
  const weeklyChangeKg = timelineWeeks > 0 ? Number((targetDeltaKg / timelineWeeks).toFixed(2)) : 0.5;

  const isSafeGoal = weeklyChangeKg <= 1.0;
  const recommendedTimelineWeeks = Math.max(4, Math.ceil(targetDeltaKg / 0.5));

  let safetyNote = "Your goal pace is within healthy, sustainable guidelines.";
  if (!isSafeGoal) {
    safetyNote =
      "A weight change exceeding 1kg per week can lead to muscle loss and rebound fatigue. We recommend a safe, steady pace of 0.4–0.6kg per week.";
  }

  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    isSafeGoal,
    feasibilityAssessment: {
      isRealistic: isSafeGoal,
      weeklyChangeKg,
      recommendedTimelineWeeks,
      safetyNote,
    },
  };
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("   NUTRIFLEXS NUTRITION ONBOARDING VERIFICATION SUITE");
  console.log("==================================================================\n");

  // 1. Test Age Calculation
  console.log("1. TESTING AGE CALCULATION...");
  const age1998 = calculateAge("1998-05-15");
  assert(age1998 >= 27 && age1998 <= 29, `1998 birthdate calculates age: ${age1998}`);
  const ageNull = calculateAge(null);
  assert(ageNull === 26, `Null birthdate defaults to safe baseline age: ${ageNull}`);

  // 2. Test BMR, TDEE and Goal Calculations
  console.log("\n2. TESTING EVIDENCE-BASED NUTRITION TARGET CALCULATIONS...");
  // Sample male: 75kg, 178cm, age 26, 4-6 days workout, goal: lose weight
  const maleTargets = calculateNutritionTargets({
    sex: "male",
    birthDate: "1998-01-01",
    weightKg: 75,
    heightCm: 178,
    workoutFrequency: "4_6_days",
    primaryGoal: "lose_weight",
    preferredPace: "moderate",
    desiredGoalTarget: { targetWeightKg: 70 },
    desiredTimelineWeeks: 12,
  });

  assert(maleTargets.bmi === 23.7, `BMI calculated correctly: ${maleTargets.bmi} (Normal Weight)`);
  assert(maleTargets.bmr > 1650 && maleTargets.bmr < 1850, `BMR is in standard range: ${maleTargets.bmr} kcal`);
  assert(maleTargets.tdee > 2600 && maleTargets.tdee < 2900, `TDEE is scaled for 4-6 days: ${maleTargets.tdee} kcal`);
  assert(maleTargets.dailyCalories < maleTargets.tdee, `Lose weight creates calorie deficit: ${maleTargets.dailyCalories} kcal`);
  assert(maleTargets.proteinGrams >= 135, `Protein target is optimal for lean mass preservation: ${maleTargets.proteinGrams}g`);

  // 3. Test Feasibility & Safety Checks
  console.log("\n3. TESTING FEASIBILITY & SAFETY ASSESSMENT...");
  // Realistic goal: 5kg loss over 12 weeks = ~0.42 kg/week
  assert(
    maleTargets.feasibilityAssessment.isRealistic === true,
    `5kg in 12 weeks flagged as realistic & safe (${maleTargets.feasibilityAssessment.weeklyChangeKg} kg/week)`
  );

  // Unrealistic/Dangerous goal: 15kg loss in 4 weeks = 3.75 kg/week (> 1kg/week threshold)
  const extremeTargets = calculateNutritionTargets({
    sex: "female",
    weightKg: 80,
    heightCm: 165,
    primaryGoal: "lose_weight",
    desiredGoalTarget: { targetWeightKg: 65 },
    desiredTimelineWeeks: 4,
  });
  assert(
    extremeTargets.feasibilityAssessment.isRealistic === false,
    `Extreme goal (15kg in 4 weeks) flagged as potentially unsafe (${extremeTargets.feasibilityAssessment.weeklyChangeKg} kg/week)`
  );
  assert(
    extremeTargets.feasibilityAssessment.safetyNote.includes("exceeding 1kg"),
    "Safety note cautions against extreme loss and advises steady pace"
  );
  assert(
    extremeTargets.dailyCalories >= 1200,
    `Physiological calorie floor enforced (female >= 1200 kcal): ${extremeTargets.dailyCalories} kcal`
  );

  // 4. Test Neon PostgreSQL Persistence & Resumption
  console.log("\n4. TESTING NEON POSTGRESQL ONBOARDING PERSISTENCE...");
  const testEmail = `test_onboarding_${Date.now()}@nutriflexs.com`;

  try {
    // 4.1 Create test user
    const user = await prisma.user.create({
      data: {
        name: "Onboarding Test User",
        email: testEmail,
        role: "CUSTOMER",
      },
    });

    assert(user.hasCompletedNutritionOnboarding === false, "New customer initial onboarding status is incomplete (false)");
    assert(user.nutritionOnboardingStep === 1, "New customer initial onboarding step is 1");

    // 4.2 Save partial progress (simulate user exiting at step 6)
    const partialData = {
      sex: "male",
      heightCm: 180,
      weightKg: 78,
      workoutFrequency: "4_6_days",
    };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        nutritionOnboardingStep: 6,
        nutritionOnboardingData: partialData,
        weightKg: 78,
        heightCm: 180,
      },
    });

    const userAfterStep6 = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        nutritionOnboardingStep: true,
        nutritionOnboardingData: true,
        hasCompletedNutritionOnboarding: true,
      },
    });

    assert(userAfterStep6.nutritionOnboardingStep === 6, "Resumed onboarding step correctly stored as 6");
    assert(userAfterStep6.nutritionOnboardingData.heightCm === 180, "Partial answers preserved: height 180cm");
    assert(userAfterStep6.nutritionOnboardingData.weightKg === 78, "Partial answers preserved: weight 78kg");
    assert(userAfterStep6.hasCompletedNutritionOnboarding === false, "Status remains incomplete before completion");

    // 4.3 Complete onboarding
    const finalData = {
      sex: "male",
      birthDate: "1997-08-20",
      heightCm: 180,
      weightKg: 78,
      workoutFrequency: "4_6_days",
      dietitianConsultation: "no",
      primaryGoal: "lose_weight",
      desiredGoalTarget: { targetWeightKg: 72 },
      desiredTimelineWeeks: 12,
      preferredPace: "moderate",
      challenges: ["Lack of time", "Difficulty tracking calories"],
      dietPreference: "vegetarian",
      desiredOutcomes: ["Eat more protein", "Track Indian homemade meals"],
      calorieRolloverEnabled: true,
      notificationsEnabled: true,
    };

    const calculatedTargets = calculateNutritionTargets(finalData);

    const [updatedUser, upsertedGoal] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          hasCompletedNutritionOnboarding: true,
          nutritionOnboardingCompletedAt: new Date(),
          nutritionOnboardingStep: 19,
          nutritionOnboardingData: finalData,
          weightKg: finalData.weightKg,
          heightCm: finalData.heightCm,
          birthDate: new Date(finalData.birthDate),
          gender: finalData.sex,
          isVegetarian: true,
          calorieRolloverEnabled: true,
          notificationsEnabled: true,
          proteinGoalGrams: calculatedTargets.proteinGrams,
          customDailyProteinGoal: calculatedTargets.proteinGrams,
          primaryNutritionGoal: finalData.primaryGoal,
        },
      }),
      prisma.nutritionGoal.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          dailyCalorieGoal: calculatedTargets.dailyCalories,
          proteinGoal: calculatedTargets.proteinGrams,
          carbohydrateGoal: calculatedTargets.carbsGrams,
          fatGoal: calculatedTargets.fatGrams,
        },
        update: {
          dailyCalorieGoal: calculatedTargets.dailyCalories,
          proteinGoal: calculatedTargets.proteinGrams,
          carbohydrateGoal: calculatedTargets.carbsGrams,
          fatGoal: calculatedTargets.fatGrams,
        },
      }),
    ]);

    assert(updatedUser.hasCompletedNutritionOnboarding === true, "User marked hasCompletedNutritionOnboarding = true in Neon DB");
    assert(Boolean(updatedUser.nutritionOnboardingCompletedAt), "Completion timestamp recorded");
    assert(updatedUser.isVegetarian === true, "Dietary preference (vegetarian) synchronized to User profile");
    assert(updatedUser.calorieRolloverEnabled === true, "Calorie rollover preference saved");
    assert(Boolean(upsertedGoal), "NutritionGoal record upserted in Neon database");
    assert(upsertedGoal.dailyCalorieGoal > 1500, `NutritionGoal dailyCalorieGoal calculated & saved: ${upsertedGoal.dailyCalorieGoal} kcal`);
    assert(upsertedGoal.proteinGoal >= 140, `NutritionGoal proteinGoal calculated & saved: ${upsertedGoal.proteinGoal}g`);

    // 4.4 Verify subsequent lookup confirms permanent completion
    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { hasCompletedNutritionOnboarding: true },
    });
    assert(finalUser.hasCompletedNutritionOnboarding === true, "Subsequent check confirms onboarding is permanently complete (no re-prompt)");

    // Cleanup test record
    await prisma.user.delete({ where: { id: user.id } });
    console.log("  ✓ Test user cleaned up successfully");
  } catch (err) {
    console.error("Database test error:", err);
    failedTests++;
  }

  // Summary
  console.log("\n==================================================================");
  console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${failedTests} FAILED)`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

