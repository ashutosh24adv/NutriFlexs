const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

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
          if (!process.env[key]) process.env[key] = val;
        }
      });
    }
  } catch (e) {
    console.error("Failed to parse .env:", e.message);
  }
}

const prisma = new PrismaClient();

const INGREDIENTS_CATALOG = [
  { name: "Lean Chicken Breast", isOrganic: true, category: "Proteins", unit: "kg", lowStock: 8, maxStock: 50, price: 280, supplier: "FreshFarms Poultry", location: "Walk-in Chiller 1" },
  { name: "Organic Egg Whites", isOrganic: true, category: "Proteins", unit: "pcs", lowStock: 50, maxStock: 500, price: 8, supplier: "PureEggs Organic", location: "Egg Rack Chiller" },
  { name: "Fresh Paneer (Cottage Cheese)", isOrganic: true, category: "Dairy", unit: "kg", lowStock: 6, maxStock: 30, price: 340, supplier: "Heritage Dairy Co.", location: "Dairy Fridge 1" },
  { name: "Greek Yogurt (Unsweetened)", isOrganic: true, category: "Dairy", unit: "kg", lowStock: 5, maxStock: 25, price: 220, supplier: "Epigamia / Heritage", location: "Dairy Fridge 2" },
  { name: "Organic Quinoa", isOrganic: true, category: "Grains", unit: "kg", lowStock: 5, maxStock: 30, price: 180, supplier: "True Elements Organics", location: "Dry Rack A1" },
  { name: "Rolled Oats", isOrganic: true, category: "Grains", unit: "kg", lowStock: 6, maxStock: 40, price: 140, supplier: "Bagrrys India", location: "Dry Rack A2" },
  { name: "Brown Basmati Rice", isOrganic: true, category: "Grains", unit: "kg", lowStock: 10, maxStock: 60, price: 110, supplier: "India Gate Organics", location: "Dry Rack A3" },
  { name: "Baby Spinach", isOrganic: true, category: "Produce", unit: "kg", lowStock: 3, maxStock: 15, price: 70, supplier: "GreenLeaf Hydroponics", location: "Veg Crisper 1" },
  { name: "Crisp Lettuce", isOrganic: true, category: "Produce", unit: "kg", lowStock: 3, maxStock: 15, price: 85, supplier: "GreenLeaf Hydroponics", location: "Veg Crisper 1" },
  { name: "Organic Apple", isOrganic: true, category: "Produce", unit: "kg", lowStock: 10, maxStock: 50, price: 160, supplier: "Himachal Orchards", location: "Cold Storage B" },
  { name: "Organic Beetroot", isOrganic: true, category: "Produce", unit: "kg", lowStock: 8, maxStock: 40, price: 45, supplier: "Krishi Organic Mandi", location: "Veg Rack B2" },
  { name: "Organic Carrot", isOrganic: true, category: "Produce", unit: "kg", lowStock: 8, maxStock: 40, price: 50, supplier: "Krishi Organic Mandi", location: "Veg Rack B3" },
  { name: "Fresh Ginger", isOrganic: true, category: "Produce", unit: "kg", lowStock: 2, maxStock: 10, price: 120, supplier: "Krishi Organic Mandi", location: "Produce Bin C" },
  { name: "Fresh Lemon Juice", isOrganic: true, category: "Produce", unit: "litre", lowStock: 3, maxStock: 15, price: 90, supplier: "Citrus Grove Mandi", location: "Walk-in Chiller 2" },
  { name: "Unsweetened Almond Milk", isOrganic: true, category: "Dairy Alternatives", unit: "litre", lowStock: 8, maxStock: 40, price: 195, supplier: "Urban Platter", location: "Chilled Shelf 3" },
  { name: "Extra Virgin Olive Oil", isOrganic: true, category: "Oils & Condiments", unit: "litre", lowStock: 4, maxStock: 20, price: 750, supplier: "Borges India", location: "Condiments Rack" },
  { name: "Organic Chia Seeds", isOrganic: true, category: "Superfoods", unit: "kg", lowStock: 2, maxStock: 15, price: 420, supplier: "True Elements", location: "Dry Rack C1" },
  { name: "Meal Packaging Containers (Eco 750ml)", isOrganic: false, category: "Packaging", unit: "pcs", lowStock: 100, maxStock: 1000, price: 12, supplier: "EcoPack Solutions", location: "Packaging Station" },
  { name: "Cold-Press Juice Bottles (350ml Glass)", isOrganic: false, category: "Packaging", unit: "pcs", lowStock: 50, maxStock: 500, price: 18, supplier: "PureGlass Containers", location: "Bottling Area" },
  { name: "Eco Cutlery & Napkin Sets", isOrganic: false, category: "Packaging", unit: "pcs", lowStock: 100, maxStock: 1000, price: 4, supplier: "EcoPack Solutions", location: "Packaging Station" }
];

