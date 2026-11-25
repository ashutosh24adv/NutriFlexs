"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  ShoppingBag,
  Calendar,
  AlertCircle,
  Flame,
  CheckCircle2,
  ChevronRight,
  Target,
  ArrowRight,
  Leaf,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/components/customer/cart-context";
import { formatPrice } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    suggestedActions?: string[];
    recommendedProducts?: Array<{
      id: string;
      name: string;
      price: number;
      protein: number;
      calories: number;
      isVeg: boolean;
      imageUrl: string;
      slug: string;
    }>;
    recommendedCoaches?: Array<{
      id: string;
      fullName: string;
      qualifications: string;
      specializations: string[];
      experienceYears: number;
      consultationFee: number;
      rating: number;
      profileImageUrl?: string | null;
    }>;
  };
  createdAt?: string;
}

const QUICK_ACTIONS = [
  { label: "Analyse My Nutrition Today", icon: Flame, text: "Analyse my nutrition and calories for today. How am I doing towards my goal?" },
  { label: "Help Me Build Muscle", icon: Target, text: "What should my daily protein and meal distribution look like to build lean muscle?" },
  { label: "Help Me Lose Fat", icon: Sparkles, text: "I want to lose fat while preserving muscle. What's the best strategy for my daily food intake?" },
  { label: "Suggest My Next Meal", icon: ShoppingBag, text: "What should my next meal be based on my remaining calories and protein for today?" },
  { label: "Review My Protein Intake", icon: CheckCircle2, text: "Can you review my protein intake today and tell me what high-protein options can close the gap?" },
  { label: "Improve My Daily Routine", icon: ArrowRight, text: "Give me 3 realistic, high-impact nutrition habits to stay consistent with my gym routine." },
];

