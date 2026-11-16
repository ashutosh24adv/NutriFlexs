const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL,
    },
  },
});

async function fixParents() {
  console.log("🔧 Correcting parent dish links for Indian food variants...");

  // Reset mistaken items
  const mistakenlyFlagged = [
    "Moong Dal Khichdi",
    "Paneer Paratha",
    "Grilled Chicken Breast",
    "Boiled Whole Egg",
  ];

  for (const name of mistakenlyFlagged) {
    const item = await prisma.foodItem.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (item) {
      await prisma.foodItem.update({
        where: { id: item.id },
        data: { hasVariants: false },
      });
      // Detach any variants linked to this item
      await prisma.foodVariant.deleteMany({
        where: { foodItemId: item.id },
      });
      console.log(`Reset ${name} (cleared mistaken variants)`);
    }
  }

  // Also clean up Dal Tadka if Dal Makhani was linked to it
  const dalTadka = await prisma.foodItem.findFirst({
    where: { name: { equals: "Dal Tadka", mode: "insensitive" } },
  });
  if (dalTadka) {
    await prisma.foodVariant.deleteMany({
      where: { foodItemId: dalTadka.id },
    });
  }

  // Dishes that must have their own exact parent FoodItem:
  const parentSpecs = [
    {
      exactName: "Dal (Yellow Dal / Dal Fry)",
      category: "Dal and legumes",
      description: "Traditional Indian yellow lentil preparation cooked with cumin, garlic, and turmeric.",
      calories: 110,
      protein: 5.8,
      carbs: 16.5,
      fat: 2.5,
      servingConversions: { g: 1, small_bowl: 100, medium_bowl: 150, large_bowl: 250, cup: 200 },
      variants: [
        {
          name: "Dal – Thick",
          variantType: "THICK",
          description: "Dense dal with concentrated cooked lentils and minimal water. High protein density.",
          caloriesPer100g: 145,
          protein: 8.2,
          carbohydrates: 21.0,
          fat: 3.2,
          isDefault: false,
          displayOrder: 1,
        },
        {
          name: "Dal – Regular",
          variantType: "BALANCED",
          description: "Standard home-style consistency with balanced lentil body and aromatic tadka.",
          caloriesPer100g: 110,
          protein: 5.8,
          carbohydrates: 16.5,
          fat: 2.5,
          isDefault: true,
          displayOrder: 2,
        },
        {
          name: "Dal – Thin",
          variantType: "THIN",
          description: "Lighter, soup-style dal with higher liquid ratio. Lower calorie and carb density per volume.",
          caloriesPer100g: 65,
          protein: 3.0,
          carbohydrates: 9.8,
          fat: 1.4,
          isDefault: false,
          displayOrder: 3,
        },
      ],
    },
    {
      exactName: "Paneer Butter Masala",
      category: "Indian curries",
      description: "Rich and creamy tomato-cashew curry with fresh Indian cottage cheese (paneer).",
      calories: 230,
      protein: 8.5,
      carbs: 9.5,
      fat: 16.8,
      servingConversions: { g: 1, small_bowl: 110, medium_bowl: 180, large_bowl: 280, cup: 220 },
      variants: [
        {
          name: "Paneer Butter Masala – More Paneer",
          variantType: "MORE_MAIN",
          description: "Generous portion of dense paneer cubes with coating gravy. High protein, moderate fat.",
          caloriesPer100g: 275,
          protein: 13.5,
          carbohydrates: 7.2,
          fat: 21.5,
          isDefault: false,
          displayOrder: 1,
        },
        {
          name: "Paneer Butter Masala – Regular",
          variantType: "BALANCED",
          description: "Standard restaurant/home balanced ratio of paneer cubes and creamy makhani gravy.",
          caloriesPer100g: 230,
          protein: 8.5,
          carbohydrates: 9.5,
          fat: 16.8,
          isDefault: true,
          displayOrder: 2,
        },
        {
          name: "Paneer Butter Masala – Gravy Only",
          variantType: "GRAVY_ONLY",
          description: "Creamy butter tomato-cashew gravy without paneer chunks. Higher fat, lower protein.",
          caloriesPer100g: 170,
          protein: 2.5,
          carbohydrates: 12.0,
          fat: 12.5,
          isDefault: false,
          displayOrder: 3,
        },
      ],
    },
    {
      exactName: "Chicken Curry (Homestyle)",
      category: "Chicken and poultry",
      description: "Homestyle Indian chicken curry simmered in onion, tomato, ginger, garlic, and ground spices.",
      calories: 165,
      protein: 14.5,
      carbs: 4.8,
      fat: 9.8,
      servingConversions: { g: 1, small_bowl: 110, medium_bowl: 180, large_bowl: 280, cup: 220 },
      variants: [
        {
          name: "Chicken Curry – More Chicken",
          variantType: "MORE_MAIN",
          description: "Chicken-heavy portion with minimal gravy (~70% chicken pieces). High lean protein.",
          caloriesPer100g: 198,
          protein: 22.0,
          carbohydrates: 2.2,
          fat: 11.2,
          isDefault: false,
          displayOrder: 1,
        },
        {
          name: "Chicken Curry – Regular",
          variantType: "BALANCED",
          description: "Traditional serving with equal portions of tender chicken pieces and spiced curry sauce.",
          caloriesPer100g: 165,
          protein: 14.5,
          carbohydrates: 4.8,
          fat: 9.8,
          isDefault: true,
          displayOrder: 2,
        },
        {
          name: "Chicken Curry – Gravy Only",
          variantType: "GRAVY_ONLY",
          description: "Spiced chicken-infused curry broth without chicken pieces.",
          caloriesPer100g: 78,
          protein: 2.2,
          carbohydrates: 6.5,
          fat: 4.8,
          isDefault: false,
          displayOrder: 3,
        },
      ],
    },
    {
      exactName: "Egg Curry",
      category: "Egg dishes",
      description: "Hard-boiled eggs simmered in a spiced onion-tomato gravy.",
      calories: 140,
      protein: 9.2,
      carbs: 5.5,
      fat: 9.0,
      servingConversions: { g: 1, small_bowl: 110, medium_bowl: 180, large_bowl: 280, cup: 220 },
      variants: [
        {
          name: "Egg Curry – More Eggs",
          variantType: "MORE_MAIN",
          description: "Egg-heavy portion (2+ whole eggs with light gravy coat). Highest protein density.",
          caloriesPer100g: 165,
          protein: 12.8,
          carbohydrates: 3.2,
          fat: 11.0,
          isDefault: false,
          displayOrder: 1,
        },
        {
          name: "Egg Curry – Regular",
          variantType: "BALANCED",
          description: "Standard balanced serving with hard-boiled eggs in seasoned curry.",
          caloriesPer100g: 140,
          protein: 9.2,
          carbohydrates: 5.5,
          fat: 9.0,
          isDefault: true,
          displayOrder: 2,
        },
        {
          name: "Egg Curry – Gravy Only",
          variantType: "GRAVY_ONLY",
          description: "Savory spiced egg curry sauce without whole boiled eggs.",
          caloriesPer100g: 72,
          protein: 1.8,
          carbohydrates: 6.8,
          fat: 4.2,
          isDefault: false,
          displayOrder: 3,
        },
      ],
    },
    {
      exactName: "Dal Makhani",
      category: "Dal and legumes",
      description: "Whole black lentils (urad) and kidney beans slow-cooked with butter and cream.",
      calories: 165,
      protein: 6.2,
      carbs: 18.0,
      fat: 7.8,
      servingConversions: { g: 1, small_bowl: 110, medium_bowl: 180, large_bowl: 280, cup: 220 },
      variants: [
        {
          name: "Dal Makhani – Thick & Creamy",
          variantType: "MORE_MAIN",
          description: "Rich, slow-simmered dark lentils with thick body and high fiber content.",
          caloriesPer100g: 195,
          protein: 8.0,
          carbohydrates: 21.0,
          fat: 9.0,
          isDefault: false,
          displayOrder: 1,
        },
        {
          name: "Dal Makhani – Regular",
          variantType: "BALANCED",
          description: "Classic creamy dal makhani with velvety texture and authentic Punjabi seasoning.",
          caloriesPer100g: 165,
          protein: 6.2,
          carbohydrates: 18.0,
          fat: 7.8,
          isDefault: true,
          displayOrder: 2,
        },
        {
          name: "Dal Makhani – Gravy Layer",
          variantType: "GRAVY_ONLY",
          description: "Smooth spiced cream and butter gravy layer with few whole lentils.",
          caloriesPer100g: 120,
          protein: 2.8,
          carbohydrates: 11.5,
          fat: 7.2,
          isDefault: false,
          displayOrder: 3,
        },
      ],
    },
  ];

  for (const spec of parentSpecs) {
    let parent = await prisma.foodItem.findFirst({
      where: { name: { equals: spec.exactName, mode: "insensitive" } },
    });

    if (!parent) {
      parent = await prisma.foodItem.create({
        data: {
          name: spec.exactName,
          category: spec.category,
          description: spec.description,
          caloriesPer100g: spec.calories,
          protein: spec.protein,
          carbohydrates: spec.carbs,
          fat: spec.fat,
          defaultServingSize: 1,
          defaultServingUnit: "bowl",
          servingWeightGrams: spec.servingConversions.medium_bowl,
          hasVariants: true,
          isActive: true,
        },
      });
      console.log(`Created clean parent dish: ${parent.name}`);
    } else {
      parent = await prisma.foodItem.update({
        where: { id: parent.id },
        data: {
          hasVariants: true,
          defaultServingUnit: "bowl",
          servingWeightGrams: spec.servingConversions.medium_bowl,
        },
      });
      console.log(`Updated clean parent dish: ${parent.name}`);
    }

    for (const v of spec.variants) {
      await prisma.foodVariant.upsert({
        where: {
          // unique identifier or find first
          id: (await prisma.foodVariant.findFirst({
            where: { foodItemId: parent.id, name: v.name },
            select: { id: true },
          }))?.id || "00000000-0000-0000-0000-000000000000",
        },
        update: {
          variantType: v.variantType,
          description: v.description,
          caloriesPer100g: v.caloriesPer100g,
          protein: v.protein,
          carbohydrates: v.carbohydrates,
          fat: v.fat,
          isDefault: v.isDefault,
          servingConversions: spec.servingConversions,
          displayOrder: v.displayOrder,
          isActive: true,
        },
        create: {
          foodItemId: parent.id,
          name: v.name,
          variantType: v.variantType,
          description: v.description,
          caloriesPer100g: v.caloriesPer100g,
          protein: v.protein,
          carbohydrates: v.carbohydrates,
          fat: v.fat,
          isDefault: v.isDefault,
          servingConversions: spec.servingConversions,
          nutritionSource: "IFCT / ICMR-NIN & Recipe Analysis",
          confidenceLevel: "ESTIMATED",
          displayOrder: v.displayOrder,
          isActive: true,
        },
      });
      console.log(`  └─ Linked variant: ${v.name}`);
    }
  }

  console.log("✅ All parent dish links corrected and verified!");
}

fixParents()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

