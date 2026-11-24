import { prisma, withDbRetry } from "@/lib/prisma";
import { getDailyNutritionDiary } from "@/services/nutrition.service";

export interface AICoachContext {
  user: {
    id: string;
    name: string;
    email: string;
    isVegetarian: boolean;
    primaryNutritionGoal?: string | null;
    workoutFrequency?: string | null;
    weightKg?: number | null;
    heightCm?: number | null;
    hasCompletedOnboarding: boolean;
  };
  todaySummary: {
    dateKey: string;
    caloriesConsumed: number;
    calorieTarget: number;
    caloriesRemaining: number;
    proteinConsumed: number;
    proteinTarget: number;
    proteinRemaining: number;
    carbsConsumed: number;
    carbsTarget: number;
    fatConsumed: number;
    fatTarget: number;
    loggedItemsSummary: string[];
  };
  weeklyConsistency?: {
    daysLogged: number;
    avgDailyCalories: number;
    avgDailyProtein: number;
  };
  nutriflexsProducts: Array<{
    id: string;
    name: string;
    price: number;
    protein: number;
    calories: number;
    carbs: number;
    fats: number;
    isVeg: boolean;
    imageUrl: string;
    slug: string;
  }>;
  coaches: Array<{
    id: string;
    fullName: string;
    qualifications: string;
    specializations: string[];
    experienceYears: number;
    consultationFee: number;
    rating: number;
    profileImageUrl?: string | null;
  }>;
}

