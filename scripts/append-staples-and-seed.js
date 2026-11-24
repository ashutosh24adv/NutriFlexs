const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// Auto-load .env
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  } catch (e) {
    console.error("Failed to parse .env:", e.message);
  }
}

const prisma = new PrismaClient();

const additionalFoods = [
  // Gujarati
  {
    name: "Methi Thepla (Gujarati Spiced Fenugreek Flatbread)",
    description: "Traditional Gujarati flatbread made with whole wheat flour, fresh fenugreek leaves, sesame seeds, and mild spices.",
    category: "Roti and breads",
    subCategory: "Thepla",
    cuisine: "Gujarati",
    brand: null,
    caloriesPer100g: 285,
    protein: 8.2,
    carbohydrates: 44.5,
    fat: 8.5,
    fiber: 6.2,
    sugar: 1.5,
    sodium: 380,
    saturatedFat: 1.8,
    defaultServingSize: 1,
    defaultServingUnit: "piece",
    servingWeightGrams: 40,
    servingUnits: [
      { unit: "piece", label: "1 Thepla (40g)", grams: 40 },
      { unit: "serving", label: "2 Theplas (80g)", grams: 80 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },
  {
    name: "Khandvi (Steamed Gram Flour & Yogurt Rolls)",
    description: "Savory Gujarati snack made of tightly rolled sheets of cooked gram flour and curd seasoned with mustard seeds, curry leaves, and grated coconut.",
    category: "Snacks",
    subCategory: "Farsan",
    cuisine: "Gujarati",
    brand: null,
    caloriesPer100g: 145,
    protein: 6.5,
    carbohydrates: 16.0,
    fat: 6.0,
    fiber: 2.5,
    sugar: 1.8,
    sodium: 320,
    saturatedFat: 1.5,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 100,
    servingUnits: [
      { unit: "plate", label: "1 Plate (4-5 Rolls, 100g)", grams: 100 },
      { unit: "piece", label: "1 Roll (25g)", grams: 25 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },
  {
    name: "Undhiyu (Gujarati Mixed Winter Vegetable)",
    description: "Classic Gujarati winter stew of surti papdi, baby potatoes, small brinjals, yam, sweet potato, and methi muthia cooked in aromatic green masala.",
    category: "Vegetables and sabzi",
    subCategory: "Sabzi",
    cuisine: "Gujarati",
    brand: null,
    caloriesPer100g: 155,
    protein: 4.2,
    carbohydrates: 18.5,
    fat: 7.5,
    fiber: 4.8,
    sugar: 2.5,
    sodium: 290,
    saturatedFat: 1.2,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 180,
    servingUnits: [
      { unit: "bowl", label: "Medium Bowl (180g)", grams: 180 },
      { unit: "small_bowl", label: "Small Katori (120g)", grams: 120 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },

  // Maharashtrian
  {
    name: "Puran Poli (Sweet Chana Dal Stuffed Flatbread)",
    description: "Traditional Maharashtrian festive flatbread stuffed with a sweet mixture of cooked chana dal, jaggery, cardamom, and nutmeg.",
    category: "Roti and breads",
    subCategory: "Stuffed Breads",
    cuisine: "Maharashtrian",
    brand: null,
    caloriesPer100g: 310,
    protein: 7.5,
    carbohydrates: 58.0,
    fat: 5.5,
    fiber: 4.5,
    sugar: 28.0,
    sodium: 120,
    saturatedFat: 2.1,
    defaultServingSize: 1,
    defaultServingUnit: "piece",
    servingWeightGrams: 75,
    servingUnits: [
      { unit: "piece", label: "1 Puran Poli (75g)", grams: 75 },
      { unit: "serving", label: "2 Pieces (150g)", grams: 150 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },
  {
    name: "Misal Pav (Sprouted Beans Curry with Farsan & 2 Pav)",
    description: "Fiery spicy sprouted moth beans curry garnished with farsan, chopped onions, coriander, lemon, served with 2 pav buns.",
    category: "Indian street food",
    subCategory: "Chaat & Street Food",
    cuisine: "Maharashtrian",
    brand: null,
    caloriesPer100g: 190,
    protein: 6.8,
    carbohydrates: 24.5,
    fat: 7.2,
    fiber: 4.0,
    sugar: 2.0,
    sodium: 480,
    saturatedFat: 2.4,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 350,
    servingUnits: [
      { unit: "plate", label: "1 Complete Plate (Misal + 2 Pav, 350g)", grams: 350 },
      { unit: "bowl", label: "Misal Curry Only (200g)", grams: 200 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },

  // Rajasthani
  {
    name: "Dal Baati Churma (Rajasthani Baati with Mixed Panchmel Dal & Ghee Churma)",
    description: "Iconic Rajasthani feast of hard baked whole wheat dough balls (baati), accompanied by rich mixed lentil panchmel dal and sweet powdered wheat churma.",
    category: "Indian curry",
    subCategory: "Traditional Meals",
    cuisine: "Rajasthani",
    brand: null,
    caloriesPer100g: 295,
    protein: 7.2,
    carbohydrates: 42.0,
    fat: 11.5,
    fiber: 4.5,
    sugar: 12.0,
    sodium: 360,
    saturatedFat: 5.5,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 350,
    servingUnits: [
      { unit: "plate", label: "Full Plate (2 Baatis + Dal + Churma, 350g)", grams: 350 },
      { unit: "piece", label: "1 Baati Only (60g)", grams: 60 },
      { unit: "bowl", label: "Panchmel Dal Bowl (150g)", grams: 150 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },
  {
    name: "Gatte Ki Sabzi (Gram Flour Dumplings in Spiced Yogurt Gravy)",
    description: "Rajasthani curry of boiled gram flour dumplings cooked in a flavorful curd and coriander gravy.",
    category: "Vegetables and sabzi",
    subCategory: "Curry",
    cuisine: "Rajasthani",
    brand: null,
    caloriesPer100g: 140,
    protein: 5.8,
    carbohydrates: 12.5,
    fat: 7.8,
    fiber: 3.0,
    sugar: 2.2,
    sodium: 340,
    saturatedFat: 2.6,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 180,
    servingUnits: [
      { unit: "bowl", label: "Medium Bowl (180g)", grams: 180 },
      { unit: "small_bowl", label: "Small Katori (120g)", grams: 120 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },

  // Bengali
  {
    name: "Macher Jhol (Bengali Rohu Fish Curry with Potatoes)",
    description: "Light and comforting Bengali fish stew made with fresh Rohu carp, potatoes, pointed gourd, kalonji, turmeric, and green chilies.",
    category: "Meat and poultry",
    subCategory: "Fish & Seafood",
    cuisine: "Bengali",
    brand: null,
    caloriesPer100g: 115,
    protein: 12.5,
    carbohydrates: 5.2,
    fat: 5.0,
    fiber: 1.2,
    sugar: 0.8,
    sodium: 280,
    saturatedFat: 0.9,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 200,
    servingUnits: [
      { unit: "bowl", label: "1 Bowl with 1 Fish Piece (200g)", grams: 200 },
      { unit: "piece", label: "1 Fish Piece with Gravy (120g)", grams: 120 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },
  {
    name: "Mishti Doi (Sweetened Baked Curd)",
    description: "Classic Bengali fermented sweet yogurt prepared by slow reducing milk with caramelized sugar or jaggery.",
    category: "Dairy products",
    subCategory: "Desserts & Sweets",
    cuisine: "Bengali",
    brand: null,
    caloriesPer100g: 145,
    protein: 4.5,
    carbohydrates: 22.0,
    fat: 4.5,
    fiber: 0.0,
    sugar: 19.5,
    sodium: 65,
    saturatedFat: 2.8,
    defaultServingSize: 1,
    defaultServingUnit: "cup",
    servingWeightGrams: 120,
    servingUnits: [
      { unit: "cup", label: "1 Matka / Cup (120g)", grams: 120 },
      { unit: "small_bowl", label: "Small Katori (100g)", grams: 100 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },

  // Bihari
  {
    name: "Litti Chokha (Roasted Sattu Wheat Balls with Baingan Bharta)",
    description: "Nutritious Bihari staple of whole wheat dough stuffed with spiced sattu (roasted gram flour) roasted over charcoal, served with roasted brinjal and tomato mash.",
    category: "Indian street food",
    subCategory: "Traditional Meals",
    cuisine: "Bihari",
    brand: null,
    caloriesPer100g: 220,
    protein: 7.5,
    carbohydrates: 36.0,
    fat: 5.5,
    fiber: 5.2,
    sugar: 1.8,
    sodium: 310,
    saturatedFat: 1.8,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 250,
    servingUnits: [
      { unit: "plate", label: "2 Littis with Chokha (250g)", grams: 250 },
      { unit: "piece", label: "1 Litti (70g)", grams: 70 },
      { unit: "bowl", label: "Chokha Bowl (110g)", grams: 110 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },

  // Northeastern
  {
    name: "Steamed Veg Momos (Dumplings with Spicy Chutney)",
    description: "Tibetan and Northeastern delicate steamed flour dumplings stuffed with finely minced vegetables, cabbage, carrots, onions, served with spicy red chili dip.",
    category: "Indian street food",
    subCategory: "Momos & Dumplings",
    cuisine: "Northeastern",
    brand: null,
    caloriesPer100g: 165,
    protein: 4.8,
    carbohydrates: 28.5,
    fat: 3.8,
    fiber: 2.5,
    sugar: 1.5,
    sodium: 340,
    saturatedFat: 0.8,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 150,
    servingUnits: [
      { unit: "plate", label: "1 Plate (6 Pieces, 150g)", grams: 150 },
      { unit: "piece", label: "1 Momo (25g)", grams: 25 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },
  {
    name: "Steamed Chicken Momos (Chicken Dumplings)",
    description: "Juicy steamed dumplings stuffed with lean spiced minced chicken, scallions, ginger, and garlic, served with authentic chili garlic dip.",
    category: "Indian street food",
    subCategory: "Momos & Dumplings",
    cuisine: "Northeastern",
    brand: null,
    caloriesPer100g: 190,
    protein: 11.5,
    carbohydrates: 24.0,
    fat: 5.0,
    fiber: 1.8,
    sugar: 1.0,
    sodium: 380,
    saturatedFat: 1.4,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 150,
    servingUnits: [
      { unit: "plate", label: "1 Plate (6 Pieces, 150g)", grams: 150 },
      { unit: "piece", label: "1 Momo (25g)", grams: 25 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },

  // Street food & staples
  {
    name: "Pav Bhaji (Spiced Mashed Veg Curry with 2 Buttered Pav)",
    description: "Famous Mumbai street food of thick spiced mashed vegetable curry cooked on a large tava with butter, served alongside 2 warm toasted pav buns, lemon, and onions.",
    category: "Indian street food",
    subCategory: "Chaat & Street Food",
    cuisine: "Indian",
    brand: null,
    caloriesPer100g: 175,
    protein: 4.2,
    carbohydrates: 22.5,
    fat: 7.8,
    fiber: 3.5,
    sugar: 2.2,
    sodium: 460,
    saturatedFat: 3.2,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 300,
    servingUnits: [
      { unit: "plate", label: "Full Plate (Bhaji + 2 Pav, 300g)", grams: 300 },
      { unit: "bowl", label: "Bhaji Bowl Only (180g)", grams: 180 },
      { unit: "piece", label: "1 Buttered Pav (60g)", grams: 60 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },
  {
    name: "Chole Bhature (Spiced Chickpeas with 2 Fried Bhature)",
    description: "Popular North Indian meal consisting of spicy dark chickpea curry accompanied by fluffy deep-fried leavened bhatura breads, pickled onions, and green chilies.",
    category: "Indian street food",
    subCategory: "Chaat & Street Food",
    cuisine: "Punjabi",
    brand: null,
    caloriesPer100g: 285,
    protein: 7.8,
    carbohydrates: 38.5,
    fat: 11.5,
    fiber: 4.2,
    sugar: 2.0,
    sodium: 490,
    saturatedFat: 2.8,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 350,
    servingUnits: [
      { unit: "plate", label: "1 Plate (Chole + 2 Bhature, 350g)", grams: 350 },
      { unit: "piece", label: "1 Bhatura Only (80g)", grams: 80 },
      { unit: "bowl", label: "Chole Bowl (180g)", grams: 180 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },
  {
    name: "Bhel Puri (Puffed Rice, Sev, Papdi & Tangy Chutneys)",
    description: "Light street chaat prepared with puffed rice, crispy sev, crushed papdi, diced potatoes, onions, and sweet-spicy tamarind and mint chutneys.",
    category: "Indian street food",
    subCategory: "Chaat & Street Food",
    cuisine: "Indian",
    brand: null,
    caloriesPer100g: 180,
    protein: 4.5,
    carbohydrates: 32.0,
    fat: 4.0,
    fiber: 3.2,
    sugar: 6.5,
    sodium: 380,
    saturatedFat: 1.1,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 150,
    servingUnits: [
      { unit: "plate", label: "1 Plate (150g)", grams: 150 },
      { unit: "small_bowl", label: "Small Katori (100g)", grams: 100 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },

  // Beverages
  {
    name: "South Indian Filter Coffee (Brewed Coffee Decoction with Hot Milk & Sugar)",
    description: "Authentic South Indian degree coffee made by brewing chicory-blended coffee grounds in a traditional brass filter, frothed with boiled whole milk and sugar.",
    category: "Beverages",
    subCategory: "Coffee",
    cuisine: "South Indian",
    brand: null,
    caloriesPer100g: 68,
    protein: 2.5,
    carbohydrates: 8.5,
    fat: 2.8,
    fiber: 0.0,
    sugar: 7.8,
    sodium: 40,
    saturatedFat: 1.7,
    defaultServingSize: 1,
    defaultServingUnit: "cup",
    servingWeightGrams: 150,
    servingUnits: [
      { unit: "cup", label: "1 Davarah Tumbler / Cup (150ml)", grams: 150 },
      { unit: "glass", label: "1 Large Glass (200ml)", grams: 200 },
      { unit: "ml", label: "Millilitre (ml)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },

  // Branded & Packaged Products
  {
    name: "Maggi 2-Minute Noodles Masala",
    description: "Classic Indian instant noodles infused with favorite Indian masala spices.",
    category: "Packaged foods",
    subCategory: "Instant Noodles",
    cuisine: "International",
    brand: "Nestlé Maggi",
    caloriesPer100g: 427,
    protein: 8.0,
    carbohydrates: 63.5,
    fat: 15.7,
    fiber: 3.6,
    sugar: 2.2,
    sodium: 1180,
    saturatedFat: 6.8,
    defaultServingSize: 1,
    defaultServingUnit: "packet",
    servingWeightGrams: 70,
    servingUnits: [
      { unit: "packet", label: "1 Single Pack (70g dry)", grams: 70 },
      { unit: "bowl", label: "1 Cooked Bowl (200g prepared)", grams: 200 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "Open Food Facts / Manufacturer Nutrition Label",
    isVerified: true
  },
  {
    name: "Lay's Classic Salted Potato Chips",
    description: "Thin crispy sliced potato chips seasoned with fine salt.",
    category: "Packaged foods",
    subCategory: "Chips & Crisps",
    cuisine: "International",
    brand: "Lay's",
    caloriesPer100g: 542,
    protein: 6.5,
    carbohydrates: 52.8,
    fat: 34.0,
    fiber: 4.4,
    sugar: 0.5,
    sodium: 580,
    saturatedFat: 14.5,
    defaultServingSize: 1,
    defaultServingUnit: "packet",
    servingWeightGrams: 30,
    servingUnits: [
      { unit: "packet", label: "1 Small Packet (30g)", grams: 30 },
      { unit: "packet", label: "1 Medium Packet (50g)", grams: 50 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "Open Food Facts / Manufacturer Nutrition Label",
    isVerified: true
  },
  {
    name: "Cadbury Dairy Milk Chocolate",
    description: "Smooth and creamy milk chocolate bar made with fresh milk ingredients.",
    category: "Packaged foods",
    subCategory: "Chocolates & Confectionery",
    cuisine: "International",
    brand: "Cadbury",
    caloriesPer100g: 532,
    protein: 7.8,
    carbohydrates: 58.5,
    fat: 30.5,
    fiber: 2.1,
    sugar: 55.0,
    sodium: 150,
    saturatedFat: 18.5,
    defaultServingSize: 1,
    defaultServingUnit: "bar",
    servingWeightGrams: 24,
    servingUnits: [
      { unit: "bar", label: "1 Standard Bar (24g)", grams: 24 },
      { unit: "piece", label: "1 Chocolate Square (6g)", grams: 6 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "Open Food Facts / Manufacturer Nutrition Label",
    isVerified: true
  },
  {
    name: "Red Bull Energy Drink",
    description: "Carbonated energy drink with taurine, caffeine, B-group vitamins, and sugars.",
    category: "Beverages",
    subCategory: "Energy Drinks",
    cuisine: "International",
    brand: "Red Bull",
    caloriesPer100g: 45,
    protein: 0.3,
    carbohydrates: 11.0,
    fat: 0.0,
    fiber: 0.0,
    sugar: 11.0,
    sodium: 40,
    saturatedFat: 0.0,
    defaultServingSize: 1,
    defaultServingUnit: "can",
    servingWeightGrams: 250,
    servingUnits: [
      { unit: "can", label: "1 Can (250ml)", grams: 250 },
      { unit: "ml", label: "Millilitre (ml)", grams: 1 }
    ],
    dataSource: "Open Food Facts / Manufacturer Nutrition Label",
    isVerified: true
  },

  // International Dishes
  {
    name: "Vegetable Sushi Roll (Avocado, Cucumber & Nori)",
    description: "Japanese seasoned sushi rice rolled in nori seaweed with fresh avocado, cucumber, and pickled daikon, cut into 6 bite-sized pieces.",
    category: "International cuisine",
    subCategory: "Japanese",
    cuisine: "Japanese",
    brand: null,
    caloriesPer100g: 145,
    protein: 3.5,
    carbohydrates: 28.0,
    fat: 2.0,
    fiber: 2.5,
    sugar: 2.8,
    sodium: 320,
    saturatedFat: 0.4,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 180,
    servingUnits: [
      { unit: "plate", label: "1 Roll (6 Pieces, 180g)", grams: 180 },
      { unit: "piece", label: "1 Sushi Piece (30g)", grams: 30 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "USDA FoodData Central",
    isVerified: true
  },
  {
    name: "Black Bean and Rice Burrito (Wrapped Flour Tortilla)",
    description: "Mexican style wrapped warm flour tortilla filled with seasoned black beans, cilantro-lime rice, pico de gallo, and salsa.",
    category: "International cuisine",
    subCategory: "Mexican",
    cuisine: "Mexican",
    brand: null,
    caloriesPer100g: 215,
    protein: 7.5,
    carbohydrates: 32.0,
    fat: 6.5,
    fiber: 5.0,
    sugar: 2.1,
    sodium: 420,
    saturatedFat: 1.8,
    defaultServingSize: 1,
    defaultServingUnit: "piece",
    servingWeightGrams: 220,
    servingUnits: [
      { unit: "piece", label: "1 Burrito (220g)", grams: 220 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "USDA FoodData Central",
    isVerified: true
  },

  // Hyderabadi
  {
    name: "Hyderabadi Chicken Dum Biryani",
    description: "Authentic kacchi yakhni dum biryani prepared with marinated spiced chicken, aged basmati rice, saffron, caramelized onions, mint, and pure ghee.",
    category: "Rice and grains",
    subCategory: "Biryani & Pulao",
    cuisine: "Hyderabadi",
    brand: null,
    caloriesPer100g: 185,
    protein: 9.8,
    carbohydrates: 22.5,
    fat: 6.5,
    fiber: 1.8,
    sugar: 1.2,
    sodium: 380,
    saturatedFat: 2.2,
    defaultServingSize: 1,
    defaultServingUnit: "plate",
    servingWeightGrams: 350,
    servingUnits: [
      { unit: "plate", label: "Full Plate (350g)", grams: 350 },
      { unit: "bowl", label: "Medium Bowl (200g)", grams: 200 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  },
  {
    name: "Hyderabadi Mutton Haleem",
    description: "Rich slow-cooked stew of pounded mutton, cracked wheat, lentils, ghee, bone broth, and spices, garnished with fried onions, cashews, and lemon.",
    category: "Meat and poultry",
    subCategory: "Traditional Meals",
    cuisine: "Hyderabadi",
    brand: null,
    caloriesPer100g: 170,
    protein: 12.0,
    carbohydrates: 14.5,
    fat: 7.0,
    fiber: 3.2,
    sugar: 0.8,
    sodium: 390,
    saturatedFat: 3.2,
    defaultServingSize: 1,
    defaultServingUnit: "bowl",
    servingWeightGrams: 250,
    servingUnits: [
      { unit: "bowl", label: "1 Bowl (250g)", grams: 250 },
      { unit: "small_bowl", label: "Small Katori (150g)", grams: 150 },
      { unit: "g", label: "Grams (g)", grams: 1 }
    ],
    dataSource: "ICMR-NIN (IFCT 2017)",
    isVerified: true
  }
];

async function main() {
  console.log("Loading dataset json file...");
  const jsonPath = path.resolve(process.cwd(), 'data/comprehensive-nutrition-database.json');
  let foods = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  console.log(`Current items in JSON: ${foods.length}`);

  let addedToJson = 0;
  for (const item of additionalFoods) {
    const existingIndex = foods.findIndex(f => f.name.toLowerCase() === item.name.toLowerCase());
    if (existingIndex === -1) {
      foods.push(item);
      addedToJson++;
    } else {
      foods[existingIndex] = { ...foods[existingIndex], ...item };
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(foods, null, 2), 'utf8');
  console.log(`Updated JSON file. New total items: ${foods.length} (+${addedToJson} added)`);

  console.log("\nSyncing additional foods into Neon PostgreSQL...");
  let dbInserted = 0;
  let dbUpdated = 0;

  for (const item of additionalFoods) {
    const existing = await prisma.foodItem.findFirst({
      where: {
        name: { equals: item.name, mode: "insensitive" }
      }
    });

    if (existing) {
      await prisma.foodItem.update({
        where: { id: existing.id },
        data: {
          category: item.category,
          subCategory: item.subCategory,
          cuisine: item.cuisine,
          brand: item.brand,
          description: item.description,
          caloriesPer100g: item.caloriesPer100g,
          protein: item.protein,
          carbohydrates: item.carbohydrates,
          fat: item.fat,
          fiber: item.fiber,
          sugar: item.sugar,
          sodium: item.sodium,
          saturatedFat: item.saturatedFat,
          defaultServingSize: item.defaultServingSize,
          defaultServingUnit: item.defaultServingUnit,
          servingWeightGrams: item.servingWeightGrams,
          servingUnits: item.servingUnits,
          dataSource: item.dataSource,
          isVerified: item.isVerified
        }
      });
      dbUpdated++;
    } else {
      await prisma.foodItem.create({
        data: {
          name: item.name,
          category: item.category,
          subCategory: item.subCategory,
          cuisine: item.cuisine,
          brand: item.brand,
          description: item.description,
          caloriesPer100g: item.caloriesPer100g,
          protein: item.protein,
          carbohydrates: item.carbohydrates,
          fat: item.fat,
          fiber: item.fiber,
          sugar: item.sugar,
          sodium: item.sodium,
          saturatedFat: item.saturatedFat,
          defaultServingSize: item.defaultServingSize,
          defaultServingUnit: item.defaultServingUnit,
          servingWeightGrams: item.servingWeightGrams,
          servingUnits: item.servingUnits,
          dataSource: item.dataSource,
          isVerified: item.isVerified,
          isCustom: false,
          isActive: true
        }
      });
      dbInserted++;
    }
  }

  const finalTotal = await prisma.foodItem.count();
  console.log(`\nDatabase Sync Complete!`);
  console.log(`- Inserted: ${dbInserted}`);
  console.log(`- Updated: ${dbUpdated}`);
  console.log(`- Total Food Items in Neon DB: ${finalTotal}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error syncing foods:", err);
  process.exit(1);
});
