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
  Apple,
  UtensilsCrossed,
  Clock,
  Layers,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductModal } from "@/components/customer/product-modal";
import { BmiRecommendations } from "@/components/customer/bmi-recommendations";
import { useCart } from "@/components/customer/cart-context";
import { useDietary } from "@/components/customer/dietary-context";
import { getGuestDailyNutritionSummary } from "@/lib/guest-nutrition";

const DEFAULT_RECOMMENDED_PRODUCT = {
  id: "e22f04b0-a567-4261-9c90-6bfeedadb0fb",
  name: "ABC Stamina Rebuilder",
  slug: "abc-stamina-rebuilder",
  description: "Organic Apple, Beetroot, Carrot with Fresh Ginger & Lemon. Ideal for nitric oxide boost & stamina.",
  price: 160,
  calories: 145,
  protein: 1.8,
  carbs: 34,
  fats: 0.4,
  preparationTimeMinutes: 3,
  imageUrl: "/images/products/abc-stamina-rebuilder.webp",
  categoryId: "juices",
  isAvailable: true,
  isFeatured: true,
  isPopular: true,
  isVeg: true,
};

function resolveProductImage(url?: string | null): string {
  if (!url) return "/images/products/abc-stamina-rebuilder.webp";
  if (url.includes("1613478223719-2ab802602423")) {
    return "/images/products/abc-stamina-rebuilder.webp";
  }
  return url;
}

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

  // Daily Nutrition Tracker summary state
  const [nutritionSummary, setNutritionSummary] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    goalCalories: number;
    totalItems: number;
  }>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    goalCalories: 2000,
    totalItems: 0,
  });

  // Modal dialog states
  const [isAddWeightModalOpen, setIsAddWeightModalOpen] = useState(false);
  const [isEditGoalModalOpen, setIsEditGoalModalOpen] = useState(false);
  const [inputWeight, setInputWeight] = useState("");
  const [inputGoal, setInputGoal] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [recommendedProduct, setRecommendedProduct] = useState<any | null>(DEFAULT_RECOMMENDED_PRODUCT);
  const [recommendedImageLoaded, setRecommendedImageLoaded] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
        const prodUrl = `/api/products?isPopular=true${isVegetarian ? "&isVeg=true" : ""}`;

        // Fetch products immediately to update recommendations without blocking on user stats
        fetch(prodUrl)
          .then((r) => r.json())
          .then((dataProds) => {
            if (dataProds.success && dataProds.products?.length > 0) {
              const featured = dataProds.products.find((p: any) => p.isFeatured) || dataProds.products[0];
              setRecommendedProduct(featured);
            }
          })
          .catch((err) => console.error("Error refreshing recommended product:", err));

        const promises: Promise<any>[] = [
          fetch("/api/categories"),
        ];

        if (isAuthenticated) {
          promises.push(fetch(`/api/user/stats?timeZone=${encodeURIComponent(clientTimeZone)}&_t=${Date.now()}`, { cache: "no-store" }));
          promises.push(fetch(`/api/nutrition/diary?timeZone=${encodeURIComponent(clientTimeZone)}&_t=${Date.now()}`, { cache: "no-store" }));
        }

        const responses = await Promise.all(promises);
        const resCats = responses[0];
        const resStats = isAuthenticated ? responses[1] : null;
        const resDiary = isAuthenticated ? responses[2] : null;

        const dataCats = await resCats.json();
        if (dataCats.success) {
          setCategories(dataCats.categories);
        }

        let diaryTotals: any = null;
        let diaryGoals: any = null;

        // Daily Nutrition Diary Data (Single source of truth for daily intake)
        if (resDiary) {
          const dataDiary = await resDiary.json();
          if (dataDiary.success && dataDiary.diary) {
            diaryTotals = dataDiary.diary.totals;
            diaryGoals = dataDiary.diary.goals;
            const mealsRecord = dataDiary.diary.meals || {};
            const itemsCount = Object.values(mealsRecord).reduce(
              (acc: number, s: any) => acc + (s.items?.length || 0),
              0
            );
            setNutritionSummary({
              calories: Math.round(diaryTotals.calories || 0),
              protein: Math.round((diaryTotals.protein || 0) * 10) / 10,
              carbs: Math.round((diaryTotals.carbohydrates || 0) * 10) / 10,
              fat: Math.round((diaryTotals.fat || 0) * 10) / 10,
              goalCalories: diaryGoals?.dailyCalorieGoal || 2000,
              totalItems: itemsCount,
            });
          }
        } else if (!isAuthenticated && typeof window !== "undefined") {
          try {
            const todayKey = new Intl.DateTimeFormat("en-CA", {
              timeZone: clientTimeZone,
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date());
            const guestSummary = getGuestDailyNutritionSummary(todayKey);
            const t = guestSummary.totals;
            const guestMeals = guestSummary.meals || {};
            const guestItemsCount = Object.values(guestMeals).reduce(
              (acc: number, s: any) => acc + (s.items?.length || 0),
              0
            );
            const guestProtConsumed = Math.round((t.protein || 0) * 10) / 10;
            const guestProtGoal = guestSummary.goals?.proteinGoal || 0;

            setNutritionSummary({
              calories: Math.round(t.calories || 0),
              protein: guestProtConsumed,
              carbs: Math.round((t.carbohydrates || 0) * 10) / 10,
              fat: Math.round((t.fat || 0) * 10) / 10,
              goalCalories: guestSummary.goals?.dailyCalorieGoal || 2000,
              totalItems: guestItemsCount,
            });

            if (guestProtGoal > 0 || guestProtConsumed > 0) {
              setUserStats((prev) => ({
                ...prev,
                proteinGoalGrams: guestProtGoal,
                todayConsumedProtein: guestProtConsumed,
                hasWeight: false,
                isCustomGoal: Boolean(guestProtGoal > 0),
              }));
            }
          } catch {
            // Non-fatal guest read fallback
          }
        }

        if (resStats) {
          const dataStats = await resStats.json();
          if (dataStats.success && dataStats.user) {
            const ng = dataStats.user.nutritionGoal;
            const resolvedProtGoal = (diaryGoals?.proteinGoal !== null && diaryGoals?.proteinGoal !== undefined && diaryGoals.proteinGoal > 0)
              ? diaryGoals.proteinGoal
              : (dataStats.user.proteinGoalGrams ?? (ng?.proteinGoal || 0));

            const resolvedConsumedProt = (diaryTotals?.protein !== undefined)
              ? Math.round(diaryTotals.protein * 10) / 10
              : (dataStats.user.todayConsumedProtein ?? (ng?.completedProtein || 0));

            setUserStats({
              name: dataStats.user.name,
              streakDays: dataStats.user.streakDays,
              weightKg: dataStats.user.weightKg ?? null,
              proteinGoalGrams: resolvedProtGoal,
              todayConsumedProtein: resolvedConsumedProt,
              hasWeight: Boolean(ng?.hasWeight ?? (dataStats.user.weightKg && dataStats.user.weightKg > 0)),
              isCustomGoal: Boolean(ng?.isCustomGoal || (diaryGoals?.proteinGoal && diaryGoals.proteinGoal > 0)),
              recentOrders: dataStats.user.recentOrders || [],
            });
            if (dataStats.user.weightKg) {
              setInputWeight(String(dataStats.user.weightKg));
            }
            if (resolvedProtGoal) {
              setInputGoal(String(resolvedProtGoal));
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

    // Listen for custom cross-page sync event, focus, and storage changes
    const handleSync = () => {
      loadHomeData();
    };

    window.addEventListener("nutriflexs:nutrition-updated", handleSync);
    window.addEventListener("focus", handleSync);
    window.addEventListener("storage", handleSync);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleSync();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("nutriflexs:nutrition-updated", handleSync);
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("storage", handleSync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nutriflexs:nutrition-updated"));
        }
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
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nutriflexs:nutrition-updated"));
        }
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
      case "combos":
        return Layers;
      default:
        return Soup;
    }
  };

  const targetCategoryOrder = [
    { name: "Juices", slug: "juices", description: "Cold-Pressed Organic Juices" },
    { name: "Protein", slug: "protein", description: "Warm Bites & Clean Eggs" },
    { name: "Bowls", slug: "bowls", description: "Fresh Balanced Meal Bowls" },
    { name: "Combos", slug: "combos", description: "Post-Workout Fuel Combos" },
  ];

  const quickOrderCategories = targetCategoryOrder.map((target) => {
    const liveMatch = categories.find((c) => c.slug?.toLowerCase() === target.slug.toLowerCase());
    return {
      id: liveMatch?.id || target.slug,
      name: liveMatch?.name || target.name,
      slug: target.slug,
      description: liveMatch?.description || target.description,
    };
  });

  const hasConfiguredGoal = userStats.hasWeight || userStats.isCustomGoal || userStats.proteinGoalGrams > 0;
  const rawProgress = userStats.proteinGoalGrams > 0
    ? Math.round((userStats.todayConsumedProtein / userStats.proteinGoalGrams) * 10000) / 100
    : 0;
  const progressPercentage = Math.max(0, rawProgress);
  const progressBarWidth = Math.min(100, progressPercentage);
  const remainingProtein = Math.max(0, Math.round((userStats.proteinGoalGrams - userStats.todayConsumedProtein) * 10) / 10);

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

      {/* Top Three Matching Dashboard Cards: Goal | Food Diary | NutriFlexs Pass */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
        {/* Card 1 — Today's Nutrition Goal */}
        <div className="bg-nutri-green-deep text-white rounded-3xl p-5 sm:p-6 shadow-md border border-nutri-green-dark relative overflow-hidden flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-full bg-white text-nutri-green flex items-center justify-center shadow-md shrink-0">
                <Target className="w-6 h-6 stroke-[2.2]" />
              </div>
              <span className="bg-white/20 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-white/30 backdrop-blur-xs">
                DAILY GOAL
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold font-heading text-white tracking-tight">
                Today&apos;s Nutrition Goal
              </h3>
              <p className="text-xs font-bold text-nutri-green-light">
                {hasConfiguredGoal
                  ? `${userStats.proteinGoalGrams}g Daily Protein Goal`
                  : isAuthenticated
                    ? "Set Daily Target"
                    : "Optimal Daily Protein Target"}
              </p>
            </div>

            {/* Goal Progress Section */}
            {hasConfiguredGoal ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80 font-medium">Protein Intake</span>
                  <span className="font-extrabold text-white text-sm">
                    {userStats.todayConsumedProtein}g / {userStats.proteinGoalGrams}g
                  </span>
                </div>
                <div className="w-full bg-black/25 border border-white/10 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-300 h-full rounded-full transition-all duration-500 shadow-xs"
                    style={{ width: `${progressBarWidth}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-nutri-green-light/90 font-medium">
                  <span>
                    {progressPercentage >= 100
                      ? "🎉 Daily target reached for today!"
                      : `${remainingProtein}g remaining to hit goal`}
                  </span>
                  <span>{progressPercentage}%</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-nutri-green-light/90 leading-relaxed pt-1">
                {isAuthenticated
                  ? "Add your body weight or custom protein target to track daily post-workout nutrition."
                  : "Track post-workout protein goals calibrated to your workout routine and fitness target."}
              </p>
            )}
          </div>

          <div className="pt-5 mt-auto">
            {isAuthenticated ? (
              <Button
                size="md"
                type="button"
                onClick={() => {
                  setModalError(null);
                  if (hasConfiguredGoal) {
                    setInputGoal(String(userStats.proteinGoalGrams || 120));
                    setIsEditGoalModalOpen(true);
                  } else {
                    setInputWeight(userStats.weightKg ? String(userStats.weightKg) : "");
                    setIsAddWeightModalOpen(true);
                  }
                }}
                className="bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-xs px-5 py-2.5 rounded-full w-full justify-center shadow-sm cursor-pointer transition-colors"
              >
                {hasConfiguredGoal ? "Edit Goal" : "Set Your Goal"} <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
              </Button>
            ) : (
              <Link href="/nutrition" className="w-full block">
                <Button
                  size="md"
                  className="bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-xs px-5 py-2.5 rounded-full w-full justify-center shadow-sm cursor-pointer transition-colors"
                >
                  {hasConfiguredGoal ? "Edit Goal" : "Set Your Goal"} <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Card 2 — Daily Nutrition Tracker & Food Diary */}
        <div className="bg-nutri-green-deep text-white rounded-3xl p-5 sm:p-6 shadow-md border border-nutri-green-dark relative overflow-hidden flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-full bg-white text-nutri-green flex items-center justify-center shadow-md shrink-0">
                <UtensilsCrossed className="w-6 h-6 stroke-[2.2] text-nutri-green" />
              </div>
              <span className="bg-white/20 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-white/30 backdrop-blur-xs">
                FOOD DIARY
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold font-heading text-white tracking-tight">
                Daily Nutrition Tracker
              </h3>
              <p className="text-xs font-bold text-nutri-green-light">
                Track calories, protein and macros throughout your day.
              </p>
            </div>

            {/* Daily Calorie / Nutrition Summary */}
            {nutritionSummary.calories > 0 ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80 font-medium">Logged Today</span>
                  <span className="font-extrabold text-white text-sm">
                    {nutritionSummary.calories} kcal
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-nutri-green-light/95 pt-0.5">
                  <span className="font-semibold">P: <strong>{nutritionSummary.protein}g</strong></span>
                  <span>•</span>
                  <span className="font-semibold">C: <strong>{nutritionSummary.carbs}g</strong></span>
                  <span>•</span>
                  <span className="font-semibold">F: <strong>{nutritionSummary.fat}g</strong></span>
                </div>
                <p className="text-[11px] text-nutri-green-light/80">
                  {nutritionSummary.totalItems} food {nutritionSummary.totalItems === 1 ? "item" : "items"} logged today
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/80 font-medium">Today&apos;s Intake</span>
                  <span className="font-extrabold text-white text-sm">0 kcal</span>
                </div>
                <p className="text-xs text-nutri-green-light/90 leading-relaxed">
                  No meals logged yet today. Track breakfast, lunch, snacks, or kiosk orders.
                </p>
              </div>
            )}
          </div>

          <div className="pt-5 mt-auto">
            <Link href="/nutrition" className="w-full block">
              <Button
                size="md"
                className="bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-xs px-5 py-2.5 rounded-full w-full justify-center shadow-sm cursor-pointer transition-colors"
              >
                Open Food Diary <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Card 3 — NutriFlexs Pass */}
        <div className="bg-nutri-green-deep text-white rounded-3xl p-5 sm:p-6 shadow-md border border-nutri-green-dark relative overflow-hidden flex flex-col justify-between h-full hover:shadow-lg transition-shadow">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-full bg-white text-nutri-green flex items-center justify-center shadow-md shrink-0">
                <Crown className="w-6 h-6 stroke-[2.2] fill-nutri-green" />
              </div>
              <span className="bg-white/20 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-white/30 backdrop-blur-xs">
                MONTHLY PASS
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold font-heading text-white tracking-tight">
                NutriFlexs Pass
              </h3>
              <p className="text-xs font-bold text-nutri-green-light">
                Eat more. Save more.
              </p>
            </div>

            <p className="text-xs text-nutri-green-light/90 leading-relaxed pt-1">
              Exclusive benefits &amp; discounts with monthly pass. Save up to 25% on daily post-workout nutrition.
            </p>
          </div>

          <div className="pt-5 mt-auto">
            <Link href="/pass" className="w-full block">
              <Button
                size="md"
                className="bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-xs px-5 py-2.5 rounded-full w-full justify-center shadow-sm cursor-pointer transition-colors"
              >
                Explore Pass <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Section A — Featured Fuel and Quick Information (Balanced 65:35 Two-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Left Column (Approx 65% width: 8 of 12 columns on desktop) */}
        <div className="lg:col-span-8 flex flex-col">
          {recommendedProduct ? (
            <div className="relative rounded-3xl overflow-hidden bg-nutri-green-deep text-white p-6 sm:p-7 shadow-md border border-nutri-green-dark flex-1 flex flex-col justify-between">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#4E9F2F_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center relative z-10 my-auto">
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
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/40 flex items-center justify-center font-extrabold text-xs text-white bg-white/10 shadow-xs">
                        {recommendedProduct.protein}g
                      </div>
                      <span className="text-[10px] text-nutri-green-light font-medium mt-1">Protein</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/40 flex items-center justify-center font-extrabold text-xs text-white bg-white/10 shadow-xs">
                        {recommendedProduct.calories}
                      </div>
                      <span className="text-[10px] text-nutri-green-light font-medium mt-1">Kcal</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-white/40 flex items-center justify-center font-extrabold text-xs text-white bg-white/10 shadow-xs">
                        100%
                      </div>
                      <span className="text-[10px] text-nutri-green-light font-medium mt-1">Clean</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => setSelectedProductModal(recommendedProduct)}
                      className="bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-full inline-flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      View &amp; Add to Cart <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>

                {/* Food Photo */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
                  <div className="relative w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full overflow-hidden shadow-2xl border-4 border-white/20 bg-nutri-green-dark/60">
                    <Image
                      src={resolveProductImage(recommendedProduct.imageUrl)}
                      alt={recommendedProduct.name}
                      fill
                      sizes="(max-width: 640px) 160px, (max-width: 768px) 176px, 192px"
                      quality={80}
                      priority
                      className={`object-cover transition-opacity duration-300 ease-out ${
                        recommendedImageLoaded ? "opacity-100" : "opacity-0"
                      }`}
                      onLoad={() => setRecommendedImageLoaded(true)}
                    />
                  </div>

                  {/* Floating Protein Badge */}
                  <div className="absolute top-0 right-1 sm:right-2 bg-white text-nutri-green rounded-full w-13 h-13 sm:w-14 sm:h-14 flex flex-col items-center justify-center shadow-lg border-2 border-nutri-green-light text-center p-1 leading-tight z-20">
                    <span className="font-extrabold text-xs">{recommendedProduct.protein}g</span>
                    <span className="text-[8px] font-bold tracking-tight text-nutri-secondary uppercase">PROTEIN</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative rounded-3xl overflow-hidden bg-nutri-green-deep text-white p-6 sm:p-7 shadow-md border border-nutri-green-dark flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1 bg-white/20 border border-white/30 text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full backdrop-blur-xs">
                  <Sparkles className="w-3 h-3 text-white fill-white" /> FEATURED FUEL
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight leading-tight">
                  Fuel Your Body Clean
                </h2>
                <p className="text-xs sm:text-sm text-nutri-green-light font-medium leading-relaxed max-w-sm">
                  Discover dietitian-crafted post-workout bowls, fresh juices, and protein bites tailored to your routine.
                </p>
              </div>
              <div className="pt-4">
                <Link href="/menu">
                  <Button size="md" className="bg-white text-nutri-green hover:bg-nutri-green-light font-extrabold text-xs rounded-full">
                    Explore Menu <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Approx 35% width: 4 of 12 columns on desktop) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-5">
          {/* Card 1: Macro Balance Guide */}
          <Card className="bg-white border-nutri-border-light p-5 sm:p-6 rounded-3xl shadow-sm space-y-3.5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-nutri-border-light pb-3">
                <h4 className="font-extrabold text-nutri-charcoal text-sm sm:text-base font-heading">
                  Macro Balance Guide
                </h4>
                <span className="text-[11px] font-bold text-nutri-green bg-nutri-green-light px-2.5 py-0.5 rounded-full border border-nutri-green/20">
                  Transparent
                </span>
              </div>

              <div className="space-y-3 pt-3">
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
                    <span className="text-nutri-secondary">Quinoa &amp; Sweet Potato</span>
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
            </div>
          </Card>

          {/* Card 2: 5-Min Kiosk Pickup */}
          <Card className="bg-white border-nutri-border-light p-5 sm:p-6 rounded-3xl shadow-sm space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center font-bold shrink-0">
                  <Clock className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-extrabold text-nutri-charcoal text-sm sm:text-base font-heading">
                    5-Min Kiosk Pickup
                  </h4>
                  <p className="text-[11px] text-nutri-secondary">50–100m outside partner gyms</p>
                </div>
              </div>
              <p className="text-xs text-nutri-secondary leading-relaxed">
                Meals prepared freshly as you wrap up your workout. Track real-time status with zero wait time.
              </p>
            </div>
            <Link href="/gyms" className="block pt-1">
              <span className="text-xs font-bold text-nutri-green hover:underline flex items-center gap-1">
                Find Express Kiosks <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </Card>
        </div>
      </div>

      {/* Section B — Find What's Right For You (Full-Width BMI Recommendation Section) */}
      <BmiRecommendations />

      {/* Section C — Quick Order (Full-Width 4 Equal Category Cards in One Row) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-nutri-charcoal font-heading text-xl tracking-tight">
              Quick Order
            </h3>
            <p className="text-xs text-nutri-secondary mt-0.5">
              Select a category to fuel up with fresh, goal-calibrated nutrition.
            </p>
          </div>
          <Link
            href="/menu"
            className="text-xs font-bold text-nutri-green hover:underline flex items-center gap-0.5"
          >
            View Full Menu <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {quickOrderCategories.map((cat) => {
            const IconComponent = getCategoryIcon(cat.slug);
            return (
              <Link
                key={cat.id || cat.slug}
                href={`/menu?category=${cat.slug}`}
                className="bg-white border border-nutri-border hover:border-nutri-green p-5 rounded-3xl shadow-xs hover:shadow-md transition-all text-center flex flex-col items-center justify-center space-y-3 group min-h-[140px]"
              >
                <div className="w-13 h-13 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center border border-nutri-border-light group-hover:scale-105 group-hover:bg-nutri-green group-hover:text-white transition-all shadow-xs">
                  <IconComponent className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <span className="font-heading font-extrabold text-sm sm:text-base text-nutri-charcoal group-hover:text-nutri-green transition-colors block">
                    {cat.name}
                  </span>
                  <span className="text-[11px] text-nutri-secondary group-hover:text-nutri-charcoal transition-colors block mt-0.5">
                    {cat.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Section D — Recent Orders */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-nutri-charcoal font-heading text-xl tracking-tight">
              Your Recent Orders
            </h3>
            <p className="text-xs text-nutri-secondary mt-0.5">
              Quick reorder your favorite post-workout fuel.
            </p>
          </div>
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
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold animate-fade-in flex items-center gap-2">
            <span>🥬</span>
            <span>{reorderNotice}</span>
          </div>
        )}

        {isAuthenticated ? (
          <div className="space-y-3">
            {userStats.recentOrders.length === 0 ? (
              <Card className="bg-white border-nutri-border p-6 rounded-3xl text-center text-xs text-nutri-secondary">
                No orders placed yet. Select an item from Quick Order to fuel up!
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userStats.recentOrders.map((ord: any) => {
                  const firstItem = ord.items?.[0];
                  const product = firstItem?.product;

                  return (
                    <Card
                      key={ord.id}
                      className="bg-white border-nutri-border p-4 rounded-3xl shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-nutri-bg shrink-0 border border-nutri-border">
                          <Image
                            src={product?.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80"}
                            alt={product?.name || "Order Item"}
                            fill
                            sizes="56px"
                            quality={75}
                            loading="lazy"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-nutri-charcoal text-sm sm:text-base leading-snug truncate">
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
                })}
              </div>
            )}
          </div>
        ) : (
          <Card className="bg-white border-nutri-border p-6 rounded-3xl text-center space-y-3">
            <p className="text-xs font-bold text-nutri-charcoal">Sign in to view your order history &amp; streak rewards</p>
            <p className="text-xs text-nutri-secondary">Track live 5-minute kiosk pickup status right outside your gym.</p>
            <Link href="/login">
              <Button size="sm" className="bg-nutri-green text-white font-bold text-xs rounded-full">
                Sign In to Account →
              </Button>
            </Link>
          </Card>
        )}
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
