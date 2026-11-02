import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MapPin,
  Clock,
  Flame,
  CheckCircle2,
  TrendingUp,
  Dumbbell,
  Smartphone,
  Utensils,
  Leaf,
  Activity,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Heart,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "About Us | NutriFlexs — Fuel Your Fitness. Nourish Your Life.",
  description:
    "At NutriFlexs, we believe eating well should be as convenient as working out. We bring freshly prepared juices and protein-rich meals right outside your gym.",
  openGraph: {
    title: "About Us | NutriFlexs",
    description:
      "Fuel Your Fitness. Nourish Your Life. Fresh post-workout nutrition right outside your gym in 5 minutes.",
    url: "https://nutriflexs.com/about",
    siteName: "NutriFlexs",
    type: "website",
  },
};

export default function AboutPage() {
  const conceptSteps = [
    {
      step: "01",
      title: "WORKOUT",
      subtitle: "Complete your training session",
      description:
        "Focus 100% on your workout — strength, cardio, functional training or yoga — knowing your post-workout nutrition is already planned.",
      icon: Dumbbell,
    },
    {
      step: "02",
      title: "ORDER",
      subtitle: "Choose your preferred fuel",
      description:
        "Select your freshly prepared juice, warm protein-rich bowl, or recovery snack in just a few taps on the web or mobile app.",
      icon: Smartphone,
    },
    {
      step: "03",
      title: "REFUEL",
      subtitle: "Collect at your NutriFlexs kiosk",
      description:
        "Walk out of your gym and pick up your freshly prepared order within ~5 minutes at your designated express kiosk counter.",
      icon: Utensils,
    },
  ];

  const philosophyItems = [
    {
      title: "Freshness First",
      description:
        "Focus on freshly prepared food and beverages. We prioritize real ingredients and just-in-time preparation over pre-packaged alternatives.",
      icon: Leaf,
    },
    {
      title: "Nutrition Matters",
      description:
        "Make nutritional information accessible and understandable. Every single item provides clear protein, calorie, carb, and fat values.",
      icon: Activity,
    },
    {
      title: "Quality & Care",
      description:
        "Pay attention to ingredients, preparation and consistency. Thoughtfully crafted recipes designed for sustained daily energy and recovery.",
      icon: ShieldCheck,
    },
    {
      title: "Everyday Convenience",
      description:
        "Make better food choices easier to access. Positioning healthy food right outside your gym removes the daily friction of eating well.",
      icon: Clock,
    },
  ];

  const offerings = [
    {
      category: "Fresh Juices",
      tag: "Cold-Pressed & Rehydrating",
      description:
        "Pure fruit and vegetable blends crafted for immediate hydration, clean micronutrients, and stamina without added sugars.",
      items: "ABC Stamina Rebuilder • Green Detox • Citrus Hydrator",
      image:
        "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
      href: "/menu?category=juices",
    },
    {
      category: "Protein-Rich Meals",
      tag: "High Protein & Warm",
      description:
        "Warm, freshly prepared protein plates designed to replenish glycogen and support lean muscle recovery right after your workout.",
      items: "Egg White Power Scramble • Grilled Paneer • Lean Chicken Plates",
      image:
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      href: "/menu?category=protein",
    },
    {
      category: "Healthy Bowls & Snacks",
      tag: "Fiber & Complex Carbs",
      description:
        "Nutrient-dense superfood bowls and wholesome crunch packed with clean dietary fiber, micronutrients, and healthy fats.",
      items: "Quinoa Energy Bowls • Sprout Power Bowls • Clean Crunch",
      image:
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
      href: "/menu?category=bowls",
    },
    {
      category: "Fitness Combos",
      tag: "Juice + Protein Pairings",
      description:
        "Complete post-workout pairings combining a fresh cold-pressed juice with a warm protein plate for full-spectrum refuel.",
      items: "Stamina & Scramble • Daily Muscle Recovery Packs",
      image:
        "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
      href: "/menu?category=combos",
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 lg:space-y-28 pb-16 sm:pb-24">
      {/* ============================================================== */}
      {/* SECTION 1: HERO — OUR STORY                                    */}
      {/* ============================================================== */}
      <section className="pt-6 sm:pt-10 lg:pt-14 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column: Story & Headline */}
          <div className="space-y-6">
            <Badge
              variant="gold"
              className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-nutri-green shrink-0" />
              OUR STORY &amp; MISSION
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading text-nutri-charcoal tracking-tight leading-[1.1]">
              Fuel Your Fitness.
              <br />
              <span className="text-nutri-green">Nourish Your Life.</span>
            </h1>

            <p className="text-base sm:text-lg text-nutri-secondary leading-relaxed">
              At NutriFlexs, we believe that eating well should be as convenient as working out. We
              are building a smarter way to access fresh, nutritious food around your fitness
              routine — making it easier to fuel your body, recover better and stay consistent with
              your goals.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/menu"
                className="inline-flex items-center justify-center gap-2 bg-nutri-green hover:bg-nutri-green-dark text-white font-bold text-sm sm:text-base py-3.5 px-6 rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center"
              >
                <span>Explore Our Menu</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
              <Link
                href="/gyms"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-nutri-green-soft text-nutri-charcoal font-bold text-sm sm:text-base py-3.5 px-6 rounded-full border border-nutri-border hover:border-nutri-green/40 shadow-sm transition-all duration-200 cursor-pointer text-center"
              >
                <MapPin className="w-4 h-4 text-nutri-green shrink-0" />
                <span>Find a Nearby Gym</span>
              </Link>
            </div>

            {/* Quick Trust Highlights */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-xs font-semibold text-nutri-secondary border-t border-nutri-border-light">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-nutri-green shrink-0" /> ~5 Min Express Pickup
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-nutri-green shrink-0" /> Fresh Daily Preparation
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-nutri-green shrink-0" /> Clear Macro Breakdown
              </span>
            </div>
          </div>

          {/* Right Column: Premium Lifestyle Hero Image */}
          <div
            className="relative w-full h-[360px] sm:h-[440px] lg:h-[480px] rounded-3xl overflow-hidden shadow-float border border-nutri-border bg-white"
            style={{ position: "relative", overflow: "hidden", minHeight: "360px" }}
          >
            <Image
              src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80"
              alt="Fresh, wholesome fitness nutrition prepared by NutriFlexs"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Floating Info Overlay Card */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/50 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-nutri-green animate-pulse" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-nutri-green">
                      Gym-Adjacent Kiosk Concept
                    </span>
                  </div>
                  <h4 className="font-bold text-nutri-charcoal text-sm sm:text-base font-heading">
                    Clean Fuel Located 50–100m From Gyms
                  </h4>
                  <p className="text-xs text-nutri-secondary mt-0.5">
                    Freshly prepared post-workout nutrition ready in 5 minutes.
                  </p>
                </div>
                <div className="hidden sm:block shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-nutri-green-light flex items-center justify-center text-nutri-green">
                    <Utensils className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 2: WHY NUTRIFLEXS EXISTS                               */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <Badge
            variant="gold"
            className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5 text-nutri-green shrink-0" />
            THE PROBLEM WE SOLVE
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Your Workout Deserves Better Fuel.
          </h2>

          <p className="text-sm sm:text-base text-nutri-secondary leading-relaxed pt-2">
            People invest time and effort into their fitness, but finding convenient, nutritious
            post-workout food is often difficult. NutriFlexs aims to bridge this gap by bringing
            freshly prepared juices, protein-rich meals and healthy snacks closer to fitness
            communities.
          </p>
        </div>

        {/* 3 Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Card 1: Convenience */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-nutri-charcoal">Convenience</h3>
              <p className="text-sm text-nutri-secondary leading-relaxed">
                Nutritious food close to your workout destination, with a quick pickup experience.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-nutri-border-light flex items-center gap-2 text-xs font-semibold text-nutri-green">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Express counter 50–100m from gym footfalls</span>
            </div>
          </div>

          {/* Card 2: Nutrition */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-nutri-charcoal">Nutrition</h3>
              <p className="text-sm text-nutri-secondary leading-relaxed">
                Food choices designed around everyday fitness and nutritional goals.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-nutri-border-light flex items-center gap-2 text-xs font-semibold text-nutri-green">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Honest macros &amp; protein-dense recipes</span>
            </div>
          </div>

          {/* Card 3: Consistency */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-nutri-charcoal">Consistency</h3>
              <p className="text-sm text-nutri-secondary leading-relaxed">
                Making healthy eating easier to maintain as part of an active lifestyle.
              </p>
            </div>
            <div className="pt-6 mt-6 border-t border-nutri-border-light flex items-center gap-2 text-xs font-semibold text-nutri-green">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Effortless post-workout refuel habit</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 3: OUR CONCEPT — FROM WORKOUT TO RECOVERY              */}
      {/* ============================================================== */}
      <section className="bg-nutri-green-soft py-14 sm:py-20 border-y border-nutri-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
            <Badge
              variant="gold"
              className="bg-white text-nutri-green border-nutri-border font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-nutri-green shrink-0" />
              HOW THE WORKFLOW OPERATES
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              A Better Post-Workout Experience.
            </h2>

            <p className="text-sm sm:text-base text-nutri-secondary leading-relaxed">
              We connect your sweat session directly with recovery through an integrated, 3-step
              seamless flow.
            </p>
          </div>

          {/* Connected 3-Step Process Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
            {conceptSteps.map((stepItem, index) => {
              const StepIcon = stepItem.icon;
              return (
                <div
                  key={stepItem.step}
                  className="bg-white rounded-3xl p-6 sm:p-8 border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 relative flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    {/* Top Row: Step Badge & Icon */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-nutri-green-light text-nutri-green tracking-wider">
                        STEP {stepItem.step}
                      </span>
                      <div className="w-12 h-12 rounded-2xl bg-nutri-green-soft text-nutri-green flex items-center justify-center group-hover:bg-nutri-green group-hover:text-white transition-colors">
                        <StepIcon className="w-6 h-6" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                        {stepItem.title}
                      </h3>
                      <p className="text-xs font-bold text-nutri-green mt-1">
                        {stepItem.subtitle}
                      </p>
                    </div>

                    <p className="text-sm text-nutri-secondary leading-relaxed">
                      {stepItem.description}
                    </p>
                  </div>

                  {/* Visual Step Indicator Line */}
                  <div className="pt-6 mt-6 border-t border-nutri-border-light flex items-center justify-between text-xs font-semibold text-nutri-secondary">
                    <span>Phase {index + 1} of 3</span>
                    <ChevronRight className="w-4 h-4 text-nutri-green" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 4: WHAT WE BELIEVE IN — OUR FOOD PHILOSOPHY            */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <Badge
            variant="gold"
            className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-nutri-green shrink-0" />
            CORE PRINCIPLES
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Our Food Philosophy
          </h2>

          <p className="text-sm sm:text-base text-nutri-secondary leading-relaxed">
            The fundamental standards that guide how we formulate our recipes, select ingredients,
            and prepare every meal.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {philosophyItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center">
                    <ItemIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold font-heading text-nutri-charcoal">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-nutri-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 5: OUR OFFERINGS                                       */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div className="space-y-3 max-w-2xl">
            <Badge
              variant="gold"
              className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5"
            >
              <Utensils className="w-3.5 h-3.5 text-nutri-green shrink-0" />
              MENU OFFERINGS
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Everything Your Fitness Routine Needs.
            </h2>

            <p className="text-sm sm:text-base text-nutri-secondary leading-relaxed">
              Explore our core product categories, calibrated specifically to support your daily
              energy, muscle recovery, and active wellness.
            </p>
          </div>

          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-sm font-bold text-nutri-green hover:text-nutri-green-dark transition-colors cursor-pointer shrink-0"
          >
            <span>Explore Full Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {offerings.map((cat) => (
            <Link
              key={cat.category}
              href={cat.href}
              className="group bg-white rounded-3xl overflow-hidden border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 flex flex-col cursor-pointer"
            >
              {/* Category Image */}
              <div className="relative w-full h-48 sm:h-52 bg-nutri-green-soft overflow-hidden">
                <Image
                  src={cat.image}
                  alt={cat.category}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full inline-block">
                    {cat.tag}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold font-heading text-nutri-charcoal group-hover:text-nutri-green transition-colors">
                    {cat.category}
                  </h3>
                  <p className="text-xs text-nutri-secondary leading-relaxed">
                    {cat.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-nutri-border-light">
                  <p className="text-[11px] font-semibold text-nutri-secondary line-clamp-1">
                    {cat.items}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-nutri-green mt-2 group-hover:translate-x-1 transition-transform">
                    View in Menu <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 6: OUR VISION                                          */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-nutri-green-soft via-white to-nutri-green-light rounded-4xl p-8 sm:p-12 lg:p-16 border border-nutri-border shadow-float">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <Badge
                variant="gold"
                className="bg-white text-nutri-green border-nutri-border font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                OUR LONG-TERM VISION
              </Badge>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight leading-[1.15]">
                Building a Healthier Fitness Ecosystem.
              </h2>

              <p className="text-base sm:text-lg text-nutri-secondary leading-relaxed">
                &ldquo;Our vision is to make nutritious food more accessible to fitness communities
                by building convenient food and pickup experiences around the places where people
                train.&rdquo;
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-nutri-border shadow-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-nutri-green shrink-0" />
                    <h4 className="font-bold text-sm text-nutri-charcoal">Gym-Adjacent Placement</h4>
                  </div>
                  <p className="text-xs text-nutri-secondary leading-relaxed">
                    Kiosks positioned directly within footsteps of training centers.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-nutri-border shadow-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-nutri-green shrink-0" />
                    <h4 className="font-bold text-sm text-nutri-charcoal">Frictionless Pickup</h4>
                  </div>
                  <p className="text-xs text-nutri-secondary leading-relaxed">
                    Order ahead and collect freshly prepared food in ~5 minutes.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Visual Image */}
            <div className="lg:col-span-5">
              <div
                className="relative w-full h-[280px] sm:h-[340px] rounded-3xl overflow-hidden shadow-card border border-nutri-border bg-white"
                style={{ position: "relative", overflow: "hidden" }}
              >
                <Image
                  src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80"
                  alt="Fitness and community training ecosystem"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-white/90">
                    Community &amp; Movement
                  </p>
                  <p className="text-sm font-bold font-heading">
                    Nutrition That Keeps Up With Your Sweat
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 7: FINAL CTA                                           */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-nutri-charcoal text-white rounded-4xl p-8 sm:p-14 lg:p-16 text-center relative overflow-hidden shadow-float">
          {/* Subtle Ambient Background Accent */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-nutri-green/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-nutri-green/20 blur-3xl pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <Badge
              variant="gold"
              className="bg-white/10 text-emerald-300 border-white/20 font-bold text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              START REFUELING TODAY
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight leading-[1.15]">
              Make Every Workout Count.
            </h2>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-xl mx-auto">
              Your fitness journey doesn&apos;t end when your workout does. Give your body the fuel
              it deserves.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/menu"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-nutri-green hover:bg-nutri-green-dark text-white font-bold text-sm sm:text-base py-3.5 px-8 rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <span>Explore Menu</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/gyms"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-base py-3.5 px-8 rounded-full border border-white/20 transition-all duration-200 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Find Your Gym</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

