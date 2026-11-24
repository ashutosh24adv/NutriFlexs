import { prisma, withDbRetry } from "@/lib/prisma";
import { getCached, setCached } from "@/lib/cache";
import { MealType } from "@prisma/client";
import {
  AddFoodLogInput,
  UpdateFoodLogInput,
  CreateCustomFoodInput,
  UpdateNutritionGoalInput,
} from "@/lib/validations/nutrition.schema";

export interface MacroTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface SugarTotals {
  totalSugar: number;
  addedSugar: number;
  naturalSugar: number;
  sugarTarget: number;
  addedSugarTarget: number;
  sugarProgressPercent: number;
  addedSugarProgressPercent: number;
  hasAnySugarData: boolean;
}

export interface WaterSummary {
  totalMl: number;
  waterGoalMl: number;
  progressPercent: number;
  remainingMl: number;
  entries: Array<{
    id: string;
    amountMl: number;
    loggedAt: string;
  }>;
}

export interface MealDiarySection {
  mealType: MealType;
  label: string;
  items: Array<{
    id: string;
    foodItemId?: string | null;
    foodVariantId?: string | null;
    variantName?: string | null;
    productId?: string | null;
    orderItemId?: string | null;
    name: string;
    category?: string | null;
    quantity: number;
    unit: string;
    grams?: number | null;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    totalSugar?: number | null;
    addedSugar?: number | null;
    hasSugarData: boolean;
    loggedAt: string;
    isAutoLoggedFromOrder: boolean;
  }>;
  totals: MacroTotals;
  sugarTotals?: {
    totalSugar: number;
    addedSugar: number;
  };
}

export interface DailyNutritionSummary {
  dateKey: string;
  totals: MacroTotals;
  sugar: SugarTotals;
  water: WaterSummary;
  goals: {
    dailyCalorieGoal: number | null;
    proteinGoal: number | null;
    carbohydrateGoal: number | null;
    fatGoal: number | null;
    remainingCalories: number | null;
    calorieProgressPercent: number;
    remainingProtein: number | null;
    proteinProgressPercent: number;
    remainingCarbs: number | null;
    carbsProgressPercent: number;
    remainingFat: number | null;
    fatProgressPercent: number;
    waterGoalMl?: number | null;
    sugarTarget?: number | null;
    addedSugarTarget?: number | null;
  };
  meals: Record<MealType, MealDiarySection>;
}

/**
 * Calculates calories and macronutrients based on grams or serving units.
 */
export function calculateItemNutrition(
  item: {
    caloriesPer100g: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber?: number | null;
    sugar?: number | null;
    totalSugar?: number | null;
    addedSugar?: number | null;
    sodium?: number | null;
    saturatedFat?: number | null;
    defaultServingSize: number;
    defaultServingUnit: string;
    servingWeightGrams?: number | null;
    servingUnits?: any;
  },
  quantity: number,
  unit: string
) {
  const normUnit = (unit || "g").toLowerCase().trim();
  const defUnit = (item.defaultServingUnit || "g").toLowerCase().trim();
  const servingWeight = item.servingWeightGrams && item.servingWeightGrams > 0 ? item.servingWeightGrams : 100;

  let grams = 0;

  // Check custom serving units defined on the item first
  if (item.servingUnits && Array.isArray(item.servingUnits)) {
    const customMatch = item.servingUnits.find((u: any) =>
      u.unit?.toLowerCase().trim() === normUnit ||
      u.label?.toLowerCase().trim() === normUnit ||
      normUnit.includes(u.unit?.toLowerCase().trim())
    );
    if (customMatch && customMatch.grams && customMatch.grams > 0) {
      grams = quantity * customMatch.grams;
    }
  }

  if (grams === 0) {
    if (normUnit === "g" || normUnit === "gram" || normUnit === "grams") {
      grams = quantity;
    } else if (normUnit === "ml" || normUnit === "millilitre" || normUnit === "millilitres" || normUnit === "ml.") {
      grams = quantity;
    } else if (normUnit === defUnit || normUnit === `${defUnit}s`) {
      grams = quantity * servingWeight;
    } else if (normUnit === "serving" || normUnit === "servings") {
      grams = quantity * servingWeight;
    } else if (normUnit === "katori" || normUnit === "katoris" || normUnit === "bowl" || normUnit === "bowls") {
      grams = quantity * (defUnit.includes("bowl") || defUnit.includes("katori") ? servingWeight : 150);
    } else if (normUnit === "small_bowl" || normUnit === "small_katori") {
      grams = quantity * 100;
    } else if (normUnit === "large_bowl" || normUnit === "large_katori") {
      grams = quantity * 250;
    } else if (normUnit === "cup" || normUnit === "cups") {
      grams = quantity * (defUnit.includes("cup") ? servingWeight : 200);
    } else if (normUnit === "glass" || normUnit === "glasses") {
      grams = quantity * (defUnit.includes("glass") ? servingWeight : 250);
    } else if (normUnit === "plate" || normUnit === "plates") {
      grams = quantity * (defUnit.includes("plate") ? servingWeight : 200);
    } else if (normUnit === "piece" || normUnit === "pieces" || normUnit === "slice" || normUnit === "slices" || normUnit === "bar" || normUnit === "bars") {
      grams = quantity * (defUnit.includes("piece") || defUnit.includes("slice") || defUnit.includes("bar") ? servingWeight : 50);
    } else if (normUnit === "packet" || normUnit === "packets" || normUnit === "pack" || normUnit === "packs" || normUnit === "pkt" || normUnit === "pkts" || normUnit === "can" || normUnit === "cans" || normUnit === "bottle" || normUnit === "bottles") {
      grams = quantity * (defUnit.includes("packet") || defUnit.includes("pack") || defUnit.includes("can") || defUnit.includes("bottle") ? servingWeight : 35);
    } else if (normUnit === "tbsp" || normUnit === "tablespoon" || normUnit === "tablespoons") {
      grams = quantity * (defUnit.includes("tbsp") ? servingWeight : 15);
    } else if (normUnit === "tsp" || normUnit === "teaspoon" || normUnit === "teaspoons") {
      grams = quantity * 5;
    } else if (normUnit === "scoop" || normUnit === "scoops") {
      grams = quantity * (defUnit.includes("scoop") ? servingWeight : 32);
    } else {
      grams = quantity * servingWeight;
    }
  }

  const factor = grams / 100;

  // Determine total & added sugar
  const rawTotalSugar = item.totalSugar !== undefined && item.totalSugar !== null
    ? item.totalSugar
    : item.sugar !== undefined && item.sugar !== null
    ? item.sugar
    : null;

  const rawAddedSugar = item.addedSugar !== undefined && item.addedSugar !== null
    ? item.addedSugar
    : null;

  const computedTotalSugar = rawTotalSugar !== null ? Math.round(rawTotalSugar * factor * 10) / 10 : null;
  const computedAddedSugar = rawAddedSugar !== null ? Math.round(rawAddedSugar * factor * 10) / 10 : null;
  const computedNaturalSugar = (computedTotalSugar !== null && computedAddedSugar !== null)
    ? Math.max(0, Math.round((computedTotalSugar - computedAddedSugar) * 10) / 10)
    : computedTotalSugar;

  return {
    grams: Math.round(grams * 10) / 10,
    calories: Math.round(item.caloriesPer100g * factor * 10) / 10,
    protein: Math.round(item.protein * factor * 10) / 10,
    carbohydrates: Math.round(item.carbohydrates * factor * 10) / 10,
    fat: Math.round(item.fat * factor * 10) / 10,
    fiber: item.fiber !== undefined && item.fiber !== null ? Math.round((item.fiber || 0) * factor * 10) / 10 : 0,
    sugar: computedTotalSugar ?? 0,
    totalSugar: computedTotalSugar,
    addedSugar: computedAddedSugar,
    naturalSugar: computedNaturalSugar,
    hasSugarData: computedTotalSugar !== null,
    sodium: item.sodium !== undefined && item.sodium !== null ? Math.round((item.sodium || 0) * factor) : 0,
    saturatedFat: item.saturatedFat !== undefined && item.saturatedFat !== null ? Math.round((item.saturatedFat || 0) * factor * 10) / 10 : 0,
  };
}

/**
 * Calculates nutrition for an Indian food variant based on dish-specific serving conversions.
 * Authoritative Formula: Selected nutrition = Nutrition per 100g × Selected quantity in grams / 100
 */
export function calculateVariantNutrition(
  variant: {
    caloriesPer100g: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    totalSugar?: number | null;
    addedSugar?: number | null;
    servingConversions?: any;
  },
  quantity: number,
  unit: string,
  fallbackServingGrams = 180
) {
  const normUnit = (unit || "medium_bowl").toLowerCase().trim().replace(/[\s-]+/g, "_");
  const conversions =
    variant.servingConversions && typeof variant.servingConversions === "object"
      ? (variant.servingConversions as Record<string, number>)
      : {};

  let gramsPerUnit = fallbackServingGrams;

  if (normUnit === "g" || normUnit === "gram" || normUnit === "grams") {
    gramsPerUnit = 1;
  } else if (normUnit === "small_bowl" || normUnit === "small_katori") {
    gramsPerUnit = conversions.small_bowl || 110;
  } else if (
    normUnit === "medium_bowl" ||
    normUnit === "bowl" ||
    normUnit === "medium_katori" ||
    normUnit === "serving"
  ) {
    gramsPerUnit = conversions.medium_bowl || 180;
  } else if (normUnit === "large_bowl" || normUnit === "large_katori") {
    gramsPerUnit = conversions.large_bowl || 280;
  } else if (normUnit === "cup" || normUnit === "cups") {
    gramsPerUnit = conversions.cup || 220;
  } else if (conversions[normUnit]) {
    gramsPerUnit = conversions[normUnit];
  }

  const totalGrams = Math.max(0, Math.round(quantity * gramsPerUnit * 10) / 10);
  const factor = totalGrams / 100;

  const rawTotalSugar = variant.totalSugar !== undefined && variant.totalSugar !== null ? variant.totalSugar : null;
  const rawAddedSugar = variant.addedSugar !== undefined && variant.addedSugar !== null ? variant.addedSugar : null;
  const computedTotalSugar = rawTotalSugar !== null ? Math.round(rawTotalSugar * factor * 10) / 10 : null;
  const computedAddedSugar = rawAddedSugar !== null ? Math.round(rawAddedSugar * factor * 10) / 10 : null;
  const computedNaturalSugar = (computedTotalSugar !== null && computedAddedSugar !== null)
    ? Math.max(0, Math.round((computedTotalSugar - computedAddedSugar) * 10) / 10)
    : computedTotalSugar;

  return {
    grams: totalGrams,
    gramsPerUnit,
    calories: Math.round(variant.caloriesPer100g * factor * 10) / 10,
    protein: Math.round(variant.protein * factor * 10) / 10,
    carbohydrates: Math.round(variant.carbohydrates * factor * 10) / 10,
    fat: Math.round(variant.fat * factor * 10) / 10,
    totalSugar: computedTotalSugar,
    addedSugar: computedAddedSugar,
    naturalSugar: computedNaturalSugar,
    hasSugarData: computedTotalSugar !== null,
  };
}

