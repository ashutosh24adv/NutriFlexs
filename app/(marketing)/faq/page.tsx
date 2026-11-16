"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  Sparkles,
  Utensils,
  Flame,
  Camera,
  ShieldCheck,
  CreditCard,
  Building2,
  ChevronDown,
  ArrowRight,
  MessageSquare,
  X,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FaqCategory =
  | "all"
  | "general"
  | "order_food"
  | "track_nutrition"
  | "ai_scanner"
  | "account_security"
  | "payments_subscriptions"
  | "partnerships";

interface FaqItem {
  id: string;
  category: FaqCategory;
  categoryLabel: string;
  question: string;
  answer: string;
}

const CATEGORIES: Array<{ id: FaqCategory; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "all", label: "All Questions", icon: Layers },
  { id: "general", label: "General", icon: HelpCircle },
  { id: "order_food", label: "Order Food", icon: Utensils },
  { id: "track_nutrition", label: "Track Nutrition", icon: Flame },
  { id: "ai_scanner", label: "AI Meal Scanner", icon: Camera },
  { id: "account_security", label: "Account & Security", icon: ShieldCheck },
  { id: "payments_subscriptions", label: "Payments & Subscriptions", icon: CreditCard },
  { id: "partnerships", label: "Gym & Trainer Partnerships", icon: Building2 },
];