function getTodayDateKey(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Gathers complete, verified user fitness & nutrition state from database
 */
export async function getAICoachContext(userId?: string | null): Promise<AICoachContext> {
  const todayKey = getTodayDateKey();

  const [products, coaches] = await withDbRetry(() =>
    Promise.all([
      prisma.product.findMany({
        where: { isAvailable: true },
        select: {
          id: true,
          name: true,
          price: true,
          protein: true,
          calories: true,
          carbs: true,
          fats: true,
          isVeg: true,
          imageUrl: true,
          slug: true,
        },
        take: 15,
        orderBy: { isFeatured: "desc" },
      }),
      prisma.dietitianProfile.findMany({
        where: { isVerified: true },
        select: {
          id: true,
          fullName: true,
          qualifications: true,
          specializations: true,
          experienceYears: true,
          consultationFee: true,
          rating: true,
          profileImageUrl: true,
        },
        take: 6,
        orderBy: { rating: "desc" },
      }),
    ])
  );

  // If no logged in user (Guest), return generic context with real products & coaches
  if (!userId) {
    return {
      user: {
        id: "guest",
        name: "Guest Athlete",
        email: "",
        isVegetarian: false,
        primaryNutritionGoal: "BUILD_MUSCLE",
        workoutFrequency: "3_5_DAYS",
        weightKg: null,
        heightCm: null,
        hasCompletedOnboarding: false,
      },
      todaySummary: {
        dateKey: todayKey,
        caloriesConsumed: 0,
        calorieTarget: 2000,
        caloriesRemaining: 2000,
        proteinConsumed: 0,
        proteinTarget: 120,
        proteinRemaining: 120,
        carbsConsumed: 0,
        carbsTarget: 200,
        fatConsumed: 0,
        fatTarget: 65,
        loggedItemsSummary: [],
      },
      weeklyConsistency: {
        daysLogged: 0,
        avgDailyCalories: 0,
        avgDailyProtein: 0,
      },
      nutriflexsProducts: products,
      coaches,
    };
  }

  const [user, diary, weeklyLogs] = await withDbRetry(() =>
    Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          isVegetarian: true,
          primaryNutritionGoal: true,
          workoutFrequency: true,
          weightKg: true,
          heightCm: true,
          hasCompletedNutritionOnboarding: true,
        },
      }),
      getDailyNutritionDiary(userId, todayKey),
      prisma.foodLog.findMany({
        where: {
          userId,
          loggedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          dateKey: true,
          calories: true,
          protein: true,
        },
      }),
    ])
  );

  if (!user) {
    throw new Error("User not found");
  }

  // Calculate today's logged items
  const loggedItems: string[] = [];
  if (diary && diary.meals) {
    for (const meal of Object.values(diary.meals)) {
      if (meal.items && meal.items.length > 0) {
        for (const item of meal.items) {
          loggedItems.push(
            `${meal.label}: ${item.name} (${item.quantity} ${item.unit || "serving"}, ${Math.round(item.calories)} kcal, ${item.protein.toFixed(1)}g protein)`
          );
        }
      }
    }
  }

  // Calculate weekly stats
  const dateMap = new Map<string, { calories: number; protein: number }>();
  for (const log of weeklyLogs) {
    const existing = dateMap.get(log.dateKey) || { calories: 0, protein: 0 };
    existing.calories += log.calories || 0;
    existing.protein += log.protein || 0;
    dateMap.set(log.dateKey, existing);
  }

  const daysLogged = dateMap.size;
  let totalCal = 0;
  let totalProt = 0;
  for (const stats of dateMap.values()) {
    totalCal += stats.calories;
    totalProt += stats.protein;
  }

  return {
    user: {
      id: user.id,
      name: user.name || "Athlete",
      email: user.email,
      isVegetarian: user.isVegetarian,
      primaryNutritionGoal: user.primaryNutritionGoal,
      workoutFrequency: user.workoutFrequency,
      weightKg: user.weightKg,
      heightCm: user.heightCm,
      hasCompletedOnboarding: user.hasCompletedNutritionOnboarding,
    },
    todaySummary: {
      dateKey: todayKey,
      caloriesConsumed: diary?.totals?.calories || 0,
      calorieTarget: diary?.goals?.dailyCalorieGoal || 2000,
      caloriesRemaining: diary?.goals?.remainingCalories ?? ((diary?.goals?.dailyCalorieGoal || 2000) - (diary?.totals?.calories || 0)),
      proteinConsumed: Math.round(diary?.totals?.protein || 0),
      proteinTarget: diary?.goals?.proteinGoal || 120,
      proteinRemaining: diary?.goals?.remainingProtein ?? Math.max(0, (diary?.goals?.proteinGoal || 120) - Math.round(diary?.totals?.protein || 0)),
      carbsConsumed: Math.round(diary?.totals?.carbohydrates || 0),
      carbsTarget: diary?.goals?.carbohydrateGoal || 200,
      fatConsumed: Math.round(diary?.totals?.fat || 0),
      fatTarget: diary?.goals?.fatGoal || 65,
      loggedItemsSummary: loggedItems,
    },
    weeklyConsistency: {
      daysLogged,
      avgDailyCalories: daysLogged > 0 ? Math.round(totalCal / daysLogged) : 0,
      avgDailyProtein: daysLogged > 0 ? Math.round(totalProt / daysLogged) : 0,
    },
    nutriflexsProducts: products,
    coaches,
  };
}

/**
 * System prompt generator grounding the AI in authentic customer metrics and real food items.
 */