/**
 * Returns today's date in YYYY-MM-DD format for a given timezone.
 */
export function getLocalDateKey(timeZone = "Asia/Kolkata", date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Determines appropriate meal category based on hour of day in target timezone.
 */
export function getMealTypeFromDate(date = new Date(), timeZone = "Asia/Kolkata"): MealType {
  const hourFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  });
  const hour = parseInt(hourFormatter.format(date), 10);

  if (hour >= 4 && hour < 11) return MealType.BREAKFAST;
  if (hour >= 11 && hour < 16) return MealType.LUNCH;
  if (hour >= 16 && hour < 19) return MealType.SNACKS;
  return MealType.DINNER;
}

/**
 * Fetches food library categories.
 */
export async function getFoodCategories() {
  const cacheKey = "food_categories_distinct";
  const cached = getCached<string[]>(cacheKey);
  if (cached) return cached;

  const distinctCategories = await withDbRetry(() =>
    prisma.foodItem.findMany({
      where: { isActive: true, isCustom: false },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    })
  );

  const result = distinctCategories.map((c) => c.category);
  setCached(cacheKey, result, 3600, ["nutrition"]);
  return result;
}

// Common Indian food synonyms, transliterations, brands & related terms
const FOOD_ALIASES_MAP: Record<string, string[]> = {
  dal: ["dal", "dhal", "daal", "lentil", "pulse", "sambhar", "sambar", "tadka", "fry", "toor", "moong", "masoor", "urad", "chana dal"],
  daal: ["dal", "dhal", "lentil", "pulse"],
  dhal: ["dal", "daal", "lentil"],
  lentil: ["dal", "daal", "lentil"],
  lentils: ["dal", "daal", "lentil"],
  rice: ["rice", "chawal", "pulao", "biryani", "khichdi", "bhat", "annam"],
  chawal: ["rice", "chawal", "khichdi", "pulao", "biryani"],
  chicken: ["chicken", "murgh", "tikka", "tandoori"],
  murgh: ["chicken", "murgh"],
  mutton: ["mutton", "gosht", "lamb", "goat", "meat", "rogan josh", "keema"],
  gosht: ["mutton", "gosht", "meat"],
  fish: ["fish", "machhli", "machli", "seafood", "rohu", "surmai", "pomfret", "salmon", "tuna", "prawns"],
  machli: ["fish", "machli", "machhli"],
  machhli: ["fish", "machhli", "machli"],
  prawns: ["prawns", "shrimp", "jhinga"],
  shrimp: ["prawns", "shrimp"],
  egg: ["egg", "anda", "ande", "omelette", "bhurji"],
  anda: ["egg", "anda", "ande", "omelette", "bhurji"],
  ande: ["egg", "anda", "ande"],
  paneer: ["paneer", "cottage cheese"],
  tofu: ["tofu", "soy", "soya"],
  soya: ["soya", "soy", "nutrela", "chunks", "granules"],
  whey: ["whey", "protein powder", "optimum nutrition", "muscleblaze", "myprotein", "isolate", "concentrate"],
  protein: ["protein", "whey", "soya", "egg", "chicken", "paneer", "isolate", "bar"],
  chai: ["chai", "tea", "chaye", "cutting"],
  tea: ["tea", "chai", "green tea", "black tea"],
  coffee: ["coffee", "kaapi", "cappuccino", "espresso", "latte", "filter coffee"],
  roti: ["roti", "phulka", "chapati", "chapatti", "paratha", "flatbread", "bread", "bhakri"],
  chapati: ["chapati", "roti", "phulka"],
  phulka: ["phulka", "roti", "chapati"],
  paratha: ["paratha", "roti", "chapati", "aloo paratha", "paneer paratha"],
  naan: ["naan", "tandoori", "garlic naan", "butter naan"],
  bread: ["bread", "roti", "toast", "sandwich", "pav", "bun"],
  curd: ["curd", "dahi", "yogurt", "yoghurt", "raita"],
  dahi: ["dahi", "curd", "yogurt", "raita"],
  yogurt: ["yogurt", "curd", "dahi", "greek yogurt"],
  chickpeas: ["chana", "chole", "chickpeas", "hummus", "kabuli chana"],
  chana: ["chana", "chole", "chickpeas", "kala chana", "roasted chana"],
  chole: ["chole", "chana", "chickpeas", "bhature"],
  makhana: ["makhana", "foxnut", "foxnuts", "lotus seed", "roasted makhana"],
  buttermilk: ["buttermilk", "chaas", "chhas", "mattha", "neer mor"],
  chaas: ["chaas", "buttermilk", "mattha"],
  lassi: ["lassi", "sweet lassi", "curd", "dahi"],
  oats: ["oats", "oatmeal", "porridge", "rolled oats"],
  milk: ["milk", "doodh", "cow milk", "toned milk"],
  poha: ["poha", "flattened rice", "chivda", "aval"],
  upma: ["upma", "semolina", "rava"],
  idli: ["idli", "idly", "rava idli"],
  dosa: ["dosa", "dosai", "masala dosa", "rava dosa"],
  vada: ["vada", "vadai", "wada", "medu vada", "batata vada"],
  sambar: ["sambar", "sambhar", "dal"],
  rasam: ["rasam", "saaru", "soup"],
  palak: ["palak", "spinach"],
  spinach: ["spinach", "palak"],
  aloo: ["aloo", "potato", "batata"],
  potato: ["potato", "aloo", "batata"],
  gobi: ["gobi", "cauliflower", "gobhi"],
  cauliflower: ["cauliflower", "gobi"],
  bhindi: ["bhindi", "okra", "ladyfinger"],
  okra: ["okra", "bhindi"],
  baingan: ["baingan", "eggplant", "brinjal", "bharta"],
  eggplant: ["eggplant", "baingan", "brinjal"],
  rajma: ["rajma", "kidney bean", "kidney beans"],
  salad: ["salad", "caesar", "sprouts"],
  biscuit: ["biscuit", "biscuits", "cookie", "cookies", "marie", "parle", "bourbon", "digestive"],
  biscuits: ["biscuit", "biscuits", "cookie", "cookies", "marie", "parle", "bourbon", "digestive"],
  cookie: ["cookie", "cookies", "biscuit", "biscuits"],
  cookies: ["cookie", "cookies", "biscuit", "biscuits"],
  namkeen: ["namkeen", "mixture", "bhujia", "sev", "chivda", "farsan", "chakli", "murukku", "snack"],
  mixture: ["mixture", "namkeen", "chivda", "khatta meetha"],
  bhujia: ["bhujia", "namkeen", "sev", "aloo bhujia"],
  sev: ["sev", "bhujia", "namkeen"],
  chips: ["chips", "wafers", "wafer", "crisps", "potato chips", "banana chips", "lays"],
  wafers: ["wafers", "wafer", "chips", "crisps"],
  wafer: ["wafer", "wafers", "chips"],
  samosa: ["samosa", "samosas", "snack"],
  kachori: ["kachori", "kachoris", "khasta kachori", "pyaaz kachori"],
  sandwich: ["sandwich", "sandwiches", "toast", "grilled sandwich"],
  popcorn: ["popcorn", "corn", "act ii"],
  peanut: ["peanut", "peanuts", "moongfali", "mungfali", "singdana", "roasted peanuts"],
  peanuts: ["peanuts", "peanut", "moongfali", "mungfali", "singdana", "roasted peanuts"],
  snack: ["snack", "snacks", "miscellaneous", "namkeen", "biscuit", "chips", "makhana"],
  snacks: ["snacks", "snack", "miscellaneous", "namkeen", "biscuit", "chips", "makhana"],
  thepla: ["thepla", "methi thepla", "gujarati"],
  dhokla: ["dhokla", "khamang", "khaman", "gujarati"],
  khakhra: ["khakhra", "gujarati", "farsan"],
  pakora: ["pakora", "pakoda", "bread pakora", "bhajiya"],
  mathri: ["mathri", "crackers"],
  momos: ["momos", "momo", "dumplings"],
  momo: ["momo", "momos", "dumplings"],
  pav: ["pav", "pao", "bun", "vada pav", "pav bhaji", "misal"],
  maggi: ["maggi", "noodles", "instant noodles"],
  noodles: ["noodles", "maggi", "hakka", "ramen", "yippee", "top ramen"],
  pizza: ["pizza", "margherita", "slice"],
  burger: ["burger", "patty"],
  pasta: ["pasta", "penne", "spaghetti", "arrabbiata", "alfredo"],
  haldiram: ["haldiram", "haldirams", "bhujia", "namkeen", "sev"],
  parle: ["parle", "parle-g", "biscuit"],
  britannia: ["britannia", "biscuit", "cookie", "good day", "bourbon", "marie"],
  lays: ["lays", "lay's", "chips"],
  kurkure: ["kurkure", "namkeen", "chips"],
  amul: ["amul", "butter", "cheese", "milk", "dark chocolate"],
  cadbury: ["cadbury", "dairy milk", "chocolate", "5 star", "oreo"],
  coke: ["coke", "coca-cola", "cola", "soda"],
  sweet: ["sweet", "mithai", "dessert", "halwa", "ladoo", "gulab jamun", "rasgulla", "kheer"],
  mithai: ["mithai", "sweet", "halwa", "ladoo", "jalebi"],
};

