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
  const [activeIndianDish, setActiveIndianDish] = useState<"chole" | "dal" | "paneer">("chole");

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

  // Unified 4-step process bridging food ordering & nutrition tracking
  const unifiedSteps = [
    {
      num: "01",
      title: "ORDER FRESH OR LOG HOME MEALS",
      desc: "Grab fresh organic fuel 50m from your gym, or prepare your home-cooked meal with authentic ingredients.",
      badge: "Step 1",
    },
    {
      num: "02",
      title: "INSTANT SCAN OR AUTO-LOG",
      desc: "Kiosk orders automatically sync to your diary. Snap a quick photo or voice-log any Indian dish in seconds.",
      badge: "Step 2",
    },
    {
      num: "03",
      title: "SMART GRAVY & PORTION TRACKING",
      desc: "Choose whether you had thick gravy, mostly protein, or a regular curry with tailored bowl-to-gram conversions.",
      badge: "Step 3",
    },
    {
      num: "04",
      title: "CRUSH YOUR DAILY MACRO GOAL",
      desc: "Monitor real-time calories, protein targets, and deficit/surplus trends with zero guesswork.",
      badge: "Step 4",
    },
  ];

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

  // Indian food variant showcase data
  const indianDishes = {
    chole: {
      name: "Chole (Chickpea Curry)",
      icon: "🍲",
      variants: [
        { name: "Chole – Mostly Chickpeas", calories: 145, protein: "8.5g", carbs: "21g", fat: "2.5g", desc: "Dense chickpeas, minimal curry reduction. High protein & fiber." },
        { name: "Chole – Regular Curry", calories: 120, protein: "5.5g", carbs: "16g", fat: "4.5g", desc: "Balanced standard household gravy-to-chickpea ratio." },
        { name: "Chole – Gravy Only", calories: 95, protein: "2.0g", carbs: "8g", fat: "6.5g", desc: "Spiced onion-tomato masala base with higher oil absorption." },
      ],
      portions: [
        { label: "Small bowl", weight: "100g", cal: 145 },
        { label: "Medium bowl", weight: "150g", cal: 218 },
        { label: "Large bowl", weight: "250g", cal: 363 },
      ],
    },
    dal: {
      name: "Dal (Yellow Lentils)",
      icon: "🥣",
      variants: [
        { name: "Dal – Thick", calories: 110, protein: "7.0g", carbs: "17g", fat: "2.0g", desc: "Concentrated dal cooked thick with tadka. High satiety." },
        { name: "Dal – Regular", calories: 85, protein: "5.0g", carbs: "13g", fat: "1.8g", desc: "Standard household homestyle dal consistency." },
        { name: "Dal – Thin", calories: 60, protein: "3.2g", carbs: "9g", fat: "1.2g", desc: "Watery broth style rasam or light lentil soup." },
      ],
      portions: [
        { label: "Small bowl", weight: "100g", cal: 85 },
        { label: "Medium bowl", weight: "150g", cal: 128 },
        { label: "Large bowl", weight: "250g", cal: 213 },
      ],
    },
    paneer: {
      name: "Paneer Butter Masala",
      icon: "🧀",
      variants: [
        { name: "Paneer Butter Masala – More Paneer", calories: 240, protein: "13.0g", carbs: "7g", fat: "18.0g", desc: "Generous cottage cheese cubes with light coating." },
        { name: "Paneer Butter Masala – Regular", calories: 200, protein: "8.5g", carbs: "9g", fat: "15.0g", desc: "Balanced ratio of rich makhani gravy and paneer." },
        { name: "Paneer Butter Masala – Gravy Only", calories: 160, protein: "3.0g", carbs: "10g", fat: "14.0g", desc: "Butter, cream, cashew-tomato gravy reduction." },
      ],
      portions: [
        { label: "Small bowl", weight: "100g", cal: 200 },
        { label: "Medium bowl", weight: "150g", cal: 300 },
        { label: "Large bowl", weight: "250g", cal: 500 },
      ],
    },
  };

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
      <section className="pt-6 sm:pt-10 lg:pt-14 max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Headline, Description & Dual CTAs */}
          <div className="lg:col-span-6 space-y-6">
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
          <div className="lg:col-span-6 relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Visual Card 1: Food Ordering Experience */}
              <div className="relative rounded-3xl overflow-hidden shadow-float border border-nutri-border bg-white flex flex-col justify-between group hover:border-nutri-green/40 transition-all">
                <div className="relative w-full h-48 sm:h-52 bg-nutri-bg overflow-hidden">
                  <Image
                    src="/images/products/grilled-chicken-quinoa-bowl.webp"
                    alt="NutriFlexs High Protein Bowl"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    priority
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-nutri-charcoal/90 backdrop-blur-md text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Utensils className="w-3 h-3 text-nutri-green-light" /> ORDER FOOD
                    </span>
                  </div>
                  <div className="absolute bottom-2.5 right-2.5">
                    <span className="bg-nutri-green text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-xs">
                      5-Min Pickup
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-nutri-charcoal text-sm font-heading leading-tight">
                      Grilled Chicken &amp; Quinoa Bowl
                    </h3>
                    <span className="text-xs font-extrabold text-nutri-charcoal shrink-0">₹250</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-nutri-secondary">
                    <span className="font-bold text-nutri-green">32g Protein</span>
                    <span>•</span>
                    <span>430 kcal</span>
                  </div>
                  <Link href="/menu" className="block pt-1 text-[11px] font-bold text-nutri-green hover:underline">
                    Order at Gym Kiosk →
                  </Link>
                </div>
              </div>

              {/* Visual Card 2: Track Nutrition Experience */}
              <div className="rounded-3xl p-4.5 border border-nutri-border bg-white shadow-float flex flex-col justify-between space-y-3 hover:border-nutri-green/40 transition-all">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-nutri-border-light">
                    <span className="bg-nutri-green-light text-nutri-green font-extrabold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-nutri-green" /> TRACK NUTRITION
                    </span>
                    <span className="text-[10px] font-bold text-nutri-green bg-nutri-green-light px-2 py-0.5 rounded-full border border-nutri-border-light">
                      Live Diary
                    </span>
                  </div>

                  {/* Micro Calorie Ring Card */}
                  <div className="mt-3 bg-nutri-bg rounded-2xl p-3 space-y-2 border border-nutri-border-light">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-nutri-charcoal">Daily Calorie Goal</span>
                      <span className="font-extrabold text-nutri-green">1,650 / 2,100</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-nutri-green h-full rounded-full" style={{ width: "78%" }} />
                    </div>
                    <p className="text-[10px] text-nutri-secondary font-medium">450 kcal remaining for dinner</p>
                  </div>

                  {/* Micro Indian Food Gravy Tag */}
                  <div className="mt-3 p-2.5 rounded-xl border border-nutri-border-light bg-white text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-nutri-charcoal text-[11px]">Chole – Mostly Chickpeas</span>
                      <span className="text-[10px] font-extrabold text-nutri-green">218 kcal</span>
                    </div>
                    <p className="text-[10px] text-nutri-secondary">
                      Medium bowl (150g) • 12.8g Protein • Gravy-separated
                    </p>
                  </div>
                </div>

                <Link href="/nutrition" className="block pt-1 text-[11px] font-bold text-nutri-green hover:underline">
                  Open Interactive Food Diary →
                </Link>
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
          3. HOW NUTRIFLEXS WORKS (UNIFIED 4-STEP EXPERIENCE)
      ========================================================================= */}
      <section id="how-it-works" className="bg-white py-16 sm:py-20 border-y border-nutri-border scroll-mt-24">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          <div className="text-center max-w-xl mx-auto">
            <Badge
              variant="gold"
              className="bg-nutri-green-light text-nutri-green border-nutri-green-soft text-xs uppercase font-bold tracking-wider mb-2.5 inline-flex items-center"
            >
              SIMPLE 4-STEP FLOW
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              How NutriFlexs Works
            </h2>
            <p className="text-xs sm:text-sm text-nutri-muted mt-2 leading-relaxed">
              Order fresh food, scan your home meals, and reach your goals in four frictionless steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {unifiedSteps.map((s, idx) => (
              <Card
                key={idx}
                className="p-5 sm:p-6 space-y-3 border-nutri-border bg-nutri-bg rounded-3xl h-full flex flex-col justify-start hover:shadow-float transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-extrabold font-heading text-nutri-green block shrink-0">{s.num}</span>
                  <span className="text-[10px] font-extrabold bg-white text-nutri-charcoal px-2 py-0.5 rounded-full border border-nutri-border">
                    {s.badge}
                  </span>
                </div>
                <h4 className="font-bold text-nutri-charcoal text-xs uppercase tracking-wider">{s.title}</h4>
                <p className="text-xs text-nutri-muted leading-relaxed">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. NUTRITION TRACKER SHOWCASE — INDIAN FOOD VARIANTS & GRAVY DISTINCTION
      ========================================================================= */}
      <section id="indian-nutrition-innovation" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="bg-[#F7FAF4] rounded-3xl p-6 sm:p-10 lg:p-12 border border-[#E5E7E2] shadow-2xs space-y-8">
          <div className="max-w-2xl space-y-3">
            <span className="bg-[#EAF4E3] text-[#2F7D16] font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#E5E7E2]">
              <Scale className="w-3.5 h-3.5 text-[#2F7D16]" /> NUTRITION INTELLIGENCE
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-[#111111] tracking-tight leading-tight">
              Not All Curries Are the Same.
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
              Standard trackers assume all Indian curries are uniform. But eating mostly chickpeas or paneer provides dense protein and fiber, while gravy carries higher oil and calorie density. NutriFlexs lets you log dishes accurately with separated main vs gravy ratios.
            </p>
          </div>

          {/* Dish Switcher Tabs */}
          <div className="flex flex-wrap gap-2.5">
            {(["chole", "dal", "paneer"] as const).map((dishKey) => {
              const dish = indianDishes[dishKey];
              const isActive = activeIndianDish === dishKey;
              return (
                <button
                  key={dishKey}
                  type="button"
                  onClick={() => setActiveIndianDish(dishKey)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border",
                    isActive
                      ? "bg-[#2F7D16] text-white border-[#2F7D16] shadow-2xs"
                      : "bg-white text-[#4B5563] hover:text-[#111111] hover:bg-[#F3F7EE] border-[#E5E7E2]"
                  )}
                >
                  <span className="text-base">{dish.icon}</span>
                  <span>{dish.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Dish Variants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {indianDishes[activeIndianDish].variants.map((v, idx) => (
              <article
                key={idx}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5E7E2] hover:border-[#2F7D16]/40 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-heading font-bold text-sm sm:text-base text-[#111111] leading-snug">
                      {v.name}
                    </h4>
                    <div className="text-right shrink-0">
                      <span className="text-sm sm:text-base font-heading font-extrabold text-[#2F7D16]">
                        {v.calories} kcal
                      </span>
                      <span className="text-[10px] text-[#6B7280] block font-normal">/100g</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#4B5563] mt-2.5 leading-relaxed">
                    {v.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E5E7E2] flex items-center justify-between text-xs">
                  <span className="text-[#2F7D16] font-bold">Protein: {v.protein}</span>
                  <span className="text-[#111111] font-semibold">Carbs: {v.carbs}</span>
                  <span className="text-[#4B5563] font-semibold">Fat: {v.fat}</span>
                </div>
              </article>
            ))}
          </div>

          {/* Portion Conversion Preview */}
          <div className="bg-[#F3F7EE] rounded-2xl p-4 sm:p-5 border border-[#E5E7E2] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs space-y-1.5 text-center sm:text-left">
              <p className="font-bold text-[#111111]">
                Smart Bowl-to-Gram Weights for {indianDishes[activeIndianDish].name}:
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] justify-center sm:justify-start">
                {indianDishes[activeIndianDish].portions.map((p, idx) => (
                  <span key={idx} className="bg-white border border-[#E5E7E2] px-3 py-1.5 rounded-xl text-[#4B5563]">
                    {p.label}: <strong className="text-[#111111] font-bold">{p.weight}</strong> (~{p.cal} kcal)
                  </span>
                ))}
              </div>
            </div>

            <Link href="/nutrition" className="shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                className="w-full sm:w-auto bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-full shadow-xs cursor-pointer min-h-[44px] transition-colors"
              >
                Try Nutrition Tracker →
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
          7. NUTRITION TRACKING BENEFITS
      ========================================================================= */}
      <section id="why-nutriflexs" className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
          <Badge
            variant="protein"
            className="text-xs uppercase font-bold tracking-wider mb-2.5 inline-flex items-center"
          >
            CORE BENEFITS
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Why NutriFlexs Works
          </h2>
          <p className="text-xs sm:text-sm text-nutri-muted mt-2 leading-relaxed">
            Combining gym-adjacent fast fuel with precision Indian nutrition tracking under one roof.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 sm:p-7 space-y-4 border-nutri-border rounded-3xl bg-white shadow-xs hover:shadow-float transition-all h-full flex flex-col justify-start">
            <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center font-bold text-xl shrink-0">
              ⚡
            </div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">1. 5-Min Kiosk Pickup</h3>
            <p className="text-xs sm:text-sm text-nutri-muted leading-relaxed">
              Order after your workout. Freshly cooked high-protein fuel is ready at the counter in 5 minutes as you walk out of your gym.
            </p>
          </Card>

          <Card className="p-6 sm:p-7 space-y-4 border-nutri-border rounded-3xl bg-white shadow-xs hover:shadow-float transition-all h-full flex flex-col justify-start">
            <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center font-bold text-xl shrink-0">
              🍛
            </div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">2. Gravy vs Main Intelligence</h3>
            <p className="text-xs sm:text-sm text-nutri-muted leading-relaxed">
              Log Indian curries with scientific accuracy. Choose thick gravy, regular, or mostly chickpeas/paneer to get exact macro values.
            </p>
          </Card>

          <Card className="p-6 sm:p-7 space-y-4 border-nutri-border rounded-3xl bg-white shadow-xs hover:shadow-float transition-all h-full flex flex-col justify-start">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xl shrink-0">
              🔄
            </div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">3. One Account, Auto-Synced</h3>
            <p className="text-xs sm:text-sm text-nutri-muted leading-relaxed">
              Meals ordered through NutriFlexs automatically populate your food diary. Zero duplicate logging, zero manual calculations.
            </p>
          </Card>
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
              NutriFlexs was founded in Bengaluru with a straightforward observation: fitness enthusiasts crush their gym workouts, but either settle for oily takeout or dry boiled chicken because fresh nutrition wasn't accessible or measurable.
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
