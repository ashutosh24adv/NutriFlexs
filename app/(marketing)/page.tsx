"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Zap,
  Clock,
  ShieldCheck,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Flame,
  HelpCircle,
  Utensils,
  Camera,
  Activity,
  Layers,
  ChevronRight,
  TrendingUp,
  Apple,
  Dumbbell,
  BookOpen,
  Info,
  Scale,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LandingPassSection } from "@/components/customer/landing-pass-section";
import { cn } from "@/lib/utils";

export default function MarketingLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const id = window.location.hash.replace("#", "");
      const elem = document.getElementById(id);
      if (elem) {
        setTimeout(() => {
          elem.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, []);

  // Popular meals with live macro breakdown
  const popularMeals = [
    {
      name: "Lean Grilled Chicken Breast",
      category: "High Protein",
      protein: "36g Protein",
      calories: "220 kcal",
      carbs: "2g Carbs",
      fats: "4.5g Fats",
      price: "₹210",
      img: "/images/products/lean-grilled-chicken-breast.webp",
      tag: "Best for Cutting",
    },
    {
      name: "ABC Stamina Rebuilder Juice",
      category: "Cold-Pressed Juice",
      protein: "1.8g Protein",
      calories: "145 kcal",
      carbs: "34g Carbs",
      fats: "0.4g Fats",
      price: "₹160",
      img: "/images/products/abc-stamina-rebuilder.webp",
      tag: "100% Organic",
    },
    {
      name: "Grilled Chicken & Quinoa Energy Bowl",
      category: "Complete Recovery Bowl",
      protein: "32g Protein",
      calories: "430 kcal",
      carbs: "48g Carbs",
      fats: "9g Fats",
      price: "₹250",
      img: "/images/products/grilled-chicken-quinoa-bowl.webp",
      tag: "Balanced Fuel",
    },
  ];

  const blogPosts = [
    {
      title: "Why Indian Gravy Secretly Doubled Your Calorie Count",
      category: "Nutrition Science",
      readTime: "4 min read",
      snippet: "How separating chickpeas from restaurant curry gravy changes your protein-to-fat ratio by over 40%.",
      href: "/blog",
    },
    {
      title: "The 30-Minute Post-Workout Refuel Rule: What Science Says",
      category: "Fitness & Recovery",
      readTime: "5 min read",
      snippet: "Why getting 30g of fast-digesting protein within 30 minutes of finishing your gym set optimizes muscle repair.",
      href: "/blog",
    },
    {
      title: "Cold-Pressed vs Centrifugal Juicing: Nitric Oxide & Bioavailability",
      category: "Clean Ingredients",
      readTime: "3 min read",
      snippet: "How cold hydraulic extraction preserves active enzymes and natural electrolytes without heat oxidation.",
      href: "/blog",
    },
  ];

  const faqs = [
    {
      q: "Can I order food and track my nutrition with the same account?",
      a: "Yes! NutriFlexs is ONE unified platform. With a single customer account and zero duplicate sign-ins, you can order gym-side meals, track home-cooked food, log calories, and review macro trends seamlessly.",
    },
    {
      q: "How does 5-minute gym kiosk pickup work?",
      a: "NutriFlexs express kiosks are positioned 50–100m outside premier fitness clubs. When you finish your workout set and order on NutriFlexs, our kitchen begins fresh assembly immediately. By the time you shower and walk out, your refuel pack is hot and ready at the counter.",
    },
    {
      q: "How does NutriFlexs solve Indian gravy vs main dish calorie tracking?",
      a: "Traditional tracking apps assume all 'Chole' or 'Paneer Butter Masala' are identical. NutriFlexs recognizes that someone eating mostly paneer gets high protein, while someone eating gravy gets mostly fats and cream. Our database allows you to specify 'Mostly Main', 'Regular Curry', or 'Gravy Only' alongside small, medium, and large bowl weights.",
    },
    {
      q: "Do NutriFlexs kiosk orders automatically count toward my food diary?",
      a: "Yes! Whenever you order meals or cold-pressed juices through NutriFlexs, your exact macros and calories sync directly into your daily tracker without needing manual entry.",
    },
    {
      q: "What is the NutriFlexs Pass?",
      a: "NutriFlexs Pass is a flexible monthly subscription providing daily post-workout meal or juice credits at a 35%+ discount, with guaranteed priority counter prep.",
    },
    {
      q: "How does the Trainer Partner Program work?",
      a: "Certified fitness trainers get a unique QR referral code. Clients receive 10% off their healthy fuel orders, and trainers earn free post-workout meals and nutrition compliance tracking tools.",
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-20 lg:space-y-24 pb-16 sm:pb-24">
      {/* =========================================================================
          1. HERO SECTION — DUAL-MODE POSITIONING & EQUAL CALLS TO ACTION
      ========================================================================= */}
      <section className="pt-6 sm:pt-10 lg:pt-14 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
          {/* Left Column: Headline, Description & Dual CTAs */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6">
            <Badge
              variant="gold"
              className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 fill-nutri-green shrink-0" />
              <span>ONE UNIFIED NUTRITION PLATFORM</span>
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading text-nutri-charcoal tracking-tight leading-[1.1]">
              Your Healthier Lifestyle,<br />
              <span className="text-nutri-green">All in One Place.</span>
            </h1>

            <p className="text-base sm:text-lg text-nutri-muted leading-relaxed max-w-xl">
              Discover healthy food, track every meal and make smarter nutrition choices with NutriFlexs. Two essential modes, one unified account.
            </p>

            {/* Dual CTAs: Neither is visually secondary */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-2">
              <Link href="/menu" className="flex-1 sm:flex-none">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-base px-6 py-3.5 rounded-full shadow-lg shadow-nutri-green/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Utensils className="w-4 h-4 stroke-[2.5]" />
                  <span>Explore Food</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>

              <Link href="/nutrition" className="flex-1 sm:flex-none">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-base px-6 py-3.5 rounded-full border-2 border-nutri-green shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Flame className="w-4 h-4 text-nutri-green stroke-[2.5]" />
                  <span>Track Nutrition</span>
                  <ArrowRight className="w-4 h-4 text-nutri-green" />
                </Button>
              </Link>
            </div>

            {/* Micro Highlights */}
            <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-semibold text-nutri-muted border-t border-nutri-border">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-nutri-green shrink-0" /> 5-Min Gym Pickup
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-nutri-green shrink-0" /> 100% Clean Ingredients
              </span>
              <span className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-nutri-green shrink-0" /> Smart Indian Gravy Tracking
              </span>
            </div>
          </div>

          {/* Right Column: Dual Visual Composition (Food Imagery + Live Nutrition Tracker UI) */}
          <div className="lg:col-span-7 xl:col-span-7 relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch">
              {/* Visual Card 1: Food Ordering Experience */}
              <div className="relative rounded-3xl overflow-hidden shadow-float border border-nutri-border bg-white flex flex-col justify-between group hover:border-nutri-green/40 transition-all h-full">
                <div className="relative w-full h-56 sm:h-60 lg:h-64 aspect-[16/11] bg-nutri-bg overflow-hidden shrink-0" style={{ position: "relative" }}>
                  <Image
                    src="/images/products/grilled-chicken-quinoa-bowl.webp"
                    alt="NutriFlexs High Protein Bowl"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    priority
                  />
                  {/* Subtle Top & Bottom Gradient to ensure high contrast against any food photograph */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/25 pointer-events-none" />

                  {/* ORDER FOOD Label: clearly visible dark semi-transparent pill with high contrast white text */}
                  <div className="absolute top-3.5 left-3.5 z-10">
                    <span className="bg-black/80 backdrop-blur-md text-white font-black text-[11px] px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-white/20">
                      <Utensils className="w-3.5 h-3.5 text-[#86EFAC] stroke-[2.5]" />
                      <span>ORDER FOOD</span>
                    </span>
                  </div>

                  {/* 5-Min Pickup Badge: clearly visible bottom-right corner */}
                  <div className="absolute bottom-3 right-3 z-10">
                    <span className="bg-nutri-green text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-1 border border-white/20">
                      <Clock className="w-3 h-3 text-white stroke-[2.5]" />
                      <span>5-Min Pickup</span>
                    </span>
                  </div>
                </div>

                <div className="p-4.5 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-nutri-charcoal text-base sm:text-lg font-heading leading-snug">
                        Grilled Chicken &amp; Quinoa Bowl
                      </h3>
                      <span className="text-base font-extrabold text-nutri-charcoal shrink-0 font-heading">₹250</span>
                    </div>
                    <p className="text-xs text-nutri-secondary line-clamp-2 leading-relaxed">
                      Herb-marinated chicken breast, warm tri-color quinoa, baby spinach &amp; olive vinaigrette.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-nutri-border-light flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-extrabold text-nutri-green bg-nutri-green-light px-2.5 py-0.5 rounded-full">
                        32g Protein
                      </span>
                      <span className="text-nutri-muted">•</span>
                      <span className="font-semibold text-nutri-secondary">430 kcal</span>
                    </div>
                    <span className="text-[10px] font-bold text-nutri-muted uppercase tracking-wider">
                      Freshly Cooked
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Card 2: Track Nutrition Experience */}
              <div className="rounded-3xl p-4.5 sm:p-5 border border-nutri-border bg-white shadow-float flex flex-col justify-between space-y-3.5 hover:border-nutri-green/40 transition-all h-full">
                {/* Clean Header with Perfectly Aligned Live Diary Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-nutri-border-light">
                  <span className="bg-nutri-green-light text-nutri-green font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
                    <Flame className="w-3.5 h-3.5 fill-nutri-green" /> TRACK NUTRITION
                  </span>
                  <span className="text-[11px] font-bold text-nutri-green bg-nutri-green-light/80 px-2.5 py-1 rounded-full border border-nutri-green/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-nutri-green animate-pulse" />
                    Live Diary
                  </span>
                </div>

                {/* Daily Calorie Progress Section */}
                <div className="bg-nutri-bg rounded-2xl p-3.5 sm:p-4 border border-nutri-border-light space-y-2.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-nutri-muted uppercase tracking-wider block">Daily Calories</span>
                      <span className="font-extrabold text-nutri-charcoal text-base sm:text-lg font-heading">
                        1,650 <span className="text-xs font-normal text-nutri-secondary">/ 2,100 kcal</span>
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-nutri-green bg-white px-2.5 py-1 rounded-full border border-nutri-border-light shadow-2xs">
                      450 kcal left
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-nutri-green h-full rounded-full transition-all duration-500"
                      style={{ width: "78%" }}
                    />
                  </div>
                </div>

                {/* Macro Summary Section with Improved Proportions & Spacing */}
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  <div className="bg-nutri-bg rounded-xl p-2.5 border border-nutri-border-light text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-nutri-muted block">Protein</span>
                    <span className="text-sm font-extrabold text-nutri-charcoal font-heading block">128g</span>
                    <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-nutri-green h-full rounded-full" style={{ width: "85%" }} />
                    </div>
                  </div>
                  <div className="bg-nutri-bg rounded-xl p-2.5 border border-nutri-border-light text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-nutri-muted block">Carbs</span>
                    <span className="text-sm font-extrabold text-nutri-charcoal font-heading block">165g</span>
                    <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-nutri-green/70 h-full rounded-full" style={{ width: "70%" }} />
                    </div>
                  </div>
                  <div className="bg-nutri-bg rounded-xl p-2.5 border border-nutri-border-light text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-nutri-muted block">Fats</span>
                    <span className="text-sm font-extrabold text-nutri-charcoal font-heading block">42g</span>
                    <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-nutri-green/50 h-full rounded-full" style={{ width: "60%" }} />
                    </div>
                  </div>
                </div>

                {/* Recent Meal Entry Card */}
                <div className="p-3 rounded-2xl border border-nutri-border-light bg-nutri-bg/70 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-nutri-green shrink-0" />
                      <span className="font-bold text-nutri-charcoal text-xs sm:text-sm">Chole – Mostly Chickpeas</span>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-nutri-green font-heading">218 kcal</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-nutri-secondary pl-4">
                    <span>Medium bowl (150g)</span>
                    <span className="font-semibold text-nutri-charcoal">12.8g Protein</span>
                  </div>
                </div>

                {/* Small Meal-History Preview */}
                <div className="p-2.5 rounded-xl border border-dashed border-nutri-border bg-white flex items-center justify-between text-xs text-nutri-secondary">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
                    <span>Lunch • 2 items logged</span>
                  </div>
                  <span className="text-[11px] font-bold text-nutri-muted">1:30 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. TWO PRIMARY EXPERIENCE CARDS (EQUAL VISUAL SPACE & PROMINENCE)
      ========================================================================= */}
      <section id="order-food" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <Badge
            variant="protein"
            className="text-xs uppercase font-bold tracking-wider mb-2.5 inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" /> TWO MODES · ONE ACCOUNT
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            How Do You Want to Fuel Today?
          </h2>
          <p className="text-xs sm:text-sm text-nutri-muted mt-2 leading-relaxed">
            Order fresh, high-protein food ready outside your gym, or track every home-cooked meal with intelligent Indian food measurement.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PRIMARY CARD 1: ORDER FOOD */}
          <Card className="p-6 sm:p-8 rounded-3xl border-2 border-nutri-border bg-white shadow-xs hover:shadow-float hover:border-nutri-green/50 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-nutri-green text-white font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5" /> ORDER FOOD
                </span>
                <span className="text-xs font-bold text-nutri-green">5-Min Gym-Side Kiosks</span>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                  Eat Better with NutriFlexs
                </h3>
                <p className="text-sm text-nutri-muted mt-2 leading-relaxed">
                  Discover fresh juices, high-protein meals, healthy snacks and convenient gym-side food.
                </p>
              </div>

              {/* Showcase Image with Badge */}
              <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden bg-nutri-bg border border-nutri-border">
                <Image
                  src="/images/products/lean-grilled-chicken-breast.webp"
                  alt="NutriFlexs High Protein Grilled Chicken"
                  fill
                  className="object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-nutri-green-light">
                    Kiosk Refuel Special
                  </p>
                  <p className="font-bold text-sm sm:text-base">Lean Grilled Chicken Breast · 36g Protein</p>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-nutri-bg border border-nutri-border-light">
                  <p className="font-bold text-xs text-nutri-charcoal">⚡ 5-Minute Pickup</p>
                  <p className="text-[11px] text-nutri-secondary mt-0.5">Hot counter delivery as you finish your workout.</p>
                </div>
                <div className="p-3 rounded-2xl bg-nutri-bg border border-nutri-border-light">
                  <p className="font-bold text-xs text-nutri-charcoal">🥗 100% Whole Food</p>
                  <p className="text-[11px] text-nutri-secondary mt-0.5">Zero refined sugar, fresh organic cold presses.</p>
                </div>
              </div>
            </div>

            <Link href="/menu" className="block pt-2">
              <Button
                size="lg"
                className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-sm py-3.5 rounded-2xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Explore Food Menu</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </Card>

          {/* PRIMARY CARD 2: TRACK NUTRITION */}
          <Card className="p-6 sm:p-8 rounded-3xl border-2 border-nutri-border bg-white shadow-xs hover:shadow-float hover:border-nutri-green/50 transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-nutri-green text-white font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> TRACK NUTRITION
                </span>
                <span className="text-xs font-bold text-nutri-green">Intelligent Indian Food Diary</span>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                  Know What You Eat
                </h3>
                <p className="text-sm text-nutri-muted mt-2 leading-relaxed">
                  Scan your meals, track calories and understand your daily nutrition with an intelligent food diary.
                </p>
              </div>

              {/* Showcase UI Preview Card */}
              <div className="w-full h-56 sm:h-64 rounded-2xl p-4 bg-gradient-to-br from-nutri-green-verylight to-nutri-green-soft border border-nutri-border flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-nutri-charcoal uppercase tracking-wider text-[11px]">
                      Smart Indian Food Tracker
                    </span>
                    <span className="bg-white text-nutri-green font-bold text-[10px] px-2 py-0.5 rounded-full border border-nutri-border">
                      Gravy vs Main
                    </span>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-nutri-border-light shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-nutri-charcoal text-xs">Chole: Chickpeas vs Gravy</span>
                      <span className="font-extrabold text-nutri-green text-xs">8.5g Protein / 100g</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center pt-1">
                      <span className="bg-nutri-green-light text-nutri-green font-bold py-1 rounded-md border border-nutri-green/30">
                        Mostly Beans
                      </span>
                      <span className="bg-nutri-green-verylight text-nutri-secondary py-1 rounded-md border border-nutri-border-light">
                        Regular
                      </span>
                      <span className="bg-nutri-green-verylight text-nutri-secondary py-1 rounded-md border border-nutri-border-light">
                        Gravy Only
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/95 backdrop-blur-xs rounded-xl p-2.5 border border-nutri-border flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-nutri-secondary">
                    Portions: Small, Medium, Large Bowls (100g–250g)
                  </span>
                  <span className="text-nutri-green font-extrabold text-xs">Live Sync</span>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-nutri-bg border border-nutri-border-light">
                  <p className="font-bold text-xs text-nutri-charcoal">🍛 Indian Food Intelligence</p>
                  <p className="text-[11px] text-nutri-secondary mt-0.5">Accurate gravy vs protein macro formulas.</p>
                </div>
                <div className="p-3 rounded-2xl bg-nutri-bg border border-nutri-border-light">
                  <p className="font-bold text-xs text-nutri-charcoal">📸 AI Plate Recognition</p>
                  <p className="text-[11px] text-nutri-secondary mt-0.5">Snap a photo to recognize dishes instantly.</p>
                </div>
              </div>
            </div>

            <Link href="/nutrition" className="block pt-2">
              <Button
                size="lg"
                className="w-full bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Start Tracking Nutrition</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* =========================================================================
          3. HOW NUTRIFLEXS POWERS YOUR HEALTH JOURNEY (UNIFIED EXPERIENCE)
      ========================================================================= */}
      <section id="how-it-works" className="bg-white py-16 sm:py-20 border-y border-nutri-border scroll-mt-24">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto">
            <Badge
              variant="protein"
              className="text-xs uppercase font-bold tracking-wider mb-2.5 inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> TWO POWERFUL EXPERIENCES · ONE PLATFORM
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              How NutriFlexs Powers Your Health Journey
            </h2>
            <p className="text-xs sm:text-sm text-nutri-muted mt-2.5 max-w-2xl mx-auto leading-relaxed">
              Whether you need hot, high-protein refuel outside your gym or precise calorie and Indian food tracking at home, NutriFlexs brings both together in one unified ecosystem.
            </p>
          </div>

          {/* Two Balanced Primary Experience Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* EXPERIENCE CARD 1: ORDER FRESH FOOD */}
            <Card className="p-6 sm:p-8 rounded-3xl border border-nutri-border bg-nutri-bg/40 shadow-xs hover:shadow-float hover:border-nutri-green/40 transition-all flex flex-col justify-between h-full space-y-6">
              <div className="space-y-5">
                {/* Header Badge & Title */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="bg-nutri-green text-white font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                      <Utensils className="w-3.5 h-3.5" /> 1. ORDER FRESH FOOD
                    </span>
                    <span className="text-[11px] font-bold text-nutri-green bg-nutri-green-light px-2.5 py-0.5 rounded-full border border-nutri-green/20">
                      5-Min Gym Kiosks
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                    Order Fresh Food
                  </h3>
                  <p className="text-xs sm:text-sm text-nutri-muted mt-1.5 leading-relaxed">
                    Freshly cooked, gym-adjacent high-protein meals and organic juices designed for rapid recovery.
                  </p>
                </div>

                {/* Appropriate Food Imagery */}
                <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden bg-white border border-nutri-border shadow-2xs group">
                  <Image
                    src="/images/products/lean-grilled-chicken-breast.webp"
                    alt="NutriFlexs Fresh High-Protein Grilled Meal"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 1024px) 100vw, 550px"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white flex items-end justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold bg-nutri-green text-white px-2 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1">
                        Gym-Side Kiosk Express
                      </span>
                      <p className="font-bold text-sm sm:text-base leading-snug">
                        Lean Grilled Chicken Breast · 36g Protein
                      </p>
                    </div>
                    <span className="text-xs font-extrabold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg shrink-0 border border-white/20">
                      5-Min Ready
                    </span>
                  </div>
                </div>

                {/* 5 Key Offerings List */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      🍗
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">Freshly Prepared High-Protein Meals</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Cooked fresh daily with lean chicken, grilled paneer, tofu bowls, and slow-burning complex carbs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      🥤
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">Healthy Juices, Snacks &amp; Nutrition-Focused Food</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Cold-pressed organic juices, high-protein snack pots, and clean shakes with zero refined sugars.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      📍
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">Gym-Adjacent Kiosks</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Physical express kiosks located 50–100m outside premium gyms for seamless grab-and-go convenience.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      ⚡
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">Convenient 5-Minute Express Pickup</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Order right as your workout finishes; your meal is hot, packed, and waiting at the counter.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      📊
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">Transparent Nutritional Information</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Exact calories, protein, carbs, and fats on every item, auto-synced into your personal food diary.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link href="/menu" className="block">
                  <Button
                    size="lg"
                    className="w-full bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs sm:text-sm py-3.5 rounded-2xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>Order Fresh Food Menu</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* EXPERIENCE CARD 2: TRACK YOUR NUTRITION */}
            <Card className="p-6 sm:p-8 rounded-3xl border border-nutri-border bg-nutri-bg/40 shadow-xs hover:shadow-float hover:border-nutri-green/40 transition-all flex flex-col justify-between h-full space-y-6">
              <div className="space-y-5">
                {/* Header Badge & Title */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="bg-nutri-green text-white font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-2xs">
                      <Flame className="w-3.5 h-3.5" /> 2. TRACK YOUR NUTRITION
                    </span>
                    <span className="text-[11px] font-bold text-nutri-green bg-nutri-green-light px-2.5 py-0.5 rounded-full border border-nutri-green/20">
                      AI &amp; Indian Food
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                    Track Your Nutrition
                  </h3>
                  <p className="text-xs sm:text-sm text-nutri-muted mt-1.5 leading-relaxed">
                    Log home-cooked Indian meals, scan plates with AI, and master your macros with zero guesswork.
                  </p>
                </div>

                {/* Appropriate Nutrition & AI Visual Preview */}
                <div className="relative w-full h-52 sm:h-60 rounded-2xl overflow-hidden bg-gradient-to-br from-[#F3F7EE] via-[#EAF4E3] to-[#F7FAF4] border border-nutri-border p-4 flex flex-col justify-between shadow-2xs">
                  <div className="space-y-2.5">
                    {/* Live Tracker Bar */}
                    <div className="bg-white rounded-xl p-3 border border-nutri-border-light shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-nutri-charcoal flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-nutri-green" /> Daily Calorie Goal
                        </span>
                        <span className="font-extrabold text-nutri-green">1,650 / 2,100 kcal</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-nutri-green h-full rounded-full" style={{ width: "78%" }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-nutri-secondary">
                        <span>450 kcal remaining for dinner</span>
                        <span className="font-bold text-nutri-green">78% Target Met</span>
                      </div>
                    </div>

                    {/* Micro Indian Food Intelligence Pill */}
                    <div className="bg-white rounded-xl p-2.5 border border-nutri-border-light shadow-2xs flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🍛</span>
                        <div>
                          <p className="font-bold text-nutri-charcoal text-[11px] leading-tight">Chole / Paneer Gravy Separation</p>
                          <p className="text-[10px] text-nutri-secondary">Dense chickpeas vs oil-rich gravy macros</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold bg-nutri-green-light text-nutri-green px-2 py-0.5 rounded-full">
                        8.5g Protein
                      </span>
                    </div>
                  </div>

                  {/* Micro AI Camera Scan Banner */}
                  <div className="bg-white/95 backdrop-blur-xs rounded-xl p-2.5 border border-nutri-border flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-nutri-charcoal flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-nutri-green" /> AI Photo Scan: Rajma Chawal
                    </span>
                    <span className="text-nutri-green font-extrabold text-[11px]">98% Confidence</span>
                  </div>
                </div>

                {/* 5 Key Offerings List */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      🔥
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">Daily Calorie &amp; Macro Tracking</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Track calories, protein targets, carbs, and healthy fats with live progress bars and deficit guides.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      📸
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">AI-Powered Food Photo Scanning</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Point your camera at any meal to identify dishes, estimate portion gram weights, and log in 2 seconds.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      🥗
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">Homemade Meal Logging</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Effortlessly log authentic home dishes, rotis, sabzis, snacks, and save favorite family recipes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      🍲
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">Indian Food Recognition &amp; Portion Tracking</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Unique gravy vs main ingredient separation with smart small/medium/large bowl-to-gram weights.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white border border-nutri-border-light shadow-2xs">
                    <div className="w-7 h-7 rounded-lg bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      📈
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-nutri-charcoal">Nutrition Goals &amp; Progress Insights</h4>
                      <p className="text-[11px] text-nutri-muted leading-relaxed mt-0.5">
                        Science-backed BMR/TDEE goal calculators, macro streak tracking, and daily compliance insights.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Link href="/nutrition" className="block">
                  <Button
                    size="lg"
                    className="w-full bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs sm:text-sm py-3.5 rounded-2xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <span>Start Tracking Nutrition</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. FITNESS JOURNEY — PRE-WORKOUT, POST-WORKOUT & SMART TRACKING
      ========================================================================= */}
      <section id="fitness-journey" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-[#F7FAF4] rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#E5E7E2] shadow-2xs space-y-8 sm:space-y-10">
          {/* Section Header */}
          <div className="max-w-3xl space-y-3">
            <span className="bg-[#EAF4E3] text-[#2F7D16] font-extrabold text-xs px-3.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#E5E7E2]">
              <Dumbbell className="w-3.5 h-3.5 text-[#2F7D16]" /> BUILT AROUND YOUR FITNESS JOURNEY
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold font-heading text-[#111111] tracking-tight leading-tight">
              Train Hard. Fuel Smart. Get Stronger.
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed max-w-2xl">
              Your workout doesn&apos;t end when you leave the gym. What you eat matters too. NutriFlexs helps you fuel your training, track your nutrition and stay consistent with your fitness goals.
            </p>
          </div>

          {/* Three Content Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {/* CARD 1: PRE-WORKOUT FUEL */}
            <Card className="bg-white rounded-3xl p-6 border border-[#E5E7E2] shadow-xs hover:shadow-float hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full group">
              <div className="space-y-4">
                {/* Visual */}
                <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden bg-nutri-bg border border-nutri-border-light shadow-2xs">
                  <Image
                    src="/images/products/abc-stamina-rebuilder.webp"
                    alt="Pre-workout nutrition, healthy smoothies and natural fuel"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 380px"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-extrabold bg-[#2F7D16] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                      Pre-Workout
                    </span>
                    <p className="font-bold text-xs sm:text-sm mt-1">Natural Stamina &amp; Electrolytes</p>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#2F7D16]">
                    <Zap className="w-3.5 h-3.5" /> 1. PRE-WORKOUT FUEL
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold font-heading text-[#111111] tracking-tight">
                    Pre-Workout Fuel
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                    Get the energy you need before training with convenient, nutrition-focused food and drink options.
                  </p>
                </div>

                {/* Quick Highlights */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-semibold text-[#2F7D16]">
                  <span className="bg-[#EAF4E3] px-2.5 py-1 rounded-lg">🍌 Clean Carbs</span>
                  <span className="bg-[#EAF4E3] px-2.5 py-1 rounded-lg">🥤 Cold-Pressed Juices</span>
                  <span className="bg-[#EAF4E3] px-2.5 py-1 rounded-lg">⚡ Zero Refined Sugar</span>
                </div>
              </div>
            </Card>

            {/* CARD 2: POST-WORKOUT RECOVERY */}
            <Card className="bg-white rounded-3xl p-6 border border-[#E5E7E2] shadow-xs hover:shadow-float hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full group">
              <div className="space-y-4">
                {/* Visual */}
                <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden bg-nutri-bg border border-nutri-border-light shadow-2xs">
                  <Image
                    src="/images/products/grilled-chicken-quinoa-bowl.webp"
                    alt="Post-workout recovery meals with lean protein and quinoa"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 380px"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[10px] font-extrabold bg-[#2F7D16] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                      Post-Workout
                    </span>
                    <p className="font-bold text-xs sm:text-sm mt-1">High-Protein Recovery Bowls · 32g+ Protein</p>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#2F7D16]">
                    <Utensils className="w-3.5 h-3.5" /> 2. POST-WORKOUT RECOVERY
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold font-heading text-[#111111] tracking-tight">
                    Post-Workout Recovery
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                    Make post-workout nutrition easier with protein-rich meals, fresh juices and convenient gym-side pickup.
                  </p>
                </div>

                {/* Quick Highlights */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-semibold text-[#2F7D16]">
                  <span className="bg-[#EAF4E3] px-2.5 py-1 rounded-lg">🍗 Grilled Chicken &amp; Paneer</span>
                  <span className="bg-[#EAF4E3] px-2.5 py-1 rounded-lg">⏱️ 5-Min Pickup</span>
                  <span className="bg-[#EAF4E3] px-2.5 py-1 rounded-lg">💪 Muscle Repair</span>
                </div>
              </div>
            </Card>

            {/* CARD 3: SMART NUTRITION TRACKING */}
            <Card className="bg-white rounded-3xl p-6 border border-[#E5E7E2] shadow-xs hover:shadow-float hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full group">
              <div className="space-y-4">
                {/* Visual: Modern Smartphone Nutrition Tracker UI */}
                <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden bg-gradient-to-br from-[#F3F7EE] via-[#EAF4E3] to-[#F7FAF4] border border-nutri-border-light p-3.5 flex flex-col justify-between shadow-2xs">
                  {/* Phone Mockup Top Bar */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#111111]">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#2F7D16]" /> Live Calorie Diary
                    </span>
                    <span className="text-[10px] font-extrabold bg-[#2F7D16] text-white px-2 py-0.5 rounded-full">
                      84% Target
                    </span>
                  </div>

                  {/* Progress Bar & Calorie Numbers */}
                  <div className="bg-white rounded-xl p-2.5 border border-nutri-border-light shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#111111]">Daily Calorie Goal</span>
                      <span className="font-extrabold text-[#2F7D16]">1,850 / 2,200 kcal</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#2F7D16] h-full rounded-full transition-all" style={{ width: "84%" }} />
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-center font-semibold">
                      <span className="bg-[#EAF4E3] text-[#2F7D16] py-0.5 rounded">145g Protein</span>
                      <span className="bg-slate-50 text-slate-700 py-0.5 rounded">180g Carbs</span>
                      <span className="bg-slate-50 text-slate-700 py-0.5 rounded">48g Fat</span>
                    </div>
                  </div>

                  {/* Meal Log Pill */}
                  <div className="bg-white/95 backdrop-blur-xs rounded-xl p-2 border border-nutri-border-light flex items-center justify-between text-[10px]">
                    <span className="font-bold text-[#111111] flex items-center gap-1">
                      <Camera className="w-3 h-3 text-[#2F7D16]" /> AI Plate Logged
                    </span>
                    <span className="text-[#2F7D16] font-extrabold">Instant Sync</span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#2F7D16]">
                    <Flame className="w-3.5 h-3.5" /> 3. SMART NUTRITION TRACKING
                  </div>
                  <h3 className="text-lg sm:text-xl font-extrabold font-heading text-[#111111] tracking-tight">
                    Smart Nutrition Tracking
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                    Track calories, protein, carbohydrates and fats. Scan your meals or log homemade food to understand what you eat.
                  </p>
                </div>

                {/* Quick Highlights */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-semibold text-[#2F7D16]">
                  <span className="bg-[#EAF4E3] px-2.5 py-1 rounded-lg">📸 AI Food Scanner</span>
                  <span className="bg-[#EAF4E3] px-2.5 py-1 rounded-lg">🍛 Homemade Meals</span>
                  <span className="bg-[#EAF4E3] px-2.5 py-1 rounded-lg">📊 Macro Goals</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Two Clear Calls to Action Footer */}
          <div className="pt-2 sm:pt-4 border-t border-[#E5E7E2] flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/menu" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-xs sm:text-sm px-8 py-3.5 rounded-full shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[46px]"
              >
                <span>Explore Food Menu</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <Link href="/nutrition" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-white hover:bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]/40 hover:border-[#2F7D16] font-extrabold text-xs sm:text-sm px-8 py-3.5 rounded-full shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors min-h-[46px]"
              >
                <span>Start Tracking Nutrition</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. POPULAR HEALTHY MEALS WITH MACRO BADGES
      ========================================================================= */}
      <section id="menu" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge
              variant="protein"
              className="text-xs uppercase font-bold tracking-wider mb-2.5 inline-flex items-center gap-1"
            >
              <Utensils className="w-3.5 h-3.5" /> REFUEL PACKS
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Popular Healthy Meals
            </h2>
            <p className="text-xs sm:text-sm text-nutri-muted mt-1 leading-relaxed">
              Freshly grilled high-protein fuel and organic cold-pressed juices ready in ~5 minutes.
            </p>
          </div>

          <Link href="/menu">
            <Button
              variant="outline"
              size="sm"
              className="font-bold text-xs px-4 py-2.5 rounded-full border-nutri-border hover:border-nutri-green hover:text-nutri-green transition-colors cursor-pointer"
            >
              VIEW FULL MENU →
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {popularMeals.map((meal, idx) => (
            <Card
              key={idx}
              className="p-5 sm:p-6 space-y-4 overflow-hidden border-nutri-border rounded-3xl hover:shadow-float transition-all bg-white h-full flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-nutri-bg shrink-0">
                  <Image
                    src={meal.img}
                    alt={meal.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    quality={80}
                    loading="lazy"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="bg-nutri-charcoal/85 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {meal.tag}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-nutri-secondary">
                    {meal.category}
                  </span>
                  <h3 className="font-bold font-heading text-nutri-charcoal text-base sm:text-lg mt-0.5">
                    {meal.name}
                  </h3>
                </div>

                {/* Macro breakdown pills */}
                <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-1 font-semibold">
                  <span className="bg-nutri-green-light text-nutri-green py-1 rounded-md">{meal.protein}</span>
                  <span className="bg-slate-100 text-slate-700 py-1 rounded-md">{meal.carbs}</span>
                  <span className="bg-slate-100 text-slate-700 py-1 rounded-md">{meal.fats}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-nutri-border-light mt-auto">
                <span className="text-nutri-green font-extrabold text-sm">{meal.calories}</span>
                <span className="font-extrabold text-nutri-charcoal text-base">{meal.price}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. AI MEAL SCANNING SHOWCASE
      ========================================================================= */}
      <section id="ai-scanner" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-white rounded-3xl border border-nutri-border p-6 sm:p-10 lg:p-12 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <Badge
              variant="gold"
              className="bg-nutri-green-light text-nutri-green border-nutri-green-soft text-xs uppercase font-bold tracking-wider inline-flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" /> AI MEAL SCANNER
            </Badge>

            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Snap, Recognize, Track in 2 Seconds
            </h2>

            <p className="text-sm text-nutri-muted leading-relaxed">
              No more tedious ingredient searches. Point your phone camera at your meal: our vision engine recognizes Indian home foods, street food, and kiosk bowls, estimating macros instantly.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="flex items-start gap-2.5 text-xs text-nutri-charcoal">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0 mt-0.5" />
                <span><strong>Instant Indian Dish Classification:</strong> Recognizes rotis, sabzis, dals, and biryanis.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-nutri-charcoal">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0 mt-0.5" />
                <span><strong>Portion Weight Detection:</strong> Suggests small, medium, or large bowl weight automatically.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-nutri-charcoal">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0 mt-0.5" />
                <span><strong>One-Tap Add to Diary:</strong> Confirm or adjust in one simple screen.</span>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/nutrition">
                <Button size="lg" className="bg-nutri-green hover:bg-nutri-green-dark text-white font-bold text-sm rounded-full px-6 py-3 cursor-pointer">
                  Try Meal Scanning in Tracker →
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            {/* Phone Mockup Frame */}
            <div className="w-full max-w-xs bg-slate-950 p-3 rounded-[36px] shadow-2xl border-4 border-slate-800">
              <div className="relative aspect-[9/16] bg-slate-900 rounded-[28px] overflow-hidden flex flex-col justify-between p-4 text-white">
                {/* Viewfinder Target */}
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-nutri-green-fresh animate-pulse" /> Live Scanner
                  </span>
                  <span>98% Match</span>
                </div>

                <div className="relative aspect-square my-auto rounded-2xl border-2 border-dashed border-nutri-green-fresh/80 p-2 flex items-center justify-center">
                  <div className="text-center space-y-1">
                    <p className="text-2xl">🍛</p>
                    <p className="text-[11px] font-bold text-white">Scanning Plate...</p>
                  </div>
                </div>

                {/* Detected Results Card */}
                <div className="bg-white/95 backdrop-blur-md text-nutri-charcoal rounded-2xl p-3 space-y-1.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">Rajma Chawal + Salad</span>
                    <span className="text-[10px] font-extrabold text-nutri-green bg-nutri-green-light px-1.5 py-0.5 rounded">
                      480 kcal
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-nutri-secondary">
                    <span>18g Protein</span>
                    <span>72g Carbs</span>
                    <span>12g Fat</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. NUTRIFLEXS PASS SECTION
      ========================================================================= */}
      <section id="pass" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <LandingPassSection />
      </section>

      {/* =========================================================================
          9. TRAINER PARTNERSHIPS
      ========================================================================= */}
      <section id="trainers" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-[#F7FAF4] rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#E5E7E2] shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="bg-[#EAF4E3] text-[#2F7D16] font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#E5E7E2]">
              <Dumbbell className="w-3.5 h-3.5 text-[#2F7D16]" /> FOR FITNESS TRAINERS &amp; COACHES
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-[#111111] tracking-tight leading-tight">
              Partner with NutriFlexs &amp; Fuel Your Clients
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed max-w-xl">
              Certified gym trainers and coaches get an exclusive QR referral code. Give your clients 10% off clean post-workout fuel, track client meal compliance, and earn free daily refuel credits.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/trainer">
                <Button
                  size="lg"
                  className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs sm:text-sm rounded-full px-6 py-3 cursor-pointer min-h-[44px] shadow-xs transition-colors"
                >
                  Open Trainer Partner Portal →
                </Button>
              </Link>
              <Link
                href="/signup?portal=trainer"
                className="text-xs sm:text-sm font-bold text-[#2F7D16] hover:text-[#24630F] underline hover:no-underline transition-colors"
              >
                Register as a Certified Trainer
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl p-6 sm:p-7 border border-[#E5E7E2] shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]">
              <p className="font-heading font-extrabold text-sm sm:text-base text-[#111111]">
                Trainer Partner Perks
              </p>
              <span className="text-[10px] font-bold bg-[#EAF4E3] text-[#2F7D16] px-2 py-0.5 rounded-full border border-[#E5E7E2]">
                Partner Benefits
              </span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-[#4B5563]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2F7D16] shrink-0 mt-0.5" />
                <span>10% discount for referred gym clients</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2F7D16] shrink-0 mt-0.5" />
                <span>Free post-workout meals through rewards</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#2F7D16] shrink-0 mt-0.5" />
                <span>Nutrition compliance insights</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. NUTRIFLEXS JOURNAL / BLOG
      ========================================================================= */}
      <section id="blog" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge
              variant="protein"
              className="text-xs uppercase font-bold tracking-wider mb-2.5 inline-flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" /> NUTRIFLEXS JOURNAL
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Science-Backed Nutrition &amp; Guides
            </h2>
            <p className="text-xs sm:text-sm text-nutri-muted mt-1 leading-relaxed">
              Read our latest breakdowns on Indian macros, recovery physiology, and clean eating.
            </p>
          </div>

          <Link href="/blog">
            <Button
              variant="outline"
              size="sm"
              className="font-bold text-xs px-4 py-2.5 rounded-full border-nutri-border hover:border-nutri-green hover:text-nutri-green transition-colors cursor-pointer"
            >
              VIEW ALL ARTICLES →
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogPosts.map((post, idx) => (
            <Card
              key={idx}
              className="p-5 sm:p-6 space-y-3 rounded-3xl border-nutri-border bg-white hover:shadow-float transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-nutri-secondary">
                  <span className="text-nutri-green uppercase tracking-wider">{post.category}</span>
                  <span>{post.readTime}</span>
                </div>
                <h3 className="font-bold font-heading text-nutri-charcoal text-base hover:text-nutri-green transition-colors">
                  <Link href={post.href}>{post.title}</Link>
                </h3>
                <p className="text-xs text-nutri-muted leading-relaxed">{post.snippet}</p>
              </div>

              <Link
                href={post.href}
                className="text-xs font-bold text-nutri-green hover:underline flex items-center gap-1 pt-2 border-t border-nutri-border-light"
              >
                <span>Read Full Article</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {/* =========================================================================
          11. ABOUT NUTRIFLEXS STORY
      ========================================================================= */}
      <section id="about" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-nutri-bg rounded-3xl p-6 sm:p-10 lg:p-12 border border-nutri-border grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <Badge
              variant="gold"
              className="bg-white text-nutri-green border-nutri-border text-xs uppercase font-bold tracking-wider inline-flex items-center gap-1"
            >
              OUR MISSION
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Eat Smart. Track Better.
            </h2>
            <p className="text-sm text-nutri-muted leading-relaxed">
              NutriFlexs was founded in Bengaluru with a straightforward observation: fitness enthusiasts crush their gym workouts, but either settle for oily takeout or dry boiled chicken because fresh nutrition wasn&apos;t accessible or measurable.
            </p>
            <p className="text-sm text-nutri-muted leading-relaxed">
              We positioned express kiosks 50m from top fitness centers to deliver hot, organic post-workout meals in 5 minutes, and built an intelligent tracker to capture home and Indian food macros with unmatched precision.
            </p>
            <div className="pt-2">
              <Link href="/about">
                <Button variant="outline" size="sm" className="font-bold text-xs px-4 py-2 rounded-full cursor-pointer">
                  Learn More About Our Team →
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-nutri-border shadow-xs space-y-3 text-xs">
            <p className="font-extrabold text-sm text-nutri-charcoal font-heading">NutriFlexs Standards</p>
            <div className="space-y-2 text-nutri-secondary">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
                <span>Cold-pressed on site with hydraulic press</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
                <span>Zero preservatives, additives, or seed oils</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
                <span>Database-verified protein &amp; macro counts</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
                <span>5-minute pickup at gym-adjacent kiosks</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          12. FAQS SECTION
      ========================================================================= */}
      <section id="faq" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="max-w-[840px] mx-auto flex flex-col items-center space-y-8 sm:space-y-10">
          <div className="text-center w-full">
            <Badge
              variant="gold"
              className="bg-nutri-green-light text-nutri-green border-nutri-green-soft text-xs uppercase font-bold tracking-wider mb-3 inline-flex items-center"
            >
              FREQUENTLY ASKED
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-nutri-muted mt-2.5 max-w-lg mx-auto leading-relaxed">
              Everything you need to know about NutriFlexs food ordering, nutrition tracking, pass subscriptions, and macros.
            </p>
          </div>

          <div className="space-y-3 sm:space-y-3.5 w-full">
            {faqs.map((faq, idx) => (
              <Card
                key={idx}
                className="px-5 sm:px-6 py-4 sm:py-5 cursor-pointer border-nutri-border rounded-2xl bg-white hover:border-nutri-green/40 transition-colors shadow-2xs w-full"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="flex items-center justify-between gap-4 w-full select-none min-h-[32px]">
                  <span className="flex-1 text-left font-bold text-xs sm:text-sm text-nutri-charcoal leading-snug">
                    {faq.q}
                  </span>
                  <span className="shrink-0 w-8 h-8 rounded-full bg-nutri-green-light/70 text-nutri-green flex items-center justify-center font-bold text-base leading-none select-none ml-2">
                    {openFaq === idx ? "−" : "+"}
                  </span>
                </div>
                {openFaq === idx && (
                  <p className="text-xs sm:text-sm text-nutri-muted mt-3.5 pt-3.5 border-t border-nutri-border-light leading-relaxed text-left animate-fade-in">
                    {faq.a}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FINAL CALL TO ACTION BANNER (BEFORE FOOTER)
      ========================================================================= */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-nutri-green text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <span className="bg-white/20 text-white font-extrabold text-xs px-3.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> START TODAY WITH ONE ACCOUNT
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight">
              Eat Smart. Track Better.
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-xl mx-auto">
              Join thousands of fitness enthusiasts ordering clean post-workout fuel and tracking every meal with scientific accuracy.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2 relative z-10">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-nutri-green hover:bg-slate-100 font-extrabold text-sm px-7 py-3.5 rounded-full shadow-lg cursor-pointer"
              >
                Create Free Account →
              </Button>
            </Link>
            <Link href="/menu" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-nutri-green-dark text-white hover:bg-black/30 font-extrabold text-sm px-7 py-3.5 rounded-full border border-white/30 cursor-pointer"
              >
                Browse Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