export default function AICoachPage() {
  const { data: session, status } = useSession();
  const { addToCart } = useCart();
  const isAuthenticated = status === "authenticated";

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);
  const isUserNearBottomRef = useRef(true);

  // Ensure the page starts strictly at the top (scrollY = 0) on mount / navigation
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as any });
    }
  }, []);

  const handleChatScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    // User is considered near bottom if within 80px of the bottom
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    isUserNearBottomRef.current = distanceFromBottom < 80;
  };

  const scrollToChatBottom = (smooth = true) => {
    const container = chatContainerRef.current;
    if (!container) return;
    // Scroll strictly inside the chat container, never altering window.scrollY
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  // Scroll chat container when typing indicator appears, but only if user is already at bottom
  useEffect(() => {
    if (isInitialMountRef.current) return;
    if (loading && isUserNearBottomRef.current) {
      scrollToChatBottom(true);
    }
  }, [loading]);

  // Load conversation history on mount
  useEffect(() => {
    async function loadChat() {
      setInitialLoading(true);
      try {
        const res = await fetch("/api/ai-coach/chat");
        const data = await res.json();
        if (data.success) {
          setConversationId(data.conversationId);
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            // Default welcoming message
            setMessages([
              {
                id: "welcome-1",
                role: "assistant",
                content:
                  "Hey! I'm your NutriFlexs AI Coach. I can help you understand your nutrition, plan meals, track your progress and stay consistent with your fitness goals. What are we working towards today?",
                metadata: {
                  suggestedActions: [
                    "Analyse My Nutrition Today",
                    "Suggest My Next Meal",
                    "Help Me Build Muscle",
                  ],
                },
              },
            ]);
          }
          if (data.todaySummary) {
            setTodaySummary(data.todaySummary);
          }
        }
      } catch (err) {
        console.error("Failed to initialize AI Coach chat:", err);
      } finally {
        setInitialLoading(false);
        // Mark initial mount complete after UI settles, without triggering any scroll
        setTimeout(() => {
          isInitialMountRef.current = false;
        }, 300);
      }
    }

    loadChat();
  }, [isAuthenticated]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    setError(null);
    setInputMessage("");

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: "temp-user-" + Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    isUserNearBottomRef.current = true;
    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    // Scroll chat container down to show the newly sent message
    setTimeout(() => {
      scrollToChatBottom(true);
    }, 50);

    try {
      const res = await fetch("/api/ai-coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        if (data.conversationId && data.conversationId !== "guest") {
          setConversationId(data.conversationId);
        }
        if (data.todaySummary) {
          setTodaySummary(data.todaySummary);
        }
        setMessages((prev) => [...prev, data.message]);

        // Keep latest response visible only if user hasn't scrolled up to read earlier history
        setTimeout(() => {
          if (isUserNearBottomRef.current) {
            scrollToChatBottom(true);
          }
        }, 50);
      } else {
        setError(data.error || "Unable to generate AI coaching advice. Please try again.");
      }
    } catch {
      setError("Network connection error. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAddToCart = (product: any) => {
    addToCart(product);
    setAddedItemNotice(`Added "${product.name}" to your cart!`);
    setTimeout(() => setAddedItemNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#FDFEFC] flex flex-col justify-between">
      {/* Top Banner / Coach Header */}
      <div className="bg-gradient-to-b from-[#F3F7EE] to-white border-b border-[#E5E7E2] py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2F7D16] to-[#4E9F2F] text-white flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                  NutriFlexs AI Coach
                </h1>
                <Badge
                  variant="gold"
                  className="bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]/20 text-[11px] font-bold py-0.5"
                >
                  <Sparkles className="w-3 h-3 text-[#2F7D16]" /> Live AI
                </Badge>
              </div>
              <p className="text-xs text-nutri-secondary mt-0.5">
                Personalized fitness & nutrition mentor • Connected to your live tracker
              </p>
            </div>
          </div>

          {/* User Live Tracker Status Pill (if available) */}
          {todaySummary && (
            <div className="bg-white border border-[#E5E7E2] rounded-2xl px-4 py-2 flex items-center gap-4 text-xs shadow-2xs">
              <div>
                <span className="text-[10px] text-nutri-secondary font-bold block uppercase tracking-wider">
                  Today&apos;s Calories
                </span>
                <span className="font-extrabold text-nutri-charcoal">
                  {todaySummary.caloriesConsumed} / {todaySummary.calorieTarget} kcal
                </span>
              </div>
              <div className="w-px h-7 bg-neutral-200" />
              <div>
                <span className="text-[10px] text-nutri-secondary font-bold block uppercase tracking-wider">
                  Protein
                </span>
                <span className="font-extrabold text-[#2F7D16]">
                  {todaySummary.proteinConsumed}g / {todaySummary.proteinTarget}g
                </span>
              </div>
              <Link
                href="/nutrition"
                className="text-[11px] font-bold text-[#2F7D16] hover:underline flex items-center ml-1"
              >
                Diary →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Added to cart toast banner */}
        {addedItemNotice && (
          <div className="p-3 bg-[#2F7D16] text-white rounded-2xl text-xs font-bold flex items-center justify-between shadow-md animate-slide-down">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#86EFAC]" />
              {addedItemNotice}
            </span>
            <Link href="/cart" className="underline font-black text-white hover:text-white/80">
              View Cart →
            </Link>
          </div>
        )}

        {/* Message Stream */}
        <div
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="space-y-4 max-h-[560px] sm:max-h-[620px] overflow-y-auto overscroll-contain pr-1.5 scroll-smooth"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  msg.role === "user"
                    ? "bg-[#111111] text-white"
                    : "bg-[#2F7D16] text-white"
                }`}
              >
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 sm:p-5 space-y-3 shadow-xs ${
                  msg.role === "user"
                    ? "bg-[#2F7D16] text-white rounded-tr-none font-medium text-sm leading-relaxed"
                    : "bg-white border border-[#E5E7E2] text-nutri-charcoal rounded-tl-none text-sm leading-relaxed"
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                  {msg.content}
                </div>

                {/* Interactive Recommended NutriFlexs Meals Widget */}
                {msg.metadata?.recommendedProducts && msg.metadata.recommendedProducts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E5E7E2] space-y-2.5">
                    <span className="text-[11px] font-extrabold uppercase text-[#2F7D16] tracking-wider block flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> Recommended NutriFlexs Menu Items
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {msg.metadata.recommendedProducts.map((prod) => (
                        <div
                          key={prod.id}
                          className="bg-[#F7FAF4] border border-[#E5E7E2] rounded-2xl p-3 flex flex-col justify-between space-y-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#E5E7E2] bg-white">
                              <Image
                                src={prod.imageUrl}
                                alt={prod.name}
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-nutri-charcoal truncate">
                                {prod.name}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[10px] text-nutri-secondary font-semibold">
                                <span className="text-[#2F7D16] font-bold">{prod.protein}g protein</span>
                                <span>•</span>
                                <span>{prod.calories} kcal</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-black text-nutri-charcoal">
                              {formatPrice(prod.price)}
                            </span>
                            <button
                              onClick={() => handleAddToCart(prod)}
                              className="px-3 py-1 rounded-full text-xs font-bold bg-[#2F7D16] text-white hover:bg-[#24630F] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              + Add to Cart
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive Human Coach Recommendation Widget */}
                {msg.metadata?.recommendedCoaches && msg.metadata.recommendedCoaches.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E5E7E2] space-y-2.5">
                    <span className="text-[11px] font-extrabold uppercase text-[#2F7D16] tracking-wider block flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> 1-on-1 Specialist Coaching
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {msg.metadata.recommendedCoaches.map((c) => (
                        <div
                          key={c.id}
                          className="bg-white border border-[#E5E7E2] rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-neutral-100 border border-[#E5E7E2]">
                              <Image
                                src={
                                  c.profileImageUrl ||
                                  "https://images.unsplash.com/photo-1594824813511-236be048b64a?auto=format&fit=crop&w=150&q=80"
                                }
                                alt={c.fullName}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-nutri-charcoal truncate">
                                {c.fullName}
                              </h4>
                              <p className="text-[10px] text-nutri-secondary truncate">
                                {c.qualifications}
                              </p>
                              <span className="text-[10px] font-extrabold text-[#2F7D16]">
                                {formatPrice(c.consultationFee)} / session
                              </span>
                            </div>
                          </div>
                          <Link href={`/dietitians/${c.id}?book=true`}>
                            <button className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#EAF4E3] text-[#2F7D16] hover:bg-[#2F7D16] hover:text-white transition-colors cursor-pointer whitespace-nowrap">
                              Book
                            </button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up Suggested Actions */}
                {msg.metadata?.suggestedActions && msg.metadata.suggestedActions.length > 0 && (
                  <div className="mt-2.5 pt-2 flex flex-wrap items-center gap-1.5">
                    {msg.metadata.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(action)}
                        className="text-xs px-3 py-1 rounded-full bg-[#F3F7EE] text-[#2F7D16] border border-[#E5E7E2] hover:bg-[#EAF4E3] hover:border-[#2F7D16]/40 font-semibold transition-all cursor-pointer active:scale-95"
                      >
                        {action} →
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2F7D16] text-white flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-[#E5E7E2] rounded-3xl rounded-tl-none p-4 shadow-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#2F7D16]" />
                <span className="text-xs font-bold text-nutri-secondary">
                  NutriFlexs AI Coach is analyzing your goals &amp; nutrition...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleSendMessage()}
              className="text-xs font-bold underline cursor-pointer text-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick Action Suggested Questions (shown when conversation has 1-2 messages) */}
        {messages.length <= 2 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-nutri-secondary block">
              Suggested Questions &amp; Workouts:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {QUICK_ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(action.text)}
                    className="p-3 text-left bg-white border border-[#E5E7E2] hover:border-[#2F7D16] hover:bg-[#F7FAF4] rounded-2xl transition-all cursor-pointer shadow-2xs group flex items-start gap-2.5"
                  >
                    <Icon className="w-4 h-4 text-[#2F7D16] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal group-hover:text-[#2F7D16]">
                        {action.label}
                      </h4>
                      <p className="text-[11px] text-nutri-secondary line-clamp-1 mt-0.5">
                        {action.text}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Input Box Footer */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-[#E5E7E2] p-4 sm:p-5">
        <div className="max-w-4xl mx-auto space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2.5"
          >
            <div className="relative flex-1">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about your workout, macros, calories, or next meal recommendation..."
                className="w-full resize-none bg-[#F7FAF4] border border-[#E5E7E2] rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium placeholder:text-nutri-muted text-nutri-charcoal focus:outline-none focus:border-[#2F7D16] focus:bg-white transition-all shadow-inner"
              />
            </div>

            <Button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-xs px-5 py-3.5 rounded-2xl transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask Coach</span>
            </Button>
          </form>

          {/* Safety Disclaimer */}
          <div className="flex items-center justify-between text-[11px] text-nutri-muted px-1">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-nutri-secondary" />
              NutriFlexs AI Coach provides general fitness &amp; nutrition advice. Informational, not medical.
            </span>
            <Link
              href="/dietitians"
              className="text-[#2F7D16] font-bold hover:underline hidden sm:inline"
            >
              Book Human Coach →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
