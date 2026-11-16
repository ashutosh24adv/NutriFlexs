const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("================================================================================");
  console.log("NUTRIFLEXS — THREE-PASS SUBSCRIPTION MIGRATION & SEED");
  console.log("================================================================================");

  // 1. Audit existing plans
  const existingPlans = await prisma.subscriptionPlan.findMany();
  console.log(`Found ${existingPlans.length} existing plans in database:`);
  for (const p of existingPlans) {
    console.log(`- [${p.id}] ${p.name} (type: ${p.planType}, active: ${p.isActive})`);
  }

  // 2. Mark legacy plans as LEGACY, flaggedForReview = true, isActive = false
  for (const p of existingPlans) {
    if (
      p.name === "NutriFlexs Daily Fuel Pass" ||
      p.name === "Cold-Pressed Juice Pass" ||
      p.planType === "LEGACY"
    ) {
      await prisma.subscriptionPlan.update({
        where: { id: p.id },
        data: {
          planType: "LEGACY",
          flaggedForReview: true,
          isActive: false,
        },
      });
      console.log(`✅ Safely migrated legacy plan: "${p.name}" (flagged for admin review, preserved history)`);
    }
  }

  // 3. Create or update the 3 official passes
  const threePasses = [
    {
      name: "NutriFlexs Food Pass",
      slug: "food-pass",
      planType: "FOOD_PASS",
      price: 1499,
      quarterlyPrice: 3999,
      annualPrice: 13999,
      validityDays: 30,
      creditsCount: 0,
      aiScanAllowance: 0,
      foodDiscountPercent: 15,
      hasFoodBenefits: true,
      hasNutritionBenefits: false,
      hasAiScan: false,
      hasAdvancedInsights: false,
      displayOrder: 1,
      badgeText: "ORDER FOOD",
      description: "Designed for customers who primarily use NutriFlexs for ordering fresh, high-protein food.",
      benefits: JSON.stringify([
        "15% exclusive discount on all food & beverage orders",
        "Special member-only food offers",
        "Access to selected menu promotions & upgrades",
        "Priority kiosk preparation & express counter pickup",
        "Exclusive Food Pass promotions",
      ]),
      isActive: true,
      flaggedForReview: false,
    },
    {
      name: "NutriFlexs Nutrition Pass",
      slug: "nutrition-pass",
      planType: "NUTRITION_PASS",
      price: 999,
      quarterlyPrice: 2499,
      annualPrice: 8999,
      validityDays: 30,
      creditsCount: 0,
      aiScanAllowance: 60,
      foodDiscountPercent: 0,
      hasFoodBenefits: false,
      hasNutritionBenefits: true,
      hasAiScan: true,
      hasAdvancedInsights: true,
      displayOrder: 2,
      badgeText: "TRACK NUTRITION",
      description: "Designed for customers who primarily use NutriFlexs for precise Indian nutrition tracking and AI meal scanning.",
      benefits: JSON.stringify([
        "60 AI photo-based meal scans per month",
        "Food identification with Indian gravy separation",
        "Automatic portion, calorie & macro estimation",
        "Advanced nutrition insights & trend analytics",
        "Personalized nutrition goals & exportable logs",
      ]),
      isActive: true,
      flaggedForReview: false,
    },
    {
      name: "NutriFlexs All Access Pass",
      slug: "all-access-pass",
      planType: "ALL_ACCESS_PASS",
      price: 1999,
      quarterlyPrice: 4999,
      annualPrice: 17999,
      validityDays: 30,
      creditsCount: 0,
      aiScanAllowance: 100,
      foodDiscountPercent: 20,
      hasFoodBenefits: true,
      hasNutritionBenefits: true,
      hasAiScan: true,
      hasAdvancedInsights: true,
      displayOrder: 3,
      badgeText: "RECOMMENDED · BEST VALUE",
      description: "The complete NutriFlexs membership combining all Food Pass ordering savings and all Nutrition Pass AI tracking capabilities.",
      benefits: JSON.stringify([
        "Every Food Pass benefit: 20% off all kiosk meals & priority prep",
        "Every Nutrition Pass benefit: 100 AI photo meal scans / month",
        "Complete Indian gravy-separated AI logging & macro intelligence",
        "Advanced nutrition insights, personalized goal coaching & trend reports",
        "Exclusive All Access member tasting events & chef special access",
      ]),
      isActive: true,
      flaggedForReview: false,
    },
  ];

  for (const passData of threePasses) {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [{ slug: passData.slug }, { name: passData.name }],
      },
    });

    if (existing) {
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: passData,
      });
      console.log(`✅ Updated existing plan: "${passData.name}" [ID: ${existing.id}]`);
    } else {
      const created = await prisma.subscriptionPlan.create({
        data: passData,
      });
      console.log(`✅ Created new pass: "${passData.name}" [ID: ${created.id}]`);
    }
  }

  // 4. Audit subscriptions
  const subs = await prisma.subscription.findMany({
    include: { plan: true },
  });
  console.log(`\nExisting subscriptions intact: ${subs.length}`);
  for (const s of subs) {
    console.log(`- Sub ${s.id}: Plan "${s.plan.name}" (Status: ${s.status}, Valid: ${s.endDate.toISOString()})`);
  }

  console.log("\n================================================================================");
  console.log("✅ THREE-PASS MIGRATION COMPLETED SUCCESSFULLY!");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("Migration error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
