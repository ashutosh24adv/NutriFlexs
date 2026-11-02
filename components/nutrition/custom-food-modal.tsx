"use client";

import React, { useState } from "react";
import { X, Sparkles, AlertCircle, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addGuestCustomFood, addGuestLog } from "@/lib/guest-nutrition";

interface CustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomFoodCreated: (createdFood: any) => void;
  targetMealType?: "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER";
  dateKey: string;
  isGuest?: boolean;
}

export function CustomFoodModal({
  isOpen,
  onClose,
  onCustomFoodCreated,
  targetMealType = "LUNCH",
  dateKey,
  isGuest = false,
}: CustomFoodModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom foods");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState<string>("");
  const [protein, setProtein] = useState<string>("");
  const [carbs, setCarbs] = useState<string>("");
  const [fat, setFat] = useState<string>("");
  const [servingSize, setServingSize] = useState<string>("1");
  const [servingUnit, setServingUnit] = useState<string>("serving");
  const [addToDiaryNow, setAddToDiaryNow] = useState(true);
  const [mealType, setMealType] = useState<"BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER">(targetMealType);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const calNum = parseFloat(calories);
    const protNum = parseFloat(protein) || 0;
    const carbNum = parseFloat(carbs) || 0;
    const fatNum = parseFloat(fat) || 0;
    const servSize = parseFloat(servingSize) || 1;

    if (!name.trim()) {
      setError("Please provide a name for the custom food.");
      return;
    }
    if (isNaN(calNum) || calNum < 0) {
      setError("Please provide valid non-negative calories.");
      return;
    }
    if (protNum < 0 || carbNum < 0 || fatNum < 0) {
      setError("Macronutrient grams cannot be negative.");
      return;
    }

    setLoading(true);

    try {
      if (isGuest) {
        const createdFood = addGuestCustomFood({
          name: name.trim(),
          category: category.trim() || "Custom foods",
          description: description.trim() || "User created dish",
          caloriesPer100g: calNum,
          protein: protNum,
          carbohydrates: carbNum,
          fat: fatNum,
          defaultServingSize: servSize,
          defaultServingUnit: servingUnit.trim() || "serving",
          servingWeightGrams: 100,
        });

        if (addToDiaryNow) {
          addGuestLog({
            foodItemId: createdFood.id,
            name: createdFood.name,
            mealType,
            quantity: servSize,
            unit: servingUnit.trim() || "serving",
            dateKey,
            calories: calNum,
            protein: protNum,
            carbohydrates: carbNum,
            fat: fatNum,
          });
        }

        onCustomFoodCreated(createdFood);
        onClose();
        return;
      }

      // 1. Create custom food in database
      const res = await fetch("/api/nutrition/foods/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim() || "Custom foods",
          description: description.trim() || "User created dish",
          caloriesPer100g: calNum,
          protein: protNum,
          carbohydrates: carbNum,
          fat: fatNum,
          defaultServingSize: servSize,
          defaultServingUnit: servingUnit.trim() || "serving",
          servingWeightGrams: 100,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create custom food");
      }

      const createdFood = data.food;

      // 2. Optionally add it directly to today's diary
      if (addToDiaryNow) {
        await fetch("/api/nutrition/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foodItemId: createdFood.id,
            foodName: createdFood.name,
            mealType,
            quantity: servSize,
            unit: servingUnit.trim() || "serving",
            dateKey,
            calories: calNum,
            protein: protNum,
            carbohydrates: carbNum,
            fat: fatNum,
          }),
        });
      }

      onCustomFoodCreated(createdFood);
      onClose();
    } catch (err: any) {
      console.error("Custom food error", err);
      setError(err.message || "Failed to save custom food");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-nutri-border shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-nutri-border-light flex items-center justify-between bg-nutri-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-nutri-charcoal text-base sm:text-lg leading-tight">
                Add Custom Food
              </h3>
              <p className="text-xs text-nutri-secondary">
                Save homemade recipes and custom dishes to your account
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
              Food / Recipe Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mom's Special Paneer Tikka, Green Smoothie..."
              className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-3.5 py-2 text-sm text-nutri-charcoal focus:outline-none focus:border-nutri-green"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                Serving Size
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-3 py-2 text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                Serving Unit
              </label>
              <input
                type="text"
                value={servingUnit}
                onChange={(e) => setServingUnit(e.target.value)}
                placeholder="e.g. bowl, piece, serving, g"
                className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-3 py-2 text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
              />
            </div>
          </div>

          {/* Macros per Serving */}
          <div className="p-3.5 bg-nutri-green-soft/60 border border-nutri-green/20 rounded-2xl space-y-2.5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-nutri-green">
              Nutrition per Serving ({servingSize} {servingUnit})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-nutri-secondary block mb-0.5">
                  Calories (kcal) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="e.g. 240"
                  className="w-full bg-white border border-nutri-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-nutri-secondary block mb-0.5">
                  Protein (g)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="e.g. 18"
                  className="w-full bg-white border border-nutri-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-nutri-secondary block mb-0.5">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full bg-white border border-nutri-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-nutri-secondary block mb-0.5">
                  Fat (g)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full bg-white border border-nutri-border rounded-xl px-2.5 py-1.5 text-xs font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                />
              </div>
            </div>
          </div>

          {/* Add to Diary Checkbox */}
          <div className="pt-1 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-nutri-charcoal cursor-pointer">
              <input
                type="checkbox"
                checked={addToDiaryNow}
                onChange={(e) => setAddToDiaryNow(e.target.checked)}
                className="w-4 h-4 rounded-md accent-nutri-green"
              />
              <span>Add directly to today&apos;s diary</span>
            </label>

            {addToDiaryNow && (
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as any)}
                className="text-xs font-bold bg-nutri-bg border border-nutri-border rounded-xl px-2.5 py-1 text-nutri-charcoal cursor-pointer"
              >
                <option value="BREAKFAST">🌅 Breakfast</option>
                <option value="LUNCH">☀️ Lunch</option>
                <option value="SNACKS">☕ Snacks</option>
                <option value="DINNER">🌙 Dinner</option>
              </select>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 text-xs font-bold py-2.5 rounded-xl border-nutri-border cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1 bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Save Custom Food
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

