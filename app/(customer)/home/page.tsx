"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Flame,
  Target,
  ArrowRight,
  ChevronRight,
  Check,
  RotateCcw,
  Crown,
  Soup,
  Salad,
  GlassWater,
  Egg,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductModal } from "@/components/customer/product-modal";
import { useCart } from "@/components/customer/cart-context";

export default function CustomerHomePage() {
  const { addToCart } = useCart();
  const [selectedProductModal, setSelectedProductModal] = useState<any | null>(null);

  // Database-driven state
  const [userStats, setUserStats] = useState<{
    name: string;
    streakDays: number;
    proteinGoalGrams: number;
    todayConsumedProtein: number;
    recentOrders: any[];
  }>({
    name: "Ashu",
    streakDays: 12,
    proteinGoalGrams: 120,
    todayConsumedProtein: 60,
    recentOrders: [],
  });

  const [recommendedProduct, setRecommendedProduct] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        // Fetch real user stats, protein progress, and recent orders from PostgreSQL
        const resStats = await fetch("/api/user/stats");
        const dataStats = await resStats.json();
        if (dataStats.success) {
          setUserStats({
            name: dataStats.user.name,
            streakDays: dataStats.user.streakDays,
            proteinGoalGrams: dataStats.user.proteinGoalGrams,
            todayConsumedProtein: dataStats.user.todayConsumedProtein,
            recentOrders: dataStats.user.recentOrders || [],
          });
        }

        // Fetch real featured post-workout meal from Product table in PostgreSQL
        const resProds = await fetch("/api/products?isPopular=true");
        const dataProds = await resProds.json();
        if (dataProds.success && dataProds.products.length > 0) {
          const featured = dataProds.products.find((p: any) => p.isFeatured) || dataProds.products[0];
          setRecommendedProduct(featured);
        }

        // Fetch real categories from Category table in PostgreSQL
        const resCats = await fetch("/api/categories");
        const dataCats = await resCats.json();
        if (dataCats.success) {
          setCategories(dataCats.categories);
        }
      } catch (error) {
        console.error("Error loading homepage data from database", error);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, []);

  const handleOrderAgain = (product: any) => {
    if (product) {
      addToCart(product, 1);
    }
  };

  // Icon mapping helper for categories
  const getCategoryIcon = (slug: string) => {
    switch (slug.toLowerCase()) {
      case "bowls":
        return Soup;
      case "salads":
        return Salad;
      case "juices":
        return GlassWater;
      case "protein":
        return Egg;
      default:
        return Soup;
    }
  };

  const progressPercentage = Math.min(
    100,
    Math.round((userStats.todayConsumedProtein / userStats.proteinGoalGrams) * 100)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Top Greeting & Streak Section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Good morning, {userStats.name}! 👋
          </h1>
          <p className="text-xs sm:text-sm font-medium text-nutri-secondary mt-0.5">
            Fuel your body. Hit your goals.
          </p>
        </div>

        {/* Streak Compact Card */}
        <div className="bg-nutri-green text-white px-4 py-2.5 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm border border-nutri-green-deep">
          <div className="flex items-center gap-1 text-base font-extrabold leading-none">
            <Flame className="w-4 h-4 fill-white text-white" />
            <span>{userStats.streakDays}</span>
          </div>
          <span className="text-[10px] font-bold tracking-tight text-white/90 mt-0.5">
            Day Streak
          </span>
        </div>
      </div>

      {/* Main Grid: Responsive 2-column layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main Content Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Today's Goal Card */}
          <Card className="bg-white border-nutri-border p-4 sm:p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-nutri-green text-white flex items-center justify-center p-2 shadow-xs shrink-0">
                  <Target className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-nutri-secondary">Today&apos;s Goal</p>
                  <h3 className="text-base sm:text-lg font-extrabold font-heading text-nutri-charcoal leading-tight">
                    {userStats.proteinGoalGrams}g Protein
                  </h3>
                </div>
              </div>

              <Link
                href="/profile"
                className="text-xs font-bold text-nutri-charcoal hover:text-nutri-green flex items-center gap-0.5 transition-colors"
              >
                Edit Goal <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Progress Bar & Value */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <div className="w-full bg-nutri-green-light h-3 rounded-full overflow-hidden mr-3">
                  <div
                    className="bg-nutri-green h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <span className="font-extrabold text-nutri-green text-sm shrink-0 whitespace-nowrap">
                  {userStats.todayConsumedProtein}g / {userStats.proteinGoalGrams}g
                </span>
              </div>
            </div>
          </Card>

          {/* Featured Post-Workout Hero Card (Loaded from PostgreSQL Product table) */}
          {recommendedProduct && (
            <div className="relative rounded-3xl overflow-hidden bg-nutri-green-deep text-white p-6 sm:p-7 shadow-md border border-nutri-green-dark">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4E9F2F_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center relative z-10">
                {/* Text Info */}
                <div className="sm:col-span-7 space-y-3">
                  <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <Sparkles className="w-3 h-3 text-white fill-white" /> RECOMMENDED FOR YOU
                  </span>

                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight leading-tight">
                    {recommendedProduct.name}
                  </h2>

                  <p className="text-xs sm:text-sm text-nutri-green-light font-medium leading-relaxed max-w-xs line-clamp-2">
                    {recommendedProduct.description}
                  </p>

                  {/* 3 Circular Stat Outline Indicators */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/40 flex items-center justify-center font-extrabold text-xs text-white bg-white/10">
                        {recommendedProduct.protein}g
                      </div>
                      <span className="text-[10px] text-nutri-green-light font-medium mt-1">Protein</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/40 flex items-center justify-center font-extrabold text-xs text-white bg-white/10">
                        {recommendedProduct.calories}
                      </div>
                      <span className="text-[10px] text-nutri-green-light font-medium mt-1">Kcal</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/40 flex items-center justify-center font-extrabold text-xs text-white bg-white/10">
                        100%
                      </div>
                      <span className="text-[10px] text-nutri-green-light font-medium mt-1">Clean</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-3">
                    <button
                      onClick={() => setSelectedProductModal(recommendedProduct)}
                      className="bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full inline-flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      Order Now <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Food Photo with Floating Protein Badge */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
                  <div className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white/20">
                    <Image
                      src={recommendedProduct.imageUrl}
                      alt={recommendedProduct.name}
                      fill
                      className="object-cover"
                      priority
                    />
                  </div>

                  {/* Floating Protein Badge */}
                  <div className="absolute top-0 right-2 bg-white text-nutri-green rounded-full w-14 h-14 flex flex-col items-center justify-center shadow-lg border-2 border-nutri-green-light text-center p-1 leading-tight z-20">
                    <span className="font-extrabold text-xs">{recommendedProduct.protein}g</span>
                    <span className="text-[8px] font-bold tracking-tight text-nutri-secondary uppercase">PROTEIN</span>
                  </div>

                  {/* Pagination Dots */}
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-white" />
                    <span className="w-2 h-2 rounded-full bg-white/40" />
                    <span className="w-2 h-2 rounded-full bg-white/40" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Order Categories (Loaded from PostgreSQL Category table) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-nutri-charcoal font-heading text-lg">Quick Order</h3>
              <Link
                href="/menu"
                className="text-xs font-bold text-nutri-green hover:underline flex items-center gap-0.5"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {categories.map((cat) => {
                const IconComponent = getCategoryIcon(cat.slug);
                return (
                  <Link
                    key={cat.id}
                    href={`/menu?category=${cat.slug}`}
                    className="bg-nutri-green-soft border border-nutri-border hover:border-nutri-green p-3 rounded-2xl shadow-xs hover:shadow-md transition-all text-center flex flex-col items-center space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-white text-nutri-green flex items-center justify-center border border-nutri-border-light group-hover:scale-105 transition-transform shadow-xs">
                      <IconComponent className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <span className="font-bold text-xs text-nutri-charcoal group-hover:text-nutri-green transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Orders List (Loaded from PostgreSQL Order table) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-nutri-charcoal font-heading text-lg">
                Your Recent Orders
              </h3>
              <Link
                href="/orders"
                className="text-xs font-bold text-nutri-green hover:underline flex items-center gap-0.5"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {userStats.recentOrders.length === 0 ? (
                <Card className="bg-white border-nutri-border p-6 text-center text-xs text-nutri-secondary">
                  No orders placed yet. Select a item from Quick Order to fuel up!
                </Card>
              ) : (
                userStats.recentOrders.map((ord: any) => {
                  const firstItem = ord.items?.[0];
                  const product = firstItem?.product;

                  return (
                    <Card
                      key={ord.id}
                      className="bg-white border-nutri-border p-3.5 sm:p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-nutri-bg shrink-0 border border-nutri-border">
                          <Image
                            src={product?.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80"}
                            alt={product?.name || "Order Item"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-nutri-charcoal text-sm sm:text-base leading-snug">
                            {product?.name || `Order ${ord.orderNumber}`}
                          </h4>
                          <p className="text-xs font-medium text-nutri-secondary mt-0.5">
                            <span className="text-nutri-green font-bold">{ord.totalProtein || 0}g Protein</span> • {ord.totalCalories || 0} kcal
                          </p>
                          <p className="text-[11px] text-nutri-muted mt-0.5">
                            {new Date(ord.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-nutri-green bg-nutri-green-light border border-nutri-border px-2.5 py-0.5 rounded-full">
                          {ord.status.replace("_", " ")} <Check className="w-3 h-3 stroke-[3]" />
                        </span>

                        {product && (
                          <button
                            onClick={() => handleOrderAgain(product)}
                            className="bg-white border border-nutri-green text-nutri-green hover:bg-nutri-green hover:text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Order Again
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Column on Desktop */}
        <div className="lg:col-span-4 space-y-6">
          {/* NutriFlexs Pass Promo Banner Card */}
          <div className="bg-nutri-green-deep text-white rounded-3xl p-5 sm:p-6 shadow-md border border-nutri-green-dark relative overflow-hidden">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-white text-nutri-green flex items-center justify-center shadow-md shrink-0">
                <Crown className="w-6 h-6 stroke-[2.2] fill-nutri-green" />
              </div>
              <span className="bg-white/20 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-white/30">
                MONTHLY PASS
              </span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold font-heading text-white">NutriFlexs Pass</h3>
              <p className="text-xs font-bold text-nutri-green-light">Eat more. Save more.</p>
              <p className="text-xs text-nutri-green-light/90 leading-relaxed pt-1">
                Exclusive benefits & discounts with monthly pass. Save up to 25% on daily post-workout nutrition.
              </p>
            </div>

            <div className="pt-5">
              <Link href="/pass">
                <Button
                  size="md"
                  className="bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-xs px-5 py-2.5 rounded-full w-full justify-center shadow-sm"
                >
                  Explore Pass <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Macro Breakdown Widget */}
          <Card className="bg-white border-nutri-border-light p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-nutri-border-light pb-3">
              <h4 className="font-extrabold text-nutri-charcoal text-sm font-heading">Macro Balance Today</h4>
              <span className="text-xs font-bold text-nutri-green bg-nutri-green-light px-2.5 py-0.5 rounded-full">
                Optimal
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-nutri-charcoal">Protein</span>
                  <span className="text-nutri-green font-bold">{userStats.todayConsumedProtein}g / {userStats.proteinGoalGrams}g</span>
                </div>
                <div className="w-full bg-nutri-border-light h-2 rounded-full overflow-hidden">
                  <div className="bg-nutri-green h-full rounded-full" style={{ width: `${progressPercentage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-nutri-charcoal">Carbs</span>
                  <span className="text-nutri-muted">110g / 200g</span>
                </div>
                <div className="w-full bg-nutri-border-light h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "55%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-nutri-charcoal">Healthy Fats</span>
                  <span className="text-nutri-muted">28g / 50g</span>
                </div>
                <div className="w-full bg-nutri-border-light h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: "56%" }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Product Detail Modal */}
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
