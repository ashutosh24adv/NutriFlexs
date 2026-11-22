"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Plus,
  Flame,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Sparkles,
  Utensils,
  Loader2,
  RotateCcw,
  Star,
  Clock,
  Layers,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { calculateItemNutrition, calculateVariantNutrition } from "@/services/nutrition.service";
import {
  addGuestLog,
  getGuestCustomFoods,
  getGuestRecentFoods,
  getGuestFavorites,
  toggleGuestFavorite,
  removeGuestFavorite,
  getGuestSavedMeals,
  saveGuestMeal,
  deleteGuestMeal,
  logGuestSavedMeal,
} from "@/lib/guest-nutrition";

export interface FoodVariantItem {
  id: string;
  foodItemId: string;
  name: string;
  variantType: "MORE_MAIN" | "BALANCED" | "GRAVY_ONLY" | "THICK" | "THIN";
  description?: string | null;
  caloriesPer100g: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  isDefault: boolean;
  servingConversions?: {
    g?: number;
    small_bowl?: number;
    medium_bowl?: number;
    large_bowl?: number;
    cup?: number;
    [key: string]: number | undefined;
  } | null;
  preparationMethod?: string | null;
  nutritionSource?: string | null;
  confidenceLevel?: string;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  caloriesPer100g: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  defaultServingSize: number;
  defaultServingUnit: string;
  servingWeightGrams?: number | null;
  isCustom?: boolean;
  productId?: string;
  isNutriFlexsProduct?: boolean;
  hasVariants?: boolean;
  variants?: FoodVariantItem[];
}

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFoodAdded: () => void;
  initialMealType: "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER";
  dateKey: string;
  onOpenCustomFood: () => void;
  isGuest?: boolean;
}

type TabType = "search" | "recents" | "favorites" | "savedMeals";

function formatHeaderDate(dateKey: string): string {
  try {
    const parts = dateKey.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
    }
    return dateKey;
  } catch {
    return dateKey;
  }
}

function formatMealLabel(mealType: string): string {
  switch (mealType) {
    case "BREAKFAST":
      return "Breakfast";
    case "LUNCH":
      return "Lunch";
    case "SNACKS":
      return "Evening Snacks";
    case "DINNER":
      return "Dinner";
    default:
      return mealType;
  }
}