function buildSystemPrompt(context?: AICoachContext): string {
  let contextBlock = "";

  if (context) {
    const u = context.user;
    const t = context.todaySummary;
    const w = context.weeklyConsistency;

    contextBlock = `
AUTHENTIC USER CONTEXT (REAL DATABASE RECORDS):
- User Name: ${u.name}
- Primary Fitness / Nutrition Goal: ${u.primaryNutritionGoal || "General Fitness & Health"}
- Vegetarian Mode: ${u.isVegetarian ? "YES (Only suggest vegetarian / plant-based foods)" : "NO (All foods allowed)"}
- Weight: ${u.weightKg ? `${u.weightKg} kg` : "Not provided"}
- Height: ${u.heightCm ? `${u.heightCm} cm` : "Not provided"}
- Workout Frequency: ${u.workoutFrequency || "3-4 days/week"}

TODAY'S LIVE NUTRITION TRACKER STATUS (Date: ${t.dateKey}):
- Calories Consumed: ${t.caloriesConsumed} kcal / ${t.calorieTarget} kcal target (${t.caloriesRemaining} kcal remaining)
- Protein Consumed: ${t.proteinConsumed}g / ${t.proteinTarget}g target (${t.proteinRemaining}g protein remaining)
- Carbs: ${t.carbsConsumed}g / ${t.carbsTarget}g
- Fat: ${t.fatConsumed}g / ${t.fatTarget}g
- Logged Meals Today: ${t.loggedItemsSummary.length > 0 ? t.loggedItemsSummary.join("; ") : "No meals logged yet today"}

PAST 7 DAYS ACTIVITY:
- Days with logged meals: ${w?.daysLogged || 0}/7 days
- Average Daily Protein: ${w?.avgDailyProtein || 0}g
- Average Daily Calories: ${w?.avgDailyCalories || 0} kcal

REAL NUTRIFLEXS MENU ITEMS AVAILABLE AT KIOSKS:
${context.nutriflexsProducts
  .map(
    (p) =>
      `- "${p.name}" (ID: ${p.id}, Slug: ${p.slug}) | Price: ₹${p.price} | ${p.protein}g protein, ${p.calories} kcal | ${p.isVeg ? "VEG" : "NON-VEG"}`
  )
  .join("\n")}

REAL NUTRIFLEXS HUMAN HEALTH COACHES AVAILABLE FOR 1-ON-1 SESSIONS:
${context.coaches
  .map(
    (c) =>
      `- Coach ${c.fullName} (ID: ${c.id}) | Specs: ${c.specializations.join(", ")} | Fee: ₹${c.consultationFee} | Rating: ${c.rating}★`
  )
  .join("\n")}
`;
  }

  return `You are the NutriFlexs AI Health Coach — a knowledgeable, encouraging, fitness-minded personal nutrition mentor.
Your mission is to help customers understand their nutrition, make smarter food choices, achieve their workout goals (muscle gain, fat loss, athletic performance, consistency), and stay motivated.

TONE & STYLE:
- Energetic, friendly, supportive, and practical.
- Speak like an experienced fitness mentor, NOT a clinical hospital doctor or robotic computer.
- Keep responses concise, clear, and action-oriented. Use bullet points and bold text for readability.
- When referencing nutrition numbers (calories, protein, carbs), USE THE REAL NUMBERS PROVIDED IN CONTEXT. Do not invent contradictory numbers.

SAFETY & GUARDRAILS:
1. You are a wellness and lifestyle coach. You do NOT diagnose medical diseases, prescribe medicines, or provide clinical treatments.
2. If a user asks about serious medical issues, severe eating disorders, pregnancy complications, or diabetes medication management, provide gentle supportive guidance and strongly recommend consulting their doctor or booking a 1-on-1 session with a certified NutriFlexs specialist.
3. Never encourage extreme starvation diets (e.g. sub-800 calorie diets) or unsafe weight loss practices.

RECOMMENDATIONS & ACTIONS:
1. When recommending meals, recommend real NutriFlexs products (e.g. Lean Grilled Chicken Breast, Grilled Chicken & Quinoa Energy Bowl, ABC Stamina Rebuilder Juice) or real home foods (e.g. Dal, Paneer Bhurji, Boiled Eggs, Phulka).
2. If the user is in Vegetarian Mode, strictly recommend vegetarian options.
3. When users need deeper 1-on-1 personalized guidance, mention that they can connect directly with our human coaches.

RESPONSE FORMAT:
Your response should be formatted in clean Markdown. At the very end of your response, you may optionally include a JSON block enclosed within \`\`\`json_metadata and \`\`\` containing interactive widgets for the user UI:
{
  "suggestedActions": ["Short follow-up question 1", "Short action 2"],
  "recommendedProductIds": ["matching-product-id-from-list"],
  "recommendedCoachIds": ["matching-coach-id-from-list"]
}
${contextBlock}`;
}

/**
 * Generates an AI Coach response using Google Gemini models with automatic fallback
 */
