"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  Lock,
  UserCheck,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductModal } from "@/components/customer/product-modal";
import { BmiRecommendations } from "@/components/customer/bmi-recommendations";
import { useCart } from "@/components/customer/cart-context";
import { useDietary } from "@/components/customer/dietary-context";

export default function CustomerHomePage() {
  const { addToCart } = useCart();
  const { isVegetarian } = useDietary();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [selectedProductModal, setSelectedProductModal] = useState<any | null>(null);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  // Database-driven state
  const [userStats, setUserStats] = useState<{
    name: string;
    streakDays: number;
    weightKg: number | null;
    proteinGoalGrams: number;
    todayConsumedProtein: number;
    hasWeight: boolean;
    isCustomGoal: boolean;
    recentOrders: any[];
  }>({
    name: "Guest",
    streakDays: 0,
    weightKg: null,
    proteinGoalGrams: 0,
    todayConsumedProtein: 0,
    hasWeight: false,
    isCustomGoal: false,
    recentOrders: [],
  });

  // Modal dialog states
  const [isAddWeightModalOpen, setIsAddWeightModalOpen] = useState(false);
  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [inputWeight, setInputWeight] = useState("");
  const [inputGoal, setInputGoal] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [recommendedProduct, setRecommendedProduct] = useState<any | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
        const prodUrl = `/api/products?isPopular=true${isVegetarian ? "&isVeg=true" : ""}`;
        const promises: Promise<any>[] = [
          fetch(prodUrl),
          fetch("/api/categories"),
        ];

        if (isAuthenticated) {
          promises.push(fetch(`/api/user/stats?timeZone=${encodeURIComponent(clientTimeZone)}`));
        }

        const responses = await Promise.all(promises);
        const [resProds, resCats, resStats] = responses;

        const dataProds = await resProds.json();
        const dataCats = await resCats.json();

        if (dataProds.success && dataProds.products.length > 0) {
          const featured = dataProds.products.find((p: any) => p.isFeatured) || dataProds.products[0];
          setRecommendedProduct(featured);
        } else if (dataProds.success && dataProds.products.length === 0) {
          setRecommendedProduct(null);
        }

        if (dataCats.success) {
          setCategories(dataCats.categories);
        }

        if (resStats) {
          const dataStats = await resStats.json();
          if (dataStats.success && dataStats.user) {
            const ng = dataStats.user.nutritionGoal;
            setUserStats({
              name: dataStats.user.name,
              streakDays: dataStats.user.streakDays,
              weightKg: dataStats.user.weightKg ?? null,
              proteinGoalGrams: dataStats.user.proteinGoalGrams ?? (ng?.proteinGoal || 0),
              todayConsumedProtein: dataStats.user.todayConsumedProtein ?? (ng?.completedProtein || 0),
              hasWeight: Boolean(ng?.hasWeight ?? (dataStats.user.weightKg && dataStats.user.weightKg > 0)),
              isCustomGoal: Boolean(ng?.isCustomGoal),
              recentOrders: dataStats.user.recentOrders || [],
            });
            if (dataStats.user.weightKg) {
              setInputWeight(String(dataStats.user.weightKg));
            }
            if (dataStats.user.proteinGoalGrams) {
              setInputGoal(String(dataStats.user.proteinGoalGrams));
            }
          }
        }
      } catch (error) {
        console.error("Error loading homepage data from database", error);
      } finally {
        setLoading(false);
      }
    }

    loadHomeData();
  }, [isAuthenticated, isVegetarian]);

  const handleOrderAgain = (product: any) => {
    if (!product) return;
    if (isVegetarian && !product.isVeg) {
      setReorderNotice(`"${product.name}" is non-vegetarian and cannot be added in Vegetarian Mode.`);
      setTimeout(() => setReorderNotice(null), 5000);
      return;
    }
    addToCart(product, 1);
  };

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const weightNum = parseFloat(inputWeight);
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
      setModalError("Please enter a valid positive weight in kg.");
      return;
    }

    try {
      setModalSubmitting(true);
      const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
      const res = await fetch("/api/user/nutrition-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_weight",
          weightKg: weightNum,
          timeZone: clientTimeZone,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUserStats((prev) => ({
          ...prev,
          weightKg: data.data.weightKg,
          proteinGoalGrams: data.data.proteinGoal,
          todayConsumedProtein: data.data.completedProtein,
          hasWeight: data.data.hasWeight,
          isCustomGoal: data.data.isCustomGoal,
        }));
        setIsAddWeightModalOpen(false);
      } else {
        setModalError(data.error || "Failed to save weight.");
      }
    } catch (err: any) {
      setModalError(err.message || "Failed to save weight.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const goalNum = parseInt(inputGoal, 10);
    if (isNaN(goalNum) || goalNum <= 0 || goalNum > 600) {
      setModalError("Please enter a valid positive daily protein target in grams.");
      return;
    }

    try {
      setModalSubmitting(true);
      const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
      const res = await fetch("/api/user/nutrition-goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_goal",
          customDailyProteinGoal: goalNum,
          timeZone: clientTimeZone,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setUserStats((prev) => ({
          ...prev,
          proteinGoalGrams: data.data.proteinGoal,
          todayConsumedProtein: data.data.completedProtein,
          isCustomGoal: data.data.isCustomGoal,
        }));
        setIsEditGoalModalOpen(false);
      } else {
        setModalError(data.error || "Failed to update protein goal.");
      }
    } catch (err: any) {
      setModalError(err.message || "Failed to update protein goal.");
    } finally {
      setModalSubmitting(false);
    }
  };

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

  const hasConfiguredGoal = userStats.hasWeight || userStats.isCustomGoal || userStats.proteinGoalGrams > 0;
  const progressPercentage = isAuthenticated && userStats.proteinGoalGrams > 0
    ? Math.min(100, Math.round((userStats.todayConsumedProtein / userStats.proteinGoalGrams) * 100))
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Top Greeting & Streak Section */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            {isAuthenticated ? `Good morning, ${userStats.name}! 👋` : "Good morning! 👋"}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-nutri-secondary mt-0.5">
            Fuel your body. Hit your goals.
          </p>
        </div>

        {/* Streak / Guest Badge */}
        {isAuthenticated ? (
          <div className="bg-nutri-green text-white px-4 py-2.5 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm border border-nutri-green-deep">
            <div className="flex items-center gap-1 text-base font-extrabold leading-none">
              <Flame className="w-4 h-4 fill-white text-white" />
              <span>{userStats.streakDays}</span>
            </div>
            <span className="text-[10px] font-bold tracking-tight text-white/90 mt-0.5">
              Day Streak
            </span>
          </div>
        ) : (
          <Link
            href="/login"
            className="bg-nutri-green-light text-nutri-green border border-nutri-border px-3.5 py-2 rounded-2xl flex items-center gap-1.5 shrink-0 hover:bg-nutri-green-soft transition-all"
          >
            <UserCheck className="w-4 h-4 stroke-[2.5]" />
            <span className="text-xs font-bold">Sign In</span>
          </Link>
        )}
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
                  <p className="text-xs font-semibold text-nutri-secondary">Today&apos;s Nutrition Goal</p>
                  <h3 className="text-base sm:text-lg font-extrabold font-heading text-nutri-charcoal leading-tight">
                    {isAuthenticated
                      ? (hasConfiguredGoal ? `${userStats.proteinGoalGrams}g Daily Protein Goal` : "Tell us your weight")
                      : "Optimal Post-Workout Nutrition"}
                  </h3>
                </div>
              </div>

              {isAuthenticated ? (
                hasConfiguredGoal ? (
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setInputGoal(String(userStats.proteinGoalGrams || 120));
                      setIsEditGoalModalOpen(true);
                    }}
                    className="text-xs font-bold text-nutri-charcoal hover:text-nutri-green flex items-center gap-0.5 transition-colors cursor-pointer"
                  >
                    Edit Goal <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setInputWeight(userStats.weightKg ? String(userStats.weightKg) : "");
                      setIsAddWeightModalOpen(true);
                    }}
                    className="text-xs font-extrabold text-nutri-green hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    Add Weight <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )
              ) : (
                <Link
                  href="/login"
                  className="text-xs font-extrabold text-nutri-green hover:underline flex items-center gap-0.5"
                >
                  Sign in to track <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Progress Bar or Guest CTA */}
            {isAuthenticated ? (
              hasConfiguredGoal ? (
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
                  {progressPercentage >= 100 && (
                    <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
                      <Check className="w-3.5 h-3.5" /> Goal reached for today! 🎉
                    </p>
                  )}
                </div>
              ) : (
                <div className="pt-2 text-xs text-nutri-secondary border-t border-nutri-border-light flex items-center justify-between">
                  <span>Add your weight to calculate your daily protein goal.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setModalError(null);
                      setInputWeight(userStats.weightKg ? String(userStats.weightKg) : "");
                      setIsAddWeightModalOpen(true);
                    }}
                    className="font-extrabold text-nutri-green hover:underline shrink-0 ml-2 flex items-center gap-1 cursor-pointer"
                  >
                    Add Weight →
                  </button>
                </div>
              )
            ) : (
              <div className="pt-2 text-xs text-nutri-secondary border-t border-nutri-border-light flex items-center justify-between">
                <span>Browse our organic menu & add refuel packs directly to your cart.</span>
                <Link href="/menu" className="font-extrabold text-nutri-green hover:underline shrink-0 ml-2">
                  Browse Menu →
                </Link>
              </div>
            )}
          </Card>

          {/* Featured Post-Workout Hero Card (Loaded from PostgreSQL Product table) */}
          {recommendedProduct && (
            <div className="relative rounded-3xl overflow-hidden bg-nutri-green-deep text-white p-6 sm:p-7 shadow-md border border-nutri-green-dark">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4E9F2F_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center relative z-10">
                {/* Text Info */}
                <div className="sm:col-span-7 space-y-3">
                  <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <Sparkles className="w-3 h-3 text-white fill-white" /> RECOMMENDED FUEL
                  </span>

                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight leading-tight">
                    {recommendedProduct.name}
                  </h2>

                  <p className="text-xs sm:text-sm text-nutri-green-light font-medium leading-relaxed max-w-xs line-clamp-2">
                    {recommendedProduct.description}
                  </p>

                  {/* 3 Circular Stat Indicators */}
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
                      View & Add to Cart <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Food Photo */}
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
                </div>
              </div>
            </div>
          )}

          {/* Find What Fits You / Personalized Recommendations Section */}
          <BmiRecommendations />

          {/* Quick Order Categories (Loaded from PostgreSQL Category table) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-nutri-charcoal font-heading text-lg">Quick Order</h3>
              <Link
                href="/menu"
                className="text-xs font-bold text-nutri-green hover:underline flex items-center gap-0.5"
              >
                View Full Menu <ChevronRight className="w-3.5 h-3.5" />
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

          {/* Recent Orders Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-nutri-charcoal font-heading text-lg">
                Your Recent Orders
              </h3>
              {isAuthenticated && (
                <Link
                  href="/orders"
                  className="text-xs font-bold text-nutri-green hover:underline flex items-center gap-0.5"
                >
                  View All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {reorderNotice && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold animate-fade-in">
                🥬 {reorderNotice}
              </div>
            )}

            {isAuthenticated ? (
              <div className="space-y-3">
                {userStats.recentOrders.length === 0 ? (
                  <Card className="bg-white border-nutri-border p-6 text-center text-xs text-nutri-secondary">
                    No orders placed yet. Select an item from Quick Order to fuel up!
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
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-nutri-green bg-nutri-green-light border border-nutri-border px-2.5 py-0.5 rounded-full">
                            {ord.status.replace("_", " ")} <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                          {product && (
                            <button
                              onClick={() => handleOrderAgain(product)}
                              className="bg-nutri-green-soft hover:bg-nutri-green hover:text-white text-nutri-green border border-nutri-border text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Order Again</span>
                            </button>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            ) : (
              <Card className="bg-white border-nutri-border p-6 rounded-2xl text-center space-y-3">
                <p className="text-xs font-bold text-nutri-charcoal">Sign in to view your order history & streak rewards</p>
                <p className="text-xs text-nutri-secondary">Track live 5-minute kiosk pickup status right outside your gym.</p>
                <Link href="/login">
                  <Button size="sm" className="bg-nutri-green text-white font-bold text-xs rounded-full">
                    Sign In to Account →
                  </Button>
                </Link>
              </Card>
            )}
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
                  className="bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-xs px-5 py-2.5 rounded-full w-full justify-center shadow-sm cursor-pointer"
                >
                  Explore Pass <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Macro Breakdown Widget */}
          <Card className="bg-white border-nutri-border-light p-5 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-nutri-border-light pb-3">
              <h4 className="font-extrabold text-nutri-charcoal text-sm font-heading">Macro Balance Guide</h4>
              <span className="text-xs font-bold text-nutri-green bg-nutri-green-light px-2.5 py-0.5 rounded-full">
                Transparent
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-nutri-charcoal">Clean Protein</span>
                  <span className="text-nutri-green font-bold">30g - 45g per bowl</span>
                </div>
                <div className="w-full bg-nutri-border-light h-2 rounded-full overflow-hidden">
                  <div className="bg-nutri-green h-full rounded-full" style={{ width: "80%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-nutri-charcoal">Complex Carbs</span>
                  <span className="text-nutri-secondary">Quinoa & Sweet Potato</span>
                </div>
                <div className="w-full bg-nutri-border-light h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: "60%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-nutri-charcoal">Cold-Pressed Juices</span>
                  <span className="text-nutri-secondary">0 Added Sugar</span>
                </div>
                <div className="w-full bg-nutri-border-light h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: "100%" }} />
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

      {/* Add Weight Modal Dialog */}
      {isAddWeightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-nutri-border space-y-4 relative">
            <button
              type="button"
              onClick={() => setIsAddWeightModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-nutri-secondary hover:text-nutri-charcoal rounded-full hover:bg-nutri-border-light transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center mb-3">
                <Target className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-extrabold font-heading text-nutri-charcoal">
                Tell us your weight
              </h3>
              <p className="text-xs text-nutri-secondary mt-1">
                We calculate your daily protein fitness target as <strong>1.6g per kg</strong> of body weight.
              </p>
            </div>

            <form onSubmit={handleSaveWeight} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-nutri-charcoal mb-1">
                  Weight (kg)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="300"
                    placeholder="e.g. 75"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-sm font-semibold text-nutri-charcoal bg-white"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-nutri-secondary">
                    kg
                  </span>
                </div>
                {inputWeight && !isNaN(parseFloat(inputWeight)) && parseFloat(inputWeight) > 0 && (
                  <p className="text-[11px] text-nutri-green font-semibold mt-1.5">
                    → Daily target: <strong>{Math.round(parseFloat(inputWeight) * 1.6)}g</strong> protein
                  </p>
                )}
              </div>

              {modalError && (
                <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {modalError}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex-1 bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs py-2.5 rounded-full cursor-pointer shadow-xs"
                >
                  {modalSubmitting ? "Saving..." : "Save Weight"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddWeightModalOpen(false)}
                  className="bg-white border-nutri-border text-nutri-secondary hover:text-nutri-charcoal text-xs py-2.5 rounded-full cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Goal Modal Dialog */}
      {isEditGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-nutri-border space-y-4 relative">
            <button
              type="button"
              onClick={() => setIsEditGoalModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-nutri-secondary hover:text-nutri-charcoal rounded-full hover:bg-nutri-border-light transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="w-10 h-10 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center mb-3">
                <Target className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-lg font-extrabold font-heading text-nutri-charcoal">
                Edit Daily Protein Goal
              </h3>
              <p className="text-xs text-nutri-secondary mt-1">
                Adjust your daily target. Your today&apos;s completed protein will stay intact.
              </p>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-nutri-charcoal mb-1">
                  Daily Protein Goal (grams)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="500"
                    placeholder="e.g. 120"
                    value={inputGoal}
                    onChange={(e) => setInputGoal(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-sm font-semibold text-nutri-charcoal bg-white"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-nutri-secondary">
                    g / day
                  </span>
                </div>
              </div>

              {modalError && (
                <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {modalError}
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex-1 bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs py-2.5 rounded-full cursor-pointer shadow-xs"
                >
                  {modalSubmitting ? "Saving..." : "Save Goal"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditGoalModalOpen(false)}
                  className="bg-white border-nutri-border text-nutri-secondary hover:text-nutri-charcoal text-xs py-2.5 rounded-full cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
