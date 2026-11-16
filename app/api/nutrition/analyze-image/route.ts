import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateImageBuffer } from "@/lib/image-security";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";
import {
  getUserEntitlements,
  recordAiScanUsage,
  EntitlementError,
} from "@/services/subscription-entitlement.service";
import {
  calculateVariantNutrition,
  calculateItemNutrition,
  searchFoodLibrary,
} from "@/services/nutrition.service";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Zod schema for validating Gemini multimodal output
const geminiDetectedItemSchema = z.object({
  foodName: z.string().trim().min(1).max(120),
  category: z.string().trim().max(80).default("Indian Curries & Dal"),
  estimatedWeightGrams: z.number().positive().max(5000).default(150),
  servingUnit: z.string().trim().max(50).default("medium_bowl"),
  quantity: z.number().positive().max(50).default(1),
  confidence: z.number().min(0).max(1).default(0.85),
  isGravy: z.boolean().default(false),
  description: z.string().trim().max(200).optional().default(""),
  estimatedCalories: z.number().nonnegative().max(5000).default(180),
  estimatedProtein: z.number().nonnegative().max(500).default(6),
  estimatedCarbs: z.number().nonnegative().max(500).default(22),
  estimatedFat: z.number().nonnegative().max(500).default(8),
  caloriesPer100g: z.number().nonnegative().max(1000).optional(),
  proteinPer100g: z.number().nonnegative().max(100).optional(),
  carbsPer100g: z.number().nonnegative().max(100).optional(),
  fatPer100g: z.number().nonnegative().max(100).optional(),
});

const geminiAnalysisOutputSchema = z.object({
  mealTitle: z.string().trim().min(1).max(120).default("Indian Meal Plate"),
  items: z.array(geminiDetectedItemSchema).min(1),
});

export type GeminiAnalysisOutput = z.infer<typeof geminiAnalysisOutputSchema>;

export interface ConfirmedFoodAnalysisItem {
  id: string;
  detectedName: string;
  displayName: string;
  category: string;
  foodItemId: string | null;
  foodVariantId: string | null;
  isGravy: boolean;
  quantity: number;
  unit: string;
  grams: number;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  confidence: number;
  confidenceLabel: "High" | "Medium" | "Low";
  isVerified: boolean;
  matchSource: "DATABASE_VARIANT" | "DATABASE_ITEM" | "ESTIMATED_AI";
  suggestions?: Array<{
    id: string;
    name: string;
    category: string;
    caloriesPer100g: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  }>;
}

/**
 * Searches the NutriFlexs food database to match a detected dish and calculate authoritative macros.
 * Authoritative Formula: Selected nutrition = Nutrition per 100g × Selected quantity in grams / 100
 */
