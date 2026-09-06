"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Zap, Clock, ShieldCheck, MapPin, Sparkles, ArrowRight, CheckCircle2, Flame, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MarketingLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
    <div className="space-y-20 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 lg:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge variant="gold" className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3.5 py-1">
              <Zap className="w-3.5 h-3.5 mr-1 fill-nutri-green" /> FAST · FRESH · TRANSPARENT · GYM-ADJACENT
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-heading text-nutri-charcoal tracking-tight leading-[1.1]">
              REAL FOOD.<br />
              <span className="text-nutri-green">REAL FUEL.</span>
            </h1>

            <p className="text-base sm:text-lg text-nutri-muted leading-relaxed max-w-xl">
              Fresh cold-pressed organic juices and freshly prepared high-protein meals delivered in <span className="font-bold text-nutri-charcoal">5 minutes</span> at express kiosks located right outside your gym.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/menu">
                <Button size="lg" variant="primary" className="font-bold text-base shadow-lg shadow-nutri-green/20">
                  EXPLORE MENU <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>

              <Link href="/home">
                <Button size="lg" variant="outline" className="font-bold text-base">
                  <MapPin className="w-4 h-4 mr-2 text-nutri-green" /> FIND YOUR GYM
                </Button>
              </Link>
            </div>

            {/* Micro Highlights */}
            <div className="pt-4 flex items-center gap-6 text-xs font-semibold text-nutri-muted border-t border-nutri-border">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-nutri-green" /> 5 Min Pickup
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-nutri-green" /> 100% Organic & Clean
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-nutri-green" /> Clear Macro Breakdown
              </span>
            </div>
          </div>

          {/* Hero Visual Image Showcase */}
          <div className="relative w-full h-[380px] sm:h-[480px] rounded-3xl overflow-hidden shadow-float border border-nutri-border bg-white">
            <Image
              src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1000&q=80"
              alt="NutriFlexs High Protein Fuel Bowl"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Overlay Card */}
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-nutri-charcoal text-sm font-heading">
                    Grilled Chicken & Quinoa Energy Bowl
                  </h4>
                  <p className="text-xs text-nutri-green font-semibold mt-0.5">
                    32g Protein · 430 Kcal · 100% Clean Ingredients
                  </p>
                </div>
                <Badge variant="gold" className="bg-nutri-green text-white border-none font-bold text-xs">
                  READY IN ~5 MIN
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. WHY NUTRIFLEXS (BUSINESS ADVANTAGES) */}
      <section id="why" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <Badge variant="protein" className="text-xs uppercase font-bold mb-2">FIVE MAJOR ADVANTAGES</Badge>
          <h2 className="text-3xl font-extrabold font-heading text-nutri-charcoal">
            Why NutriFlexs Works
          </h2>
          <p className="text-xs sm:text-sm text-nutri-muted mt-1">
            Built specifically for post-workout recovery right outside your gym door.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3 border-nutri-border">
            <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center font-bold text-xl">
              ⚡
            </div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">1. Immediate 5-Min Pickup</h3>
            <p className="text-xs text-nutri-muted leading-relaxed">
              Order right after your last workout set. Your food is freshly prepared and ready in 5 minutes as you walk out of the gym.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-nutri-border">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
              🌿
            </div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">2. 100% Fresh & Organic</h3>
            <p className="text-xs text-nutri-muted leading-relaxed">
              Cold-pressed juices extracted on site and hot organic eggs, paneer, chicken, and fish cooked fresh to order.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-nutri-border">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-xl">
              📊
            </div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">3. Transparent Macro Data</h3>
            <p className="text-xs text-nutri-muted leading-relaxed">
              Exact protein, calories, carbs, fats, and ingredients calculated for every single item on the menu.
            </p>
          </Card>
        </div>
      </section>

      {/* 3. HOW IT WORKS (5-STEP PROCESS) */}
      <section id="how" className="bg-white py-16 border-y border-nutri-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-xl mx-auto">
            <Badge variant="gold" className="text-xs uppercase font-bold mb-2">SIMPLE 5-STEP EXPERIENCE</Badge>
            <h2 className="text-3xl font-extrabold font-heading text-nutri-charcoal">
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {steps.map((s, idx) => (
              <Card key={idx} className="p-5 space-y-2 border-nutri-border bg-nutri-bg">
                <span className="text-2xl font-extrabold font-heading text-nutri-green block">{s.num}</span>
                <h4 className="font-bold text-nutri-charcoal text-xs uppercase tracking-wider">{s.title}</h4>
                <p className="text-xs text-nutri-muted leading-relaxed">{s.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FEATURED MEALS */}
      <section id="menu" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold font-heading text-nutri-charcoal">Popular Refuel Packs</h2>
            <p className="text-xs text-nutri-muted mt-1">High protein & cold-pressed organic juices</p>
          </div>

          <Link href="/menu">
            <Button variant="outline" size="sm" className="font-bold text-xs">
              VIEW FULL MENU →
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {featuredMeals.map((meal, idx) => (
            <Card key={idx} className="p-4 space-y-3 overflow-hidden border-nutri-border hover:shadow-float transition-all">
              <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-nutri-bg">
                <Image src={meal.img} alt={meal.name} fill className="object-cover" />
              </div>
              <h3 className="font-bold font-heading text-nutri-charcoal text-base">{meal.name}</h3>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-nutri-border-light">
                <span className="text-nutri-green font-bold">{meal.protein}</span>
                <span className="font-extrabold text-nutri-charcoal">{meal.price}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. FAQ ACCORDION */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold font-heading text-nutri-charcoal">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <Card key={idx} className="p-4 cursor-pointer border-nutri-border" onClick={() => setOpenFaq(openFaq === idx ? null : idx)}>
              <div className="flex items-center justify-between font-bold text-xs sm:text-sm text-nutri-charcoal">
                <span>{faq.q}</span>
                <span className="text-nutri-green text-lg">{openFaq === idx ? "−" : "+"}</span>
              </div>
              {openFaq === idx && (
                <p className="text-xs text-nutri-muted mt-2 pt-2 border-t border-nutri-border-light leading-relaxed">
                  {faq.a}
                </p>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