const FAQ_DATA: FaqItem[] = [
  // GENERAL
  {
    id: "q1",
    category: "general",
    categoryLabel: "General",
    question: "What is NutriFlexs?",
    answer:
      "NutriFlexs is a unified food and nutrition platform with two primary experiences: Order Food and Track Nutrition. Users can discover healthy meals, order food and monitor their daily nutrition through one account.",
  },
  {
    id: "q2",
    category: "general",
    categoryLabel: "General",
    question: "Do I need separate accounts for food ordering and calorie tracking?",
    answer:
      "No. One NutriFlexs account gives you access to both experiences. You can switch between them whenever you want.",
  },
  {
    id: "q3",
    category: "general",
    categoryLabel: "General",
    question: "Can I use NutriFlexs on mobile?",
    answer:
      "Yes. NutriFlexs is designed to work across mobile, tablet and desktop browsers.",
  },

  // ORDER FOOD
  {
    id: "q4",
    category: "order_food",
    categoryLabel: "Order Food",
    question: "What kind of food can I order?",
    answer:
      "NutriFlexs offers healthy meals, protein-rich food, fresh juices, bowls and other nutrition-focused options, depending on the available outlet.",
  },
  {
    id: "q5",
    category: "order_food",
    categoryLabel: "Order Food",
    question: "How does food pickup work?",
    answer:
      "Choose an available outlet, browse its menu, place your order and follow the order status. Pickup instructions and estimated preparation time should be displayed when available.",
  },
  {
    id: "q6",
    category: "order_food",
    categoryLabel: "Order Food",
    question: "Can I see the nutritional information of meals?",
    answer:
      "Yes. Nutrition information can be displayed for products where verified or appropriately estimated nutritional data is available.",
  },
  {
    id: "q7",
    category: "order_food",
    categoryLabel: "Order Food",
    question: "Can I cancel an order?",
    answer:
      "Cancellation depends on the order status and applicable cancellation policy. Once our kitchen begins fresh preparation for 5-minute counter pickup, active orders cannot be cancelled. If your order is still in 'Order Placed' status before kitchen acceptance, you can cancel directly from your Orders page.",
  },

  // TRACK NUTRITION
  {
    id: "q8",
    category: "track_nutrition",
    categoryLabel: "Track Nutrition",
    question: "What is the NutriFlexs Nutrition Tracker?",
    answer:
      "It helps you record food intake, monitor calories and track protein, carbohydrates and fat.",
  },
  {
    id: "q9",
    category: "track_nutrition",
    categoryLabel: "Track Nutrition",
    question: "Can I track homemade Indian food?",
    answer:
      "Yes. Search for common Indian dishes in the available food database or add a custom food when needed.",
  },
  {
    id: "q10",
    category: "track_nutrition",
    categoryLabel: "Track Nutrition",
    question: "Can I track food without ordering from NutriFlexs?",
    answer:
      "Yes. You can log homemade meals and food purchased elsewhere.",
  },
  {
    id: "q11",
    category: "track_nutrition",
    categoryLabel: "Track Nutrition",
    question: "How does AI meal scanning work?",
    answer:
      "Upload or capture a food image. The AI identifies possible food items and estimates portions. You can review and edit the detected foods before saving the nutrition entry.",
  },
  {
    id: "q12",
    category: "track_nutrition",
    categoryLabel: "Track Nutrition",
    question: "Are AI calorie estimates completely accurate?",
    answer:
      "No. Photo-based estimates are approximate. Hidden oil, ghee, sauces, ingredients and exact portion weights may not be visible. Always review the results before saving.",
  },
  {
    id: "q13",
    category: "track_nutrition",
    categoryLabel: "Track Nutrition",
    question: "Can I change my calorie and macro goals?",
    answer:
      "Yes. You can update your nutrition preferences and goals through your profile or nutrition settings.",
  },
  {
    id: "q14",
    category: "track_nutrition",
    categoryLabel: "Track Nutrition",
    question: "Can I access the nutrition tracker without logging in?",
    answer:
      "Yes, guests can explore a preview of the nutrition tracker with demo entries in their browser session. However, to save your daily logs, persist historical trends across devices, and sync kiosk meals, you must create or sign in to your NutriFlexs account.",
  },

  // AI MEAL SCANNER
  {
    id: "q15",
    category: "ai_scanner",
    categoryLabel: "AI Meal Scanner",
    question: "Can the scanner identify multiple foods in one photograph?",
    answer:
      "It can attempt to identify multiple visible food items. Users must review and confirm the results.",
  },
  {
    id: "q16",
    category: "ai_scanner",
    categoryLabel: "AI Meal Scanner",
    question: "Can I edit the portion size after scanning?",
    answer:
      "Yes, when the editing functionality is available. Users should be able to adjust detected foods and quantities before saving.",
  },

  // ACCOUNT & SECURITY
  {
    id: "q17",
    category: "account_security",
    categoryLabel: "Account & Security",
    question: "Can I use one account for both NutriFlexs modes?",
    answer:
      "Yes. Both modes share one customer account and authentication system.",
  },
  {
    id: "q18",
    category: "account_security",
    categoryLabel: "Account & Security",
    question: "Is my nutrition information private?",
    answer:
      "Personal nutrition records should only be accessible to the authenticated customer and appropriately authorized services. Follow the application's privacy and security policies.",
  },
  {
    id: "q19",
    category: "account_security",
    categoryLabel: "Account & Security",
    question: "How can I reset my password?",
    answer:
      "Use the password recovery process provided by the application on the Sign In page.",
  },

  // PAYMENTS & SUBSCRIPTIONS
  {
    id: "q20",
    category: "payments_subscriptions",
    categoryLabel: "Payments & Subscriptions",
    question: "What payment methods are supported?",
    answer:
      "NutriFlexs supports UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and net banking through our secure payment gateway at checkout.",
  },
  {
    id: "q21",
    category: "payments_subscriptions",
    categoryLabel: "Payments & Subscriptions",
    question: "What is NutriFlexs Pass?",
    answer:
      "NutriFlexs Pass is a flexible monthly subscription providing daily post-workout meal or juice credits at discounted rates, with priority kiosk counter assembly and pause flexibility.",
  },

  // GYM & TRAINER PARTNERSHIPS
  {
    id: "q22",
    category: "partnerships",
    categoryLabel: "Gym & Trainer Partnerships",
    question: "How can a gym partner with NutriFlexs?",
    answer:
      "Interested fitness clubs and gym owners can reach out via our Contact Us page under the 'Business Partnerships' category to set up an express kiosk right outside their gym floor.",
  },
  {
    id: "q23",
    category: "partnerships",
    categoryLabel: "Gym & Trainer Partnerships",
    question: "How does the trainer referral program work?",
    answer:
      "Certified fitness trainers receive an exclusive partner code. Clients get 10% off clean nutrition meals, and trainers earn refuel rewards and client nutrition compliance insights.",
  },
];

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set(["q1"]));

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return FAQ_DATA.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const matchesQuery =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query) ||
        item.categoryLabel.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-nutri-bg">
      {/* =========================================================================
          1. HERO SECTION
          ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-10 sm:pt-16 sm:pb-14 border-b border-nutri-border/60 bg-gradient-to-b from-nutri-green-soft/50 via-nutri-bg to-nutri-bg">
        {/* Subtle decorative green glow circles */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-nutri-green-light/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <Badge
            variant="green"
            className="text-xs uppercase font-extrabold tracking-wider px-3.5 py-1 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-nutri-green" />
            <span>HELP &amp; SUPPORT CENTER</span>
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Frequently Asked Questions
          </h1>

          <p className="text-sm sm:text-base text-nutri-secondary max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about NutriFlexs, your food, your nutrition and your healthier lifestyle.
          </p>

          {/* Search Input Bar */}
          <div className="pt-4 max-w-xl mx-auto">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-nutri-muted absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions (e.g. food pickup, AI scanner, Indian gravies, pass)..."
                aria-label="Search frequently asked questions"
                className="w-full pl-11 pr-10 py-3.5 bg-white border border-nutri-border rounded-2xl text-sm text-nutri-charcoal placeholder:text-nutri-muted shadow-card focus:outline-none focus:ring-2 focus:ring-nutri-green/30 focus:border-nutri-green transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 p-1 rounded-full text-nutri-muted hover:text-nutri-charcoal hover:bg-nutri-green-soft transition-colors cursor-pointer"
                  aria-label="Clear search query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-xs text-nutri-secondary mt-2 text-left px-1">
                Showing {filteredFaqs.length} {filteredFaqs.length === 1 ? "result" : "results"} for &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. CATEGORY PILLS & FAQ ACCORDION LIST
          ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border shrink-0",
                  isSelected
                    ? "bg-nutri-green text-white border-nutri-green shadow-xs"
                    : "bg-white text-nutri-secondary border-nutri-border hover:border-nutri-green/40 hover:text-nutri-charcoal hover:bg-nutri-green-soft/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-white" : "text-nutri-green")} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion List */}
        {filteredFaqs.length === 0 ? (
          /* Empty State */
          <Card className="p-8 sm:p-12 text-center rounded-3xl border border-nutri-border bg-white shadow-xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-nutri-charcoal font-heading">
                No matching questions found
              </h3>
              <p className="text-xs text-nutri-secondary max-w-sm mx-auto leading-relaxed">
                We couldn&apos;t find any questions matching &ldquo;{searchQuery}&rdquo;. Try using different keywords or browse all categories.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="cursor-pointer"
              >
                Clear Search &amp; Show All
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3.5">
            {filteredFaqs.map((faq) => {
              const isOpen = openIds.has(faq.id);
              return (
                <div
                  key={faq.id}
                  className={cn(
                    "rounded-2xl border transition-all bg-white overflow-hidden",
                    isOpen
                      ? "border-nutri-green/40 shadow-card"
                      : "border-nutri-border hover:border-nutri-border hover:shadow-2xs"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleAccordion(faq.id)}
                    aria-expanded={isOpen}
                    className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-nutri-green/30"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-nutri-green">
                        {faq.categoryLabel}
                      </span>
                      <h3 className="font-extrabold text-sm sm:text-base text-nutri-charcoal leading-snug font-heading">
                        {faq.question}
                      </h3>
                    </div>
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 mt-1",
                        isOpen
                          ? "bg-nutri-green text-white rotate-180"
                          : "bg-nutri-green-light text-nutri-green"
                      )}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 border-t border-nutri-border/50 animate-in fade-in duration-200">
                      <p className="text-xs sm:text-sm text-nutri-secondary leading-relaxed pt-3">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          3. STILL HAVE QUESTIONS CTA
          ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <Card className="p-8 sm:p-10 rounded-3xl border border-nutri-green/20 bg-gradient-to-br from-nutri-green-soft via-white to-nutri-green-light/40 shadow-card flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-2">
            <Badge variant="green" className="text-xs font-bold px-3 py-0.5 inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-nutri-green" />
              <span>DIRECT SUPPORT</span>
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Still have questions?
            </h2>
            <p className="text-xs sm:text-sm text-nutri-secondary max-w-md leading-relaxed">
              Can&apos;t find what you&apos;re looking for? Our team is happy to help with orders, tracking, or partnerships.
            </p>
          </div>

          <Link href="/contact" className="shrink-0">
            <Button
              size="lg"
              className="bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-sm px-6 py-3.5 rounded-full shadow-xs cursor-pointer flex items-center gap-2"
            >
              <span>Contact Us</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
