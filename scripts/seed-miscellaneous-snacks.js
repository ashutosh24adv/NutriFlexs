const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MISCELLANEOUS_SNACKS = [
  // 1. Biscuits & Cookies
  {
    name: "Marie Gold Biscuits",
    category: "Miscellaneous Snacks",
    description: "Light, crispy tea-time biscuits made with wheat flour. (Approx. estimate)",
    caloriesPer100g: 430,
    protein: 7.5,
    carbohydrates: 78.0,
    fat: 10.0,
    defaultServingSize: 4,
    defaultServingUnit: "piece",
    servingWeightGrams: 20,
  },
  {
    name: "Digestive Biscuits",
    category: "Miscellaneous Snacks",
    description: "Semi-sweet whole wheat biscuits high in dietary fiber. (Approx. estimate)",
    caloriesPer100g: 475,
    protein: 7.0,
    carbohydrates: 65.0,
    fat: 21.0,
    defaultServingSize: 2,
    defaultServingUnit: "piece",
    servingWeightGrams: 30,
  },
  {
    name: "Parle-G Biscuits",
    category: "Miscellaneous Snacks",
    description: "Classic Indian glucose biscuits, popular with chai. (Approx. estimate)",
    caloriesPer100g: 450,
    protein: 6.5,
    carbohydrates: 77.0,
    fat: 13.0,
    defaultServingSize: 5,
    defaultServingUnit: "piece",
    servingWeightGrams: 25,
  },
  {
    name: "Chocolate Chip Cookies",
    category: "Miscellaneous Snacks",
    description: "Baked sweet cookies with rich chocolate chips. (Approx. estimate)",
    caloriesPer100g: 490,
    protein: 5.0,
    carbohydrates: 64.0,
    fat: 24.0,
    defaultServingSize: 2,
    defaultServingUnit: "piece",
    servingWeightGrams: 30,
  },
  {
    name: "Bourbon Chocolate Biscuits",
    category: "Miscellaneous Snacks",
    description: "Chocolate sandwich biscuits with smooth chocolate cream filling. (Approx. estimate)",
    caloriesPer100g: 480,
    protein: 5.5,
    carbohydrates: 70.0,
    fat: 20.0,
    defaultServingSize: 2,
    defaultServingUnit: "piece",
    servingWeightGrams: 25,
  },

  // 2. Namkeen & Mixtures
  {
    name: "Aloo Bhujia",
    category: "Miscellaneous Snacks",
    description: "Crispy spiced potato and chickpea flour noodles. (Approx. estimate)",
    caloriesPer100g: 580,
    protein: 8.0,
    carbohydrates: 42.0,
    fat: 42.0,
    defaultServingSize: 1,
    defaultServingUnit: "packet",
    servingWeightGrams: 35,
  },
  {
    name: "Besan Sev / Bhujia Namkeen",
    category: "Miscellaneous Snacks",
    description: "Crisp seasoned chickpea flour crunchy strings. (Approx. estimate)",
    caloriesPer100g: 560,
    protein: 11.0,
    carbohydrates: 44.0,
    fat: 38.0,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 30,
  },
  {
    name: "Khatta Meetha Mixture",
    category: "Miscellaneous Snacks",
    description: "Sweet and tangy Indian savory mix with sev, puffed rice, and nuts. (Approx. estimate)",
    caloriesPer100g: 530,
    protein: 9.0,
    carbohydrates: 52.0,
    fat: 32.0,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 35,
  },
  {
    name: "Poha Chivda (Roasted)",
    category: "Miscellaneous Snacks",
    description: "Dry roasted flattened rice snack with peanuts and mild spices. (Approx. estimate)",
    caloriesPer100g: 460,
    protein: 8.5,
    carbohydrates: 65.0,
    fat: 18.0,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 40,
  },
  {
    name: "Chakli / Murukku",
    category: "Miscellaneous Snacks",
    description: "Spiral crunchy snack made of rice and gram flour. (Approx. estimate)",
    caloriesPer100g: 510,
    protein: 7.0,
    carbohydrates: 58.0,
    fat: 28.0,
    defaultServingSize: 2,
    defaultServingUnit: "piece",
    servingWeightGrams: 30,
  },

  // 3. Chips & Wafers
  {
    name: "Potato Chips (Classic Salted)",
    category: "Miscellaneous Snacks",
    description: "Thin-sliced crispy fried potato chips with light sea salt. (Approx. estimate)",
    caloriesPer100g: 540,
    protein: 6.5,
    carbohydrates: 52.0,
    fat: 34.0,
    defaultServingSize: 1,
    defaultServingUnit: "packet",
    servingWeightGrams: 30,
  },
  {
    name: "Potato Chips (Spiced Masala)",
    category: "Miscellaneous Snacks",
    description: "Crispy potato chips tossed in zesty Indian masala spices. (Approx. estimate)",
    caloriesPer100g: 545,
    protein: 6.2,
    carbohydrates: 53.0,
    fat: 34.0,
    defaultServingSize: 1,
    defaultServingUnit: "packet",
    servingWeightGrams: 30,
  },
  {
    name: "Banana Chips (Kerala Style)",
    category: "Miscellaneous Snacks",
    description: "Crispy raw plantain chips fried in coconut oil. (Approx. estimate)",
    caloriesPer100g: 520,
    protein: 3.0,
    carbohydrates: 58.0,
    fat: 32.0,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 35,
  },

  // 4. Kachori & Samosa variants
  {
    name: "Khasta Moong Dal Kachori",
    category: "Miscellaneous Snacks",
    description: "Flaky crispy pastry stuffed with spiced yellow moong dal filling. (Approx. estimate)",
    caloriesPer100g: 380,
    protein: 7.5,
    carbohydrates: 45.0,
    fat: 20.0,
    defaultServingSize: 1,
    defaultServingUnit: "piece",
    servingWeightGrams: 75,
  },
  {
    name: "Pyaaz Kachori",
    category: "Miscellaneous Snacks",
    description: "Crispy Rajasthani pastry stuffed with caramelized spiced onions. (Approx. estimate)",
    caloriesPer100g: 360,
    protein: 5.5,
    carbohydrates: 42.0,
    fat: 19.0,
    defaultServingSize: 1,
    defaultServingUnit: "piece",
    servingWeightGrams: 85,
  },

  // 5. Sandwiches
  {
    name: "Veg Grilled Sandwich",
    category: "Miscellaneous Snacks",
    description: "Toasted white or brown bread with cucumber, tomato, potato, and green chutney. (Approx. estimate)",
    caloriesPer100g: 210,
    protein: 6.0,
    carbohydrates: 30.0,
    fat: 7.5,
    defaultServingSize: 1,
    defaultServingUnit: "piece",
    servingWeightGrams: 160,
  },
  {
    name: "Paneer Grilled Sandwich",
    category: "Miscellaneous Snacks",
    description: "Spiced cottage cheese filling grilled with bell peppers and chutney. (Approx. estimate)",
    caloriesPer100g: 245,
    protein: 11.5,
    carbohydrates: 26.0,
    fat: 11.0,
    defaultServingSize: 1,
    defaultServingUnit: "piece",
    servingWeightGrams: 170,
  },
  {
    name: "Cheese Toast Sandwich",
    category: "Miscellaneous Snacks",
    description: "Melted cheese with chili flakes and herbs on golden toasted bread. (Approx. estimate)",
    caloriesPer100g: 280,
    protein: 9.0,
    carbohydrates: 28.0,
    fat: 14.5,
    defaultServingSize: 1,
    defaultServingUnit: "piece",
    servingWeightGrams: 70,
  },

  // 6. Popcorn
  {
    name: "Salted Popcorn",
    category: "Miscellaneous Snacks",
    description: "Air-popped or lightly salted warm corn snack. (Approx. estimate)",
    caloriesPer100g: 385,
    protein: 12.0,
    carbohydrates: 74.0,
    fat: 4.5,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 30,
  },
  {
    name: "Butter Popcorn",
    category: "Miscellaneous Snacks",
    description: "Movie-theatre style popped corn tossed in melted savory butter. (Approx. estimate)",
    caloriesPer100g: 480,
    protein: 9.0,
    carbohydrates: 55.0,
    fat: 26.0,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 50,
  },

  // 7. Peanuts & Roasted Chana
  {
    name: "Salted Peanuts",
    category: "Miscellaneous Snacks",
    description: "Crunchy roasted peanuts tossed with light salt. (Approx. estimate)",
    caloriesPer100g: 585,
    protein: 26.0,
    carbohydrates: 15.0,
    fat: 50.0,
    defaultServingSize: 1,
    defaultServingUnit: "packet",
    servingWeightGrams: 30,
  },
  {
    name: "Masala Peanuts",
    category: "Miscellaneous Snacks",
    description: "Roasted peanuts tossed with chaat masala, chili, and lemon. (Approx. estimate)",
    caloriesPer100g: 570,
    protein: 22.0,
    carbohydrates: 24.0,
    fat: 44.0,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 35,
  },

  // 8. Other Packaged & Homemade Snacks
  {
    name: "Khamang Dhokla",
    category: "Miscellaneous Snacks",
    description: "Steamed fermented chickpea batter tempered with mustard and curry leaves. (Approx. estimate)",
    caloriesPer100g: 160,
    protein: 6.5,
    carbohydrates: 24.0,
    fat: 4.5,
    defaultServingSize: 2,
    defaultServingUnit: "piece",
    servingWeightGrams: 80,
  },
  {
    name: "Bread Pakora",
    category: "Miscellaneous Snacks",
    description: "Spiced potato sandwich coated in gram flour batter and fried crisp. (Approx. estimate)",
    caloriesPer100g: 275,
    protein: 5.5,
    carbohydrates: 28.0,
    fat: 16.0,
    defaultServingSize: 1,
    defaultServingUnit: "piece",
    servingWeightGrams: 90,
  },
  {
    name: "Mathri / Crispy Crackers",
    category: "Miscellaneous Snacks",
    description: "Traditional flaky spiced wheat crackers with ajwain and black pepper. (Approx. estimate)",
    caloriesPer100g: 520,
    protein: 7.5,
    carbohydrates: 56.0,
    fat: 30.0,
    defaultServingSize: 2,
    defaultServingUnit: "piece",
    servingWeightGrams: 40,
  },
];

