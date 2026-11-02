"use client";

import React, { useState, useEffect } from "react";
import { X, Target, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveGuestGoals } from "@/lib/guest-nutrition";

interface NutritionGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalsUpdated: () => void;
  isGuest?: boolean;
  currentGoals: {
    dailyCalorieGoal: number | null;
    proteinGoal: number | null;
    carbohydrateGoal: number | null;
    fatGoal: number | null;
  };
}

export function NutritionGoalsModal({
  isOpen,
  onClose,
  onGoalsUpdated,
  isGuest = false,
  currentGoals,
}: NutritionGoalsModalProps) {
  const [calorieGoal, setCalorieGoal] = useState<string>("");
  const [proteinGoal, setProteinGoal] = useState<string>("");
  const [carbGoal, setCarbGoal] = useState<string>("");
  const [fatGoal, setFatGoal] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCalorieGoal(currentGoals.dailyCalorieGoal ? String(currentGoals.dailyCalorieGoal) : "");
    setProteinGoal(currentGoals.proteinGoal ? String(currentGoals.proteinGoal) : "");
    setCarbGoal(currentGoals.carbohydrateGoal ? String(currentGoals.carbohydrateGoal) : "");
    setFatGoal(currentGoals.fatGoal ? String(currentGoals.fatGoal) : "");
    setError(null);
  }, [currentGoals, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cals = calorieGoal.trim() ? parseInt(calorieGoal.trim(), 10) : null;
    const prot = proteinGoal.trim() ? parseFloat(proteinGoal.trim()) : null;
    const carbs = carbGoal.trim() ? parseFloat(carbGoal.trim()) : null;
    const fat = fatGoal.trim() ? parseFloat(fatGoal.trim()) : null;

    if (cals !== null && (isNaN(cals) || cals < 500 || cals > 10000)) {
      setError("Daily calorie target should be between 500 and 10,000 kcal.");
      return;
    }
    if (prot !== null && (isNaN(prot) || prot < 0 || prot > 600)) {
      setError("Protein target should be between 0 and 600g.");
      return;
    }
    if (carbs !== null && (isNaN(carbs) || carbs < 0 || carbs > 1500)) {
      setError("Carbohydrate target should be between 0 and 1500g.");
      return;
    }
    if (fat !== null && (isNaN(fat) || fat < 0 || fat > 500)) {
      setError("Fat target should be between 0 and 500g.");
      return;
    }

    setLoading(true);

    try {
      if (isGuest) {
        saveGuestGoals({
          dailyCalorieGoal: cals,
          proteinGoal: prot,
          carbohydrateGoal: carbs,
          fatGoal: fat,
        });
        onGoalsUpdated();
        onClose();
        return;
      }

      const res = await fetch("/api/nutrition/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyCalorieGoal: cals,
          proteinGoal: prot,
          carbohydrateGoal: carbs,
          fatGoal: fat,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update nutrition targets");
      }

      onGoalsUpdated();
      onClose();
    } catch (err: any) {
      console.error("Goals update error", err);
      setError(err.message || "Failed to save nutrition goals");
    } finally {
      setLoading(false);
    }
  };

  const handleClearGoals = async () => {
    if (!confirm("Reset all nutrition targets to optional/unset?")) return;

    setLoading(true);
    setError(null);
    try {
      if (isGuest) {
        saveGuestGoals({
          dailyCalorieGoal: null,
          proteinGoal: null,
          carbohydrateGoal: null,
          fatGoal: null,
        });
        onGoalsUpdated();
        onClose();
        return;
      }

      await fetch("/api/nutrition/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyCalorieGoal: null,
          proteinGoal: null,
          carbohydrateGoal: null,
          fatGoal: null,
        }),
      });

      onGoalsUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to reset goals");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-nutri-border shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-nutri-border-light flex items-center justify-between bg-nutri-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-nutri-green-light flex items-center justify-center text-nutri-green">
              <Target className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-nutri-charcoal text-base sm:text-lg leading-tight">
                Daily Nutrition Goals
              </h3>
              <p className="text-xs text-nutri-secondary">
                Set optional personal targets for calories &amp; macros
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
              Daily Calorie Target (kcal)
            </label>
            <input
              type="number"
              step="50"
              min="500"
              max="10000"
              value={calorieGoal}
              onChange={(e) => setCalorieGoal(e.target.value)}
              placeholder="e.g. 2100 (Optional)"
              className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-3.5 py-2 text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
            />
            <span className="text-[11px] text-nutri-muted mt-0.5 block">
              Leave blank if you prefer tracking without a strict calorie ceiling.
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                Protein (g)
              </label>
              <input
                type="number"
                step="5"
                min="0"
                value={proteinGoal}
                onChange={(e) => setProteinGoal(e.target.value)}
                placeholder="e.g. 130"
                className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-2.5 py-2 text-xs font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                Carbs (g)
              </label>
              <input
                type="number"
                step="5"
                min="0"
                value={carbGoal}
                onChange={(e) => setCarbGoal(e.target.value)}
                placeholder="e.g. 220"
                className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-2.5 py-2 text-xs font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                Fat (g)
              </label>
              <input
                type="number"
                step="5"
                min="0"
                value={fatGoal}
                onChange={(e) => setFatGoal(e.target.value)}
                placeholder="e.g. 60"
                className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-2.5 py-2 text-xs font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
              />
            </div>
          </div>

          <div className="p-3 bg-nutri-green-soft rounded-2xl border border-nutri-green/20 text-[11px] text-nutri-secondary leading-relaxed">
            💡 <strong>Disclaimer:</strong> Nutrition values and targets are general dietary estimates. Individual nutritional needs vary based on age, metabolism, and fitness routine. Consult a certified nutritionist or physician for clinical advice.
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-nutri-border-light">
            {(currentGoals.dailyCalorieGoal || currentGoals.proteinGoal) ? (
              <button
                type="button"
                onClick={handleClearGoals}
                className="text-xs font-bold text-nutri-muted hover:text-rose-600 transition-colors cursor-pointer"
              >
                Clear Goals
              </button>
            ) : <span />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs font-bold py-2 rounded-xl border-nutri-border cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Targets"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

