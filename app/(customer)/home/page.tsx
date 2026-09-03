"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame, Zap, ArrowRight, RotateCcw, Sparkles, Check, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductModal } from "@/components/customer/product-modal";
import { useCart } from "@/components/customer/cart-context";

export default function CustomerHomePage() {
  const { addToCart } = useCart();
  const [selectedProductModal, setSelectedProductModal] = useState<any | null>(null);

  // Sample data-driven recommendation product
  const recommendedProduct = {
    id: "prod-rec-1",
    name: "Grilled Chicken & Quinoa Energy Bowl",
    description: "High-protein post-workout bowl with grilled chicken breast, organic quinoa, roasted veggies & avocado dressing.",
    price: 250,
    calories: 430,
    protein: 32.0,
    carbs: 44.0,
    fats: 12.0,
    preparationTimeMinutes: 4,
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    isVeg: false,
    ingredients: [
      { ingredient: { name: "Lean Chicken Breast" } },
      { ingredient: { name: "Organic Quinoa" } },
      { ingredient: { name: "Steamed Broccoli" } },
      { ingredient: { name: "Avocado Dressing" } },
    ]
  };

  const quickCategories = [
    { label: "Protein Bowls", icon: "🥗", href: "/menu?category=bowls" },
    { label: "Cold Juices", icon: "🧃", href: "/menu?category=juices" },
    { label: "Warm Bites", icon: "🍗", href: "/menu?category=protein" },
    { label: "Egg Packs", icon: "🥚", href: "/menu?category=protein" },
    { label: "Combos", icon: "⚡", href: "/menu?category=combos" },
  ];

  const recentOrders = [
    {
      id: "ro-1",
      name: "Paneer Power Skewers & Green Juice",
      protein: "29.5g",
      calories: "495",
      date: "Yesterday at 7:45 PM",
      price: 320,
      product: {
        id: "prod-paneer-1",
        name: "Herb-Grilled Organic Paneer Skewers",
        price: 180,
        protein: 27.0,
        calories: 410,
        imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&q=80",
      }
    },
    {
      id: "ro-2",
      name: "ABC Stamina Rebuilder Juice",
      protein: "1.8g",
      calories: "145",
      date: "2 days ago",
      price: 160,
      product: {
        id: "prod-abc-1",
        name: "ABC Stamina Rebuilder",
        price: 160,
        protein: 1.8,
        calories: 145,
        imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
      }
    }
  ];

  const handleOrderAgain = (product: any) => {
    addToCart(product, 1);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Header Greeting & Streak Card Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Good morning, Ashu! 👋
          </h1>
          <p className="text-sm font-medium text-nutri-muted mt-0.5">
            Fuel your body. Hit your goals.
          </p>
        </div>

        {/* Streak Badge Card */}
        <div className="inline-flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-nutri-border shadow-card shrink-0">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-lg font-bold">
            🔥
          </div>
          <div>
            <div className="text-base font-extrabold text-nutri-charcoal leading-none font-heading">
              12 Day
            </div>
            <div className="text-[11px] font-semibold text-nutri-muted uppercase tracking-wider mt-0.5">
              Workout Streak
            </div>
          </div>
        </div>
      </div>

      {/* 2. Today's Protein Goal Progress Bar */}
      <Card className="bg-white border-nutri-border p-5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-nutri-green-light text-nutri-green flex items-center justify-center">
              <Zap className="w-4 h-4 fill-nutri-green" />
            </div>
            <div>
              <h3 className="font-bold text-nutri-charcoal text-sm font-heading">Today&apos;s Protein Goal</h3>
              <p className="text-[11px] text-nutri-muted">Target: 120g Daily Post-Workout</p>
            </div>
          </div>
          <span className="text-sm font-extrabold text-nutri-green font-heading bg-nutri-green-light px-3 py-1 rounded-full border border-nutri-green-soft">
            60g / 120g
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full bg-nutri-border-light h-3 rounded-full overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-nutri-green to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: "50%" }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-nutri-muted mt-2">
          <span>50% Completed</span>
          <span className="text-nutri-green font-semibold">60g Remaining</span>
        </div>
      </Card>

      {/* 3. Post-Workout Recommendation Banner Card */}
      <div className="relative rounded-3xl overflow-hidden shadow-float bg-nutri-green text-white p-6 sm:p-8">
        <div className="relative z-10 max-w-md space-y-3">
          <Badge variant="gold" className="bg-amber-400 text-nutri-charcoal border-none font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-3 h-3 mr-1 fill-nutri-charcoal" /> RECOMMENDED FOR YOU
          </Badge>

          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white leading-tight">
            Post Workout Fuel
          </h2>

          <p className="text-xs sm:text-sm text-nutri-green-soft leading-relaxed">
            High protein meals to refuel and recover within 3–5 minutes after your Indiranagar Cult.fit workout.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="protein" className="bg-white/20 text-white border-white/30 text-xs">
              <Zap className="w-3 h-3 text-emerald-300 fill-emerald-300" /> 32g Protein
            </Badge>
            <Badge variant="calories" className="bg-black/30 text-orange-200 border-none text-xs">
              <Flame className="w-3 h-3 text-orange-300" /> 430 Kcal
            </Badge>
            <Badge variant="clean" className="bg-emerald-800/80 text-emerald-100 border-none text-xs">
              100% Clean
            </Badge>
          </div>

          <div className="pt-3">
            <Button
              onClick={() => setSelectedProductModal(recommendedProduct)}
              size="lg"
              className="bg-white text-nutri-green hover:bg-nutri-green-light font-bold text-sm shadow-md"
            >
              ORDER NOW <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* Background Image Accent */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 sm:opacity-40 pointer-events-none">
          <Image
            src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"
            alt="Recommended Meal"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-nutri-green via-nutri-green/60 to-transparent" />
        </div>
      </div>

      {/* 4. Quick Order Category Shortcuts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-nutri-charcoal font-heading text-lg">Quick Order</h3>
          <Link href="/menu" className="text-xs font-semibold text-nutri-green hover:underline flex items-center gap-0.5">
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {quickCategories.map((qc, idx) => (
            <Link
              key={idx}
              href={qc.href}
              className="flex items-center gap-2.5 bg-white border border-nutri-border px-4 py-3 rounded-2xl shadow-sm hover:border-nutri-green hover:shadow-card transition-all shrink-0 font-semibold text-xs text-nutri-charcoal"
            >
              <span className="text-lg">{qc.icon}</span>
              <span>{qc.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 5. NutriFlexs Pass Promo Banner */}
      <Card className="bg-gradient-to-r from-nutri-green-light to-emerald-50 border-nutri-green-soft p-5 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-[10px] font-bold text-nutri-green uppercase tracking-widest bg-white/80 px-2.5 py-0.5 rounded-full border border-nutri-green-soft">
              SUBSCRIPTION PASS
            </span>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal mt-1.5">
              NutriFlexs Pass
            </h3>
            <p className="text-xs text-nutri-muted mt-0.5 max-w-md">
              Eat more. Save more. Exclusive daily post-workout benefits & discounts with monthly pass.
            </p>
          </div>

          <Link href="/pass">
            <Button size="md" variant="primary" className="font-bold text-xs shrink-0">
              Explore Pass →
            </Button>
          </Link>
        </div>
      </Card>

      {/* 6. Recent Orders (Order Again Functional Module) */}
      <div>
        <h3 className="font-bold text-nutri-charcoal font-heading text-lg mb-3">
          Recent Orders
        </h3>

        <div className="space-y-3">
          {recentOrders.map((ro) => (
            <Card key={ro.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-nutri-bg shrink-0">
                  <Image
                    src={ro.product.imageUrl}
                    alt={ro.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-nutri-charcoal text-sm">{ro.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-nutri-muted mt-0.5">
                    <span className="text-nutri-green font-semibold">{ro.protein} Protein</span>
                    <span>·</span>
                    <span>{ro.calories} kcal</span>
                    <span>·</span>
                    <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Delivered
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => handleOrderAgain(ro.product)}
                variant="secondary"
                size="sm"
                className="font-bold text-xs rounded-full shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> ORDER AGAIN
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Detailed Product Modal */}
      {selectedProductModal && (
        <ProductModal
          product={selectedProductModal}
          onClose={() => setSelectedProductModal(null)}
          onAddToCart={(prod, qty) => addToCart(prod, qty)}
        />
      )}
    </div>
  );
}