export function FoodSearchModal({
  isOpen,
  onClose,
  onFoodAdded,
  initialMealType,
  dateKey,
  onOpenCustomFood,
  isGuest = false,
}: FoodSearchModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("search");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [categories, setCategories] = useState<string[]>([
    "All",
    "Miscellaneous Snacks",
    "NutriFlexs Menu",
    "Popular",
    "Dal and Legumes",
    "Grains",
    "Vegetables",
    "Chicken and Meat",
    "Dairy Products",
    "Beverages",
    "Fruits",
  ]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Selected food configuration state
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<FoodVariantItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>("serving");
  const [targetMealType, setTargetMealType] = useState<"BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER">(initialMealType);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Recents, Favorites, Saved Meals
  const [recentFoods, setRecentFoods] = useState<any[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(false);

  const [favoriteFoods, setFavoriteFoods] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set());

  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [loadingSavedMeals, setLoadingSavedMeals] = useState(false);

  // Saved Meal Creation Mode
  const [isCreatingMeal, setIsCreatingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState("");
  const [newMealDescription, setNewMealDescription] = useState("");
  const [newMealItems, setNewMealItems] = useState<any[]>([]);
  const [mealSearchQuery, setMealSearchQuery] = useState("");
  const [mealSearchResults, setMealSearchResults] = useState<FoodItem[]>([]);
  const [searchingMealFoods, setSearchingMealFoods] = useState(false);
  const [selectedMealFood, setSelectedMealFood] = useState<FoodItem | null>(null);
  const [mealItemQuantity, setMealItemQuantity] = useState<number>(1);
  const [mealItemUnit, setMealItemUnit] = useState<string>("serving");
  const [savingMeal, setSavingMeal] = useState(false);
  const [mealActionSuccess, setMealActionSuccess] = useState<string | null>(null);

  const handleRetry = () => {
    setRetryTrigger((prev) => prev + 1);
  };

  // Sync initial meal type when modal opens
  useEffect(() => {
    setTargetMealType(initialMealType);
    setSelectedFood(null);
    setDuplicateWarning(false);
    setIsCreatingMeal(false);
    setMealActionSuccess(null);
  }, [initialMealType, isOpen]);

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/nutrition/categories");
        const data = await res.json();
        if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
          const cats = [...data.categories];
          if (!cats.includes("Miscellaneous Snacks")) {
            cats.splice(1, 0, "Miscellaneous Snacks");
          }
          setCategories(cats);
        }
      } catch (err) {
        console.error("Failed to load food categories", err);
      }
    }
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Load favorites
  const loadFavorites = useCallback(async () => {
    if (isGuest) {
      const guestFavs = getGuestFavorites();
      setFavoriteFoods(guestFavs);
      setFavoriteNames(new Set(guestFavs.map((f) => f.foodNameSnapshot.trim().toLowerCase())));
      return;
    }

    setLoadingFavorites(true);
    try {
      const res = await fetch("/api/nutrition/favorites");
      const data = await res.json();
      if (data.success && Array.isArray(data.favorites)) {
        setFavoriteFoods(data.favorites);
        setFavoriteNames(new Set(data.favorites.map((f: any) => f.foodNameSnapshot.trim().toLowerCase())));
      }
    } catch (err) {
      console.error("Error loading favorites", err);
    } finally {
      setLoadingFavorites(false);
    }
  }, [isGuest]);

  // Load recent foods
  const loadRecents = useCallback(async () => {
    if (isGuest) {
      const guestRecents = getGuestRecentFoods();
      setRecentFoods(guestRecents);
      return;
    }

    setLoadingRecents(true);
    try {
      const res = await fetch("/api/nutrition/recent");
      const data = await res.json();
      if (data.success && Array.isArray(data.recents)) {
        setRecentFoods(data.recents);
      }
    } catch (err) {
      console.error("Error loading recents", err);
    } finally {
      setLoadingRecents(false);
    }
  }, [isGuest]);

  // Load saved meals
  const loadSavedMeals = useCallback(async () => {
    if (isGuest) {
      const guestMeals = getGuestSavedMeals();
      setSavedMeals(guestMeals);
      return;
    }

    setLoadingSavedMeals(true);
    try {
      const res = await fetch("/api/nutrition/saved-meals");
      const data = await res.json();
      if (data.success && Array.isArray(data.meals)) {
        setSavedMeals(data.meals);
      }
    } catch (err) {
      console.error("Error loading saved meals", err);
    } finally {
      setLoadingSavedMeals(false);
    }
  }, [isGuest]);

  useEffect(() => {
    if (isOpen) {
      loadFavorites();
      if (activeTab === "recents") loadRecents();
      if (activeTab === "savedMeals") loadSavedMeals();
    }
  }, [isOpen, activeTab, loadFavorites, loadRecents, loadSavedMeals]);

  // Search foods with debounce and cancellation
  useEffect(() => {
    if (!isOpen || activeTab !== "search") return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (selectedCategory && selectedCategory !== "All") params.set("category", selectedCategory);
        params.set("limit", "50");

        const res = await fetch(`/api/nutrition/foods?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (data.success) {
          let customGuestFoods: FoodItem[] = [];
          if (isGuest) {
            const guestCustom = getGuestCustomFoods();
            const q = searchQuery.trim().toLowerCase();
            const filteredGuest = guestCustom.filter((g) => {
              const matchQ =
                !q ||
                g.name.toLowerCase().includes(q) ||
                (g.category && g.category.toLowerCase().includes(q));
              const matchCat =
                !selectedCategory ||
                selectedCategory === "All" ||
                (g.category && g.category.toLowerCase() === selectedCategory.toLowerCase());
              return matchQ && matchCat;
            });
            customGuestFoods = filteredGuest.map((g) => ({
              id: g.id,
              name: g.name,
              description: g.description,
              category: g.category || "Custom foods",
              caloriesPer100g: g.caloriesPer100g,
              protein: g.protein,
              carbohydrates: g.carbohydrates,
              fat: g.fat,
              defaultServingSize: g.defaultServingSize,
              defaultServingUnit: g.defaultServingUnit,
              servingWeightGrams: g.servingWeightGrams,
              isCustom: true,
            }));
          }

          const combined = [
            ...customGuestFoods,
            ...(data.nutriflexsProducts || []),
            ...(data.foods || []),
          ];
          setFoods(combined);
          setError(null);
        } else {
          setError(data.error || "Unable to load foods from the database.");
          setFoods([]);
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Search error", err);
        setError("Failed to connect to food library. Please try again.");
        setFoods([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, selectedCategory, isOpen, activeTab, retryTrigger, isGuest]);

  // Food search helper for Saved Meal builder
  useEffect(() => {
    if (!isCreatingMeal || !mealSearchQuery.trim()) {
      setMealSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingMealFoods(true);
      try {
        const res = await fetch(`/api/nutrition/foods?q=${encodeURIComponent(mealSearchQuery.trim())}&limit=15`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.success) {
          const list = [...(data.nutriflexsProducts || []), ...(data.foods || [])];
          setMealSearchResults(list);
        }
      } catch {
        // Ignore aborted
      } finally {
        setSearchingMealFoods(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mealSearchQuery, isCreatingMeal]);

  // Toggle favorite
  const handleToggleFavorite = async (e: React.MouseEvent, food: any) => {
    e.stopPropagation();
    const foodName = food.name || food.foodNameSnapshot;
    const nameKey = foodName.trim().toLowerCase();

    if (isGuest) {
      const res = toggleGuestFavorite({
        name: foodName,
        foodItemId: food.productId ? null : food.id,
        productId: food.productId || null,
        category: food.category,
        caloriesPer100g: food.caloriesPer100g,
        protein: food.protein,
        carbohydrates: food.carbohydrates,
        fat: food.fat,
        defaultServingSize: food.defaultServingSize,
        defaultServingUnit: food.defaultServingUnit,
        servingWeightGrams: food.servingWeightGrams,
      });

      setFavoriteNames((prev) => {
        const next = new Set(prev);
        if (res.isFavorite) next.add(nameKey);
        else next.delete(nameKey);
        return next;
      });
      loadFavorites();
      return;
    }

    try {
      const res = await fetch("/api/nutrition/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodName,
          foodItemId: food.productId ? null : food.id,
          productId: food.productId || null,
          category: food.category,
          caloriesPer100g: food.caloriesPer100g,
          protein: food.protein,
          carbohydrates: food.carbohydrates,
          fat: food.fat,
          defaultServingSize: food.defaultServingSize,
          defaultServingUnit: food.defaultServingUnit,
          servingWeightGrams: food.servingWeightGrams,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFavoriteNames((prev) => {
          const next = new Set(prev);
          if (data.isFavorite) next.add(nameKey);
          else next.delete(nameKey);
          return next;
        });
        loadFavorites();
      }
    } catch (err) {
      console.error("Error toggling favorite", err);
    }
  };

  // Remove favorite
  const handleRemoveFavorite = async (favId: string) => {
    if (isGuest) {
      removeGuestFavorite(favId);
      loadFavorites();
      return;
    }
    try {
      await fetch(`/api/nutrition/favorites?id=${favId}`, { method: "DELETE" });
      loadFavorites();
    } catch (err) {
      console.error("Error removing favorite", err);
    }
  };

  // When a food item is clicked, initialize its serving inputs
  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    if (food.variants && food.variants.length > 0) {
      const defaultVar = food.variants.find((v) => v.isDefault) || food.variants[0];
      setSelectedVariant(defaultVar);
      setUnit("medium_bowl");
      setQuantity(1);
    } else {
      setSelectedVariant(null);
      const defUnit = food.defaultServingUnit || "g";
      setUnit(defUnit);
      setQuantity(food.defaultServingSize || (defUnit === "g" ? 100 : 1));
    }
    setDuplicateWarning(false);
  };

  // Select food from Recent or Favorite
  const handleSelectFromOtherTab = (item: any) => {
    const foodItem: FoodItem = {
      id: item.foodItemId || item.id,
      productId: item.productId || undefined,
      name: item.name || item.foodNameSnapshot,
      category: item.category || "General",
      caloriesPer100g: item.caloriesPer100g || item.calories,
      protein: item.protein || 0,
      carbohydrates: item.carbohydrates || 0,
      fat: item.fat || 0,
      defaultServingSize: item.lastQuantity || item.defaultServingSize || 1,
      defaultServingUnit: item.unit || item.defaultServingUnit || "serving",
      servingWeightGrams: item.servingWeightGrams || 100,
      isNutriFlexsProduct: Boolean(item.productId),
    };
    setSelectedFood(foodItem);
    if (item.foodVariant) {
      setSelectedVariant(item.foodVariant);
      setUnit(item.unit || "medium_bowl");
    } else {
      setSelectedVariant(null);
      setUnit(item.unit || item.defaultServingUnit || "serving");
    }
    setQuantity(item.lastQuantity || item.defaultServingSize || 1);
    setActiveTab("search");
  };

  // Live computed nutrition
  const computedNutrition = useMemo(() => {
    if (!selectedFood) return { calories: 0, protein: 0, carbohydrates: 0, fat: 0, grams: 0 };

    if (selectedFood.isNutriFlexsProduct) {
      const q = Math.max(0.1, quantity || 1);
      return {
        grams: q * 100,
        calories: Math.round(selectedFood.caloriesPer100g * q * 10) / 10,
        protein: Math.round(selectedFood.protein * q * 10) / 10,
        carbohydrates: Math.round(selectedFood.carbohydrates * q * 10) / 10,
        fat: Math.round(selectedFood.fat * q * 10) / 10,
      };
    }

    if (selectedVariant) {
      return calculateVariantNutrition(
        selectedVariant,
        Math.max(0.1, quantity || 1),
        unit,
        selectedFood.servingWeightGrams || 180
      );
    }

    return calculateItemNutrition(
      selectedFood,
      Math.max(0.1, quantity || 1),
      unit
    );
  }, [selectedFood, selectedVariant, quantity, unit]);

  // Unit options available for the selected food
  const unitOptions = useMemo(() => {
    if (!selectedFood) return ["serving", "g"];
    if (selectedFood.isNutriFlexsProduct) return ["serving", "portion"];

    if (selectedVariant) {
      return ["medium_bowl", "small_bowl", "large_bowl", "cup", "g"];
    }

    const def = selectedFood.defaultServingUnit || "g";
    const set = new Set<string>();
    set.add(def);
    set.add("g");
    set.add("serving");

    if (["bowl", "cup", "glass", "plate", "piece", "slice", "tbsp", "scoop", "packet", "pack"].includes(def.toLowerCase())) {
      set.add(def.toLowerCase());
    }

    if (selectedFood.category?.includes("Rice") || selectedFood.category?.includes("Dal") || selectedFood.category?.includes("Vegetable")) {
      set.add("bowl");
    }
    if (selectedFood.category?.includes("Dairy") || selectedFood.category?.includes("Beverage")) {
      set.add("glass");
      set.add("cup");
      set.add("ml");
    }
    if (selectedFood.category?.includes("Egg") || selectedFood.category?.includes("Roti")) {
      set.add("piece");
    }
    if (selectedFood.category?.toLowerCase().includes("snack")) {
      set.add("piece");
      set.add("packet");
      set.add("bowl");
    }

    return Array.from(set);
  }, [selectedFood, selectedVariant]);

  const getPortionLabel = (u: string) => {
    if (!selectedVariant) {
      if (u === "g") return "Grams (g)";
      if (u === "ml") return "Milliliters (ml)";
      if (u === "serving") return `Standard Serving (${selectedFood?.servingWeightGrams || 100}g)`;
      if (u === "packet" || u === "pack") return `Packet / Pack (${selectedFood?.servingWeightGrams || 35}g)`;
      if (u === "piece") return `Piece (${selectedFood?.servingWeightGrams || 50}g)`;
      if (u === "bowl") return `Bowl (${selectedFood?.servingWeightGrams || 150}g)`;
      if (u === "cup") return "Cup (~200g)";
      if (u === "glass") return "Glass (~250ml)";
      if (u === "plate") return "Plate";
      return u;
    }
    const conv = (selectedVariant.servingConversions as any) || {};
    if (u === "medium_bowl") return `Medium bowl (${conv.medium_bowl || 180}g) — Standard`;
    if (u === "small_bowl") return `Small bowl (${conv.small_bowl || 110}g)`;
    if (u === "large_bowl") return `Large bowl (${conv.large_bowl || 280}g)`;
    if (u === "cup") return `Cup (${conv.cup || 220}g)`;
    if (u === "g") return `Grams (exact weight in g)`;
    return u;
  };

  // Submit food log entry
  const handleAddLog = async () => {
    if (!selectedFood) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const displayName = selectedVariant ? selectedVariant.name : selectedFood.name;

      if (isGuest) {
        addGuestLog({
          name: displayName,
          variantName: selectedVariant?.name || null,
          mealType: targetMealType,
          quantity: Math.max(0.1, quantity),
          unit,
          gramsCalculated: computedNutrition.grams,
          dateKey,
          calories: computedNutrition.calories,
          protein: computedNutrition.protein,
          carbohydrates: computedNutrition.carbohydrates,
          fat: computedNutrition.fat,
          foodItemId: selectedFood.productId ? null : selectedFood.id,
          foodVariantId: selectedVariant?.id || null,
          productId: selectedFood.productId || null,
        });

        onFoodAdded();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nutriflexs:nutrition-updated"));
        }
        setSelectedFood(null);
        setSelectedVariant(null);
        onClose();
        return;
      }

      const payload: any = {
        foodName: displayName,
        variantName: selectedVariant?.name || null,
        mealType: targetMealType,
        quantity: Math.max(0.1, quantity),
        unit,
        dateKey,
        calories: computedNutrition.calories,
        protein: computedNutrition.protein,
        carbohydrates: computedNutrition.carbohydrates,
        fat: computedNutrition.fat,
      };

      if (selectedFood.productId) {
        payload.productId = selectedFood.productId;
      } else {
        payload.foodItemId = selectedFood.id;
        if (selectedVariant) {
          payload.foodVariantId = selectedVariant.id;
        }
      }

      const res = await fetch("/api/nutrition/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to log food");
      }

      if (data.possibleDuplicate && !duplicateWarning) {
        setDuplicateWarning(true);
      }

      onFoodAdded();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nutriflexs:nutrition-updated"));
      }
      setSelectedFood(null);
      setSelectedVariant(null);
      onClose();
    } catch (err: any) {
      console.error("Error logging food", err);
      setSubmitError(err.message || "Failed to log food entry");
    } finally {
      setSubmitting(false);
    }
  };

  // Log an entire saved meal into food diary
  const handleLogSavedMeal = async (mealId: string) => {
    setSubmitting(true);
    try {
      if (isGuest) {
        logGuestSavedMeal(mealId, targetMealType, dateKey);
        onFoodAdded();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nutriflexs:nutrition-updated"));
        }
        setMealActionSuccess("Saved meal successfully added to diary!");
        setTimeout(() => {
          onClose();
        }, 600);
        return;
      }

      const res = await fetch(`/api/nutrition/saved-meals/${mealId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealType: targetMealType, dateKey }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to log saved meal");
      }

      onFoodAdded();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nutriflexs:nutrition-updated"));
      }
      setMealActionSuccess(`Logged all ${data.loggedItemsCount} items into your diary!`);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      console.error("Error logging saved meal", err);
      setSubmitError(err.message || "Failed to log saved meal");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete saved meal
  const handleDeleteSavedMeal = async (mealId: string) => {
    if (!confirm("Are you sure you want to delete this saved meal?")) return;
    try {
      if (isGuest) {
        deleteGuestMeal(mealId);
        loadSavedMeals();
        return;
      }
      await fetch(`/api/nutrition/saved-meals/${mealId}`, { method: "DELETE" });
      loadSavedMeals();
    } catch (err) {
      console.error("Error deleting saved meal", err);
    }
  };

  // Add item to new saved meal
  const handleAddItemToSavedMeal = () => {
    if (!selectedMealFood) return;
    const computed = calculateItemNutrition(selectedMealFood, Math.max(0.1, mealItemQuantity), mealItemUnit);
    setNewMealItems((prev) => [
      ...prev,
      {
        id: `tmp_${Date.now()}_${Math.random()}`,
        foodName: selectedMealFood.name,
        foodItemId: selectedMealFood.productId ? null : selectedMealFood.id,
        productId: selectedMealFood.productId || null,
        quantity: Math.max(0.1, mealItemQuantity),
        unit: mealItemUnit,
        calories: computed.calories,
        protein: computed.protein,
        carbohydrates: computed.carbohydrates,
        fat: computed.fat,
        caloriesPer100g: selectedMealFood.caloriesPer100g,
        servingWeightGrams: selectedMealFood.servingWeightGrams || 100,
      },
    ]);
    setSelectedMealFood(null);
    setMealSearchQuery("");
  };

  // Save the custom meal recipe
  const handleSaveCustomMeal = async () => {
    if (!newMealName.trim()) {
      alert("Please enter a name for your meal.");
      return;
    }
    if (newMealItems.length === 0) {
      alert("Please add at least one food item to this meal.");
      return;
    }

    setSavingMeal(true);
    try {
      if (isGuest) {
        saveGuestMeal({
          name: newMealName,
          description: newMealDescription,
          items: newMealItems,
        });
        loadSavedMeals();
        setIsCreatingMeal(false);
        setNewMealName("");
        setNewMealDescription("");
        setNewMealItems([]);
        return;
      }

      const res = await fetch("/api/nutrition/saved-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMealName,
          description: newMealDescription,
          items: newMealItems,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to save meal");
      }

      loadSavedMeals();
      setIsCreatingMeal(false);
      setNewMealName("");
      setNewMealDescription("");
      setNewMealItems([]);
    } catch (err: any) {
      alert(err.message || "Failed to save meal");
    } finally {
      setSavingMeal(false);
    }
  };

  if (!isOpen) return null;

  const TABS: { id: TabType; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "search", label: "Search", icon: Search },
    { id: "recents", label: "Recents", icon: Clock },
    { id: "favorites", label: "Favourites", icon: Star, badge: favoriteFoods.length },
    { id: "savedMeals", label: "Saved Meals", icon: Layers, badge: savedMeals.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#E5E7E2] shadow-2xl w-full max-w-4xl xl:max-w-5xl max-h-[88vh] flex flex-col overflow-hidden animate-scale-up">
        {/* 1. Modal Header */}
        <div className="px-5 py-4 border-b border-[#E5E7E2] bg-[#F7FAF4]/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center shrink-0 border border-[#E5E7E2]">
              <Utensils className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-[#111111] text-base sm:text-lg leading-tight">
                Add Food to Diary
              </h3>
              <p className="text-xs text-[#4B5563] mt-0.5">
                {formatMealLabel(targetMealType)} · {formatHeaderDate(dateKey)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#4B5563] hover:text-[#111111] hover:bg-[#EAF4E3] transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Sub Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-5 py-2.5 border-b border-[#E5E7E2] bg-white overflow-x-auto scrollbar-none shrink-0">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsCreatingMeal(false);
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-[#2F7D16] text-white shadow-xs"
                    : "text-[#4B5563] hover:text-[#111111] hover:bg-[#EAF4E3]/60"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-[#4B5563]")} />
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold",
                      isActive ? "bg-white/25 text-white" : "bg-[#EAF4E3] text-[#2F7D16]"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Notifications */}
        {submitError && (
          <div className="mx-5 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {mealActionSuccess && (
          <div className="mx-5 mt-3 p-3 bg-[#EAF4E3] border border-[#2F7D16]/30 text-[#111111] text-xs rounded-2xl flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2F7D16]" />
            <span>{mealActionSuccess}</span>
          </div>
        )}

        {/* 3. Main Body Container */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* ========================================================================= */}
          {/* TAB 1: SEARCH FOODS (TWO-PANEL DESKTOP LAYOUT)                            */}
          {/* ========================================================================= */}
          {activeTab === "search" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7E2] overflow-hidden">
              {/* ----------------------------------------------------------------- */}
              {/* LEFT PANEL: Food Search and Results (~46-48% on desktop)          */}
              {/* ----------------------------------------------------------------- */}
              <div
                className={cn(
                  "lg:col-span-6 xl:col-span-5 flex flex-col min-h-0 p-4 sm:p-5 bg-white space-y-3 overflow-hidden",
                  selectedFood ? "hidden lg:flex" : "flex"
                )}
              >
                {/* Search Bar */}
                <div className="relative shrink-0">
                  <Search className="w-4 h-4 text-[#4B5563] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dal, roti, rice, chicken..."
                    className="w-full bg-[#F7FAF4] border border-[#E5E7E2] rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-[#111111] placeholder:text-[#4B5563]/60 focus:outline-none focus:border-[#2F7D16] focus:bg-white transition-all font-medium"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#111111] p-1 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 shrink-0">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[11px] font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap",
                          isSelected
                            ? "bg-[#2F7D16] text-white shadow-2xs"
                            : "bg-[#F3F7EE] text-[#4B5563] hover:text-[#2F7D16] hover:bg-[#EAF4E3] border border-[#E5E7E2]"
                        )}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Search Meta & Add Custom Food Action */}
                <div className="flex items-center justify-between text-[11px] font-bold text-[#4B5563] px-1 shrink-0">
                  <span>
                    {loading
                      ? "Searching food library..."
                      : error
                      ? "Search error"
                      : `${foods.length} matching foods`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCustomFood();
                    }}
                    className="text-[#2F7D16] hover:text-[#24630F] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Food
                  </button>
                </div>

                {/* Food Results List */}
                <div className="flex-1 overflow-y-auto divide-y divide-[#E5E7E2]/70 border border-[#E5E7E2] rounded-2xl bg-white pr-1">
                  {loading ? (
                    <div className="divide-y divide-[#E5E7E2]/60">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-3.5 space-y-2 animate-pulse bg-white">
                          <div className="flex items-center justify-between">
                            <div className="h-4 bg-slate-200/90 rounded-md w-2/5"></div>
                            <div className="h-4 bg-[#EAF4E3] rounded-md w-16"></div>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-md w-4/5"></div>
                          <div className="flex items-center gap-3 pt-1">
                            <div className="h-3 bg-emerald-100/60 rounded-md w-24"></div>
                            <div className="h-3 bg-slate-100 rounded-md w-32"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="p-6 text-center bg-rose-50/40 rounded-xl m-3 space-y-2.5 border border-rose-200">
                      <AlertCircle className="w-6 h-6 text-rose-500 mx-auto" />
                      <p className="font-bold text-xs text-[#111111]">{error}</p>
                      <p className="text-[11px] text-[#4B5563]">
                        Unable to reach the food library right now. Please check your connection and try again.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRetry}
                        className="text-xs font-bold border-[#2F7D16] text-[#2F7D16] hover:bg-[#EAF4E3] rounded-full"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry Search
                      </Button>
                    </div>
                  ) : foods.length === 0 ? (
                    <div className="p-8 text-center bg-[#F7FAF4] rounded-2xl m-3 space-y-3 border border-[#E5E7E2]">
                      <div className="w-12 h-12 rounded-full bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center mx-auto">
                        <Utensils className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#111111]">No matching foods found</p>
                        <p className="text-xs text-[#4B5563] mt-1 max-w-xs mx-auto">
                          {searchQuery
                            ? `We couldn't find any foods matching "${searchQuery}". You can create a custom food item with your verified nutrition facts.`
                            : "No foods found in this category. You can add a custom food item."}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onClose();
                          onOpenCustomFood();
                        }}
                        className="text-xs font-bold border-[#2F7D16] text-[#2F7D16] hover:bg-[#EAF4E3] rounded-full"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> + Add Custom Food
                      </Button>
                    </div>
                  ) : (
                    <>
                      {!searchQuery.trim() && (
                        <div className="px-3.5 py-2 bg-[#F7FAF4] border-b border-[#E5E7E2] flex items-center justify-between text-xs text-[#4B5563]">
                          <span className="font-bold text-[#111111] flex items-center gap-1.5 text-[11px]">
                            <Sparkles className="w-3 h-3 text-[#2F7D16]" /> Popular Indian Foods & Staples
                          </span>
                          <span className="text-[10px] text-[#4B5563]">Scroll or search above</span>
                        </div>
                      )}
                      {foods.map((food) => {
                        const isSelected = selectedFood?.id === food.id;
                        const isFav = favoriteNames.has(food.name.trim().toLowerCase());
                        return (
                          <div
                            key={food.id}
                            data-food-row="true"
                            data-food-id={food.id}
                            onClick={() => handleSelectFood(food)}
                            className={cn(
                              "p-3.5 sm:p-4 flex items-start justify-between gap-3 transition-colors cursor-pointer text-left border-b border-[#E5E7E2]/70",
                              isSelected
                                ? "bg-[#EAF4E3] border-l-4 border-l-[#2F7D16]"
                                : "hover:bg-[#F9FAF7] bg-white"
                            )}
                          >
                            {/* Favorite Star Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(e, food)}
                              className="p-1 mt-0.5 text-slate-300 hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
                              title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                            >
                              <Star
                                className={cn(
                                  "w-4 h-4",
                                  isFav ? "fill-amber-400 text-amber-500" : "stroke-[1.8]"
                                )}
                              />
                            </button>

                            <div className="min-w-0 flex-1 space-y-1">
                              {/* 1. Food Name & Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-heading font-extrabold text-xs sm:text-sm text-[#111111] leading-tight">
                                  {food.name}
                                </span>
                                {food.isNutriFlexsProduct && (
                                  <span className="text-[9px] font-extrabold bg-[#2F7D16] text-white px-1.5 py-0.2 rounded-full">
                                    Kiosk
                                  </span>
                                )}
                                {food.isCustom && (
                                  <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full">
                                    Custom
                                  </span>
                                )}
                                {food.hasVariants && food.variants && food.variants.length > 0 && (
                                  <span className="text-[9px] font-bold bg-[#EAF4E3] text-[#2F7D16] px-1.5 py-0.2 rounded-full border border-[#2F7D16]/20 flex items-center gap-0.5">
                                    <Sparkles className="w-2.5 h-2.5" /> {food.variants.length} Variants
                                  </span>
                                )}
                              </div>

                              {/* 2. Short Description */}
                              {food.description && (
                                <p className="text-xs text-[#4B5563] line-clamp-1 leading-relaxed">
                                  {food.description}
                                </p>
                              )}

                              {/* 3. Calories per 100g and Serving */}
                              <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                                <span className="font-bold text-[#2F7D16]">
                                  {food.hasVariants && food.variants?.length ? "~" : ""}
                                  {food.caloriesPer100g} kcal / 100g
                                </span>
                                <span className="text-[#4B5563]/40">·</span>
                                <span className="text-[#4B5563] font-medium text-[11px]">
                                  Serving: {food.defaultServingSize} {food.defaultServingUnit}
                                  {food.servingWeightGrams ? ` (${Math.round(food.servingWeightGrams * food.defaultServingSize)}g)` : ""}
                                </span>
                              </div>

                              {/* 4. Key Macronutrients */}
                              <div className="text-[11px] font-medium text-[#4B5563] flex items-center gap-1.5 pt-0.5">
                                <span className="text-[#111111] font-semibold">Protein {food.protein}g</span>
                                <span>·</span>
                                <span>Carbs {food.carbohydrates}g</span>
                                <span>·</span>
                                <span>Fat {food.fat}g</span>
                              </div>
                            </div>

                            {/* Selection / Action Indicator */}
                            <div className="shrink-0 flex items-center self-center pl-1">
                              {isSelected ? (
                                <div className="w-6 h-6 rounded-full bg-[#2F7D16] text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <ChevronRight className="w-4 h-4 text-[#4B5563]/50" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* RIGHT PANEL: Selected Food and Quantity Editor (~52-54% on desktop)*/}
              {/* ----------------------------------------------------------------- */}
              <div
                className={cn(
                  "lg:col-span-6 xl:col-span-7 flex flex-col min-h-0 p-4 sm:p-5 overflow-y-auto bg-[#F7FAF4]/40",
                  selectedFood ? "flex" : "hidden lg:flex"
                )}
              >
                {selectedFood ? (
                  <div className="space-y-4 animate-fade-in flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Mobile Back Button to return to results list */}
                      <button
                        type="button"
                        onClick={() => setSelectedFood(null)}
                        className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-[#2F7D16] hover:underline cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Back to food search results
                      </button>

                      {/* Header of Selected Food */}
                      <div className="p-3.5 bg-white border border-[#E5E7E2] rounded-2xl flex items-start justify-between gap-3 shadow-2xs">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-heading font-extrabold text-sm sm:text-base text-[#111111]">
                              {selectedFood.name}
                            </h4>
                            {selectedFood.isNutriFlexsProduct && (
                              <Badge className="bg-[#2F7D16] text-white text-[10px] font-bold">
                                NutriFlexs Kiosk
                              </Badge>
                            )}
                            {selectedFood.isCustom && (
                              <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Custom Food
                              </Badge>
                            )}
                            {selectedFood.hasVariants && (
                              <Badge className="bg-[#EAF4E3] text-[#2F7D16] border-[#E5E7E2] text-[10px] font-bold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-[#2F7D16]" /> Smart Variants
                              </Badge>
                            )}
                          </div>
                          {selectedFood.description && (
                            <p className="text-xs text-[#4B5563] mt-1 line-clamp-2 leading-relaxed">
                              {selectedFood.description}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFood(null);
                            setSelectedVariant(null);
                          }}
                          className="text-xs font-bold text-[#2F7D16] hover:text-[#24630F] hover:underline shrink-0 p-1 cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      {/* Dish Composition / Variant Selector */}
                      {selectedFood.variants && selectedFood.variants.length > 0 && (
                        <div className="p-3.5 bg-white border border-[#E5E7E2] rounded-2xl space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
                              Dish Composition / Ratio
                            </label>
                            <span className="text-[10px] text-[#4B5563] italic">
                              Tap to select what you ate
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {selectedFood.variants.map((v) => {
                              const isCurrent = selectedVariant?.id === v.id;
                              let icon = "⚖️";
                              let shortLabel = "Balanced";
                              if (v.variantType === "MORE_MAIN") {
                                icon = "🥘";
                                shortLabel = "More Main";
                              } else if (v.variantType === "GRAVY_ONLY") {
                                icon = "🥣";
                                shortLabel = "More Gravy";
                              } else if (v.variantType === "THICK") {
                                icon = "🍲";
                                shortLabel = "Thick";
                              } else if (v.variantType === "THIN") {
                                icon = "🥣";
                                shortLabel = "Thin";
                              }

                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => setSelectedVariant(v)}
                                  className={cn(
                                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                                    isCurrent
                                      ? "bg-[#2F7D16] text-white border-[#2F7D16] shadow-2xs"
                                      : "bg-[#F7FAF4] text-[#111111] border-[#E5E7E2] hover:border-[#2F7D16]/60 hover:bg-[#EAF4E3]/40"
                                  )}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className="text-base">{icon}</span>
                                    {v.isDefault && (
                                      <span
                                        className={cn(
                                          "text-[9px] px-1 py-0.2 rounded font-bold",
                                          isCurrent
                                            ? "bg-white/20 text-white"
                                            : "bg-[#EAF4E3] text-[#2F7D16]"
                                        )}
                                      >
                                        Standard
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1">
                                    <p className="font-extrabold text-xs leading-tight">
                                      {v.name.includes("–") ? v.name.split("–")[1]?.trim() : shortLabel}
                                    </p>
                                    <p
                                      className={cn(
                                        "text-[10px] mt-0.5 font-medium",
                                        isCurrent ? "text-white/80" : "text-[#4B5563]"
                                      )}
                                    >
                                      {v.caloriesPer100g} kcal/100g
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Serving & Quantity Selectors */}
                      <div className="p-3.5 bg-white border border-[#E5E7E2] rounded-2xl space-y-3 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Quantity */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
                                Quantity
                              </label>
                              {selectedVariant && unit !== "g" && (
                                <div className="flex items-center gap-1">
                                  {[0.5, 1, 1.5, 2].map((step) => (
                                    <button
                                      key={step}
                                      type="button"
                                      onClick={() => setQuantity(step)}
                                      className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors",
                                        quantity === step
                                          ? "bg-[#2F7D16] text-white"
                                          : "bg-[#F3F7EE] text-[#4B5563] hover:text-[#111111] border border-[#E5E7E2]"
                                      )}
                                    >
                                      {step}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <input
                              type="number"
                              step={unit === "g" ? "10" : "0.5"}
                              min="0.1"
                              max="5000"
                              value={quantity}
                              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                              placeholder={unit === "g" ? "e.g. 180" : "1"}
                              className="w-full bg-[#F7FAF4] border border-[#E5E7E2] rounded-xl px-3 py-2 text-sm font-bold text-[#111111] focus:outline-none focus:border-[#2F7D16] focus:bg-white"
                            />
                          </div>

                          {/* Serving Unit */}
                          <div>
                            <label className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block mb-1">
                              Serving Unit
                            </label>
                            <select
                              value={unit}
                              onChange={(e) => {
                                const nextUnit = e.target.value;
                                setUnit(nextUnit);
                                if (nextUnit === "g" && (quantity === 1 || quantity === 0.5 || quantity === 1.5 || quantity === 2)) {
                                  const conv = (selectedVariant?.servingConversions as any) || {};
                                  setQuantity(conv.medium_bowl || 180);
                                } else if (nextUnit !== "g" && quantity > 10) {
                                  setQuantity(1);
                                }
                              }}
                              className="w-full bg-[#F7FAF4] border border-[#E5E7E2] rounded-xl px-3 py-2 text-sm font-bold text-[#111111] focus:outline-none focus:border-[#2F7D16] focus:bg-white capitalize cursor-pointer"
                            >
                              {unitOptions.map((u) => (
                                <option key={u} value={u}>
                                  {getPortionLabel(u)}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Meal Category */}
                          <div>
                            <label className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block mb-1">
                              Meal Category
                            </label>
                            <select
                              value={targetMealType}
                              onChange={(e) => setTargetMealType(e.target.value as any)}
                              className="w-full bg-[#F7FAF4] border border-[#E5E7E2] rounded-xl px-3 py-2 text-sm font-bold text-[#111111] focus:outline-none focus:border-[#2F7D16] focus:bg-white cursor-pointer"
                            >
                              <option value="BREAKFAST">🌅 Breakfast</option>
                              <option value="LUNCH">☀️ Lunch</option>
                              <option value="SNACKS">☕ Evening Snacks</option>
                              <option value="DINNER">🌙 Dinner</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Nutrition Summary Box */}
                      <div className="p-4 bg-[#EAF4E3] border border-[#2F7D16]/30 rounded-2xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[#2F7D16] font-heading font-extrabold text-lg sm:text-xl">
                            <Flame className="w-5 h-5 fill-[#2F7D16]" />
                            <span data-live-calories="true">{computedNutrition.calories} kcal</span>
                          </div>
                          {computedNutrition.grams > 0 && (
                            <span className="text-[11px] font-bold text-[#2F7D16] bg-white px-2 py-0.5 rounded-full border border-[#E5E7E2]">
                              ~{computedNutrition.grams}g portion
                            </span>
                          )}
                        </div>

                        {/* Clean Horizontal Macro Indicators */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#2F7D16]/20 text-xs font-semibold text-[#111111]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#4B5563]">Protein:</span>
                            <span className="font-bold text-[#2F7D16]">{computedNutrition.protein}g</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#4B5563]">Carbs:</span>
                            <span className="font-bold text-[#111111]">{computedNutrition.carbohydrates}g</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#4B5563]">Fat:</span>
                            <span className="font-bold text-[#111111]">{computedNutrition.fat}g</span>
                          </div>
                        </div>
                      </div>

                      {duplicateWarning && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>Note: This food was already logged today. Click Add again to confirm.</span>
                        </div>
                      )}
                    </div>

                    {/* Prominent Full-Width Add CTA */}
                    <div className="pt-4 border-t border-[#E5E7E2]">
                      <Button
                        variant="primary"
                        onClick={handleAddLog}
                        disabled={submitting || quantity <= 0}
                        className="w-full bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-sm py-3 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Adding to Diary...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 stroke-[2.5]" /> Add to Diary · {computedNutrition.calories} kcal
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Empty state placeholder when no food is selected */
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 min-h-[320px]">
                    <div className="w-16 h-16 rounded-full bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center shadow-xs border border-[#E5E7E2]">
                      <Utensils className="w-8 h-8 stroke-[2]" />
                    </div>
                    <div className="max-w-xs space-y-1">
                      <h4 className="font-heading font-extrabold text-[#111111] text-base">
                        Select a food to view its nutrition
                      </h4>
                      <p className="text-xs text-[#4B5563] leading-relaxed">
                        Click any food from the search results on the left to configure portions and add it to your daily diary.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: RECENT FOODS                                                       */}
          {/* ========================================================================= */}
          {activeTab === "recents" && (
            <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3">
              <div>
                <h4 className="font-heading font-bold text-sm text-[#111111]">
                  Recently Logged Foods
                </h4>
                <p className="text-xs text-[#4B5563]">
                  Quickly re-add foods based on your actual logging history.
                </p>
              </div>

              {loadingRecents ? (
                <div className="py-16 flex flex-col items-center justify-center text-[#4B5563] text-xs space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2F7D16]" />
                  <span>Loading recent foods...</span>
                </div>
              ) : recentFoods.length === 0 ? (
                <div className="p-8 text-center bg-[#F7FAF4] rounded-2xl border border-[#E5E7E2] space-y-2 max-w-md mx-auto my-6">
                  <Clock className="w-8 h-8 text-[#4B5563]/50 mx-auto" />
                  <p className="font-bold text-sm text-[#111111]">No recently logged foods</p>
                  <p className="text-xs text-[#4B5563]">
                    Foods you log into your diary will appear here for fast 1-click refuel.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7E2] border border-[#E5E7E2] rounded-2xl overflow-hidden bg-white max-h-96 overflow-y-auto">
                  {recentFoods.map((item) => {
                    const isFav = favoriteNames.has(item.name.trim().toLowerCase());
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F3F7EE] transition-colors"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, item)}
                          className="p-1 text-slate-300 hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              isFav ? "fill-amber-400 text-amber-500" : "stroke-[1.8]"
                            )}
                          />
                        </button>

                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-xs sm:text-sm text-[#111111] truncate">
                            {item.name}
                          </h5>
                          <p className="text-[11px] text-[#4B5563]">
                            Last logged: {item.lastQuantity} {item.unit} • {item.calories} kcal • P: {item.protein}g
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleSelectFromOtherTab(item)}
                          className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Log Again
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: FAVOURITE FOODS                                                    */}
          {/* ========================================================================= */}
          {activeTab === "favorites" && (
            <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3">
              <div>
                <h4 className="font-heading font-bold text-sm text-[#111111]">
                  Your Favourite Foods
                </h4>
                <p className="text-xs text-[#4B5563]">
                  Quickly add your most frequent go-to foods to today&apos;s diary.
                </p>
              </div>

              {loadingFavorites ? (
                <div className="py-16 flex flex-col items-center justify-center text-[#4B5563] text-xs space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#2F7D16]" />
                  <span>Loading favourite foods...</span>
                </div>
              ) : favoriteFoods.length === 0 ? (
                <div className="p-8 text-center bg-[#F7FAF4] rounded-2xl border border-[#E5E7E2] space-y-2 max-w-md mx-auto my-6">
                  <Star className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="font-bold text-sm text-[#111111]">No favourite foods yet</p>
                  <p className="text-xs text-[#4B5563]">
                    Tap the star icon next to any food in Search or Recents to pin it here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E7E2] border border-[#E5E7E2] rounded-2xl overflow-hidden bg-white max-h-96 overflow-y-auto">
                  {favoriteFoods.map((fav) => (
                    <div
                      key={fav.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F3F7EE] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveFavorite(fav.id)}
                        className="p-1 text-amber-500 hover:text-rose-500 transition-colors shrink-0 cursor-pointer"
                        title="Remove from favorites"
                      >
                        <Star className="w-4 h-4 fill-amber-400" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-xs sm:text-sm text-[#111111] truncate">
                          {fav.foodNameSnapshot}
                        </h5>
                        <p className="text-[11px] text-[#4B5563]">
                          {fav.caloriesPer100g} kcal/100g • P: {fav.protein}g • C: {fav.carbohydrates}g • F: {fav.fat}g
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSelectFromOtherTab(fav)}
                        className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Log
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: SAVED MEALS & RECIPES                                              */}
          {/* ========================================================================= */}
          {activeTab === "savedMeals" && (
            <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-4">
              {!isCreatingMeal ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-heading font-bold text-sm text-[#111111]">
                        Saved Meals &amp; Recipes
                      </h4>
                      <p className="text-xs text-[#4B5563]">
                        Combine multiple food items and log them in a single tap.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsCreatingMeal(true)}
                      className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Meal
                    </Button>
                  </div>

                  {loadingSavedMeals ? (
                    <div className="py-16 flex flex-col items-center justify-center text-[#4B5563] text-xs space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#2F7D16]" />
                      <span>Loading saved meals...</span>
                    </div>
                  ) : savedMeals.length === 0 ? (
                    <div className="p-8 text-center bg-[#F7FAF4] rounded-2xl border border-[#E5E7E2] space-y-3 max-w-md mx-auto my-6">
                      <Layers className="w-8 h-8 text-[#4B5563]/50 mx-auto" />
                      <div>
                        <p className="font-bold text-sm text-[#111111]">No saved meals yet</p>
                        <p className="text-xs text-[#4B5563] mt-0.5">
                          Create custom meal combos (e.g. &apos;2 Eggs + Toast + Milk&apos;) to log all ingredients together.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsCreatingMeal(true)}
                        className="bg-[#2F7D16] text-white font-extrabold text-xs rounded-xl"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Create Your First Meal
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="p-4 bg-white border border-[#E5E7E2] rounded-2xl shadow-xs space-y-2.5 hover:border-[#2F7D16]/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="font-heading font-extrabold text-sm sm:text-base text-[#111111]">
                                {meal.name}
                              </h5>
                              {meal.description && (
                                <p className="text-xs text-[#4B5563] mt-0.5">
                                  {meal.description}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedMeal(meal.id)}
                              className="text-[#4B5563] hover:text-rose-600 p-1 cursor-pointer transition-colors"
                              title="Delete saved meal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Item Pills */}
                          <div className="flex flex-wrap gap-1.5 text-[11px]">
                            {meal.items.map((it: any, idx: number) => (
                              <span
                                key={idx}
                                className="bg-[#F7FAF4] px-2.5 py-1 rounded-lg border border-[#E5E7E2] text-[#111111] font-medium"
                              >
                                {it.quantity} {it.unit} {it.foodName}
                              </span>
                            ))}
                          </div>

                          {/* Macro Totals & Log CTA */}
                          <div className="pt-2 border-t border-[#E5E7E2] flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#4B5563]">
                              <span className="text-[#2F7D16] font-extrabold">
                                {meal.totalCalories} kcal
                              </span>
                              <span>•</span>
                              <span>P: {meal.totalProtein}g</span>
                              <span>•</span>
                              <span>C: {meal.totalCarbs}g</span>
                              <span>•</span>
                              <span>F: {meal.totalFat}g</span>
                            </div>

                            <Button
                              size="sm"
                              variant="primary"
                              disabled={submitting}
                              onClick={() => handleLogSavedMeal(meal.id)}
                              className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Log to {formatMealLabel(targetMealType)}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* INLINE SAVED MEAL BUILDER */
                <div className="p-4 bg-[#F7FAF4] border border-[#E5E7E2] rounded-2xl space-y-4 animate-scale-up">
                  <div className="flex items-center justify-between border-b border-[#E5E7E2] pb-2">
                    <h4 className="font-heading font-extrabold text-sm sm:text-base text-[#111111]">
                      Create Custom Meal / Recipe
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsCreatingMeal(false)}
                      className="text-xs text-[#4B5563] hover:text-[#111111] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-[#4B5563] block mb-1">
                        Meal Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newMealName}
                        onChange={(e) => setNewMealName(e.target.value)}
                        placeholder="e.g. My Power Breakfast, Post-Workout Shake"
                        className="w-full bg-white border border-[#E5E7E2] rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-[#111111] focus:outline-none focus:border-[#2F7D16]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#4B5563] block mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={newMealDescription}
                        onChange={(e) => setNewMealDescription(e.target.value)}
                        placeholder="e.g. High protein eggs and multigrain toast with banana"
                        className="w-full bg-white border border-[#E5E7E2] rounded-xl px-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#2F7D16]"
                      />
                    </div>
                  </div>

                  {/* Food Item Picker inside Builder */}
                  <div className="space-y-2 pt-2 border-t border-[#E5E7E2]">
                    <label className="text-xs font-bold text-[#4B5563] block">
                      Search &amp; Add Food Items to Meal
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#4B5563] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={mealSearchQuery}
                        onChange={(e) => setMealSearchQuery(e.target.value)}
                        placeholder="Search food item to add (e.g. Boiled Egg, Oats)..."
                        className="w-full bg-white border border-[#E5E7E2] rounded-xl pl-9 pr-3 py-2 text-xs text-[#111111] focus:outline-none focus:border-[#2F7D16]"
                      />
                    </div>

                    {mealSearchResults.length > 0 && (
                      <div className="divide-y divide-[#E5E7E2] border border-[#E5E7E2] rounded-xl overflow-hidden bg-white max-h-40 overflow-y-auto">
                        {mealSearchResults.map((food) => (
                          <div
                            key={food.id}
                            onClick={() => {
                              setSelectedMealFood(food);
                              setMealItemQuantity(food.defaultServingSize || 1);
                              setMealItemUnit(food.defaultServingUnit || "serving");
                              setMealSearchResults([]);
                              setMealSearchQuery(food.name);
                            }}
                            className="p-2.5 flex items-center justify-between text-xs hover:bg-[#EAF4E3] cursor-pointer"
                          >
                            <span className="font-bold text-[#111111] truncate">{food.name}</span>
                            <span className="text-[#4B5563] font-medium shrink-0">
                              {food.caloriesPer100g} kcal
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedMealFood && (
                      <div className="p-3 bg-[#EAF4E3]/60 border border-[#2F7D16]/30 rounded-xl flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-[#111111] truncate block">
                            {selectedMealFood.name}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          value={mealItemQuantity}
                          onChange={(e) => setMealItemQuantity(parseFloat(e.target.value) || 0)}
                          className="w-16 bg-white border border-[#E5E7E2] rounded-lg px-2 py-1 text-xs font-bold text-center"
                        />
                        <span className="text-xs text-[#4B5563]">{mealItemUnit}</span>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleAddItemToSavedMeal}
                          className="bg-[#2F7D16] text-white font-bold text-xs py-1 px-3 rounded-lg"
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Added Items List */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-[#4B5563] block">
                      Meal Items ({newMealItems.length})
                    </span>
                    {newMealItems.length === 0 ? (
                      <p className="text-xs text-[#4B5563] italic">No items added to this meal yet.</p>
                    ) : (
                      <div className="divide-y divide-[#E5E7E2] border border-[#E5E7E2] rounded-xl bg-white overflow-hidden">
                        {newMealItems.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-[#111111]">
                                {item.quantity} {item.unit} {item.foodName}
                              </span>
                              <span className="text-[#4B5563] text-[11px] block">
                                {item.calories} kcal • P: {item.protein}g • C: {item.carbohydrates}g • F: {item.fat}g
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNewMealItems((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Combined Totals Preview */}
                  {newMealItems.length > 0 && (
                    <div className="p-3 bg-white rounded-xl border border-[#E5E7E2] flex items-center justify-between text-xs font-bold">
                      <span className="text-[#111111]">Total Nutrition:</span>
                      <div className="flex items-center gap-2 text-[#4B5563]">
                        <span className="text-[#2F7D16] font-extrabold">
                          {Math.round(newMealItems.reduce((acc, i) => acc + i.calories, 0) * 10) / 10} kcal
                        </span>
                        <span>•</span>
                        <span>P: {Math.round(newMealItems.reduce((acc, i) => acc + i.protein, 0) * 10) / 10}g</span>
                        <span>•</span>
                        <span>C: {Math.round(newMealItems.reduce((acc, i) => acc + i.carbohydrates, 0) * 10) / 10}g</span>
                        <span>•</span>
                        <span>F: {Math.round(newMealItems.reduce((acc, i) => acc + i.fat, 0) * 10) / 10}g</span>
                      </div>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    disabled={savingMeal || newMealItems.length === 0 || !newMealName.trim()}
                    onClick={handleSaveCustomMeal}
                    className="w-full bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-xs sm:text-sm py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    {savingMeal ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving Meal...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Save Meal Recipe
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E5E7E2] bg-[#F7FAF4] flex items-center justify-between text-xs text-[#4B5563] shrink-0">
          <span className="text-[11px] text-[#4B5563] truncate mr-2">
            * Verified nutrition estimates based on standard Indian Food Composition Tables (ICMR-NIN) &amp; NutriFlexs recipes.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold text-[#4B5563] hover:text-[#111111] hover:bg-[#EAF4E3] rounded-full px-3 py-1 cursor-pointer shrink-0"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