function scoreFoodRelevance(
  name: string,
  desc: string | null | undefined,
  brand: string | null | undefined,
  cuisine: string | null | undefined,
  subCategory: string | null | undefined,
  isCustom: boolean,
  variants: { name: string }[] | undefined,
  queryLower: string,
  tokens: string[],
  aliases: string[]
): number {
  const nLower = name.toLowerCase().trim();
  const dLower = (desc || "").toLowerCase().trim();
  const bLower = (brand || "").toLowerCase().trim();
  const cLower = (cuisine || "").toLowerCase().trim();
  const sLower = (subCategory || "").toLowerCase().trim();

  // 1. Exact match on full name
  if (nLower === queryLower) {
    return 1000 + (isCustom ? 10 : 0);
  }

  // 2. Starts with full query
  if (nLower.startsWith(queryLower)) {
    return 850 - nLower.length;
  }

  // 3. Exact brand match
  if (bLower && (bLower === queryLower || queryLower.includes(bLower))) {
    return 800 - nLower.length;
  }

  // 4. Word in name starts with query
  const words = nLower.split(/[\s\/\(\),\-\.]+/).filter(Boolean);
  if (words.some((w) => w.startsWith(queryLower))) {
    return 650 - nLower.length;
  }

  // 5. Substring in name
  if (nLower.includes(queryLower)) {
    return 500 - nLower.length;
  }

  // 6. All query tokens present in name
  if (tokens.length > 1 && tokens.every((t) => nLower.includes(t))) {
    return 450 - nLower.length;
  }

  // 7. Exact match with cuisine or subCategory
  if (cLower === queryLower || sLower === queryLower) {
    return 420;
  }

  // 8. Name matches any alias exactly or word starts with alias
  for (const a of aliases) {
    if (nLower === a) return 400;
    if (words.some((w) => w.startsWith(a))) return 350;
    if (nLower.includes(a)) return 300;
  }

  // 9. Token overlap in name
  const matchedTokens = tokens.filter((t) => nLower.includes(t)).length;
  if (matchedTokens > 0) {
    return 200 + matchedTokens * 25;
  }

  // 10. Variant name contains query
  if (variants && variants.some((v) => v.name.toLowerCase().includes(queryLower))) {
    return 150;
  }

  // 11. Description contains full query
  if (dLower.includes(queryLower) || bLower.includes(queryLower) || cLower.includes(queryLower)) {
    return 100;
  }

  // 12. Description contains alias
  for (const a of aliases) {
    if (dLower.includes(a) || bLower.includes(a)) return 70;
  }

  return 10;
}

/**
 * Searches food library and user's custom foods, plus NutriFlexs menu products.
 */
