"use client";

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { calculateItemNutrition } from "@/services/nutrition.service";

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
}

export function FoodSearchModal({
  isOpen,
  onClose,
  onFoodAdded,
  initialMealType,
  dateKey,
  onOpenCustomFood,
}: FoodSearchModalProps) {
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

  const handleRetry = () => {
    setRetryTrigger((prev) => prev + 1);
  };

  // Sync initial meal type when modal opens
  useEffect(() => {
    setTargetMealType(initialMealType);
    setSelectedFood(null);
    setDuplicateWarning(false);
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

  // Search foods with debounce and cancellation
  useEffect(() => {
    if (!isOpen) return;

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
          const combined = [
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
  }, [searchQuery, selectedCategory, isOpen, retryTrigger]);

  // When a food item is clicked, initialize its serving inputs
  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    const defUnit = food.defaultServingUnit || "g";
    setUnit(defUnit);
    setQuantity(food.defaultServingSize || (defUnit === "g" ? 100 : 1));
    setDuplicateWarning(false);
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

    // Common Indian measurements
    if (selectedFood.category.includes("Rice") || selectedFood.category.includes("Dal") || selectedFood.category.includes("Vegetable")) {
      set.add("bowl");
    }
    if (selectedFood.category.includes("Dairy") || selectedFood.category.includes("Beverage")) {
      set.add("glass");
      set.add("cup");
      set.add("ml");
    }
    if (selectedFood.category.includes("Egg") || selectedFood.category.includes("Roti")) {
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
      setSelectedFood(null);
      onClose();
    } catch (err: any) {
      console.error("Error logging food", err);
      setSubmitError(err.message || "Failed to log food entry");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-nutri-border shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-nutri-border-light flex items-center justify-between bg-nutri-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-nutri-green-light flex items-center justify-center text-nutri-green">
              <Utensils className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-nutri-charcoal text-base sm:text-lg leading-tight">
                Add Food to Diary
              </h3>
              <p className="text-xs text-nutri-secondary">
                Search verified Indian &amp; NutriFlexs food items
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nutri-muted hover:text-nutri-charcoal p-1"
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
                  return (
                    <div
                      key={food.id}
                      onClick={() => handleSelectFood(food)}
                      className={`p-3 flex items-center justify-between gap-3 hover:bg-nutri-green-soft/50 transition-colors cursor-pointer text-left ${
                        isSelected ? "bg-nutri-green-light/60" : ""
                      }`}
                    >
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
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-nutri-border-light bg-nutri-bg/50 flex items-center justify-between text-xs text-nutri-secondary">
          <span>* Nutritional estimates based on standard Indian Food Tables &amp; verified kiosk recipes.</span>
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