async function main() {
  console.log("Seeding Miscellaneous Snacks...");

  let createdCount = 0;
  let updatedCount = 0;

  for (const item of MISCELLANEOUS_SNACKS) {
    const existing = await prisma.foodItem.findFirst({
      where: {
        name: { equals: item.name, mode: "insensitive" },
        isCustom: false,
      },
    });

    if (existing) {
      await prisma.foodItem.update({
        where: { id: existing.id },
        data: {
          category: item.category,
          description: item.description,
          caloriesPer100g: item.caloriesPer100g,
          protein: item.protein,
          carbohydrates: item.carbohydrates,
          fat: item.fat,
          defaultServingSize: item.defaultServingSize,
          defaultServingUnit: item.defaultServingUnit,
          servingWeightGrams: item.servingWeightGrams,
        },
      });
      updatedCount++;
    } else {
      await prisma.foodItem.create({
        data: {
          name: item.name,
          category: item.category,
          description: item.description,
          caloriesPer100g: item.caloriesPer100g,
          protein: item.protein,
          carbohydrates: item.carbohydrates,
          fat: item.fat,
          defaultServingSize: item.defaultServingSize,
          defaultServingUnit: item.defaultServingUnit,
          servingWeightGrams: item.servingWeightGrams,
          isCustom: false,
          isActive: true,
        },
      });
      createdCount++;
    }
  }

  // Also ensure existing "Snacks" items have Miscellaneous Snacks category or are accessible
  const existingSnacks = await prisma.foodItem.findMany({
    where: {
      category: "Snacks",
      isCustom: false,
    },
  });
  for (const item of existingSnacks) {
    await prisma.foodItem.update({
      where: { id: item.id },
      data: { category: "Miscellaneous Snacks" },
    });
    updatedCount++;
  }

  console.log(`Finished: ${createdCount} created, ${updatedCount} updated.`);
}

main()
  .catch((e) => {
    console.error("Error seeding snacks:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
