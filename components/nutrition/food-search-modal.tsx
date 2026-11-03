"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Plus,
  Flame,
  Check,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Utensils,
  Loader2,
  RotateCcw,
  Star,
  Clock,
  Heart,
  Bookmark,
  Layers,
  Trash2,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateItemNutrition } from "@/services/nutrition.service";
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

interface FoodItem {
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
  const [categories, setCategories] = useState<string[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Selected food configuration state
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>("serving");
  const [targetMealType, setTargetMealType] = useState<"BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER">(initialMealType);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Phase 3 States: Recents, Favorites, Saved Meals
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
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
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
        params.set("limit", "40");

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
    const defUnit = food.defaultServingUnit || "g";
    setUnit(defUnit);
    setQuantity(food.defaultServingSize || (defUnit === "g" ? 100 : 1));
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
    setQuantity(item.lastQuantity || item.defaultServingSize || 1);
    setUnit(item.unit || item.defaultServingUnit || "serving");
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

    return calculateItemNutrition(
      selectedFood,
      Math.max(0.1, quantity || 1),
      unit
    );
  }, [selectedFood, quantity, unit]);

  // Unit options available for the selected food
  const unitOptions = useMemo(() => {
    if (!selectedFood) return ["serving", "g"];
    if (selectedFood.isNutriFlexsProduct) return ["serving", "portion"];

    const def = selectedFood.defaultServingUnit || "g";
    const set = new Set<string>();
    set.add(def);
    set.add("g");
    set.add("serving");

    if (["bowl", "cup", "glass", "plate", "piece", "slice", "tbsp", "scoop"].includes(def.toLowerCase())) {
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

    return Array.from(set);
  }, [selectedFood]);

  // Submit food log entry
  const handleAddLog = async () => {
    if (!selectedFood) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      if (isGuest) {
        addGuestLog({
          name: selectedFood.name,
          mealType: targetMealType,
          quantity: Math.max(0.1, quantity),
          unit,
          dateKey,
          calories: computedNutrition.calories,
          protein: computedNutrition.protein,
          carbohydrates: computedNutrition.carbohydrates,
          fat: computedNutrition.fat,
          foodItemId: selectedFood.productId ? null : selectedFood.id,
          productId: selectedFood.productId || null,
        });

        onFoodAdded();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("nutriflexs:nutrition-updated"));
        }
        setSelectedFood(null);
        onClose();
        return;
      }

      const payload: any = {
        foodName: selectedFood.name,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-nutri-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-nutri-border-light bg-nutri-bg/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-nutri-green-light flex items-center justify-center text-nutri-green">
                <Utensils className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-nutri-charcoal text-base sm:text-lg leading-tight">
                  Add Food to Diary
                </h3>
                <p className="text-xs text-nutri-secondary">
                  Targeting: <strong className="text-nutri-green capitalize">{targetMealType.toLowerCase()}</strong> for {dateKey}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-nutri-secondary hover:text-nutri-charcoal hover:bg-nutri-border-light transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 mt-4 border-b border-nutri-border-light/60 pb-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab("search");
                setIsCreatingMeal(false);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "search"
                  ? "bg-nutri-green text-white shadow-xs"
                  : "text-nutri-secondary hover:text-nutri-charcoal hover:bg-nutri-border-light/50"
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Search
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("recents");
                setIsCreatingMeal(false);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "recents"
                  ? "bg-nutri-green text-white shadow-xs"
                  : "text-nutri-secondary hover:text-nutri-charcoal hover:bg-nutri-border-light/50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Recents
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("favorites");
                setIsCreatingMeal(false);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "favorites"
                  ? "bg-nutri-green text-white shadow-xs"
                  : "text-nutri-secondary hover:text-nutri-charcoal hover:bg-nutri-border-light/50"
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> Favourites ({favoriteFoods.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("savedMeals");
                setIsCreatingMeal(false);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "savedMeals"
                  ? "bg-nutri-green text-white shadow-xs"
                  : "text-nutri-secondary hover:text-nutri-charcoal hover:bg-nutri-border-light/50"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Saved Meals
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {mealActionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{mealActionSuccess}</span>
            </div>
          )}

          {/* TAB 1: SEARCH FOODS */}
          {activeTab === "search" && (
            <>
              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-nutri-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search foods (e.g. Dal, Roti, Rice, Boiled Egg, Paneer, Chicken)..."
                  className="w-full bg-nutri-bg border border-nutri-border rounded-2xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-nutri-charcoal focus:outline-none focus:border-nutri-green transition-all"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nutri-muted hover:text-nutri-charcoal p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-nutri-green text-white shadow-xs"
                        : "bg-nutri-bg text-nutri-secondary hover:bg-nutri-green-soft hover:text-nutri-green border border-nutri-border"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Selected Item Configuration Panel */}
              {selectedFood && (
                <div className="p-4 bg-nutri-green-soft/70 border border-nutri-green/30 rounded-2xl space-y-3.5 animate-slide-down">
                  <div className="flex items-start justify-between gap-3 pb-2 border-b border-nutri-green/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-heading font-extrabold text-sm sm:text-base text-nutri-charcoal">
                          {selectedFood.name}
                        </h4>
                        {selectedFood.isNutriFlexsProduct && (
                          <Badge className="bg-nutri-green text-white text-[10px] font-bold">
                            NutriFlexs Kiosk
                          </Badge>
                        )}
                        {selectedFood.isCustom && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Custom Food
                          </Badge>
                        )}
                      </div>
                      {selectedFood.description && (
                        <p className="text-xs text-nutri-secondary mt-0.5">
                          {selectedFood.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFood(null)}
                      className="text-xs text-nutri-muted hover:text-nutri-charcoal p-1 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {/* Serving & Quantity Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max="5000"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white border border-nutri-border rounded-xl px-3 py-2 text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                        Serving Unit
                      </label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full bg-white border border-nutri-border rounded-xl px-3 py-2 text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green capitalize cursor-pointer"
                      >
                        {unitOptions.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                        Meal Category
                      </label>
                      <select
                        value={targetMealType}
                        onChange={(e) => setTargetMealType(e.target.value as any)}
                        className="w-full bg-white border border-nutri-border rounded-xl px-3 py-2 text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green cursor-pointer"
                      >
                        <option value="BREAKFAST">🌅 Breakfast</option>
                        <option value="LUNCH">☀️ Lunch</option>
                        <option value="SNACKS">☕ Evening Snacks</option>
                        <option value="DINNER">🌙 Dinner</option>
                      </select>
                    </div>
                  </div>

                  {/* Live Computed Nutrition Preview */}
                  <div className="p-3 bg-white rounded-xl border border-nutri-border flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-nutri-green font-extrabold text-sm sm:text-base">
                      <Flame className="w-4 h-4 fill-nutri-green" />
                      <span>{computedNutrition.calories} kcal</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-nutri-secondary">
                      <span>Protein: <strong className="text-nutri-charcoal">{computedNutrition.protein}g</strong></span>
                      <span>Carbs: <strong className="text-nutri-charcoal">{computedNutrition.carbohydrates}g</strong></span>
                      <span>Fat: <strong className="text-nutri-charcoal">{computedNutrition.fat}g</strong></span>
                      {computedNutrition.grams > 0 && unit !== "g" && (
                        <span className="text-[11px] text-nutri-muted font-normal">
                          (~{computedNutrition.grams}g)
                        </span>
                      )}
                    </div>
                  </div>

                  {duplicateWarning && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Note: An order containing this item was already completed today. Click Add again to confirm logging a duplicate.</span>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    onClick={handleAddLog}
                    disabled={submitting || quantity <= 0}
                    className="w-full bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs sm:text-sm py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Adding to Diary...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 stroke-[2.5]" /> Add {quantity} {unit} to Diary
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Results List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-nutri-secondary">
                    {loading ? "Searching foods..." : error ? "Unable to load items" : `Found ${foods.length} items`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCustomFood();
                    }}
                    className="text-xs font-bold text-nutri-green hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Food
                  </button>
                </div>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-nutri-secondary text-xs space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-nutri-green" />
                    <span>Searching food library...</span>
                  </div>
                ) : error ? (
                  <div className="p-8 text-center bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <div>
                      <p className="font-bold text-sm text-nutri-charcoal">Unable to load foods</p>
                      <p className="text-xs text-nutri-secondary mt-0.5">{error}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRetry}
                      className="text-xs font-bold border-nutri-green text-nutri-green hover:bg-nutri-green-light cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry Search
                    </Button>
                  </div>
                ) : foods.length === 0 ? (
                  <div className="p-8 text-center bg-nutri-bg rounded-2xl border border-nutri-border space-y-3">
                    <Utensils className="w-8 h-8 text-nutri-muted mx-auto" />
                    <div>
                      <p className="font-bold text-sm text-nutri-charcoal">No foods match your search</p>
                      <p className="text-xs text-nutri-secondary mt-0.5">
                        Can&apos;t find what you ate? You can create a custom food item with your own macros.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onOpenCustomFood();
                      }}
                      className="text-xs font-bold border-nutri-green text-nutri-green hover:bg-nutri-green-light cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Create Custom Food
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-nutri-border-light border border-nutri-border rounded-2xl overflow-hidden bg-white max-h-72 overflow-y-auto">
                    {foods.map((food) => {
                      const isSelected = selectedFood?.id === food.id;
                      const isFav = favoriteNames.has(food.name.trim().toLowerCase());
                      return (
                        <div
                          key={food.id}
                          onClick={() => handleSelectFood(food)}
                          className={`p-3 flex items-center justify-between gap-3 hover:bg-nutri-green-soft/50 transition-colors cursor-pointer text-left ${
                            isSelected ? "bg-nutri-green-light/60" : ""
                          }`}
                        >
                          {/* Favorite Star Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(e, food)}
                            className="p-1 text-slate-300 hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
                            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                isFav ? "fill-amber-400 text-amber-500" : "stroke-[1.8]"
                              }`}
                            />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs sm:text-sm text-nutri-charcoal truncate">
                                {food.name}
                              </span>
                              {food.isNutriFlexsProduct && (
                                <span className="text-[10px] font-bold bg-nutri-green-light text-nutri-green px-1.5 py-0.5 rounded-md">
                                  Kiosk Menu
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-nutri-secondary truncate">
                              {food.defaultServingSize} {food.defaultServingUnit} · {food.category}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-heading font-extrabold text-xs sm:text-sm text-nutri-green block">
                              {food.caloriesPer100g} kcal
                            </span>
                            <span className="text-[10px] text-nutri-muted block font-medium">
                              P: {food.protein}g · C: {food.carbohydrates}g · F: {food.fat}g
                            </span>
                          </div>

                          <div className="shrink-0 text-nutri-muted pl-1">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: RECENT FOODS */}
          {activeTab === "recents" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-bold text-sm text-nutri-charcoal">
                    Recently Logged Foods
                  </h4>
                  <p className="text-xs text-nutri-secondary">
                    Based on your actual meal logging history.
                  </p>
                </div>
              </div>

              {loadingRecents ? (
                <div className="py-12 flex flex-col items-center justify-center text-nutri-secondary text-xs space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-nutri-green" />
                  <span>Loading recent foods...</span>
                </div>
              ) : recentFoods.length === 0 ? (
                <div className="p-8 text-center bg-nutri-bg rounded-2xl border border-nutri-border space-y-2">
                  <Clock className="w-8 h-8 text-nutri-muted mx-auto" />
                  <p className="font-bold text-sm text-nutri-charcoal">No recently logged foods</p>
                  <p className="text-xs text-nutri-secondary">
                    Foods you log into your diary will appear here for fast 1-click refuel.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-nutri-border-light border border-nutri-border rounded-2xl overflow-hidden bg-white max-h-80 overflow-y-auto">
                  {recentFoods.map((item) => {
                    const isFav = favoriteNames.has(item.name.trim().toLowerCase());
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-nutri-green-soft/40 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, item)}
                          className="p-1 text-slate-300 hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isFav ? "fill-amber-400 text-amber-500" : "stroke-[1.8]"
                            }`}
                          />
                        </button>

                        <div className="min-w-0 flex-1">
                          <h5 className="font-bold text-xs sm:text-sm text-nutri-charcoal truncate">
                            {item.name}
                          </h5>
                          <p className="text-[11px] text-nutri-secondary">
                            Last logged: {item.lastQuantity} {item.unit} • {item.calories} kcal • P: {item.protein}g
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSelectFromOtherTab(item)}
                            className="bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Again
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FAVOURITE FOODS */}
          {activeTab === "favorites" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-bold text-sm text-nutri-charcoal">
                    Your Favourite Foods
                  </h4>
                  <p className="text-xs text-nutri-secondary">
                    Quickly add foods you frequently eat to today&apos;s diary.
                  </p>
                </div>
              </div>

              {loadingFavorites ? (
                <div className="py-12 flex flex-col items-center justify-center text-nutri-secondary text-xs space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-nutri-green" />
                  <span>Loading favourite foods...</span>
                </div>
              ) : favoriteFoods.length === 0 ? (
                <div className="p-8 text-center bg-nutri-bg rounded-2xl border border-nutri-border space-y-2">
                  <Star className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="font-bold text-sm text-nutri-charcoal">No favourite foods yet</p>
                  <p className="text-xs text-nutri-secondary">
                    Tap the star icon ⭐ next to any food in Search or Recents to add it here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-nutri-border-light border border-nutri-border rounded-2xl overflow-hidden bg-white max-h-80 overflow-y-auto">
                  {favoriteFoods.map((fav) => (
                    <div
                      key={fav.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-nutri-green-soft/40 transition-colors"
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
                        <h5 className="font-bold text-xs sm:text-sm text-nutri-charcoal truncate">
                          {fav.foodNameSnapshot}
                        </h5>
                        <p className="text-[11px] text-nutri-secondary">
                          {fav.caloriesPer100g} kcal/100g • P: {fav.protein}g • C: {fav.carbohydrates}g • F: {fav.fat}g
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleSelectFromOtherTab(fav)}
                          className="bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Log
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAVED MEALS & RECIPES */}
          {activeTab === "savedMeals" && (
            <div className="space-y-4">
              {!isCreatingMeal ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-heading font-bold text-sm text-nutri-charcoal">
                        Saved Meals &amp; Recipes
                      </h4>
                      <p className="text-xs text-nutri-secondary">
                        Combine multiple food items and log them in a single tap.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsCreatingMeal(true)}
                      className="bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Meal
                    </Button>
                  </div>

                  {loadingSavedMeals ? (
                    <div className="py-12 flex flex-col items-center justify-center text-nutri-secondary text-xs space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-nutri-green" />
                      <span>Loading saved meals...</span>
                    </div>
                  ) : savedMeals.length === 0 ? (
                    <div className="p-8 text-center bg-nutri-bg rounded-2xl border border-nutri-border space-y-3">
                      <Layers className="w-8 h-8 text-nutri-muted mx-auto" />
                      <div>
                        <p className="font-bold text-sm text-nutri-charcoal">No saved meals yet</p>
                        <p className="text-xs text-nutri-secondary mt-0.5 max-w-sm mx-auto">
                          Create custom meal combos (e.g. &apos;My Breakfast: 2 Eggs + 2 Toast + Milk&apos;) to log all ingredients at once.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsCreatingMeal(true)}
                        className="bg-nutri-green text-white font-extrabold text-xs rounded-xl cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Create Your First Meal
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {savedMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="p-4 bg-white border border-nutri-border rounded-2xl shadow-xs space-y-2.5 hover:border-nutri-green/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h5 className="font-heading font-extrabold text-sm sm:text-base text-nutri-charcoal">
                                {meal.name}
                              </h5>
                              {meal.description && (
                                <p className="text-xs text-nutri-secondary mt-0.5">
                                  {meal.description}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedMeal(meal.id)}
                              className="text-nutri-muted hover:text-rose-600 p-1 cursor-pointer"
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
                                className="bg-nutri-bg px-2.5 py-1 rounded-lg border border-nutri-border text-nutri-charcoal font-medium"
                              >
                                {it.quantity} {it.unit} {it.foodName}
                              </span>
                            ))}
                          </div>

                          {/* Macro Totals & Log CTA */}
                          <div className="pt-2 border-t border-nutri-border-light flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-nutri-secondary">
                              <span className="text-nutri-green font-extrabold">
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
                              className="bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs py-1.5 px-3 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" /> Log to {targetMealType.toLowerCase()}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* INLINE SAVED MEAL BUILDER */
                <div className="p-4 bg-nutri-bg/60 border border-nutri-border rounded-2xl space-y-4 animate-scale-up">
                  <div className="flex items-center justify-between border-b border-nutri-border-light pb-2">
                    <h4 className="font-heading font-extrabold text-sm sm:text-base text-nutri-charcoal">
                      Create Custom Meal / Recipe
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsCreatingMeal(false)}
                      className="text-xs text-nutri-secondary hover:text-nutri-charcoal cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-nutri-secondary block mb-1">
                        Meal Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newMealName}
                        onChange={(e) => setNewMealName(e.target.value)}
                        placeholder="e.g. My Power Breakfast, Post-Workout Shake"
                        className="w-full bg-white border border-nutri-border rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-nutri-secondary block mb-1">
                        Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={newMealDescription}
                        onChange={(e) => setNewMealDescription(e.target.value)}
                        placeholder="e.g. High protein eggs and multigrain toast with banana"
                        className="w-full bg-white border border-nutri-border rounded-xl px-3 py-2 text-xs text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                      />
                    </div>
                  </div>

                  {/* Food Item Picker inside Builder */}
                  <div className="space-y-2 pt-2 border-t border-nutri-border-light">
                    <label className="text-xs font-bold text-nutri-secondary block">
                      Search &amp; Add Food Items to Meal
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-nutri-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={mealSearchQuery}
                        onChange={(e) => setMealSearchQuery(e.target.value)}
                        placeholder="Search food item to add (e.g. Boiled Egg, Oats)..."
                        className="w-full bg-white border border-nutri-border rounded-xl pl-9 pr-3 py-2 text-xs text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                      />
                    </div>

                    {/* Search results dropdown for meal */}
                    {mealSearchResults.length > 0 && (
                      <div className="divide-y divide-nutri-border-light border border-nutri-border rounded-xl overflow-hidden bg-white max-h-40 overflow-y-auto">
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
                            className="p-2.5 flex items-center justify-between text-xs hover:bg-nutri-green-soft cursor-pointer"
                          >
                            <span className="font-bold text-nutri-charcoal truncate">{food.name}</span>
                            <span className="text-nutri-secondary font-medium shrink-0">
                              {food.caloriesPer100g} kcal
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Configurator for the chosen item */}
                    {selectedMealFood && (
                      <div className="p-3 bg-nutri-green-light/40 border border-nutri-green/30 rounded-xl flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-nutri-charcoal truncate block">
                            {selectedMealFood.name}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          value={mealItemQuantity}
                          onChange={(e) => setMealItemQuantity(parseFloat(e.target.value) || 0)}
                          className="w-16 bg-white border border-nutri-border rounded-lg px-2 py-1 text-xs font-bold text-center"
                        />
                        <span className="text-xs text-nutri-secondary">{mealItemUnit}</span>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleAddItemToSavedMeal}
                          className="bg-nutri-green text-white font-bold text-xs py-1 px-3 rounded-lg"
                        >
                          Add
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Added Items List */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-nutri-secondary block">
                      Meal Items ({newMealItems.length})
                    </span>
                    {newMealItems.length === 0 ? (
                      <p className="text-xs text-nutri-muted italic">No items added to this meal yet.</p>
                    ) : (
                      <div className="divide-y divide-nutri-border-light border border-nutri-border rounded-xl bg-white overflow-hidden">
                        {newMealItems.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-nutri-charcoal">
                                {item.quantity} {item.unit} {item.foodName}
                              </span>
                              <span className="text-nutri-muted text-[11px] block">
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
                    <div className="p-3 bg-white rounded-xl border border-nutri-border flex items-center justify-between text-xs font-bold">
                      <span className="text-nutri-charcoal">Total Nutrition:</span>
                      <div className="flex items-center gap-2 text-nutri-secondary">
                        <span className="text-nutri-green font-extrabold">
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
                    className="w-full bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs sm:text-sm py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
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

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-nutri-border-light bg-nutri-bg/50 flex items-center justify-between text-xs text-nutri-secondary">
          <span>* Verified nutrition estimates based on standard Indian Food Composition Tables &amp; NutriFlexs recipes.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold text-nutri-secondary hover:text-nutri-charcoal cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