async function main() {
  console.log("Starting kitchen inventory and recipe seeding...");

  // 1. Ensure all ingredients exist
  const ingredientMap = new Map();
  for (const ing of INGREDIENTS_CATALOG) {
    let dbIng = await prisma.ingredient.findUnique({ where: { name: ing.name } });
    if (!dbIng) {
      dbIng = await prisma.ingredient.create({
        data: {
          name: ing.name,
          isOrganic: ing.isOrganic
        }
      });
      console.log(`Created ingredient: ${ing.name}`);
    }
    ingredientMap.set(ing.name, { ...ing, dbId: dbIng.id });
  }

  // 2. Fetch all outlets
  const outlets = await prisma.outlet.findMany();
  console.log(`Found ${outlets.length} outlets.`);

  // 3. For each outlet, seed inventory items
  let seededItemsCount = 0;
  for (const outlet of outlets) {
    console.log(`Seeding inventory for outlet: ${outlet.name}`);
    for (const [name, ingMeta] of ingredientMap.entries()) {
      const existing = await prisma.inventoryItem.findUnique({
        where: {
          outletId_ingredientId: {
            outletId: outlet.id,
            ingredientId: ingMeta.dbId
          }
        }
      });

      // Give varied initial quantities
      const initialQty = ingMeta.unit === 'pcs' ? Math.floor(Math.random() * 80 + 40) : Math.floor(Math.random() * 25 + 10);
      const daysToExpire = Math.floor(Math.random() * 30 + 10);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + daysToExpire);

      if (!existing) {
        await prisma.inventoryItem.create({
          data: {
            outletId: outlet.id,
            ingredientId: ingMeta.dbId,
            quantity: initialQty,
            reservedQuantity: 0,
            unit: ingMeta.unit,
            lowStockThreshold: ingMeta.lowStock,
            maxStockThreshold: ingMeta.maxStock,
            category: ingMeta.category,
            storageLocation: ingMeta.location,
            purchasePricePerUnit: ingMeta.price,
            supplier: ingMeta.supplier,
            batchNumber: `BATCH-2026-${Math.floor(Math.random() * 900 + 100)}`,
            expiryDate: expiry,
            notes: "Initial kiosk operational stock",
            isActive: true
          }
        });
        seededItemsCount++;
      } else {
        await prisma.inventoryItem.update({
          where: { id: existing.id },
          data: {
            category: ingMeta.category,
            storageLocation: ingMeta.location,
            purchasePricePerUnit: ingMeta.price,
            supplier: ingMeta.supplier,
            maxStockThreshold: ingMeta.maxStock,
            expiryDate: existing.expiryDate || expiry,
            batchNumber: existing.batchNumber || `BATCH-2026-${Math.floor(Math.random() * 900 + 100)}`,
          }
        });
      }
    }
  }

  // 4. Configure Recipes for Products
  const products = await prisma.product.findMany();
  console.log(`Configuring recipes for ${products.length} products...`);

  // Product recipe definitions
  const RECIPE_DEFINITIONS = {
    "Green Electrolyte & Alkalizer": [
      { ing: "Baby Spinach", qty: 0.08, unit: "kg", notes: "Fresh organic leaves" },
      { ing: "Organic Apple", qty: 0.15, unit: "kg", notes: "Cold-pressed" },
      { ing: "Fresh Lemon Juice", qty: 0.03, unit: "litre", notes: "Fresh squeeze" },
      { ing: "Cold-Press Juice Bottles (350ml Glass)", qty: 1, unit: "pcs", notes: "Sterilized bottle" }
    ],
    "Citrus Hydrator & Recovery": [
      { ing: "Organic Carrot", qty: 0.2, unit: "kg", notes: "Washed and peeled" },
      { ing: "Fresh Ginger", qty: 0.015, unit: "kg", notes: "Crushed decoction" },
      { ing: "Fresh Lemon Juice", qty: 0.04, unit: "litre", notes: "High vitamin C" },
      { ing: "Cold-Press Juice Bottles (350ml Glass)", qty: 1, unit: "pcs", notes: "Bottled cold" }
    ],
    "ABC Stamina Rebuilder": [
      { ing: "Organic Apple", qty: 0.15, unit: "kg", notes: "Crisp organic apple" },
      { ing: "Organic Beetroot", qty: 0.12, unit: "kg", notes: "Deep crimson root" },
      { ing: "Organic Carrot", qty: 0.15, unit: "kg", notes: "Beta carotene" },
      { ing: "Fresh Ginger", qty: 0.01, unit: "kg", notes: "Grated" },
      { ing: "Fresh Lemon Juice", qty: 0.02, unit: "litre", notes: "Fresh tart balance" },
      { ing: "Cold-Press Juice Bottles (350ml Glass)", qty: 1, unit: "pcs", notes: "Glass container" }
    ],
    "Boiled Organic Egg White Pack": [
      { ing: "Organic Egg Whites", qty: 6, unit: "pcs", notes: "Steamed and peeled soft-firm" },
      { ing: "Meal Packaging Containers (Eco 750ml)", qty: 1, unit: "pcs", notes: "Vented container" },
      { ing: "Eco Cutlery & Napkin Sets", qty: 1, unit: "pcs", notes: "Included set" }
    ],
    "Grilled Herb Chicken & Quinoa": [
      { ing: "Lean Chicken Breast", qty: 0.18, unit: "kg", notes: "Sous-vide herb grilled" },
      { ing: "Organic Quinoa", qty: 0.08, unit: "kg", notes: "Steamed fluffy quinoa" },
      { ing: "Baby Spinach", qty: 0.05, unit: "kg", notes: "Tossed greens" },
      { ing: "Extra Virgin Olive Oil", qty: 0.015, unit: "litre", notes: "Herb emulsion drizzle" },
      { ing: "Meal Packaging Containers (Eco 750ml)", qty: 1, unit: "pcs", notes: "Hot meal pack" },
      { ing: "Eco Cutlery & Napkin Sets", qty: 1, unit: "pcs", notes: "Standard fork set" }
    ],
    "Paneer High-Protein Power Bowl": [
      { ing: "Fresh Paneer (Cottage Cheese)", qty: 0.15, unit: "kg", notes: "Tawa seared spiced cubes" },
      { ing: "Brown Basmati Rice", qty: 0.08, unit: "kg", notes: "Cooked long grain" },
      { ing: "Crisp Lettuce", qty: 0.04, unit: "kg", notes: "Fresh shredded" },
      { ing: "Meal Packaging Containers (Eco 750ml)", qty: 1, unit: "pcs", notes: "Partitioned tray" },
      { ing: "Eco Cutlery & Napkin Sets", qty: 1, unit: "pcs", notes: "Cutlery set" }
    ],
    "Overnight Protein Rolled Oats": [
      { ing: "Rolled Oats", qty: 0.07, unit: "kg", notes: "Rolled whole oats" },
      { ing: "Unsweetened Almond Milk", qty: 0.18, unit: "litre", notes: "Soaked overnight" },
      { ing: "Greek Yogurt (Unsweetened)", qty: 0.05, unit: "kg", notes: "Creamy probiotic base" },
      { ing: "Organic Chia Seeds", qty: 0.015, unit: "kg", notes: "Omega-3 seed topping" },
      { ing: "Cold-Press Juice Bottles (350ml Glass)", qty: 1, unit: "pcs", notes: "Mason jar pack" }
    ]
  };

  let recipeMappingsCreated = 0;
  for (const prod of products) {
    const matchName = Object.keys(RECIPE_DEFINITIONS).find(k => 
      prod.name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(prod.name.toLowerCase())
    );

    const recipeItems = matchName ? RECIPE_DEFINITIONS[matchName] : [
      { ing: "Meal Packaging Containers (Eco 750ml)", qty: 1, unit: "pcs", notes: "Standard packaging" },
      { ing: "Eco Cutlery & Napkin Sets", qty: 1, unit: "pcs", notes: "Standard packaging" }
    ];

    for (const rItem of recipeItems) {
      const ingMeta = ingredientMap.get(rItem.ing);
      if (ingMeta) {
        await prisma.productIngredient.upsert({
          where: {
            productId_ingredientId: {
              productId: prod.id,
              ingredientId: ingMeta.dbId
            }
          },
          update: {
            amount: `${rItem.qty} ${rItem.unit}`,
            quantityRequired: rItem.qty,
            unit: rItem.unit,
            prepNotes: rItem.notes,
            isOptional: false
          },
          create: {
            productId: prod.id,
            ingredientId: ingMeta.dbId,
            amount: `${rItem.qty} ${rItem.unit}`,
            quantityRequired: rItem.qty,
            unit: rItem.unit,
            prepNotes: rItem.notes,
            isOptional: false
          }
        });
        recipeMappingsCreated++;
      }
    }
  }

  console.log(`Seeding finished successfully!`);
  console.log(`- Seeded new inventory items: ${seededItemsCount}`);
  console.log(`- Recipe ingredient mappings configured: ${recipeMappingsCreated}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