async function matchFoodItemWithDatabase(
  item: z.infer<typeof geminiDetectedItemSchema>,
  index: number
): Promise<ConfirmedFoodAnalysisItem> {
  const cleanName = item.foodName.trim();
  const searchKeywords = cleanName.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const ADJECTIVES = new Set(["whole", "wheat", "steamed", "fresh", "boiled", "cooked", "fried", "dry", "spicy", "hot", "plain", "mixed", "homemade"]);
  const significantKeywords = searchKeywords.filter((w) => !ADJECTIVES.has(w));
  const mainKeyword = significantKeywords[0] || searchKeywords[searchKeywords.length - 1] || cleanName;

  // 1. Try matching with FoodVariant (dish-specific variations such as Dal Makhani, Paneer, Rice, etc.)
  try {
    const matchedVariants = await prisma.foodVariant.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: cleanName, mode: "insensitive" } },
          { name: { contains: mainKeyword, mode: "insensitive" } },
          { foodItem: { name: { contains: cleanName, mode: "insensitive" } } },
          { foodItem: { name: { contains: mainKeyword, mode: "insensitive" } } },
        ],
      },
      include: { foodItem: true },
      take: 5,
    });

    if (matchedVariants.length > 0) {
      // Prioritize variant matching gravy flag if item is gravy
      let bestVariant = matchedVariants[0];
      if (item.isGravy) {
        const gravyVariant = matchedVariants.find(
          (v) => v.variantType === "GRAVY_ONLY" || v.variantType === "BALANCED" || v.name.toLowerCase().includes("gravy")
        );
        if (gravyVariant) bestVariant = gravyVariant;
      }

      const fallbackWeight = bestVariant.foodItem?.servingWeightGrams || item.estimatedWeightGrams || 180;
      const computed = calculateVariantNutrition(
        bestVariant,
        item.quantity || 1,
        item.servingUnit || "medium_bowl",
        fallbackWeight
      );

      const confidenceLabel = item.confidence >= 0.85 ? "High" : item.confidence >= 0.65 ? "Medium" : "Low";

      return {
        id: `detected_${Date.now()}_${index}`,
        detectedName: item.foodName,
        displayName: bestVariant.name,
        category: bestVariant.foodItem?.category || item.category,
        foodItemId: bestVariant.foodItemId,
        foodVariantId: bestVariant.id,
        isGravy: item.isGravy,
        quantity: item.quantity || 1,
        unit: item.servingUnit || "medium_bowl",
        grams: computed.grams,
        calories: computed.calories,
        protein: computed.protein,
        carbohydrates: computed.carbohydrates,
        fat: computed.fat,
        caloriesPer100g: bestVariant.caloriesPer100g,
        proteinPer100g: bestVariant.protein,
        carbsPer100g: bestVariant.carbohydrates,
        fatPer100g: bestVariant.fat,
        confidence: Math.round(item.confidence * 100) / 100,
        confidenceLabel,
        isVerified: true,
        matchSource: "DATABASE_VARIANT",
        suggestions: [],
      };
    }
  } catch (err) {
    console.warn("[matchFoodItemWithDatabase] Variant match query skipped or failed:", err);
  }

  // 2. Try matching with FoodItem
  try {
    const matchedFoods = await prisma.foodItem.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: cleanName, mode: "insensitive" } },
          { name: { contains: mainKeyword, mode: "insensitive" } },
        ],
      },
      take: 4,
    });

    if (matchedFoods.length > 0) {
      const bestFood = matchedFoods[0];
      const computed = calculateItemNutrition(
        bestFood,
        item.quantity || 1,
        item.servingUnit || bestFood.defaultServingUnit || "serving"
      );

      const confidenceLabel = item.confidence >= 0.85 ? "High" : item.confidence >= 0.65 ? "Medium" : "Low";

      return {
        id: `detected_${Date.now()}_${index}`,
        detectedName: item.foodName,
        displayName: bestFood.name,
        category: bestFood.category,
        foodItemId: bestFood.id,
        foodVariantId: null,
        isGravy: item.isGravy,
        quantity: item.quantity || 1,
        unit: item.servingUnit || bestFood.defaultServingUnit || "serving",
        grams: computed.grams,
        calories: computed.calories,
        protein: computed.protein,
        carbohydrates: computed.carbohydrates,
        fat: computed.fat,
        caloriesPer100g: bestFood.caloriesPer100g,
        proteinPer100g: bestFood.protein,
        carbsPer100g: bestFood.carbohydrates,
        fatPer100g: bestFood.fat,
        confidence: Math.round(item.confidence * 100) / 100,
        confidenceLabel,
        isVerified: true,
        matchSource: "DATABASE_ITEM",
        suggestions: [],
      };
    }
  } catch (err) {
    console.warn("[matchFoodItemWithDatabase] FoodItem match query failed:", err);
  }

  // 3. Fallback: Unmatched dish. Use Gemini's estimates and provide suggestions from database
  let suggestions: ConfirmedFoodAnalysisItem["suggestions"] = [];
  try {
    const related = await searchFoodLibrary({
      query: mainKeyword,
      limit: 3,
      includeNutriFlexsProducts: false,
    });
    suggestions = related.foods.slice(0, 3).map((f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      caloriesPer100g: f.caloriesPer100g,
      protein: f.protein,
      carbohydrates: f.carbohydrates,
      fat: f.fat,
    }));
  } catch {
    suggestions = [];
  }

  const confidenceLabel = item.confidence >= 0.85 ? "High" : item.confidence >= 0.65 ? "Medium" : "Low";
  const calPer100 = item.caloriesPer100g || (item.estimatedWeightGrams > 0 ? Math.round((item.estimatedCalories / item.estimatedWeightGrams) * 100) : 120);
  const protPer100 = item.proteinPer100g || (item.estimatedWeightGrams > 0 ? Math.round((item.estimatedProtein / item.estimatedWeightGrams) * 100 * 10) / 10 : 4);
  const carbsPer100 = item.carbsPer100g || (item.estimatedWeightGrams > 0 ? Math.round((item.estimatedCarbs / item.estimatedWeightGrams) * 100 * 10) / 10 : 16);
  const fatPer100 = item.fatPer100g || (item.estimatedWeightGrams > 0 ? Math.round((item.estimatedFat / item.estimatedWeightGrams) * 100 * 10) / 10 : 5);

  return {
    id: `detected_${Date.now()}_${index}`,
    detectedName: item.foodName,
    displayName: item.foodName,
    category: item.category,
    foodItemId: null,
    foodVariantId: null,
    isGravy: item.isGravy,
    quantity: item.quantity || 1,
    unit: item.servingUnit || "medium_bowl",
    grams: item.estimatedWeightGrams,
    calories: Math.round(item.estimatedCalories * 10) / 10,
    protein: Math.round(item.estimatedProtein * 10) / 10,
    carbohydrates: Math.round(item.estimatedCarbs * 10) / 10,
    fat: Math.round(item.estimatedFat * 10) / 10,
    caloriesPer100g: calPer100,
    proteinPer100g: protPer100,
    carbsPer100g: carbsPer100,
    fatPer100g: fatPer100,
    confidence: Math.round(item.confidence * 100) / 100,
    confidenceLabel,
    isVerified: false,
    matchSource: "ESTIMATED_AI",
    suggestions,
  };
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  // 1. Abuse prevention: 20 scans per 15 minutes per IP
  const rateLimit = checkRateLimit({
    key: `ai_meal_scan:${clientIp}`,
    maxRequests: 20,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Scan quota exceeded. Please wait a few minutes before scanning another meal.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
        },
      }
    );
  }

  try {
    // 2. Authentication & Entitlements
    const session = await getServerSession(authOptions);
    let user: any = null;
    let isGuest = true;
    let userEntitlements: any = null;

    if (session?.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase().trim() },
      });

      if (user) {
        isGuest = false;
        userEntitlements = await getUserEntitlements(user.id);
      }
    }

    // 3. Extract and validate image buffer
    let imageBuffer: Buffer | null = null;
    let simulateSample = false;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image");
      if (formData.get("simulateSample") === "true") {
        simulateSample = true;
      }

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { success: false, error: "An image file is required" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.simulateSample) {
        simulateSample = true;
      }
      if (!body.imageBase64 || typeof body.imageBase64 !== "string") {
        return NextResponse.json(
          { success: false, error: "Missing or invalid imageBase64 payload" },
          { status: 400 }
        );
      }

      const cleanBase64 = body.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      imageBuffer = Buffer.from(cleanBase64, "base64");
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported content type. Send multipart/form-data or application/json." },
        { status: 415 }
      );
    }

    if (!imageBuffer || imageBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "Image file data is empty" },
        { status: 400 }
      );
    }

    // Magic-byte file validation (JPEG, PNG, WebP up to 8MB)
    const validation = validateImageBuffer(imageBuffer);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Invalid image file format" },
        { status: 400 }
      );
    }

    // 4. Server-side GEMINI_API_KEY Check (Never hardcode, never silently mock!)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const isMockHeader = req.headers.get("x-mock-meal-analysis") === "true";

    // If key is missing and no explicit test simulation header is provided, return required 503 error
    if (!geminiApiKey && !simulateSample && !isMockHeader) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gemini API key is not configured on the server. Please set the GEMINI_API_KEY environment variable to enable AI meal scanning.",
          code: "MISSING_GEMINI_API_KEY",
        },
        { status: 503 }
      );
    }

    // 5. AI Inference or Test Simulation
    let rawGeminiResponse: any = null;

    if (geminiApiKey) {
      try {
        const geminiPrompt = `You are an expert Indian clinical nutritionist and computer vision system for the NutriFlexs Health platform.
Carefully examine the meal in this image.

Key instructions:
1. Identify all visible separate food items on the plate or table (e.g. Dal Makhani, Steamed Basmati Rice, Phulka / Roti, Paneer Butter Masala, Mixed Vegetable Sabzi, Chole, Salad, Dosa, Idli, Sambhar, Chicken Curry, Boiled Eggs, etc.).
2. Break down mixed meals into individual distinct components rather than treating the plate as a single generic item.
3. Distinguish between gravy and solid ingredients where visually possible (flag isGravy: true for gravies/curries/soups, and specify whether it is mostly gravy or includes solid paneer/chicken/veggies).
4. Estimate portion size in grams or millilitres, along with a natural serving unit (e.g. "medium_bowl", "small_bowl", "piece", "cup", "plate", "g", "ml").
5. Provide a realistic confidence score (0.0 to 1.0) and describe any uncertainty or assumptions.
6. Provide reasonable baseline nutritional estimates per 100g and for the estimated portion (calories, protein, carbohydrates, fat).

Return ONLY a valid JSON object without markdown fences, conforming to this exact structure:
{
  "mealTitle": "North Indian Thali",
  "items": [
    {
      "foodName": "Dal Makhani",
      "category": "Indian Curries & Dal",
      "estimatedWeightGrams": 180,
      "servingUnit": "medium_bowl",
      "quantity": 1,
      "confidence": 0.94,
      "isGravy": true,
      "description": "Slow cooked black lentil curry with rich gravy",
      "estimatedCalories": 234,
      "estimatedProtein": 8.5,
      "estimatedCarbs": 26.2,
      "estimatedFat": 10.4,
      "caloriesPer100g": 130,
      "proteinPer100g": 4.7,
      "carbsPer100g": 14.6,
      "fatPer100g": 5.8
    }
  ]
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: geminiPrompt },
                    {
                      inlineData: {
                        mimeType: validation.mimeType,
                        data: imageBuffer.toString("base64"),
                      },
                    },
                  ],
                },
              ],
            }),
            signal: AbortSignal.timeout(15000), // 15s timeout
          }
        );

        if (!response.ok) {
          const errBody = await response.text();
          console.error("[AI Scan] Gemini API error:", response.status, errBody);
          return NextResponse.json(
            { success: false, error: "AI meal recognition service temporarily unavailable. Please try again." },
            { status: 502 }
          );
        }

        const aiData = await response.json();
        const candidateText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const cleanJson = candidateText.replace(/```json/g, "").replace(/```/g, "").trim();
        rawGeminiResponse = JSON.parse(cleanJson);
      } catch (geminiErr: any) {
        console.error("[AI Scan] Gemini processing exception:", geminiErr);
        return NextResponse.json(
          { success: false, error: "Failed to communicate with AI recognition service. Please try again." },
          { status: 502 }
        );
      }
    } else if (simulateSample || isMockHeader) {
      // Test simulation mode for automated testing / sample preview
      rawGeminiResponse = {
        mealTitle: "North Indian High-Protein Thali",
        items: [
          {
            foodName: "Dal Makhani",
            category: "Indian Curries & Dal",
            estimatedWeightGrams: 180,
            servingUnit: "medium_bowl",
            quantity: 1,
            confidence: 0.94,
            isGravy: true,
            description: "Creamy black lentil curry with rich gravy",
            estimatedCalories: 234,
            estimatedProtein: 8.5,
            estimatedCarbs: 26.2,
            estimatedFat: 10.4,
            caloriesPer100g: 130,
            proteinPer100g: 4.7,
            carbsPer100g: 14.6,
            fatPer100g: 5.8,
          },
          {
            foodName: "Whole Wheat Roti",
            category: "Breads & Roti",
            estimatedWeightGrams: 80,
            servingUnit: "piece",
            quantity: 2,
            confidence: 0.96,
            isGravy: false,
            description: "Freshly roasted whole wheat phulkas",
            estimatedCalories: 168,
            estimatedProtein: 5.6,
            estimatedCarbs: 32.0,
            estimatedFat: 1.2,
            caloriesPer100g: 210,
            proteinPer100g: 7.0,
            carbsPer100g: 40.0,
            fatPer100g: 1.5,
          },
          {
            foodName: "Paneer Bhurji / Sabzi",
            category: "Indian Curries & Dal",
            estimatedWeightGrams: 120,
            servingUnit: "small_bowl",
            quantity: 1,
            confidence: 0.91,
            isGravy: false,
            description: "Cottage cheese scramble with onions, tomatoes & spices",
            estimatedCalories: 216,
            estimatedProtein: 14.4,
            estimatedCarbs: 6.0,
            estimatedFat: 15.0,
            caloriesPer100g: 180,
            proteinPer100g: 12.0,
            carbsPer100g: 5.0,
            fatPer100g: 12.5,
          },
          {
            foodName: "Cucumber & Onion Salad",
            category: "Salads & Fresh Bowls",
            estimatedWeightGrams: 60,
            servingUnit: "small_bowl",
            quantity: 1,
            confidence: 0.88,
            isGravy: false,
            description: "Fresh sliced cucumber and lemon onion salad",
            estimatedCalories: 24,
            estimatedProtein: 1.0,
            estimatedCarbs: 4.8,
            estimatedFat: 0.2,
            caloriesPer100g: 40,
            proteinPer100g: 1.7,
            carbsPer100g: 8.0,
            fatPer100g: 0.3,
          },
        ],
      };
    }

    // 6. Strict validation of AI output with Zod
    const parsedGemini = geminiAnalysisOutputSchema.safeParse(rawGeminiResponse);
    if (!parsedGemini.success) {
      console.error("[AI Scan] Zod validation failed:", parsedGemini.error);
      return NextResponse.json(
        { success: false, error: "AI meal analysis produced invalid output structure. Please try again." },
        { status: 502 }
      );
    }

    // 7. Authoritative Database Matching for all detected items
    const detectedItems: ConfirmedFoodAnalysisItem[] = await Promise.all(
      parsedGemini.data.items.map((item, index) => matchFoodItemWithDatabase(item, index))
    );

    // 8. Compute total meal nutrition
    const totalMealNutrition = detectedItems.reduce(
      (acc, item) => ({
        calories: Math.round((acc.calories + item.calories) * 10) / 10,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        carbohydrates: Math.round((acc.carbohydrates + item.carbohydrates) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
        totalWeightGrams: Math.round((acc.totalWeightGrams + item.grams) * 10) / 10,
      }),
      { calories: 0, protein: 0, carbohydrates: 0, fat: 0, totalWeightGrams: 0 }
    );

    // 9. Quota tracking for active subscribers
    let scanQuotaInfo = {
      isGuest,
      scansUsed: 0,
      scansRemaining: isGuest ? 5 : 30,
      allowance: isGuest ? 5 : 30,
    };

    if (user && userEntitlements?.subscriptionId) {
      try {
        const usageResult = await recordAiScanUsage(user.id, userEntitlements.subscriptionId, {
          foodName: parsedGemini.data.mealTitle,
          confidence: detectedItems[0]?.confidence || 0.9,
        });
        scanQuotaInfo = {
          isGuest: false,
          scansUsed: usageResult.scansUsed,
          scansRemaining: usageResult.scansRemaining,
          allowance: usageResult.allowance,
        };
      } catch (quotaErr) {
        console.warn("[AI Scan] Could not record subscription scan usage:", quotaErr);
      }
    }

    // 10. Ephemeral response — never persist raw image data
    return NextResponse.json({
      success: true,
      requiresUserConfirmation: true,
      message: "AI analysis complete. Review and adjust portions before confirming to your food diary.",
      mealTitle: parsedGemini.data.mealTitle,
      detectedItems,
      totalMealNutrition,
      scanMetadata: {
        fileType: validation.mimeType,
        sizeKb: Math.round(validation.sizeBytes / 1024),
        isGuest,
        scansRemaining: scanQuotaInfo.scansRemaining,
      },
    });
  } catch (error: any) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          requiresUpgrade: true,
        },
        { status: error.statusCode }
      );
    }
    return safeErrorResponse(error, "Failed to analyze meal image", 500);
  }
}