export async function generateAICoachChatResponse(params: {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  context?: AICoachContext;
}): Promise<{
  text: string;
  metadata?: {
    suggestedActions?: string[];
    recommendedProducts?: any[];
    recommendedCoaches?: any[];
  };
}> {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const systemInstruction = buildSystemPrompt(params.context);

  // Format conversation history for Gemini API
  const contents = params.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-2.5-pro",
  ].filter(Boolean) as string[];

  const uniqueModels = Array.from(new Set(candidateModels));
  let lastError: any = null;

  for (const model of uniqueModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1200,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[AI Coach] Model ${model} returned HTTP ${response.status}:`, errorText);
        lastError = new Error(`Model ${model} returned ${response.status}: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("No text response generated by model");
      }

      // Parse optional json_metadata block
      let cleanText = rawText;
      let parsedMetadata: any = null;

      const metadataRegex = /```json_metadata\s*([\s\S]*?)\s*```/;
      const match = rawText.match(metadataRegex);
      if (match && match[1]) {
        try {
          parsedMetadata = JSON.parse(match[1]);
          cleanText = rawText.replace(metadataRegex, "").trim();
        } catch {
          // Ignore JSON parse errors in metadata
        }
      }

      // Enrich metadata with actual product and coach records
      const enrichedMetadata: any = {};
      if (parsedMetadata?.suggestedActions && Array.isArray(parsedMetadata.suggestedActions)) {
        enrichedMetadata.suggestedActions = parsedMetadata.suggestedActions;
      }

      if (parsedMetadata?.recommendedProductIds && params.context?.nutriflexsProducts) {
        enrichedMetadata.recommendedProducts = params.context.nutriflexsProducts.filter((p) =>
          parsedMetadata.recommendedProductIds.includes(p.id)
        );
      }

      if (parsedMetadata?.recommendedCoachIds && params.context?.coaches) {
        enrichedMetadata.recommendedCoaches = params.context.coaches.filter((c) =>
          parsedMetadata.recommendedCoachIds.includes(c.id)
        );
      }

      // Smart fallback: If LLM mentioned real menu products in text without JSON metadata, automatically detect and attach them!
      if (
        (!enrichedMetadata.recommendedProducts || enrichedMetadata.recommendedProducts.length === 0) &&
        params.context?.nutriflexsProducts
      ) {
        const textLower = cleanText.toLowerCase();
        const detected = params.context.nutriflexsProducts.filter((p) =>
          textLower.includes(p.name.toLowerCase())
        );
        if (detected.length > 0) {
          enrichedMetadata.recommendedProducts = detected.slice(0, 3);
        }
      }

      // Smart fallback: If LLM mentioned coach names, attach coach cards
      if (
        (!enrichedMetadata.recommendedCoaches || enrichedMetadata.recommendedCoaches.length === 0) &&
        params.context?.coaches
      ) {
        const textLower = cleanText.toLowerCase();
        const detectedCoaches = params.context.coaches.filter((c) =>
          textLower.includes(c.fullName.toLowerCase())
        );
        if (detectedCoaches.length > 0) {
          enrichedMetadata.recommendedCoaches = detectedCoaches.slice(0, 2);
        }
      }

      // Suggested action pills fallback if none provided
      if (!enrichedMetadata.suggestedActions || enrichedMetadata.suggestedActions.length === 0) {
        enrichedMetadata.suggestedActions = [
          "How many calories should I eat today?",
          "Show high-protein meal options",
          "Connect me with a fitness coach",
        ];
      }

      return {
        text: cleanText,
        metadata: enrichedMetadata,
      };
    } catch (err: any) {
      console.warn(`[AI Coach] Exception on model ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("All AI models failed to generate response.");
}

/**
 * Gets or creates the primary AI conversation for a user
 */
export async function getOrCreateUserConversation(userId: string, conversationId?: string) {
  if (conversationId) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
      },
    });
    if (conv) return conv;
  }

  // Get most recent or create new
  let conv = await prisma.aIConversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
      },
    },
  });

  if (!conv) {
    conv = await prisma.aIConversation.create({
      data: {
        userId,
        title: "NutriFlexs AI Fitness Coach",
      },
      include: {
        messages: true,
      },
    });
  }

  return conv;
}

/**
 * Saves a user or assistant message to database
 */
export async function saveAIMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata?: any
) {
  const [msg] = await prisma.$transaction([
    prisma.aIMessage.create({
      data: {
        conversationId,
        role,
        content,
        metadata: metadata || undefined,
      },
    }),
    prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return msg;
}
