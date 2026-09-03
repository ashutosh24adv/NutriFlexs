import { PrismaClient, Role, OrderStatus, PaymentStatus, DiscountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting NutriFlexs database seeding on Neon PostgreSQL...');

  // Clean existing tables in order
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.trainerReward.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.productIngredient.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.trainer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();
  await prisma.gym.deleteMany();

  // 1. Gyms & Outlets
  const gymCult = await prisma.gym.create({
    data: {
      name: "Cult.fit Indiranagar",
      address: "100 Feet Rd, HAL 2nd Stage, Indiranagar",
      city: "Bengaluru",
    },
  });

  const gymGolds = await prisma.gym.create({
    data: {
      name: "Gold's Gym Koramangala",
      address: "80 Feet Rd, 4th Block, Koramangala",
      city: "Bengaluru",
    },
  });

  const gymNitrro = await prisma.gym.create({
    data: {
      name: "Nitrro Wellness Bandra",
      address: "Linking Rd, Bandra West",
      city: "Mumbai",
    },
  });

  const outletCult = await prisma.outlet.create({
    data: {
      name: "Indiranagar Cult Kiosk (50m from Gym)",
      gymId: gymCult.id,
      address: "Express Kiosk #1, 100 Feet Road, Indiranagar",
      phone: "+91 98765 43210",
      isAvailable: true,
    },
  });

  const outletGolds = await prisma.outlet.create({
    data: {
      name: "Koramangala Gold Kiosk (75m from Gym)",
      gymId: gymGolds.id,
      address: "Express Kiosk #2, 80 Feet Road, Koramangala",
      phone: "+91 98765 43211",
      isAvailable: true,
    },
  });

  const outletNitrro = await prisma.outlet.create({
    data: {
      name: "Bandra Nitrro Kiosk (60m from Gym)",
      gymId: gymNitrro.id,
      address: "Express Kiosk #3, Linking Road, Bandra",
      phone: "+91 98765 43212",
      isAvailable: true,
    },
  });

  // 2. Users & Roles
  const customerAshu = await prisma.user.create({
    data: {
      name: "Ashu",
      email: "ashu@nutriflexs.com",
      role: Role.CUSTOMER,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      phone: "+91 99999 88888",
      selectedGymId: gymCult.id,
      selectedOutletId: outletCult.id,
      streakDays: 12,
      proteinGoalGrams: 120,
    },
  });

  const trainerUser = await prisma.user.create({
    data: {
      name: "Trainer Arjun",
      email: "arjun@nutriflexs.com",
      role: Role.TRAINER,
      avatar: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=300&q=80",
      phone: "+91 98888 77777",
    },
  });

  const trainerProfile = await prisma.trainer.create({
    data: {
      userId: trainerUser.id,
      referralCode: "NUTRI-ARJUN",
      totalReferrals: 8,
      activeSubscribers: 3,
      rewardsEarned: 1,
    },
  });

  const kitchenUser = await prisma.user.create({
    data: {
      name: "Indiranagar Kitchen Express",
      email: "kitchen@nutriflexs.com",
      role: Role.KITCHEN,
      selectedGymId: gymCult.id,
      selectedOutletId: outletCult.id,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      name: "NutriFlexs Admin",
      email: "admin@nutriflexs.com",
      role: Role.ADMIN,
    },
  });

  // 3. Categories
  const catJuices = await prisma.category.create({
    data: { name: "Juices", slug: "juices", description: "Cold-Pressed Organic Juices", displayOrder: 1 },
  });
  const catProtein = await prisma.category.create({
    data: { name: "Protein", slug: "protein", description: "Post-Workout Warm Bites & Eggs", displayOrder: 2 },
  });
  const catBowls = await prisma.category.create({
    data: { name: "Bowls", slug: "bowls", description: "Fresh & Balanced Clean Meal Bowls", displayOrder: 3 },
  });
  const catCombos = await prisma.category.create({
    data: { name: "Combos", slug: "combos", description: "Post-Workout Juice & Protein Combos", displayOrder: 4 },
  });

  // 4. Ingredients
  const ingApple = await prisma.ingredient.create({ data: { name: "Organic Apple", isOrganic: true } });
  const ingBeetroot = await prisma.ingredient.create({ data: { name: "Organic Beetroot", isOrganic: true } });
  const ingCarrot = await prisma.ingredient.create({ data: { name: "Organic Carrot", isOrganic: true } });
  const ingGinger = await prisma.ingredient.create({ data: { name: "Fresh Ginger", isOrganic: true } });
  const ingLemon = await prisma.ingredient.create({ data: { name: "Fresh Lemon Juice", isOrganic: true } });
  const ingSpinach = await prisma.ingredient.create({ data: { name: "Organic Spinach / Kale", isOrganic: true } });
  const ingCucumber = await prisma.ingredient.create({ data: { name: "Cucumber", isOrganic: true } });
  const ingCelery = await prisma.ingredient.create({ data: { name: "Celery", isOrganic: true } });
  const ingMint = await prisma.ingredient.create({ data: { name: "Mint", isOrganic: true } });
  const ingSweetLime = await prisma.ingredient.create({ data: { name: "Sweet Lime (Mosambi)", isOrganic: true } });
  const ingPineapple = await prisma.ingredient.create({ data: { name: "Pineapple", isOrganic: true } });
  const ingPinkSalt = await prisma.ingredient.create({ data: { name: "Himalayan Pink Salt", isOrganic: true } });
  const ingEggWhites = await prisma.ingredient.create({ data: { name: "Organic Egg Whites", isOrganic: true } });
  const ingEggs = await prisma.ingredient.create({ data: { name: "Whole Eggs", isOrganic: true } });
  const ingToast = await prisma.ingredient.create({ data: { name: "Multi-Grain Toast", isOrganic: false } });
  const ingPaneer = await prisma.ingredient.create({ data: { name: "Organic Paneer", isOrganic: true } });
  const ingChicken = await prisma.ingredient.create({ data: { name: "Lean Chicken Breast", isOrganic: true } });
  const ingFish = await prisma.ingredient.create({ data: { name: "Fresh Fish Fillet", isOrganic: true } });
  const ingQuinoa = await prisma.ingredient.create({ data: { name: "Quinoa", isOrganic: true } });
  const ingSprouts = await prisma.ingredient.create({ data: { name: "Mixed Organic Sprouts", isOrganic: true } });

  // 5. Products (13 exact menu items)
  const prodABC = await prisma.product.create({
    data: {
      name: "ABC Stamina Rebuilder",
      slug: "abc-stamina-rebuilder",
      description: "Organic Apple, Beetroot, Carrot with Fresh Ginger & Lemon. Ideal for nitric oxide boost & stamina.",
      price: 160,
      calories: 145,
      protein: 1.8,
      carbs: 34.0,
      fats: 0.4,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
      categoryId: catJuices.id,
      isFeatured: true,
      isPopular: true,
      isVeg: true,
    },
  });

  const prodGreen = await prisma.product.create({
    data: {
      name: "Green Electrolyte & Alkalizer",
      slug: "green-electrolyte-alkalizer",
      description: "Spinach, Kale, Cucumber, Celery, Green Apple, Mint & Lemon. High magnesium & alkalizing minerals.",
      price: 140,
      calories: 85,
      protein: 2.5,
      carbs: 18.0,
      fats: 0.3,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=600&q=80",
      categoryId: catJuices.id,
      isFeatured: false,
      isPopular: true,
      isVeg: true,
    },
  });

  const prodCitrus = await prisma.product.create({
    data: {
      name: "Citrus Hydrator & Recovery",
      slug: "citrus-hydrator-recovery",
      description: "Sweet Lime (Mosambi), Pineapple & Himalayan Pink Salt. Instant glycogen re-synthesis & hydration.",
      price: 150,
      calories: 160,
      protein: 2.0,
      carbs: 38.0,
      fats: 0.2,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80",
      categoryId: catJuices.id,
      isFeatured: false,
      isPopular: false,
      isVeg: true,
    },
  });

  const prodBoiledEggs = await prisma.product.create({
    data: {
      name: "Boiled Organic Egg White Pack",
      slug: "boiled-organic-egg-white-pack",
      description: "4 freshly steamed organic egg whites with black pepper and pink salt.",
      price: 90,
      calories: 72,
      protein: 16.0,
      carbs: 0.0,
      fats: 0.4,
      preparationTimeMinutes: 2,
      imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80",
      categoryId: catProtein.id,
      isFeatured: false,
      isPopular: true,
      isVeg: false,
    },
  });

  const prodEggScramble = await prisma.product.create({
    data: {
      name: "High-Protein Egg Scramble on Multi-Grain Toast",
      slug: "high-protein-egg-scramble-toast",
      description: "3 Whole Eggs + 1 Egg White on Whole-Wheat/Oat Toast with Spinach, Bell Peppers & Olive Oil.",
      price: 150,
      calories: 340,
      protein: 24.5,
      carbs: 28.0,
      fats: 14.0,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
      categoryId: catProtein.id,
      isFeatured: false,
      isPopular: false,
      isVeg: false,
    },
  });

  const prodPaneer = await prisma.product.create({
    data: {
      name: "Herb-Grilled Organic Paneer Skewers",
      slug: "herb-grilled-organic-paneer-skewers",
      description: "150g grilled organic cottage cheese cubes marinated in rosemary, mint & olive oil.",
      price: 180,
      calories: 410,
      protein: 27.0,
      carbs: 9.0,
      fats: 30.0,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&q=80",
      categoryId: catProtein.id,
      isFeatured: true,
      isPopular: true,
      isVeg: true,
    },
  });

  const prodChicken = await prisma.product.create({
    data: {
      name: "Lean Grilled Chicken Breast",
      slug: "lean-grilled-chicken-breast",
      description: "150g raw / 120g cooked tender chicken breast served with steamed broccoli & carrots.",
      price: 210,
      calories: 220,
      protein: 36.0,
      carbs: 3.5,
      fats: 6.0,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
      categoryId: catProtein.id,
      isFeatured: true,
      isPopular: true,
      isVeg: false,
    },
  });

  const prodFish = await prisma.product.create({
    data: {
      name: "Pan-Seared Lemon Herb Fish Fillet",
      slug: "pan-seared-lemon-herb-fish-fillet",
      description: "140g fresh white fish fillet pan-seared in lemon, dill & pink salt with a crisp side salad.",
      price: 290,
      calories: 190,
      protein: 28.0,
      carbs: 2.0,
      fats: 7.5,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80",
      categoryId: catProtein.id,
      isFeatured: false,
      isPopular: false,
      isVeg: false,
    },
  });

  const prodChickenBowl = await prisma.product.create({
    data: {
      name: "Grilled Chicken & Quinoa Energy Bowl",
      slug: "grilled-chicken-quinoa-energy-bowl",
      description: "High-protein bowl with grilled chicken breast, fluffy organic quinoa, roasted veggies & avocado dressing.",
      price: 250,
      calories: 430,
      protein: 32.0,
      carbs: 44.0,
      fats: 12.0,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      categoryId: catBowls.id,
      isFeatured: true,
      isPopular: true,
      isVeg: false,
    },
  });

  const prodVeggieSprouts = await prisma.product.create({
    data: {
      name: "High-Protein Crunchy Veggie & Sprouts Bowl",
      slug: "high-protein-veggie-sprouts-bowl",
      description: "Sprouted green gram, organic tofu/paneer, pomegranate, cucumbers, peanuts & mint chutney.",
      price: 170,
      calories: 320,
      protein: 21.0,
      carbs: 31.0,
      fats: 12.5,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
      categoryId: catBowls.id,
      isFeatured: false,
      isPopular: true,
      isVeg: true,
    },
  });

  const prodLeanRefuel = await prisma.product.create({
    data: {
      name: "Lean Refuel",
      slug: "lean-refuel",
      description: "ABC Stamina Rebuilder Juice + 4 Boiled Egg Whites. Perfect fast recovery pack.",
      price: 230,
      calories: 217,
      protein: 17.8,
      carbs: 34.0,
      fats: 0.8,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
      categoryId: catCombos.id,
      isFeatured: true,
      isPopular: true,
      isVeg: false,
    },
  });

  const prodVeganMuscle = await prisma.product.create({
    data: {
      name: "Vegan Muscle Pack",
      slug: "vegan-muscle-pack",
      description: "Green Electrolyte & Alkalizer Juice + High-Protein Veggie & Sprouts Bowl.",
      price: 280,
      calories: 405,
      protein: 23.5,
      carbs: 49.0,
      fats: 12.8,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=600&q=80",
      categoryId: catCombos.id,
      isFeatured: false,
      isPopular: true,
      isVeg: true,
    },
  });

  const prodProGainer = await prisma.product.create({
    data: {
      name: "Pro-Gainer Combo",
      slug: "pro-gainer-combo",
      description: "Citrus Hydrator Juice + Lean Grilled Chicken Breast. High glycogen & protein replenishment.",
      price: 340,
      calories: 380,
      protein: 38.0,
      carbs: 41.5,
      fats: 6.2,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
      categoryId: catCombos.id,
      isFeatured: true,
      isPopular: true,
      isVeg: false,
    },
  });

  // Product Ingredients linkage
  await prisma.productIngredient.createMany({
    data: [
      { productId: prodABC.id, ingredientId: ingApple.id, amount: "1 Whole" },
      { productId: prodABC.id, ingredientId: ingBeetroot.id, amount: "1/2 Medium" },
      { productId: prodABC.id, ingredientId: ingCarrot.id, amount: "1 Large" },
      { productId: prodABC.id, ingredientId: ingGinger.id, amount: "10g" },
      { productId: prodABC.id, ingredientId: ingLemon.id, amount: "15ml" },
      { productId: prodChicken.id, ingredientId: ingChicken.id, amount: "150g" },
      { productId: prodBoiledEggs.id, ingredientId: ingEggWhites.id, amount: "4 Eggs" },
    ]
  });

  // 6. Subscription Plans
  const planMonthlyPass = await prisma.subscriptionPlan.create({
    data: {
      name: "NutriFlexs Daily Fuel Pass",
      price: 2999,
      validityDays: 30,
      creditsCount: 30,
      description: "1 Post-Workout Meal or Juice every day for 30 days. Save over 35%.",
      benefits: JSON.stringify([
        "30 Post-Workout Fuel Credits",
        "Free Priority 3-Min Preparation",
        "10% Off Additional A-la-carte Items",
        "Exclusive Trainer Consultation Access"
      ]),
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.create({
    data: {
      name: "Cold-Pressed Juice Pass",
      price: 1999,
      validityDays: 30,
      creditsCount: 20,
      description: "20 Cold-Pressed Juices per month. Freshly extracted right after workout.",
      benefits: JSON.stringify([
        "20 Juice Credits (ABC, Green, Citrus)",
        "Zero added sugar guaranteed",
        "Pause or carry forward credits"
      ]),
      isActive: true,
    },
  });

  // Customer active subscription
  await prisma.subscription.create({
    data: {
      userId: customerAshu.id,
      planId: planMonthlyPass.id,
      remainingCredits: 18,
      startDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  // 7. Coupons
  await prisma.coupon.create({
    data: {
      code: "GYMPOWER20",
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20,
      minOrderAmount: 150,
      maxDiscount: 100,
      isActive: true,
    },
  });

  await prisma.coupon.create({
    data: {
      code: "FIRST50",
      discountType: DiscountType.FLAT,
      discountValue: 50,
      minOrderAmount: 200,
      isActive: true,
    },
  });

  // 8. Demo Orders
  await prisma.order.create({
    data: {
      orderNumber: "NF-1042",
      userId: customerAshu.id,
      outletId: outletCult.id,
      status: OrderStatus.READY_FOR_PICKUP,
      subtotal: 210,
      discount: 21,
      totalAmount: 189,
      totalProtein: 36.0,
      totalCalories: 220,
      paymentStatus: PaymentStatus.PAID,
      trainerId: trainerProfile.id,
      estimatedPrepMinutes: 3,
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      items: {
        create: [
          {
            productId: prodChicken.id,
            quantity: 1,
            priceAtPurchase: 210,
            productJson: JSON.stringify({ name: prodChicken.name, protein: 36, calories: 220 }),
          }
        ]
      },
      payment: {
        create: {
          razorpayOrderId: "order_demo_1042",
          razorpayPaymentId: "pay_demo_1042",
          amount: 189,
          status: PaymentStatus.PAID,
          method: "RAZORPAY_UPI",
        }
      }
    }
  });

  await prisma.order.create({
    data: {
      orderNumber: "NF-1039",
      userId: customerAshu.id,
      outletId: outletCult.id,
      status: OrderStatus.COMPLETED,
      subtotal: 230,
      discount: 0,
      totalAmount: 230,
      totalProtein: 17.8,
      totalCalories: 217,
      paymentStatus: PaymentStatus.PAID,
      estimatedPrepMinutes: 3,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      items: {
        create: [
          {
            productId: prodLeanRefuel.id,
            quantity: 1,
            priceAtPurchase: 230,
            productJson: JSON.stringify({ name: prodLeanRefuel.name, protein: 17.8, calories: 217 }),
          }
        ]
      },
      payment: {
        create: {
          razorpayOrderId: "order_demo_1039",
          razorpayPaymentId: "pay_demo_1039",
          amount: 230,
          status: PaymentStatus.PAID,
          method: "RAZORPAY_CARD",
        }
      }
    }
  });

  // 9. Trainer Referral & Reward
  await prisma.referral.create({
    data: {
      trainerId: trainerProfile.id,
      customerId: customerAshu.id,
      codeUsed: "NUTRI-ARJUN",
      discountApplied: 21,
      status: "ACTIVE",
    }
  });

  await prisma.trainerReward.create({
    data: {
      trainerId: trainerProfile.id,
      rewardTitle: "Free Post-Workout Protein Bowl Voucher",
      isClaimed: false,
    }
  });

  // 10. Inventory Items for Outlet
  await prisma.inventoryItem.create({
    data: {
      outletId: outletCult.id,
      ingredientId: ingChicken.id,
      quantity: 25.5,
      unit: "kg",
      lowStockThreshold: 5.0,
    }
  });

  await prisma.inventoryItem.create({
    data: {
      outletId: outletCult.id,
      ingredientId: ingEggWhites.id,
      quantity: 120,
      unit: "pcs",
      lowStockThreshold: 20,
    }
  });

  console.log('✅ NutriFlexs Database Seeding Completed Successfully on Neon PostgreSQL!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
