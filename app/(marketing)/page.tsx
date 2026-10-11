"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Zap, Clock, ShieldCheck, MapPin, Sparkles, ArrowRight, CheckCircle2, Flame, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BmiRecommendations } from "@/components/customer/bmi-recommendations";
import { LandingPassSection } from "@/components/customer/landing-pass-section";

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

  const steps = [
    { num: "01", title: "CHOOSE YOUR GYM", desc: "Select your express kiosk located 50–100m from your gym (e.g. Cult.fit Indiranagar)." },
    { num: "02", title: "CHOOSE YOUR FUEL", desc: "Browse cold-pressed juices and freshly grilled organic high-protein meals." },
    { num: "03", title: "FRESH PREPARATION", desc: "Our kiosk chefs prepare your post-workout meal immediately after ordering." },
    { num: "04", title: "READY IN 5 MINUTES", desc: "Track live preparation status on your phone with zero waiting time." },
    { num: "05", title: "PICK UP & FUEL UP", desc: "Grab your fresh refuel pack right as you walk out of your workout." },
  ];

  const featuredMeals = [
    {
      name: "Lean Grilled Chicken Breast",
      protein: "36g Protein",
      calories: "220 kcal",
      price: "₹210",
      img: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "ABC Stamina Rebuilder Juice",
      protein: "Organic Apple & Beetroot",
      calories: "145 kcal",
      price: "₹160",
      img: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
    },
    {
      name: "Grilled Chicken & Quinoa Energy Bowl",
      protein: "32g Protein",
      calories: "430 kcal",
      price: "₹250",
      img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
    },
  ];

  const faqs = [
    {
      q: "How does 5-minute pickup work?",
      a: "NutriFlexs express kiosks are positioned 50–100m from gyms. When you complete your workout and place your order on NutriFlexs, our kitchen starts preparing your fresh meal immediately. By the time you walk out of the gym, your order is hot and ready in ~5 minutes at the counter.",
    },
    {
      q: "Are the macros transparent & database-backed?",
      a: "Yes! Every single product displays exact protein, calorie, carbohydrate, and fat counts calculated directly from fresh organic ingredients.",
    },
    {
      q: "What is the NutriFlexs Pass?",
      a: "NutriFlexs Pass is a monthly subscription providing daily post-workout meal or cold-pressed juice credits at a 35%+ discount with priority kiosk preparation.",
    },
    {
      q: "How does the Trainer Referral program work?",
      a: "Certified trainers get a unique code and QR. When their gym clients scan and order, clients get 10% off and trainers unlock free daily post-workout fuel vouchers.",
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-20 lg:space-y-24 pb-16 sm:pb-24">
      {/* 1. HERO SECTION */}
      <section className="pt-6 sm:pt-10 lg:pt-14 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="gold" className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1 inline-flex items-center">
              <Zap className="w-3.5 h-3.5 mr-1.5 fill-nutri-green shrink-0" /> FAST · FRESH · TRANSPARENT · GYM-ADJACENT
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading text-nutri-charcoal tracking-tight leading-[1.1]">
              REAL FOOD.<br />
              <span className="text-nutri-green">REAL FUEL.</span>
            </h1>

            <p className="text-base sm:text-lg text-nutri-muted leading-relaxed max-w-xl">
              Fresh cold-pressed organic juices and freshly prepared high-protein meals delivered in <span className="font-bold text-nutri-charcoal">5 minutes</span> at express kiosks located right outside your gym.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link href="/menu">
                <Button size="lg" variant="primary" className="font-bold text-base shadow-lg shadow-nutri-green/20">
                  EXPLORE MENU <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              <Link href="/home?action=find-gym">
                <Button size="lg" variant="outline" className="font-bold text-base">
                  <MapPin className="w-4 h-4 mr-2 text-nutri-green" /> FIND YOUR GYM
                </Button>
              </Link>
            </div>

            {/* Micro Highlights */}
            <div className="pt-5 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-semibold text-nutri-muted border-t border-nutri-border">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-nutri-green shrink-0" /> 5 Min Pickup
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-nutri-green shrink-0" /> 100% Organic &amp; Clean
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-nutri-green shrink-0" /> Clear Macro Breakdown
              </span>
            </div>
          </div>

          {/* Hero Visual Image Showcase */}
          <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[480px] rounded-3xl overflow-hidden shadow-float border border-nutri-border bg-white">
            <Image
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80"
              alt="NutriFlexs High Protein Fuel Bowl"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Overlay Card */}
            <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-nutri-charcoal text-sm font-heading">
                    Grilled Chicken &amp; Quinoa Energy Bowl
                  </h4>
                  <p className="text-xs text-nutri-green font-semibold mt-0.5">
                    32g Protein · 430 Kcal · 100% Clean Ingredients
                  </p>
                </div>
                <Badge variant="gold" className="bg-nutri-green text-white border-none font-bold text-xs shrink-0">
                  READY IN ~5 MIN
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FIND WHAT FITS YOU / PERSONALIZED RECOMMENDATIONS */}
      <section id="find-fuel" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <BmiRecommendations />
      </section>

      {/* 3. WHY NUTRIFLEXS (BUSINESS ADVANTAGES) */}
      <section id="why-nutriflexs" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12">
          <Badge variant="protein" className="text-xs uppercase font-bold tracking-wider mb-2.5 inline-flex items-center">
            FIVE MAJOR ADVANTAGES
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Why NutriFlexs Works
          </h2>
          <p className="text-xs sm:text-sm text-nutri-muted mt-2 leading-relaxed">
            Built specifically for post-workout recovery right outside your gym door.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 sm:p-7 space-y-4 border-nutri-border rounded-3xl bg-white shadow-xs hover:shadow-float transition-all h-full flex flex-col justify-start">
            <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center font-bold text-xl shrink-0">
              ⚡
            </div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">1. Immediate 5-Min Pickup</h3>
            <p className="text-xs sm:text-sm text-nutri-muted leading-relaxed">
              Order right after your last workout set. Your food is freshly prepared and ready in 5 minutes as you walk out of the gym.
            </p>
          </Card>

          <Card className="p-6 sm:p-7 space-y-4 border-nutri-border rounded-3xl bg-white shadow-xs hover:shadow-float transition-all h-full flex flex-col justify-start">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl shrink-0">
              🌿
            </div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">2. 100% Fresh &amp; Organic</h3>
            <p className="text-xs sm:text-sm text-nutri-muted leading-relaxed">
              Cold-pressed juices extracted on site and hot organic eggs, paneer, chicken, and fish cooked fresh to order.
            </p>
          </Card>

          <Card className="p-6 sm:p-7 space-y-4 border-nutri-border rounded-3xl bg-white shadow-xs hover:shadow-float transition-all h-full flex flex-col justify-start">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xl shrink-0">
              📊
            </div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">3. Transparent Macro Data</h3>
            <p className="text-xs sm:text-sm text-nutri-muted leading-relaxed">
              Exact protein, calories, carbs, fats, and ingredients calculated for every single item on the menu.
            </p>
          </Card>
        </div>
      </section>

      {/* 4. HOW IT WORKS (5-STEP PROCESS) */}
      <section id="how-it-works" className="bg-white py-16 sm:py-20 border-y border-nutri-border scroll-mt-24">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
          <div className="text-center max-w-xl mx-auto">
            <Badge variant="gold" className="bg-nutri-green-light text-nutri-green border-nutri-green-soft text-xs uppercase font-bold tracking-wider mb-2.5 inline-flex items-center">
              SIMPLE 5-STEP EXPERIENCE
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              How It Works
            </h2>
            <p className="text-xs sm:text-sm text-nutri-muted mt-2 leading-relaxed">
              From workout finish to fresh nutrition in 5 seamless steps.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {steps.map((s, idx) => (
              <Card key={idx} className="p-5 sm:p-6 space-y-3 border-nutri-border bg-nutri-bg rounded-3xl h-full flex flex-col justify-start hover:shadow-float transition-all">
                <span className="text-2xl font-extrabold font-heading text-nutri-green block shrink-0">{s.num}</span>
                <h4 className="font-bold text-nutri-charcoal text-xs uppercase tracking-wider">{s.title}</h4>
                <p className="text-xs text-nutri-muted leading-relaxed">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FEATURED MEALS / MENU SECTION */}
      <section id="menu" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge variant="protein" className="text-xs uppercase font-bold tracking-wider mb-2.5 inline-flex items-center">
              FUEL MENU
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Popular Refuel Packs
            </h2>
            <p className="text-xs sm:text-sm text-nutri-muted mt-1 leading-relaxed">
              High protein meals &amp; cold-pressed organic juices
            </p>
          </div>

          <Link href="/menu">
            <Button variant="outline" size="sm" className="font-bold text-xs px-4 py-2.5 rounded-full border-nutri-border hover:border-nutri-green hover:text-nutri-green transition-colors">
              VIEW FULL MENU →
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredMeals.map((meal, idx) => (
            <Card key={idx} className="p-5 sm:p-6 space-y-4 overflow-hidden border-nutri-border rounded-3xl hover:shadow-float transition-all bg-white h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-nutri-bg shrink-0">
                  <Image src={meal.img} alt={meal.name} fill className="object-cover" />
                </div>
                <h3 className="font-bold font-heading text-nutri-charcoal text-base sm:text-lg min-h-[48px] flex items-center">
                  {meal.name}
                </h3>
              </div>
              <div className="flex items-center justify-between text-xs pt-3 border-t border-nutri-border-light mt-auto">
                <span className="text-nutri-green font-bold">{meal.protein}</span>
                <span className="font-extrabold text-nutri-charcoal text-sm">{meal.price}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 6. NUTRIFLEXS PASS SECTION */}
      <section id="pass" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <LandingPassSection />
      </section>

      {/* 7. FAQ ACCORDION */}
      <section id="faq" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="max-w-[800px] mx-auto flex flex-col items-center space-y-8 sm:space-y-10">
          <div className="text-center w-full">
            <Badge variant="gold" className="bg-nutri-green-light text-nutri-green border-nutri-green-soft text-xs uppercase font-bold tracking-wider mb-3 inline-flex items-center">
              FREQUENTLY ASKED
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-nutri-muted mt-2.5 max-w-lg mx-auto leading-relaxed">
              Everything you need to know about NutriFlexs kiosk ordering, pass plans, and macros.
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
    </div>
  );
}