export async function searchFoodLibrary(params: {
  query?: string;
  category?: string;
  userId?: string;
  limit?: number;
  page?: number;
  includeNutriFlexsProducts?: boolean;
}) {
  const { query = "", category, userId, limit = 50, page = 1, includeNutriFlexsProducts = true } = params;
  const normalized = query.trim().replace(/\s+/g, " ");

  const cacheKey = `food_search_${userId || "guest"}_${encodeURIComponent(normalized)}_${category || "all"}_p${page}_l${limit}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  const queryLower = normalized.toLowerCase();
  const tokens = queryLower.split(/[\s,]+/).filter(Boolean);

  // Collect relevant aliases
  const aliasSet = new Set<string>();
  for (const tok of tokens) {
    if (FOOD_ALIASES_MAP[tok]) {
      for (const alt of FOOD_ALIASES_MAP[tok]) {
        aliasSet.add(alt);
      }
    }
  }
  const expandedAliases = Array.from(aliasSet);

  // 1. FoodItem condition (global foods OR user custom foods)
  const whereFoodItem: any = {
    isActive: true,
    OR: [
      { isCustom: false },
      ...(userId ? [{ isCustom: true, createdById: userId }] : []),
    ],
  };

  if (category && category !== "All" && category !== "NutriFlexs Menu") {
    whereFoodItem.category = category;
  }

  if (normalized) {
    const mainAliases = expandedAliases.slice(0, 5);
    whereFoodItem.AND = [
      {
        OR: [
          { name: { contains: normalized, mode: "insensitive" } },
          { description: { contains: normalized, mode: "insensitive" } },
          { brand: { contains: normalized, mode: "insensitive" } },
          { cuisine: { contains: normalized, mode: "insensitive" } },
          { subCategory: { contains: normalized, mode: "insensitive" } },
          { variants: { some: { name: { contains: normalized, mode: "insensitive" } } } },
          ...mainAliases.map((alt) => ({ name: { contains: alt, mode: "insensitive" } })),
          ...mainAliases.map((alt) => ({ brand: { contains: alt, mode: "insensitive" } })),
        ],
      },
    ];
  }

  // If there is a query, fetch candidate foods to score and rank intelligently
  const fetchLimit = normalized ? Math.max(limit * 2, 80) : limit;
  const skip = normalized ? 0 : (page - 1) * limit;

  const shouldQueryProducts =
    includeNutriFlexsProducts &&
    (!category || category === "All" || category === "NutriFlexs Menu");

  const whereProduct: any = { isAvailable: true };
  if (normalized) {
    whereProduct.OR = [
      { name: { contains: normalized, mode: "insensitive" } },
      { description: { contains: normalized, mode: "insensitive" } },
    ];
  }

  // Fetch foods and products in parallel in a single round-trip
  const [rawFoods, prods] = await withDbRetry(() =>
    Promise.all([
      prisma.foodItem.findMany({
        where: whereFoodItem,
        orderBy: normalized ? undefined : [{ isCustom: "desc" }, { name: "asc" }],
        skip: normalized ? 0 : skip,
        take: fetchLimit,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          subCategory: true,
          cuisine: true,
          brand: true,
          caloriesPer100g: true,
          protein: true,
          carbohydrates: true,
          fat: true,
          fiber: true,
          sugar: true,
          sodium: true,
          saturatedFat: true,
          defaultServingSize: true,
          defaultServingUnit: true,
          servingWeightGrams: true,
          servingUnits: true,
          dataSource: true,
          isVerified: true,
          hasVariants: true,
          isCustom: true,
          variants: {
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
            select: {
              id: true,
              foodItemId: true,
              name: true,
              variantType: true,
              description: true,
              caloriesPer100g: true,
              protein: true,
              carbohydrates: true,
              fat: true,
              isDefault: true,
              servingConversions: true,
              preparationMethod: true,
              nutritionSource: true,
              confidenceLevel: true,
              imageUrl: true,
              displayOrder: true,
              isActive: true,
            },
          },
        },
      }),
      shouldQueryProducts
        ? prisma.product.findMany({
            where: whereProduct,
            take: 20,
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              calories: true,
              protein: true,
              carbs: true,
              fats: true,
              imageUrl: true,
              isVeg: true,
            },
          })
        : Promise.resolve([]),
    ])
  );

  const totalFoods = rawFoods.length;

  // Rank foods by relevance if query is provided
  let rankedFoods = rawFoods;
  if (normalized) {
    rankedFoods = rawFoods
      .map((food) => ({
        food,
        score: scoreFoodRelevance(
          food.name,
          food.description,
          food.brand,
          food.cuisine,
          food.subCategory,
          !!food.isCustom,
          food.variants,
          queryLower,
          tokens,
          expandedAliases
        ),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.food.name.localeCompare(b.food.name);
      })
      .map((item) => item.food);

    const startIndex = (page - 1) * limit;
    rankedFoods = rankedFoods.slice(startIndex, startIndex + limit);
  }

  // 2. If searching "NutriFlexs Menu" or if general query matches NutriFlexs products, include them
  let nutriflexsProducts: any[] = [];
  if (prods && prods.length > 0) {
    const mappedProducts = prods.map((p) => ({
      id: p.id,
      productId: p.id,
      name: `NutriFlexs: ${p.name}`,
      description: `${p.isVeg ? "🟢 Vegetarian" : "🔴 Non-Veg"} · ₹${p.price}${p.description ? ` · ${p.description}` : ""}`,
      category: "NutriFlexs Menu",
      caloriesPer100g: p.calories, // 1 serving
      protein: p.protein,
      carbohydrates: p.carbs,
      fat: p.fats,
      defaultServingSize: 1,
      defaultServingUnit: "serving",
      servingWeightGrams: 100,
      isNutriFlexsProduct: true,
      isCustom: false,
      score: normalized
        ? scoreFoodRelevance(
            p.name,
            p.description,
            null,
            null,
            null,
            false,
            undefined,
            queryLower,
            tokens,
            expandedAliases
          )
        : 50,
    }));

    if (normalized) {
      mappedProducts.sort((a, b) => b.score - a.score);
    }

    nutriflexsProducts = mappedProducts.map(({ score, ...rest }) => rest);
  }

  const finalResult = {
    foods: rankedFoods,
    nutriflexsProducts,
    total: totalFoods + nutriflexsProducts.length,
    page,
    limit,
  };

  setCached(cacheKey, finalResult, 120, ["food_search"]);
  return finalResult;
}

/**
 * Creates user-specific custom food.
 */
export async function createCustomFood(userId: string, input: CreateCustomFoodInput) {
  return await prisma.foodItem.create({
    data: {
      name: input.name.trim(),
      category: input.category || "Custom foods",
      description: input.description?.trim() || "User created custom food",
      caloriesPer100g: input.caloriesPer100g,
      protein: input.protein,
      carbohydrates: input.carbohydrates,
      fat: input.fat,
      defaultServingSize: input.defaultServingSize || 1,
      defaultServingUnit: input.defaultServingUnit || "serving",
      servingWeightGrams: input.servingWeightGrams || 100,
      isCustom: true,
      createdById: userId,
      isActive: true,
    },
  });
}

/**
 * Gets daily nutrition diary & goals for a given dateKey (YYYY-MM-DD).
 */
export async function getDailyNutritionDiary(userId: string, dateKey: string): Promise<DailyNutritionSummary> {
  const [logs, goalRecord, userRecord, waterEntries] = await Promise.all([
    prisma.foodLog.findMany({
      where: {
        userId,
        dateKey,
      },
      orderBy: { loggedAt: "asc" },
      include: {
        product: { select: { imageUrl: true, isVeg: true, totalSugar: true, addedSugar: true } },
        foodItem: { select: { category: true, totalSugar: true, addedSugar: true, sugar: true } },
        foodVariant: { select: { totalSugar: true, addedSugar: true } },
      },
    }),
    prisma.nutritionGoal.findUnique({
      where: { userId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        proteinGoalGrams: true,
        customDailyProteinGoal: true,
        weightKg: true,
      },
    }),
    prisma.waterEntry.findMany({
      where: { userId, dateKey },
      orderBy: { loggedAt: "desc" },
      select: {
        id: true,
        amountMl: true,
        loggedAt: true,
      },
    }),
  ]);

  const meals: Record<MealType, MealDiarySection> = {
    [MealType.BREAKFAST]: { mealType: MealType.BREAKFAST, label: "Breakfast", items: [], totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }, sugarTotals: { totalSugar: 0, addedSugar: 0 } },
    [MealType.LUNCH]: { mealType: MealType.LUNCH, label: "Lunch", items: [], totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }, sugarTotals: { totalSugar: 0, addedSugar: 0 } },
    [MealType.SNACKS]: { mealType: MealType.SNACKS, label: "Evening Snacks", items: [], totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }, sugarTotals: { totalSugar: 0, addedSugar: 0 } },
    [MealType.DINNER]: { mealType: MealType.DINNER, label: "Dinner", items: [], totals: { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }, sugarTotals: { totalSugar: 0, addedSugar: 0 } },
  };

  const dailyTotals: MacroTotals = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    fat: 0,
  };

  let dailyTotalSugarSum = 0;
  let dailyAddedSugarSum = 0;
  let hasAnySugarData = false;

  for (const log of logs) {
    const meal = meals[log.mealType] || meals[MealType.LUNCH];
    const roundedCals = Math.round(log.calories * 10) / 10;
    const roundedProt = Math.round(log.protein * 10) / 10;
    const roundedCarb = Math.round(log.carbohydrates * 10) / 10;
    const roundedFat = Math.round(log.fat * 10) / 10;

    // Determine sugar for this log
    let itemTotalSugar: number | null = log.totalSugar !== null && log.totalSugar !== undefined
      ? Math.round(log.totalSugar * 10) / 10
      : null;
    let itemAddedSugar: number | null = log.addedSugar !== null && log.addedSugar !== undefined
      ? Math.round(log.addedSugar * 10) / 10
      : null;
    let itemHasSugar = log.hasSugarData || itemTotalSugar !== null;

    // Fallback if log was created before migration but related item has sugar
    if (itemTotalSugar === null && log.foodItem && (log.foodItem.totalSugar !== null || log.foodItem.sugar !== null)) {
      const fallbackSugar = log.foodItem.totalSugar ?? log.foodItem.sugar;
      if (fallbackSugar !== null && fallbackSugar !== undefined) {
        const factor = (log.gramsCalculated || 100) / 100;
        itemTotalSugar = Math.round(fallbackSugar * factor * 10) / 10;
        itemAddedSugar = log.foodItem.addedSugar !== null && log.foodItem.addedSugar !== undefined
          ? Math.round(log.foodItem.addedSugar * factor * 10) / 10
          : 0;
        itemHasSugar = true;
      }
    } else if (itemTotalSugar === null && log.product && log.product.totalSugar !== null) {
      itemTotalSugar = Math.round((log.product.totalSugar || 0) * log.quantity * 10) / 10;
      itemAddedSugar = log.product.addedSugar !== null && log.product.addedSugar !== undefined
        ? Math.round(log.product.addedSugar * log.quantity * 10) / 10
        : 0;
      itemHasSugar = true;
    }

    if (itemHasSugar && itemTotalSugar !== null) {
      hasAnySugarData = true;
      dailyTotalSugarSum += itemTotalSugar;
      if (meal.sugarTotals) {
        meal.sugarTotals.totalSugar = Math.round((meal.sugarTotals.totalSugar + itemTotalSugar) * 10) / 10;
      }
      if (itemAddedSugar !== null) {
        dailyAddedSugarSum += itemAddedSugar;
        if (meal.sugarTotals) {
          meal.sugarTotals.addedSugar = Math.round((meal.sugarTotals.addedSugar + itemAddedSugar) * 10) / 10;
        }
      }
    }

    meal.items.push({
      id: log.id,
      foodItemId: log.foodItemId,
      foodVariantId: log.foodVariantId,
      productId: log.productId,
      orderItemId: log.orderItemId,
      name: log.foodNameSnapshot,
      variantName: log.variantNameSnapshot,
      category: log.foodItem?.category || null,
      quantity: log.quantity,
      unit: log.unit,
      grams: log.gramsCalculated,
      calories: roundedCals,
      protein: roundedProt,
      carbohydrates: roundedCarb,
      fat: roundedFat,
      totalSugar: itemTotalSugar,
      addedSugar: itemAddedSugar,
      hasSugarData: itemHasSugar,
      loggedAt: log.loggedAt.toISOString(),
      isAutoLoggedFromOrder: Boolean(log.orderItemId),
    });

    meal.totals.calories = Math.round((meal.totals.calories + roundedCals) * 10) / 10;
    meal.totals.protein = Math.round((meal.totals.protein + roundedProt) * 10) / 10;
    meal.totals.carbohydrates = Math.round((meal.totals.carbohydrates + roundedCarb) * 10) / 10;
    meal.totals.fat = Math.round((meal.totals.fat + roundedFat) * 10) / 10;

    dailyTotals.calories = Math.round((dailyTotals.calories + roundedCals) * 10) / 10;
    dailyTotals.protein = Math.round((dailyTotals.protein + roundedProt) * 10) / 10;
    dailyTotals.carbohydrates = Math.round((dailyTotals.carbohydrates + roundedCarb) * 10) / 10;
    dailyTotals.fat = Math.round((dailyTotals.fat + roundedFat) * 10) / 10;
  }

  // Calculate unified goal targets and progress
  const calGoal = goalRecord?.dailyCalorieGoal || null;
  let protGoal: number | null = null;
  if (goalRecord?.proteinGoal !== null && goalRecord?.proteinGoal !== undefined && goalRecord.proteinGoal > 0) {
    protGoal = Math.round(goalRecord.proteinGoal * 10) / 10;
  } else if (userRecord?.customDailyProteinGoal && userRecord.customDailyProteinGoal > 0) {
    protGoal = userRecord.customDailyProteinGoal;
  } else if (userRecord?.proteinGoalGrams && userRecord.proteinGoalGrams > 0) {
    protGoal = userRecord.proteinGoalGrams;
  } else if (userRecord?.weightKg && userRecord.weightKg > 0) {
    protGoal = Math.round(userRecord.weightKg * 1.6);
  }

  const carbGoal = goalRecord?.carbohydrateGoal || null;
  const fatGoal = goalRecord?.fatGoal || null;

  const proteinProgressPercent = protGoal && protGoal > 0
    ? Math.round((dailyTotals.protein / protGoal) * 10000) / 100
    : 0;

  // Water calculations
  const totalWaterMl = waterEntries.reduce((acc, curr) => acc + curr.amountMl, 0);
  const waterGoalMl = goalRecord?.waterGoalMl || 3000;
  const waterProgressPercent = waterGoalMl > 0 ? Math.min(200, Math.round((totalWaterMl / waterGoalMl) * 100)) : 0;
  const remainingWaterMl = Math.max(0, waterGoalMl - totalWaterMl);

  // Sugar calculations
  const sugarTarget = goalRecord?.sugarTarget || 35;
  const addedSugarTarget = goalRecord?.addedSugarTarget || 25;
  const roundedTotalSugar = Math.round(dailyTotalSugarSum * 10) / 10;
  const roundedAddedSugar = Math.round(dailyAddedSugarSum * 10) / 10;
  const naturalSugar = Math.max(0, Math.round((roundedTotalSugar - roundedAddedSugar) * 10) / 10);
  const sugarProgressPercent = sugarTarget > 0 ? Math.min(200, Math.round((roundedTotalSugar / sugarTarget) * 100)) : 0;
  const addedSugarProgressPercent = addedSugarTarget > 0 ? Math.min(200, Math.round((roundedAddedSugar / addedSugarTarget) * 100)) : 0;

  return {
    dateKey,
    totals: dailyTotals,
    sugar: {
      totalSugar: roundedTotalSugar,
      addedSugar: roundedAddedSugar,
      naturalSugar,
      sugarTarget,
      addedSugarTarget,
      sugarProgressPercent,
      addedSugarProgressPercent,
      hasAnySugarData,
    },
    water: {
      totalMl: totalWaterMl,
      waterGoalMl,
      progressPercent: waterProgressPercent,
      remainingMl: remainingWaterMl,
      entries: waterEntries.map((e) => ({
        id: e.id,
        amountMl: e.amountMl,
        loggedAt: e.loggedAt.toISOString(),
      })),
    },
    goals: {
      dailyCalorieGoal: calGoal,
      proteinGoal: protGoal,
      carbohydrateGoal: carbGoal,
      fatGoal: fatGoal,
      remainingCalories: calGoal !== null ? Math.round((calGoal - dailyTotals.calories) * 10) / 10 : null,
      calorieProgressPercent: calGoal ? Math.min(100, Math.round((dailyTotals.calories / calGoal) * 100)) : 0,
      remainingProtein: protGoal !== null ? Math.max(0, Math.round((protGoal - dailyTotals.protein) * 10) / 10) : null,
      proteinProgressPercent,
      remainingCarbs: carbGoal !== null ? Math.round((carbGoal - dailyTotals.carbohydrates) * 10) / 10 : null,
      carbsProgressPercent: carbGoal ? Math.min(100, Math.round((dailyTotals.carbohydrates / carbGoal) * 100)) : 0,
      remainingFat: fatGoal !== null ? Math.round((fatGoal - dailyTotals.fat) * 10) / 10 : null,
      fatProgressPercent: fatGoal ? Math.min(100, Math.round((dailyTotals.fat / fatGoal) * 100)) : 0,
      waterGoalMl,
      sugarTarget,
      addedSugarTarget,
    },
    meals,
  };
}

/**
 * Adds a food log entry with server-side macro calculation.
 */
export async function addFoodLog(userId: string, input: AddFoodLogInput) {
  let calculatedCalories = 0;
  let calculatedProtein = 0;
  let calculatedCarbs = 0;
  let calculatedFat = 0;
  let calculatedTotalSugar: number | null = null;
  let calculatedAddedSugar: number | null = null;
  let hasSugarData = false;
  let calculatedGrams: number | null = null;
  let foodName = input.foodName.trim();
  let variantNameSnapshot: string | null = input.variantName || null;
  let foodItemId: string | null = input.foodItemId || null;
  let foodVariantId: string | null = input.foodVariantId || null;
  let possibleDuplicate = false;

  if (input.productId) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) throw new Error("Product not found");

    foodName = product.name;
    calculatedCalories = Math.round(product.calories * input.quantity * 10) / 10;
    calculatedProtein = Math.round(product.protein * input.quantity * 10) / 10;
    calculatedCarbs = Math.round(product.carbs * input.quantity * 10) / 10;
    calculatedFat = Math.round(product.fats * input.quantity * 10) / 10;
    calculatedGrams = Math.round(input.quantity * 100 * 10) / 10;

    if (product.totalSugar !== null && product.totalSugar !== undefined) {
      calculatedTotalSugar = Math.round(product.totalSugar * input.quantity * 10) / 10;
      calculatedAddedSugar = product.addedSugar !== null && product.addedSugar !== undefined
        ? Math.round(product.addedSugar * input.quantity * 10) / 10
        : 0;
      hasSugarData = true;
    }

    // Check if an order item for this product was already logged for this user on this dateKey
    const existingOrderLog = await prisma.foodLog.findFirst({
      where: {
        userId,
        dateKey: input.dateKey,
        productId: product.id,
        orderItemId: { not: null },
      },
    });
    if (existingOrderLog) {
      possibleDuplicate = true;
    }
  } else if (input.foodVariantId) {
    // Dedicated variant logging with dish-specific gram conversions
    const variant = await prisma.foodVariant.findUnique({
      where: { id: input.foodVariantId },
      include: { foodItem: true },
    });
    if (!variant) throw new Error("Food variant not found");

    foodItemId = variant.foodItemId;
    foodVariantId = variant.id;
    foodName = variant.name;
    variantNameSnapshot = variant.name;

    const computed = calculateVariantNutrition(
      variant,
      input.quantity,
      input.unit,
      variant.foodItem?.servingWeightGrams || 180
    );
    calculatedCalories = computed.calories;
    calculatedProtein = computed.protein;
    calculatedCarbs = computed.carbohydrates;
    calculatedFat = computed.fat;
    calculatedGrams = computed.grams;
    calculatedTotalSugar = computed.totalSugar ?? (input.totalSugar !== undefined ? input.totalSugar : null);
    calculatedAddedSugar = computed.addedSugar ?? (input.addedSugar !== undefined ? input.addedSugar : null);
    hasSugarData = calculatedTotalSugar !== null;
  } else if (input.foodItemId) {
    const foodItem = await prisma.foodItem.findFirst({
      where: {
        id: input.foodItemId,
        isActive: true,
        OR: [{ isCustom: false }, { isCustom: true, createdById: userId }],
      },
    });
    if (!foodItem) throw new Error("Food item not found");

    foodName = foodItem.name;
    const computed = calculateItemNutrition(foodItem, input.quantity, input.unit);
    calculatedCalories = computed.calories;
    calculatedProtein = computed.protein;
    calculatedCarbs = computed.carbohydrates;
    calculatedFat = computed.fat;
    calculatedGrams = computed.grams;
    calculatedTotalSugar = computed.totalSugar ?? (input.totalSugar !== undefined ? input.totalSugar : null);
    calculatedAddedSugar = computed.addedSugar ?? (input.addedSugar !== undefined ? input.addedSugar : null);
    hasSugarData = calculatedTotalSugar !== null;
  } else {
    // Custom ad-hoc entry
    calculatedCalories = input.calories !== undefined ? input.calories : 0;
    calculatedProtein = input.protein !== undefined ? input.protein : 0;
    calculatedCarbs = input.carbohydrates !== undefined ? input.carbohydrates : 0;
    calculatedFat = input.fat !== undefined ? input.fat : 0;
    calculatedTotalSugar = input.totalSugar !== undefined && input.totalSugar !== null ? input.totalSugar : null;
    calculatedAddedSugar = input.addedSugar !== undefined && input.addedSugar !== null ? input.addedSugar : null;
    hasSugarData = calculatedTotalSugar !== null;
    if (input.unit?.toLowerCase() === "g" || input.unit?.toLowerCase() === "grams") {
      calculatedGrams = input.quantity;
    }
  }

  const log = await prisma.foodLog.create({
    data: {
      userId,
      foodItemId,
      foodVariantId,
      productId: input.productId || null,
      foodNameSnapshot: foodName,
      variantNameSnapshot,
      servingUnitSnapshot: input.unit,
      gramsCalculated: calculatedGrams,
      mealType: input.mealType,
      quantity: input.quantity,
      unit: input.unit,
      calories: calculatedCalories,
      protein: calculatedProtein,
      carbohydrates: calculatedCarbs,
      fat: calculatedFat,
      totalSugar: calculatedTotalSugar,
      addedSugar: calculatedAddedSugar,
      hasSugarData,
      dateKey: input.dateKey,
      loggedAt: new Date(),
    },
  });

  return {
    log,
    possibleDuplicate,
  };
}

/**
 * Updates a food log entry with server-side recalculation.
 */
export async function updateFoodLog(userId: string, logId: string, input: UpdateFoodLogInput) {
  const existing = await prisma.foodLog.findFirst({
    where: { id: logId, userId },
    include: { foodItem: true, product: true, foodVariant: true },
  });

  if (!existing) {
    throw new Error("Food log entry not found or unauthorized.");
  }

  const quantity = input.quantity !== undefined ? input.quantity : existing.quantity;
  const unit = input.unit !== undefined ? input.unit : existing.unit;
  const mealType = input.mealType !== undefined ? input.mealType : existing.mealType;
  const targetVariantId = input.foodVariantId !== undefined ? input.foodVariantId : existing.foodVariantId;

  let calories = existing.calories;
  let protein = existing.protein;
  let carbohydrates = existing.carbohydrates;
  let fat = existing.fat;
  let gramsCalculated = existing.gramsCalculated;
  let foodNameSnapshot = existing.foodNameSnapshot;
  let variantNameSnapshot = existing.variantNameSnapshot;
  let totalSugar = existing.totalSugar;
  let addedSugar = existing.addedSugar;
  let hasSugarData = existing.hasSugarData;

  if (targetVariantId) {
    const variant = await prisma.foodVariant.findUnique({
      where: { id: targetVariantId },
      include: { foodItem: true },
    });
    if (variant) {
      foodNameSnapshot = variant.name;
      variantNameSnapshot = variant.name;
      const computed = calculateVariantNutrition(
        variant,
        quantity,
        unit,
        variant.foodItem?.servingWeightGrams || 180
      );
      calories = computed.calories;
      protein = computed.protein;
      carbohydrates = computed.carbohydrates;
      fat = computed.fat;
      gramsCalculated = computed.grams;
      totalSugar = computed.totalSugar ?? existing.totalSugar;
      addedSugar = computed.addedSugar ?? existing.addedSugar;
      hasSugarData = totalSugar !== null;
    }
  } else if (existing.productId && existing.product) {
    calories = Math.round(existing.product.calories * quantity * 10) / 10;
    protein = Math.round(existing.product.protein * quantity * 10) / 10;
    carbohydrates = Math.round(existing.product.carbs * quantity * 10) / 10;
    fat = Math.round(existing.product.fats * quantity * 10) / 10;
    gramsCalculated = Math.round(quantity * 100 * 10) / 10;
    totalSugar = existing.product.totalSugar !== null && existing.product.totalSugar !== undefined
      ? Math.round(existing.product.totalSugar * quantity * 10) / 10
      : null;
    addedSugar = existing.product.addedSugar !== null && existing.product.addedSugar !== undefined
      ? Math.round(existing.product.addedSugar * quantity * 10) / 10
      : null;
    hasSugarData = totalSugar !== null;
  } else if (existing.foodItemId && existing.foodItem) {
    const computed = calculateItemNutrition(existing.foodItem, quantity, unit);
    calories = computed.calories;
    protein = computed.protein;
    carbohydrates = computed.carbohydrates;
    fat = computed.fat;
    gramsCalculated = computed.grams;
    totalSugar = computed.totalSugar ?? existing.totalSugar;
    addedSugar = computed.addedSugar ?? existing.addedSugar;
    hasSugarData = totalSugar !== null;
  } else {
    // If ad-hoc, scale proportionally with quantity ratio if user didn't override
    if (input.calories !== undefined) {
      calories = input.calories;
      protein = input.protein || 0;
      carbohydrates = input.carbohydrates || 0;
      fat = input.fat || 0;
    } else if (existing.quantity > 0) {
      const ratio = quantity / existing.quantity;
      calories = Math.round(existing.calories * ratio * 10) / 10;
      protein = Math.round(existing.protein * ratio * 10) / 10;
      carbohydrates = Math.round(existing.carbohydrates * ratio * 10) / 10;
      fat = Math.round(existing.fat * ratio * 10) / 10;
    }

    if (input.totalSugar !== undefined) {
      totalSugar = input.totalSugar;
      hasSugarData = totalSugar !== null;
    } else if (existing.quantity > 0 && existing.totalSugar !== null) {
      const ratio = quantity / existing.quantity;
      totalSugar = Math.round(existing.totalSugar * ratio * 10) / 10;
    }
    if (input.addedSugar !== undefined) {
      addedSugar = input.addedSugar;
    } else if (existing.quantity > 0 && existing.addedSugar !== null) {
      const ratio = quantity / existing.quantity;
      addedSugar = Math.round(existing.addedSugar * ratio * 10) / 10;
    }
  }

  return await prisma.foodLog.update({
    where: { id: logId },
    data: {
      foodVariantId: targetVariantId || null,
      foodNameSnapshot,
      variantNameSnapshot,
      servingUnitSnapshot: unit,
      gramsCalculated,
      quantity,
      unit,
      mealType,
      calories,
      protein,
      carbohydrates,
      fat,
      totalSugar,
      addedSugar,
      hasSugarData,
    },
  });
}

/**
 * Deletes a food log entry.
 */
export async function deleteFoodLog(userId: string, logId: string) {
  const existing = await prisma.foodLog.findFirst({
    where: { id: logId, userId },
  });

  if (!existing) {
    throw new Error("Food log entry not found or unauthorized.");
  }

  return await prisma.foodLog.delete({
    where: { id: logId },
  });
}

/**
 * Gets or updates customer's nutrition goals.
 */
export async function getNutritionGoals(userId: string) {
  return await prisma.nutritionGoal.findUnique({
    where: { userId },
  });
}

export async function upsertNutritionGoals(userId: string, input: UpdateNutritionGoalInput) {
  const result = await prisma.nutritionGoal.upsert({
    where: { userId },
    create: {
      userId,
      dailyCalorieGoal: input.dailyCalorieGoal !== undefined ? input.dailyCalorieGoal : null,
      proteinGoal: input.proteinGoal !== undefined ? input.proteinGoal : null,
      carbohydrateGoal: input.carbohydrateGoal !== undefined ? input.carbohydrateGoal : null,
      fatGoal: input.fatGoal !== undefined ? input.fatGoal : null,
      waterGoalMl: input.waterGoalMl !== undefined ? input.waterGoalMl : 3000,
      sugarTarget: input.sugarTarget !== undefined ? input.sugarTarget : 35,
      addedSugarTarget: input.addedSugarTarget !== undefined ? input.addedSugarTarget : 25,
    },
    update: {
      ...(input.dailyCalorieGoal !== undefined && { dailyCalorieGoal: input.dailyCalorieGoal }),
      ...(input.proteinGoal !== undefined && { proteinGoal: input.proteinGoal }),
      ...(input.carbohydrateGoal !== undefined && { carbohydrateGoal: input.carbohydrateGoal }),
      ...(input.fatGoal !== undefined && { fatGoal: input.fatGoal }),
      ...(input.waterGoalMl !== undefined && { waterGoalMl: input.waterGoalMl }),
      ...(input.sugarTarget !== undefined && { sugarTarget: input.sugarTarget }),
      ...(input.addedSugarTarget !== undefined && { addedSugarTarget: input.addedSugarTarget }),
    },
  });

  // Keep User table synchronized with protein goal
  if (input.proteinGoal !== undefined && input.proteinGoal !== null && input.proteinGoal > 0) {
    const roundedProt = Math.round(input.proteinGoal);
    await prisma.user.update({
      where: { id: userId },
      data: {
        customDailyProteinGoal: roundedProt,
        proteinGoalGrams: roundedProt,
      },
    });
  }

  return result;
}

/**
 * Adds an individual water intake entry and updates the daily aggregated total.
 */
export async function addWaterEntry(userId: string, dateKey: string, amountMl: number) {
  const cleanAmount = Math.max(1, Math.round(amountMl));

  const entry = await withDbRetry(() =>
    prisma.waterEntry.create({
      data: {
        userId,
        dateKey,
        amountMl: cleanAmount,
        loggedAt: new Date(),
      },
    })
  );

  // Recalculate total water for this date
  const allEntries = await withDbRetry(() =>
    prisma.waterEntry.findMany({
      where: { userId, dateKey },
      orderBy: { loggedAt: "desc" },
    })
  );

  const totalMl = allEntries.reduce((sum, e) => sum + e.amountMl, 0);

  // Update aggregated WaterLog
  await withDbRetry(() =>
    prisma.waterLog.upsert({
      where: {
        userId_dateKey: { userId, dateKey },
      },
      create: {
        userId,
        dateKey,
        amountMl: totalMl,
        loggedAt: new Date(),
      },
      update: {
        amountMl: totalMl,
        loggedAt: new Date(),
      },
    })
  );

  // Sync DailyHealthMetric hydrationMl
  try {
    await withDbRetry(() =>
      prisma.dailyHealthMetric.upsert({
        where: {
          userId_dateKey: { userId, dateKey },
        },
        create: {
          userId,
          dateKey,
          hydrationMl: totalMl,
          waterIntakeMl: totalMl,
          source: "Water Tracker",
        },
        update: {
          hydrationMl: totalMl,
          waterIntakeMl: totalMl,
        },
      })
    );
  } catch {}

  const goal = await prisma.nutritionGoal.findUnique({
    where: { userId },
    select: { waterGoalMl: true },
  });

  return {
    entry: {
      id: entry.id,
      amountMl: entry.amountMl,
      loggedAt: entry.loggedAt.toISOString(),
    },
    totalMl,
    waterGoalMl: goal?.waterGoalMl || 3000,
    entries: allEntries.map((e) => ({
      id: e.id,
      amountMl: e.amountMl,
      loggedAt: e.loggedAt.toISOString(),
    })),
  };
}

/**
 * Deletes a water entry and recalculates the day's aggregated total.
 */
export async function deleteWaterEntry(userId: string, entryId: string) {
  const existing = await withDbRetry(() =>
    prisma.waterEntry.findFirst({
      where: { id: entryId, userId },
    })
  );

  if (!existing) {
    throw new Error("Water entry not found or unauthorized.");
  }

  const { dateKey } = existing;

  await withDbRetry(() =>
    prisma.waterEntry.delete({
      where: { id: entryId },
    })
  );

  // Recalculate remaining entries for this date
  const remainingEntries = await withDbRetry(() =>
    prisma.waterEntry.findMany({
      where: { userId, dateKey },
      orderBy: { loggedAt: "desc" },
    })
  );

  const totalMl = remainingEntries.reduce((sum, e) => sum + e.amountMl, 0);

  // Update aggregated WaterLog
  await withDbRetry(() =>
    prisma.waterLog.upsert({
      where: {
        userId_dateKey: { userId, dateKey },
      },
      create: {
        userId,
        dateKey,
        amountMl: totalMl,
      },
      update: {
        amountMl: totalMl,
      },
    })
  );

  // Sync DailyHealthMetric hydrationMl
  try {
    await withDbRetry(() =>
      prisma.dailyHealthMetric.upsert({
        where: {
          userId_dateKey: { userId, dateKey },
        },
        create: {
          userId,
          dateKey,
          hydrationMl: totalMl,
          waterIntakeMl: totalMl,
          source: "Water Tracker",
        },
        update: {
          hydrationMl: totalMl,
          waterIntakeMl: totalMl,
        },
      })
    );
  } catch {}

  const goal = await prisma.nutritionGoal.findUnique({
    where: { userId },
    select: { waterGoalMl: true },
  });

  return {
    success: true,
    deletedId: entryId,
    totalMl,
    waterGoalMl: goal?.waterGoalMl || 3000,
    entries: remainingEntries.map((e) => ({
      id: e.id,
      amountMl: e.amountMl,
      loggedAt: e.loggedAt.toISOString(),
    })),
  };
}

/**
 * Updates water goal in NutritionGoal.
 */
export async function updateWaterGoal(userId: string, waterGoalMl: number) {
  const cleanGoal = Math.max(500, Math.min(15000, Math.round(waterGoalMl)));

  const updated = await withDbRetry(() =>
    prisma.nutritionGoal.upsert({
      where: { userId },
      create: {
        userId,
        waterGoalMl: cleanGoal,
      },
      update: {
        waterGoalMl: cleanGoal,
      },
    })
  );

  return {
    success: true,
    waterGoalMl: updated.waterGoalMl,
  };
}

/**
 * Updates sugar goal in NutritionGoal.
 */
export async function updateSugarGoal(userId: string, sugarTarget: number, addedSugarTarget?: number) {
  const cleanSugar = Math.max(0, Math.round(sugarTarget * 10) / 10);
  const cleanAdded = addedSugarTarget !== undefined ? Math.max(0, Math.round(addedSugarTarget * 10) / 10) : undefined;

  const updated = await withDbRetry(() =>
    prisma.nutritionGoal.upsert({
      where: { userId },
      create: {
        userId,
        sugarTarget: cleanSugar,
        addedSugarTarget: cleanAdded ?? 25,
      },
      update: {
        sugarTarget: cleanSugar,
        ...(cleanAdded !== undefined ? { addedSugarTarget: cleanAdded } : {}),
      },
    })
  );

  return {
    success: true,
    sugarTarget: updated.sugarTarget,
    addedSugarTarget: updated.addedSugarTarget,
  };
}

/**
 * Automatically syncs completed NutriFlexs order items into the customer's food diary.
 * Idempotent: checks orderItemId so duplicates are never inserted.
 */
export async function syncCompletedOrderToNutritionDiary(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!order || order.status !== "COMPLETED") {
    return { synced: 0, skipped: 0 };
  }

  const completionDate = order.updatedAt || order.createdAt || new Date();
  const dateKey = getLocalDateKey("Asia/Kolkata", completionDate);
  const mealType = getMealTypeFromDate(completionDate, "Asia/Kolkata");

  let synced = 0;
  let skipped = 0;

  for (const item of order.items) {
    if (!item.product) continue;

    // Check if an entry already exists for this orderItemId
    const existing = await prisma.foodLog.findFirst({
      where: { orderItemId: item.id },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const totalCals = Math.round(item.product.calories * item.quantity * 10) / 10;
    const totalProt = Math.round(item.product.protein * item.quantity * 10) / 10;
    const totalCarb = Math.round(item.product.carbs * item.quantity * 10) / 10;
    const totalFat = Math.round(item.product.fats * item.quantity * 10) / 10;
    const productTotalSugar = item.product.totalSugar !== undefined && item.product.totalSugar !== null
      ? Math.round(item.product.totalSugar * item.quantity * 10) / 10
      : null;
    const productAddedSugar = item.product.addedSugar !== undefined && item.product.addedSugar !== null
      ? Math.round(item.product.addedSugar * item.quantity * 10) / 10
      : null;
    const productHasSugarData = productTotalSugar !== null;

    await prisma.foodLog.create({
      data: {
        userId: order.userId,
        orderItemId: item.id,
        productId: item.productId,
        foodNameSnapshot: `NutriFlexs: ${item.product.name}`,
        mealType,
        quantity: item.quantity,
        unit: "serving",
        calories: totalCals,
        protein: totalProt,
        carbohydrates: totalCarb,
        fat: totalFat,
        totalSugar: productTotalSugar,
        addedSugar: productAddedSugar,
        hasSugarData: productHasSugarData,
        dateKey,
        loggedAt: completionDate,
      },
    });

    synced++;
  }

  return { synced, skipped };
}

export interface GuestMigrationPayload {
  goals?: {
    dailyCalorieGoal?: number | null;
    proteinGoal?: number | null;
    carbohydrateGoal?: number | null;
    fatGoal?: number | null;
    waterGoalMl?: number | null;
    sugarTarget?: number | null;
    addedSugarTarget?: number | null;
  };
  logs?: Array<{
    foodItemId?: string | null;
    productId?: string | null;
    name: string;
    quantity: number;
    unit: string;
    mealType: MealType;
    dateKey: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    totalSugar?: number | null;
    addedSugar?: number | null;
    hasSugarData?: boolean;
    loggedAt?: string;
  }>;
  customFoods?: Array<{
    name: string;
    category?: string;
    description?: string;
    caloriesPer100g: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    totalSugar?: number | null;
    addedSugar?: number | null;
    defaultServingSize?: number;
    defaultServingUnit?: string;
    servingWeightGrams?: number;
  }>;
  waterEntries?: Array<{
    dateKey: string;
    amountMl: number;
    loggedAt?: string;
  }>;
}

/**
 * Migrates locally-stored guest nutrition logs, goals, and custom dishes into user database records.
 * Carefully avoids duplicates and never overwrites existing account goals without confirmation.
 */
export async function migrateGuestNutritionData(
  userId: string,
  payload: GuestMigrationPayload
) {
  // 1. Migrate custom foods first
  const customFoodIdMap = new Map<string, string>();
  if (payload.customFoods && payload.customFoods.length > 0) {
    for (const cf of payload.customFoods) {
      if (!cf.name || !cf.name.trim()) continue;
      const existing = await prisma.foodItem.findFirst({
        where: {
          createdById: userId,
          name: { equals: cf.name.trim(), mode: "insensitive" },
        },
      });
      if (!existing) {
        const created = await prisma.foodItem.create({
          data: {
            name: cf.name.trim(),
            category: cf.category || "Custom foods",
            description: cf.description || "Migrated custom food",
            caloriesPer100g: cf.caloriesPer100g,
            protein: cf.protein,
            carbohydrates: cf.carbohydrates,
            fat: cf.fat,
            defaultServingSize: cf.defaultServingSize || 1,
            defaultServingUnit: cf.defaultServingUnit || "serving",
            servingWeightGrams: cf.servingWeightGrams || 100,
            isCustom: true,
            createdById: userId,
            isActive: true,
          },
        });
        customFoodIdMap.set(cf.name.trim().toLowerCase(), created.id);
      } else {
        customFoodIdMap.set(cf.name.trim().toLowerCase(), existing.id);
      }
    }
  }

  // 2. Migrate goals carefully (do not overwrite existing non-null user goals)
  let goalsMigrated = false;
  if (payload.goals) {
    const existingGoal = await prisma.nutritionGoal.findUnique({
      where: { userId },
    });

    if (!existingGoal) {
      if (
        payload.goals.dailyCalorieGoal ||
        payload.goals.proteinGoal ||
        payload.goals.carbohydrateGoal ||
        payload.goals.fatGoal
      ) {
        await prisma.nutritionGoal.create({
          data: {
            userId,
            dailyCalorieGoal: payload.goals.dailyCalorieGoal || null,
            proteinGoal: payload.goals.proteinGoal || null,
            carbohydrateGoal: payload.goals.carbohydrateGoal || null,
            fatGoal: payload.goals.fatGoal || null,
          },
        });
        goalsMigrated = true;
      }
    } else {
      // Only backfill unset goals, never overwrite existing goals
      const updates: any = {};
      if (!existingGoal.dailyCalorieGoal && payload.goals.dailyCalorieGoal) {
        updates.dailyCalorieGoal = payload.goals.dailyCalorieGoal;
      }
      if (!existingGoal.proteinGoal && payload.goals.proteinGoal) {
        updates.proteinGoal = payload.goals.proteinGoal;
      }
      if (!existingGoal.carbohydrateGoal && payload.goals.carbohydrateGoal) {
        updates.carbohydrateGoal = payload.goals.carbohydrateGoal;
      }
      if (!existingGoal.fatGoal && payload.goals.fatGoal) {
        updates.fatGoal = payload.goals.fatGoal;
      }
      if (!existingGoal.waterGoalMl && payload.goals.waterGoalMl) {
        updates.waterGoalMl = payload.goals.waterGoalMl;
      }
      if (!existingGoal.sugarTarget && payload.goals.sugarTarget) {
        updates.sugarTarget = payload.goals.sugarTarget;
      }
      if (!existingGoal.addedSugarTarget && payload.goals.addedSugarTarget) {
        updates.addedSugarTarget = payload.goals.addedSugarTarget;
      }
      if (Object.keys(updates).length > 0) {
        await prisma.nutritionGoal.update({
          where: { userId },
          data: updates,
        });
        goalsMigrated = true;
      }
    }
  }

  // 3. Migrate water entries
  let migratedWaterCount = 0;
  if (payload.waterEntries && payload.waterEntries.length > 0) {
    const dates = Array.from(new Set(payload.waterEntries.map((w) => w.dateKey)));
    for (const w of payload.waterEntries) {
      if (!w.dateKey || !w.amountMl || w.amountMl <= 0) continue;
      await prisma.waterEntry.create({
        data: {
          userId,
          dateKey: w.dateKey,
          amountMl: w.amountMl,
          loggedAt: w.loggedAt ? new Date(w.loggedAt) : new Date(),
        },
      });
      migratedWaterCount++;
    }

    // Recalculate daily WaterLog for each affected date
    for (const d of dates) {
      const allW = await prisma.waterEntry.findMany({
        where: { userId, dateKey: d },
      });
      const sumMl = allW.reduce((sum, curr) => sum + curr.amountMl, 0);
      await prisma.waterLog.upsert({
        where: {
          userId_dateKey: { userId, dateKey: d },
        },
        create: {
          userId,
          dateKey: d,
          amountMl: sumMl,
        },
        update: {
          amountMl: sumMl,
        },
      });
    }
  }

  // 4. Migrate logs (deduplicate against existing logs)
  let migratedLogsCount = 0;
  let skippedDuplicatesCount = 0;

  if (payload.logs && payload.logs.length > 0) {
    const dateKeys = Array.from(new Set(payload.logs.map((l) => l.dateKey)));
    const existingLogs = await prisma.foodLog.findMany({
      where: {
        userId,
        dateKey: { in: dateKeys },
      },
    });

    for (const log of payload.logs) {
      if (!log.name || !log.dateKey || !log.mealType) continue;

      // Duplicate check: same dateKey, mealType, and foodNameSnapshot (or matching productId/foodItemId)
      const isDuplicate = existingLogs.some((el) => {
        if (el.dateKey !== log.dateKey || el.mealType !== log.mealType) return false;
        const nameMatch = el.foodNameSnapshot.trim().toLowerCase() === log.name.trim().toLowerCase();
        const productMatch = log.productId && el.productId === log.productId;
        const foodItemMatch = log.foodItemId && el.foodItemId === log.foodItemId;
        return nameMatch || productMatch || foodItemMatch;
      });

      if (isDuplicate) {
        skippedDuplicatesCount++;
        continue;
      }

      // Check if foodItemId needs mapping from custom foods
      let resolvedFoodItemId = log.foodItemId;
      if (!resolvedFoodItemId && customFoodIdMap.has(log.name.trim().toLowerCase())) {
        resolvedFoodItemId = customFoodIdMap.get(log.name.trim().toLowerCase());
      }

      const totalSugar = log.totalSugar !== undefined ? log.totalSugar : null;
      const addedSugar = log.addedSugar !== undefined ? log.addedSugar : null;

      const created = await prisma.foodLog.create({
        data: {
          userId,
          foodNameSnapshot: log.name.trim(),
          mealType: log.mealType,
          quantity: log.quantity || 1,
          unit: log.unit || "serving",
          calories: log.calories,
          protein: log.protein,
          carbohydrates: log.carbohydrates,
          fat: log.fat,
          totalSugar,
          addedSugar,
          hasSugarData: totalSugar !== null,
          dateKey: log.dateKey,
          foodItemId: resolvedFoodItemId || null,
          productId: log.productId || null,
          loggedAt: log.loggedAt ? new Date(log.loggedAt) : new Date(),
        },
      });

      existingLogs.push(created);
      migratedLogsCount++;
    }
  }

  return {
    success: true,
    migratedLogsCount,
    migratedWaterCount,
    skippedDuplicatesCount,
    goalsMigrated,
  };
}

/**
 * -------------------------------------------------------------
 * PHASE 3: RECENT FOODS, FAVOURITES AND SAVED MEALS
 * -------------------------------------------------------------
 */

/**
 * Get distinct recent foods logged by the user based on actual user activity.
 */
export async function getRecentFoods(userId: string, limit = 12) {
  const logs = await prisma.foodLog.findMany({
    where: { userId },
    orderBy: { loggedAt: "desc" },
    take: 60,
    select: {
      id: true,
      foodNameSnapshot: true,
      variantNameSnapshot: true,
      quantity: true,
      unit: true,
      gramsCalculated: true,
      calories: true,
      protein: true,
      carbohydrates: true,
      fat: true,
      foodItemId: true,
      foodVariantId: true,
      productId: true,
      loggedAt: true,
    },
  });

  const seen = new Set<string>();
  const recentFoods: any[] = [];

  for (const log of logs) {
    const key = (log.variantNameSnapshot || log.foodNameSnapshot).trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      recentFoods.push({
        id: log.id,
        name: log.foodNameSnapshot,
        variantName: log.variantNameSnapshot,
        lastQuantity: log.quantity,
        unit: log.unit,
        grams: log.gramsCalculated,
        calories: Math.round(log.calories * 10) / 10,
        protein: Math.round(log.protein * 10) / 10,
        carbohydrates: Math.round(log.carbohydrates * 10) / 10,
        fat: Math.round(log.fat * 10) / 10,
        foodItemId: log.foodItemId,
        foodVariantId: log.foodVariantId,
        productId: log.productId,
        loggedAt: log.loggedAt.toISOString(),
      });
      if (recentFoods.length >= limit) break;
    }
  }

  return recentFoods;
}

/**
 * Get all favorite foods for an authenticated user.
 */
export async function getFavoriteFoods(userId: string) {
  return await prisma.favoriteFood.findMany({
    where: { userId },
    include: {
      foodVariant: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Add or toggle favorite food item.
 */
export async function toggleFavoriteFood(userId: string, data: {
  foodName: string;
  foodItemId?: string | null;
  foodVariantId?: string | null;
  productId?: string | null;
  category?: string | null;
  caloriesPer100g?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  defaultServingSize?: number;
  defaultServingUnit?: string;
  servingWeightGrams?: number;
}) {
  const name = data.foodName.trim();

  // Check if exists
  const existing = await prisma.favoriteFood.findFirst({
    where: {
      userId,
      OR: [
        ...(data.foodVariantId ? [{ foodVariantId: data.foodVariantId }] : []),
        ...(data.foodItemId && !data.foodVariantId ? [{ foodItemId: data.foodItemId }] : []),
        ...(data.productId ? [{ productId: data.productId }] : []),
        { foodNameSnapshot: { equals: name, mode: "insensitive" } },
      ],
    },
  });

  if (existing) {
    await prisma.favoriteFood.delete({ where: { id: existing.id } });
    return { isFavorite: false, item: null };
  }

  const created = await prisma.favoriteFood.create({
    data: {
      userId,
      foodItemId: data.foodItemId || null,
      foodVariantId: data.foodVariantId || null,
      productId: data.productId || null,
      foodNameSnapshot: name,
      category: data.category || "General",
      caloriesPer100g: data.caloriesPer100g || 0,
      protein: data.protein || 0,
      carbohydrates: data.carbohydrates || 0,
      fat: data.fat || 0,
      defaultServingSize: data.defaultServingSize || 1,
      defaultServingUnit: data.defaultServingUnit || "serving",
      servingWeightGrams: data.servingWeightGrams || 100,
    },
  });

  return { isFavorite: true, item: created };
}

/**
 * Remove a favorite food by ID.
 */
export async function removeFavoriteFood(userId: string, favoriteId: string) {
  const existing = await prisma.favoriteFood.findFirst({
    where: { id: favoriteId, userId },
  });

  if (!existing) return null;
  return await prisma.favoriteFood.delete({ where: { id: existing.id } });
}

/**
 * Get all saved meals and recipes for a user.
 */
export async function getSavedMeals(userId: string) {
  const meals = await prisma.savedMeal.findMany({
    where: { userId },
    include: {
      items: {
        include: { foodVariant: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return meals.map((m) => {
    const totalCalories = Math.round(m.items.reduce((acc, i) => acc + i.calories, 0) * 10) / 10;
    const totalProtein = Math.round(m.items.reduce((acc, i) => acc + i.protein, 0) * 10) / 10;
    const totalCarbs = Math.round(m.items.reduce((acc, i) => acc + i.carbohydrates, 0) * 10) / 10;
    const totalFat = Math.round(m.items.reduce((acc, i) => acc + i.fat, 0) * 10) / 10;

    return {
      ...m,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      itemCount: m.items.length,
    };
  });
}

/**
 * Create a new saved meal with multiple individual food items.
 */
export async function createSavedMeal(userId: string, data: {
  name: string;
  description?: string;
  items: Array<{
    foodName: string;
    foodItemId?: string | null;
    foodVariantId?: string | null;
    productId?: string | null;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    caloriesPer100g?: number;
    servingWeightGrams?: number;
  }>;
}) {
  if (!data.name || !data.name.trim()) {
    throw new Error("Meal name is required.");
  }
  if (!data.items || data.items.length === 0) {
    throw new Error("A saved meal must contain at least one food item.");
  }

  return await prisma.savedMeal.create({
    data: {
      userId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      items: {
        create: data.items.map((it) => ({
          foodName: it.foodName.trim(),
          foodItemId: it.foodItemId || null,
          foodVariantId: it.foodVariantId || null,
          productId: it.productId || null,
          quantity: Math.max(0.1, it.quantity || 1),
          unit: it.unit || "serving",
          calories: Math.round(it.calories * 10) / 10,
          protein: Math.round(it.protein * 10) / 10,
          carbohydrates: Math.round(it.carbohydrates * 10) / 10,
          fat: Math.round(it.fat * 10) / 10,
          caloriesPer100g: it.caloriesPer100g || 0,
          servingWeightGrams: it.servingWeightGrams || 100,
        })),
      },
    },
    include: {
      items: true,
    },
  });
}

/**
 * Update an existing saved meal.
 */
export async function updateSavedMeal(userId: string, mealId: string, data: {
  name: string;
  description?: string;
  items: Array<{
    foodName: string;
    foodItemId?: string | null;
    foodVariantId?: string | null;
    productId?: string | null;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    caloriesPer100g?: number;
    servingWeightGrams?: number;
  }>;
}) {
  const existing = await prisma.savedMeal.findFirst({
    where: { id: mealId, userId },
  });
  if (!existing) {
    throw new Error("Saved meal not found or unauthorized.");
  }

  return await prisma.$transaction(async (tx) => {
    // Delete old items
    await tx.savedMealItem.deleteMany({
      where: { savedMealId: mealId },
    });

    // Update parent and insert new items
    return await tx.savedMeal.update({
      where: { id: mealId },
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        items: {
          create: data.items.map((it) => ({
            foodName: it.foodName.trim(),
            foodItemId: it.foodItemId || null,
            foodVariantId: it.foodVariantId || null,
            productId: it.productId || null,
            quantity: Math.max(0.1, it.quantity || 1),
            unit: it.unit || "serving",
            calories: Math.round(it.calories * 10) / 10,
            protein: Math.round(it.protein * 10) / 10,
            carbohydrates: Math.round(it.carbohydrates * 10) / 10,
            fat: Math.round(it.fat * 10) / 10,
            caloriesPer100g: it.caloriesPer100g || 0,
            servingWeightGrams: it.servingWeightGrams || 100,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  });
}

/**
 * Delete a saved meal.
 */
export async function deleteSavedMeal(userId: string, mealId: string) {
  const existing = await prisma.savedMeal.findFirst({
    where: { id: mealId, userId },
  });
  if (!existing) {
    throw new Error("Saved meal not found or unauthorized.");
  }

  return await prisma.savedMeal.delete({
    where: { id: mealId },
  });
}

/**
 * Log an entire saved meal into the food diary.
 * Creates individual FoodLog records for each item in the saved meal
 * so all nutrition snapshot calculations remain accurate and granular.
 */
export async function logSavedMeal(userId: string, mealId: string, mealType: MealType, dateKey: string) {
  const meal = await prisma.savedMeal.findFirst({
    where: { id: mealId, userId },
    include: { items: true },
  });

  if (!meal) {
    throw new Error("Saved meal not found or unauthorized.");
  }

  const createdLogs = await prisma.$transaction(
    meal.items.map((it) =>
      prisma.foodLog.create({
        data: {
          userId,
          foodItemId: it.foodItemId || null,
          foodVariantId: it.foodVariantId || null,
          productId: it.productId || null,
          foodNameSnapshot: it.foodName,
          variantNameSnapshot: it.foodName,
          servingUnitSnapshot: it.unit,
          mealType,
          quantity: it.quantity,
          unit: it.unit,
          calories: it.calories,
          protein: it.protein,
          carbohydrates: it.carbohydrates,
          fat: it.fat,
          dateKey,
          loggedAt: new Date(),
        },
      })
    )
  );

  return {
    success: true,
    mealName: meal.name,
    loggedItemsCount: createdLogs.length,
    createdLogs,
  };
}


