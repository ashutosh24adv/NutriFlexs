import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  MapPin,
  Clock,
  Sparkles,
  Target,
  Compass,
  Crosshair,
  Dumbbell,
  Smartphone,
  ChefHat,
  Apple,
  Building2,
  Users,
  ChevronDown,
  BookOpen,
  Utensils,
  NotebookPen,
  ShieldCheck,
  Zap,
  Info,
  UserCheck,
  CheckCircle2,
  HeartHandshake,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "About Us | NutriFlexs — Fuel Your Ambition. Nourish Your Potential.",
  description:
    "At NutriFlexs, we believe what you eat after a workout matters just as much as the effort you put into it. We are building a smarter, more convenient way to fuel your fitness journey.",
  openGraph: {
    title: "About Us | NutriFlexs — Fuel Your Ambition. Nourish Your Potential.",
    description:
      "At NutriFlexs, we believe what you eat after a workout matters just as much as the effort you put into it. Fresh post-workout nutrition right outside your gym in ~5 minutes.",
    url: "https://nutriflexs.com/about",
    siteName: "NutriFlexs",
    type: "website",
  },
};

export default function AboutPage() {
  // Section 2: Mission, Vision & Aim cards data
  const missionVisionCards = [
    {
      badge: "OUR MISSION",
      title: "Our Mission",
      description:
        "Make quality fitness nutrition convenient, accessible and enjoyable. We want people to have better food choices available when their bodies need nourishment the most.",
      icon: Target,
      tagline: "Convenient & Accessible Nutrition",
    },
    {
      badge: "OUR VISION",
      title: "Our Vision",
      description:
        "Build a world where healthy eating and fitness go hand in hand, where nutritious food is easy to access and becoming healthier fits naturally into everyday life.",
      icon: Compass,
      tagline: "Fitness & Nutrition Hand-in-Hand",
    },
    {
      badge: "OUR AIM",
      title: "Our Aim",
      description:
        "Bring thoughtfully prepared meals and refreshing beverages closer to fitness communities through convenient pickup experiences and transparent nutrition information.",
      icon: Crosshair,
      tagline: "Transparent, Thoughtful Fuel",
    },
  ];

  // Section 3: Visual Journey steps
  const journeySteps = [
    {
      number: "01",
      title: "WORKOUT",
      desc: "Train hard with focus",
      icon: Dumbbell,
    },
    {
      number: "02",
      title: "ORDER",
      desc: "Pick your fuel in seconds",
      icon: Smartphone,
    },
    {
      number: "03",
      title: "FRESH PREPARATION",
      desc: "Crafted just-in-time",
      icon: ChefHat,
    },
    {
      number: "04",
      title: "PICKUP",
      desc: "Ready at gym kiosk in ~5 min",
      icon: MapPin,
    },
  ];

  // Section 5: Role-based Team Contributors (No fabricated personal identities)
  const teamRoles = [
    {
      role: "Kitchen & Food Preparation",
      focus: "Just-In-Time Culinary Prep",
      description:
        "Trained culinary teams operating assigned kitchens with strict hygiene standards, daily cold-press extraction, and warm meal assemblies.",
      icon: ChefHat,
      badge: "Culinary Operations",
      highlight: "Daily Fresh Batching",
      image:
        "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
    },
    {
      role: "Nutrition & Menu Development",
      focus: "Macronutrient Calibration",
      description:
        "Dietitians and fitness nutrition specialists formulating protein-dense recipes, zero-sugar hydrators, and transparent nutritional profiles.",
      icon: Apple,
      badge: "Nutrition Science",
      highlight: "Honest Macro Verification",
      image:
        "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80",
    },
    {
      role: "Kiosk & Outlet Operations",
      focus: "5-Minute Express Fulfillment",
      description:
        "Frontline staff managing express pickup counters located 50–100m outside partner gyms to provide seamless post-workout handoffs.",
      icon: Building2,
      badge: "Field Operations",
      highlight: "Rapid Turnaround",
      image:
        "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=800&q=80",
    },
    {
      role: "Gym & Trainer Community",
      focus: "Fitness Alignment & Recovery",
      description:
        "Certified trainers and fitness center partners collaborating to integrate post-workout nutrition with client fitness regimens.",
      icon: Users,
      badge: "Ecosystem Partners",
      highlight: "Active Collaboration",
      image:
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
    },
  ];

  // Section 6: Operational Process Steps (Preparation to Pickup)
  const processSteps = [
    {
      step: "01",
      title: "THOUGHTFUL MENU",
      description:
        "Explore meals and beverages designed around everyday fitness nutrition.",
      icon: BookOpen,
      detail: "Clean protein, complex carbs & natural hydration",
    },
    {
      step: "02",
      title: "FRESH PREPARATION",
      description:
        "Your selected food is prepared at the assigned NutriFlexs kitchen.",
      icon: Utensils,
      detail: "Made on demand for peak nutritional value",
    },
    {
      step: "03",
      title: "QUICK PICKUP",
      description:
        "Collect your order from your selected partner gym kiosk.",
      icon: MapPin,
      detail: "Conveniently located 50–100m outside gym entrance",
    },
    {
      step: "04",
      title: "TRACK YOUR NUTRITION",
      description:
        "Keep track of your food, calories and macros through your nutrition diary.",
      icon: NotebookPen,
      detail: "Live daily synchronization with calorie & protein goals",
    },
  ];

  // Section 7: Nutrition Philosophy Principles
  const philosophyPrinciples = [
    {
      title: "Thoughtful Ingredients",
      description:
        "Every whole fruit, lean protein source, and nutrient-dense ingredient is chosen with purpose to support recovery and daily physical energy.",
      icon: Apple,
      tag: "Purposeful Sourcing",
    },
    {
      title: "Transparent Nutrition",
      description:
        "Accurate, verifiable macronutrient and calorie breakdowns for every single item so you know exactly what is fueling your body.",
      icon: ShieldCheck,
      tag: "Clear Macros",
    },
    {
      title: "Fitness-Focused Choices",
      description:
        "Portions, hydration blends, and protein plates specifically calibrated around post-workout recovery needs and active routines.",
      icon: Dumbbell,
      tag: "Workout Calibrated",
    },
    {
      title: "Convenient Access",
      description:
        "Placing nutritious food directly within your daily fitness footprint so eating well requires zero detours or extra friction.",
      icon: Clock,
      tag: "5-Min Proximity",
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 lg:space-y-32 pb-16 sm:pb-24 overflow-hidden">
      {/* ============================================================== */}
      {/* SECTION 1 — HERO: OUR STORY                                    */}
      {/* ============================================================== */}
      <section className="relative w-full min-h-[620px] sm:min-h-[680px] lg:min-h-[740px] flex items-center justify-center overflow-hidden rounded-b-3xl sm:rounded-b-4xl lg:rounded-b-[3.5rem] shadow-float">
        {/* Background Image with Dark Green Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=2000&q=85"
            alt="NutriFlexs fitness training and post-workout nutrition"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Layered Gradient Overlay for Text Readability & NutriFlexs Brand Tint */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#14330E] via-[#1E4D14]/85 to-[#0F260A]/75 backdrop-brightness-[0.85]" />
          <div className="absolute inset-0 bg-[radial-gradient(#4E9F2F_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-white space-y-6 sm:space-y-8">
          {/* Brand Tag Pill */}
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 text-white text-xs sm:text-[13px] font-extrabold uppercase tracking-wider px-4 py-1.5 rounded-full backdrop-blur-md shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300" />
            <span>OUR STORY &amp; PURPOSE</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold font-heading text-white tracking-tight leading-[1.08] max-w-4xl mx-auto">
            Fuel Your Ambition.
            <br />
            <span className="text-emerald-300">Nourish Your Potential.</span>
          </h1>

          {/* Supporting Text */}
          <p className="text-base sm:text-lg md:text-xl text-nutri-green-light max-w-2xl mx-auto leading-relaxed font-normal">
            At NutriFlexs, we believe that what you eat after a workout matters just as much as the
            effort you put into it. We&apos;re building a smarter, more convenient way to fuel your
            fitness journey.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-3">
            <Link
              href="/menu"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-nutri-green hover:bg-nutri-green-hover text-white font-extrabold text-sm sm:text-base py-3.5 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer active:scale-98"
            >
              <span>Explore Our Menu</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
            <Link
              href="/gyms"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm sm:text-base py-3.5 px-8 rounded-full border border-white/30 backdrop-blur-sm transition-all duration-200 cursor-pointer active:scale-98"
            >
              <MapPin className="w-4 h-4 text-emerald-300" />
              <span>Find a Nearby Gym</span>
            </Link>
          </div>

          {/* Trust Highlights Strip */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-6 sm:pt-10 text-xs sm:text-sm font-semibold text-nutri-green-light/90 border-t border-white/15 max-w-2xl mx-auto">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-300" /> ~5-Min Express Pickup
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-300" /> Fresh Daily Preparation
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-300" /> Transparent Nutrition
            </span>
          </div>

          {/* Subtle Scroll Indicator */}
          <div className="pt-4 hidden sm:block">
            <a
              href="#mission-vision-aim"
              aria-label="Scroll to Mission, Vision & Aim"
              className="inline-flex flex-col items-center text-xs text-white/70 hover:text-white transition-colors"
            >
              <span className="text-[11px] font-medium tracking-wider uppercase mb-1">Discover</span>
              <ChevronDown className="w-4 h-4 animate-bounce text-emerald-300" />
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 2 — OUR MISSION, VISION & AIM                          */}
      {/* ============================================================== */}
      <section id="mission-vision-aim" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <Badge
            variant="gold"
            className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5 text-nutri-green shrink-0" />
            PURPOSE &amp; DIRECTION
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Our Mission, Vision &amp; Aim
          </h2>

          <p className="text-sm sm:text-base text-nutri-secondary leading-relaxed pt-1">
            The foundational principles that inspire why NutriFlexs was started and guide every
            step of our growth.
          </p>
        </div>

        {/* 3 Equal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {missionVisionCards.map((card) => {
            const CardIcon = card.icon;
            return (
              <div
                key={card.badge}
                className="bg-[#F7FAF4] rounded-3xl p-7 sm:p-9 border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div className="space-y-5 text-center flex flex-col items-center">
                  {/* Distinctive Minimal Green Icon Container */}
                  <div className="w-14 h-14 rounded-2xl bg-nutri-green text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <CardIcon className="w-7 h-7 stroke-[2.2]" />
                  </div>

                  {/* Badge */}
                  <span className="text-[11px] font-extrabold tracking-wider uppercase px-3 py-1 rounded-full bg-nutri-green-light text-nutri-green border border-nutri-green-soft">
                    {card.badge}
                  </span>

                  {/* Title */}
                  <h3 className="text-2xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm sm:text-[15px] text-nutri-secondary leading-relaxed font-normal">
                    &ldquo;{card.description}&rdquo;
                  </p>
                </div>

                {/* Card Tagline Footer */}
                <div className="pt-6 mt-6 border-t border-nutri-border text-center">
                  <span className="text-xs font-bold text-nutri-green inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {card.tagline}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 3 — FROM WORKOUT TO THE RIGHT FUEL                     */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Origin Story Narrative (7 cols on desktop) */}
          <div className="lg:col-span-7 space-y-6">
            <Badge
              variant="gold"
              className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-nutri-green shrink-0" />
              THE PROBLEM WE ARE SOLVING
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight leading-[1.12]">
              From Workout to the Right Fuel
            </h2>

            <div className="space-y-4 text-sm sm:text-base text-nutri-secondary leading-relaxed font-normal">
              <p>
                Every fitness journey requires consistency, effort and the right nutrition.
              </p>
              <p>
                But there&apos;s a gap between finishing a workout and finding a nutritious meal.
                People often have to choose between convenience and making a healthier food choice.
              </p>
              <p className="font-semibold text-nutri-charcoal">
                NutriFlexs was built around a simple idea: good nutrition should be closer to where
                your fitness journey happens.
              </p>
              <p>
                By bringing thoughtfully prepared meals, protein-rich options and refreshing
                beverages closer to partner gyms, we aim to make post-workout nutrition easier,
                faster and more convenient.
              </p>
              <p className="font-bold text-nutri-green text-base sm:text-lg">
                Because your effort in the gym deserves better fuel outside it too.
              </p>
            </div>

            {/* Small Visual Journey: WORKOUT → ORDER → FRESH PREPARATION → PICKUP */}
            <div className="pt-4 border-t border-nutri-border space-y-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-nutri-charcoal">
                The Seamless Refuel Flow
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {journeySteps.map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.number}
                      className="bg-nutri-green-soft/70 p-3 sm:p-3.5 rounded-2xl border border-nutri-border flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-nutri-green bg-white px-2 py-0.5 rounded-full shadow-xs">
                          {step.number}
                        </span>
                        <StepIcon className="w-4 h-4 text-nutri-green" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-nutri-charcoal tracking-tight">
                          {step.title}
                        </h4>
                        <p className="text-[11px] text-nutri-secondary mt-0.5 line-clamp-1">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: High Quality Lifestyle Food & Gym Image (5 cols on desktop) */}
          <div className="lg:col-span-5">
            <div className="relative w-full h-[400px] sm:h-[480px] rounded-3xl overflow-hidden shadow-float border border-nutri-border bg-white">
              <Image
                src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=85"
                alt="NutriFlexs fresh post-workout fuel and clean ingredients"
                fill
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Floating Overlay Badge */}
              <div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/60 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-nutri-green-light flex items-center justify-center text-nutri-green shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-nutri-green block">
                      Gym-Adjacent Model
                    </span>
                    <h4 className="text-sm font-bold text-nutri-charcoal">
                      Bridging Sweat &amp; Recovery
                    </h4>
                    <p className="text-xs text-nutri-secondary mt-0.5">
                      Positioned 50–100m outside partner gyms for instant post-workout collection.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 4 — MEET OUR FOUNDER (EDITABLE PLACEHOLDER STRUCTURE)  */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F3F7EE] rounded-3xl sm:rounded-4xl p-6 sm:p-10 lg:p-14 border border-nutri-border shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Founder Portrait Placeholder (5 cols on desktop) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-[360px] aspect-[4/5] rounded-3xl overflow-hidden border-2 border-dashed border-nutri-green/30 bg-white/80 shadow-card flex flex-col items-center justify-center p-6 text-center group">
                {/* Architectural Avatar Placeholder */}
                <div className="w-24 h-24 rounded-full bg-nutri-green-light border-2 border-nutri-green/20 flex items-center justify-center text-nutri-green mb-4 shadow-sm group-hover:scale-105 transition-transform">
                  <UserCheck className="w-12 h-12 stroke-[1.8]" />
                </div>

                <Badge
                  variant="gold"
                  className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-extrabold text-[10px] uppercase px-3 py-1 mb-2"
                >
                  Founder Portrait Slot
                </Badge>

                <h4 className="font-heading font-bold text-base text-nutri-charcoal">
                  [Founder Photograph]
                </h4>

                <p className="text-xs text-nutri-secondary mt-1 max-w-[240px] leading-relaxed">
                  Recommended: High-resolution vertical portrait in training or kitchen studio environment.
                </p>

                <div className="mt-4 pt-3 border-t border-nutri-border w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-nutri-green">
                  <Info className="w-3.5 h-3.5" />
                  <span>Ready for verified asset</span>
                </div>
              </div>
            </div>

            {/* Right Column: Founder Story & Philosophy (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2">
                <Badge
                  variant="gold"
                  className="bg-white text-nutri-green border-nutri-border font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                  FOUNDER&apos;S PERSPECTIVE
                </Badge>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                  Meet the Mind Behind NutriFlexs
                </h2>

                <p className="text-sm sm:text-base text-nutri-green font-semibold">
                  Every meaningful idea begins with a problem worth solving and a belief that
                  things can be better.
                </p>
              </div>

              {/* Founder Narrative (Authentic problem-solving story, no fabricated biography) */}
              <div className="space-y-4 text-sm sm:text-base text-nutri-secondary leading-relaxed font-normal">
                <p>
                  Like so many fitness enthusiasts, the journey to build NutriFlexs started with a
                  daily frustration: walking out of an intense training session with hungry muscles,
                  only to find that getting real, nutritious post-workout food meant either driving home
                  to prep from scratch or settling for oily takeout and sugary substitutes.
                </p>
                <p>
                  The conviction behind NutriFlexs is straightforward: if you are committed enough to
                  put in the physical work inside the gym, having convenient access to clean protein,
                  fresh juices, and balanced meals right outside the door shouldn&apos;t be a luxury—it
                  should be the standard.
                </p>
              </div>

              {/* Personal Philosophy Highlight Quote */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-nutri-border shadow-xs border-l-4 border-l-nutri-green">
                <p className="text-sm sm:text-base font-medium italic text-nutri-charcoal leading-relaxed">
                  &ldquo;Good nutrition shouldn&apos;t require a compromise between your schedule and
                  your health. When healthy food is available right when you need it, consistency
                  becomes effortless.&rdquo;
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-nutri-green uppercase tracking-wider">
                    — Founder &amp; Head of Vision, NutriFlexs
                  </span>
                  <span className="text-[11px] text-nutri-secondary/80 bg-nutri-green-soft px-2.5 py-0.5 rounded-full">
                    Founder Philosophy
                  </span>
                </div>
              </div>

              {/* Editable Information Notice */}
              <div className="flex items-center gap-2 p-3 bg-white/70 rounded-xl border border-nutri-border text-[11px] text-nutri-secondary">
                <Info className="w-4 h-4 text-nutri-green shrink-0" />
                <span>
                  Official founder name, biography and verified portrait can be populated here directly without modifying layout structure.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 5 — THE PEOPLE BEHIND EVERY MEAL                       */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <Badge
            variant="gold"
            className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-nutri-green shrink-0" />
            OUR TEAM &amp; COMMUNITY
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            People Who Make It Happen
          </h2>

          <p className="text-sm sm:text-base text-nutri-secondary leading-relaxed pt-1">
            Behind every good meal is a team that cares about preparation, quality and the experience
            of every customer.
          </p>
        </div>

        {/* 4 Role-Based Cards Grid (No fabricated employee personas) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamRoles.map((team) => {
            const TeamIcon = team.icon;
            return (
              <div
                key={team.role}
                className="bg-white rounded-3xl overflow-hidden border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 flex flex-col justify-between group"
              >
                {/* Visual Header Image */}
                <div className="relative w-full h-44 bg-nutri-green-soft overflow-hidden">
                  <Image
                    src={team.image}
                    alt={team.role}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                      {team.badge}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-nutri-green text-white flex items-center justify-center shadow-xs">
                      <TeamIcon className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold font-heading text-nutri-charcoal group-hover:text-nutri-green transition-colors">
                      {team.role}
                    </h3>
                    <p className="text-xs font-bold text-nutri-green">
                      {team.focus}
                    </p>
                    <p className="text-xs text-nutri-secondary leading-relaxed pt-1">
                      {team.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-nutri-border flex items-center justify-between text-[11px] font-semibold text-nutri-secondary">
                    <span>Core Focus</span>
                    <span className="text-nutri-green font-bold">{team.highlight}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 6 — HOW WE BRING NUTRITION CLOSER                      */}
      {/* ============================================================== */}
      <section className="bg-nutri-green-soft py-14 sm:py-20 border-y border-nutri-border">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
            <Badge
              variant="gold"
              className="bg-white text-nutri-green border-nutri-border font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5 shadow-sm"
            >
              <Clock className="w-3.5 h-3.5 text-nutri-green shrink-0" />
              OPERATIONAL FLOW
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              From Preparation to Pickup
            </h2>

            <p className="text-sm sm:text-base text-nutri-secondary leading-relaxed">
              How our integrated workflow connects kitchen preparation, express kiosks, and your
              daily nutrition diary.
            </p>
          </div>

          {/* 4 Connected Operational Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {processSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.step}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 flex flex-col justify-between group relative"
                >
                  <div className="space-y-4">
                    {/* Step Number Badge & Icon */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-nutri-green-light text-nutri-green tracking-wider">
                        STEP {step.step}
                      </span>
                      <div className="w-11 h-11 rounded-2xl bg-nutri-green-soft text-nutri-green flex items-center justify-center group-hover:bg-nutri-green group-hover:text-white transition-colors">
                        <StepIcon className="w-5 h-5 stroke-[2.2]" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold font-heading text-nutri-charcoal tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-xs font-bold text-nutri-green mt-1">
                        {step.detail}
                      </p>
                    </div>

                    <p className="text-xs sm:text-sm text-nutri-secondary leading-relaxed">
                      &ldquo;{step.description}&rdquo;
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-nutri-border flex items-center justify-between text-xs font-semibold text-nutri-secondary">
                    <span>Stage {idx + 1} of 4</span>
                    <CheckCircle2 className="w-4 h-4 text-nutri-green" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 7 — OUR NUTRITION PHILOSOPHY                           */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-10 sm:mb-14">
          <Badge
            variant="gold"
            className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1 inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-nutri-green shrink-0" />
            OUR STANDARDS
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Real Food. Real Fuel.
          </h2>

          <p className="text-sm sm:text-base text-nutri-secondary leading-relaxed pt-1 max-w-2xl mx-auto">
            We believe better nutrition starts with understanding what goes into your food. That&apos;s
            why we focus on thoughtful menu choices, transparent nutritional information and
            convenient access to meals that support active lifestyles.
          </p>
        </div>

        {/* 4 Visual Principles Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {philosophyPrinciples.map((item) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center group-hover:bg-nutri-green group-hover:text-white transition-colors">
                    <ItemIcon className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-nutri-green">
                      {item.tag}
                    </span>
                    <h3 className="text-lg font-bold font-heading text-nutri-charcoal mt-1">
                      {item.title}
                    </h3>
                  </div>
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
      {/* SECTION 8 — CLOSING CTA                                        */}
      {/* ============================================================== */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1E3A1E] text-white rounded-3xl sm:rounded-4xl p-8 sm:p-14 lg:p-18 text-center relative overflow-hidden shadow-float">
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-nutri-green/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-nutri-green/25 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#4E9F2F_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <Badge
              variant="gold"
              className="bg-white/15 text-emerald-300 border-white/20 font-extrabold text-xs px-4 py-1.5 inline-flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300 shrink-0" />
              START YOUR REFUEL ROUTINE
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight leading-[1.12]">
              Your Fitness Journey Deserves Better Fuel.
            </h2>

            <p className="text-sm sm:text-base md:text-lg text-nutri-green-light leading-relaxed max-w-xl mx-auto font-normal">
              Make every workout count. Find your fuel with NutriFlexs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              <Link
                href="/menu"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-sm sm:text-base py-3.5 px-8 rounded-full shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-98"
              >
                <span>Explore Our Menu</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
              <Link
                href="/gyms"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-base py-3.5 px-8 rounded-full border border-white/25 transition-all duration-200 cursor-pointer active:scale-98"
              >
                <MapPin className="w-4 h-4 text-emerald-300" />
                <span>Find a Nearby Gym</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
