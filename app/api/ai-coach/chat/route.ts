import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAICoachContext,
  generateAICoachChatResponse,
  getOrCreateUserConversation,
  saveAIMessage,
} from "@/services/ai-coach.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({
        success: true,
        conversationId: null,
        messages: [],
        todaySummary: null,
        isAuthenticated: false,
      });
    }

    const { searchParams } = new URL(req.url);
    const conversationIdParam = searchParams.get("conversationId") || undefined;

    const [conv, context] = await Promise.all([
      getOrCreateUserConversation(userId, conversationIdParam),
      getAICoachContext(userId),
    ]);

    return NextResponse.json({
      success: true,
      conversationId: conv.id,
      messages: conv.messages,
      todaySummary: context.todaySummary,
      userGoal: context.user.primaryNutritionGoal,
      isAuthenticated: true,
    });
  } catch (error: any) {
    console.error("[API /api/ai-coach/chat GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load coaching conversation." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    // 1. Authenticated User Flow (Full Database Context & Message Persistence)
    if (userId) {
      const conv = await getOrCreateUserConversation(userId, conversationId);
      const context = await getAICoachContext(userId);

      // Save incoming user message
      await saveAIMessage(conv.id, "user", message.trim());

      // Format past messages for context window
      const history = (conv.messages || []).slice(-10).map((m: any) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      history.push({ role: "user", content: message.trim() });

      // Generate AI response with context
      const aiResponse = await generateAICoachChatResponse({
        messages: history,
        context,
      });

      // Save assistant message to database
      const savedMsg = await saveAIMessage(
        conv.id,
        "assistant",
        aiResponse.text,
        aiResponse.metadata
      );

      return NextResponse.json({
        success: true,
        conversationId: conv.id,
        message: savedMsg,
        todaySummary: context.todaySummary,
      });
    }

    // 2. Guest User Flow (Instant AI guidance without DB persistence)
    const guestContext = await getAICoachContext(null);
    const guestResponse = await generateAICoachChatResponse({
      messages: [{ role: "user", content: message.trim() }],
      context: guestContext,
    });

    return NextResponse.json({
      success: true,
      conversationId: "guest",
      message: {
        id: "guest-" + Date.now(),
        role: "assistant",
        content: guestResponse.text,
        metadata: guestResponse.metadata,
        createdAt: new Date().toISOString(),
      },
      todaySummary: guestContext.todaySummary,
    });
  } catch (error: any) {
    console.error("[API /api/ai-coach/chat POST] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "AI Coach is momentarily unavailable. Please retry in a moment.",
      },
      { status: 500 }
    );
  }
}
