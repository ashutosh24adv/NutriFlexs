"use client";

import React, { useState, useEffect } from "react";
import { X, Trash2, Edit3, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateGuestLog, deleteGuestLog } from "@/lib/guest-nutrition";

interface EditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogUpdated: () => void;
  isGuest?: boolean;
  item: {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    mealType: "BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER";
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    isAutoLoggedFromOrder?: boolean;
  } | null;
}

export function EditLogModal({
  isOpen,
  onClose,
  onLogUpdated,
  isGuest = false,
  item,
}: EditLogModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>("serving");
  const [mealType, setMealType] = useState<"BREAKFAST" | "LUNCH" | "SNACKS" | "DINNER">("LUNCH");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
      setUnit(item.unit);
      setMealType(item.mealType);
      setError(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isGuest) {
        updateGuestLog(item.id, {
          quantity,
          unit,
          mealType,
        });
        onLogUpdated();
        onClose();
        return;
      }

      const res = await fetch(`/api/nutrition/logs/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          unit,
          mealType,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update food log");
      }

      onLogUpdated();
      onClose();
    } catch (err: any) {
      console.error("Update log error", err);
      setError(err.message || "Failed to update entry");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to remove "${item.name}" from your diary?`)) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      if (isGuest) {
        deleteGuestLog(item.id);
        onLogUpdated();
        onClose();
        return;
      }

      const res = await fetch(`/api/nutrition/logs/${item.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to remove food log");
      }

      onLogUpdated();
      onClose();
    } catch (err: any) {
      console.error("Delete log error", err);
      setError(err.message || "Failed to remove entry");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-nutri-border shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-nutri-border-light flex items-center justify-between bg-nutri-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-nutri-green-light flex items-center justify-center text-nutri-green">
              <Edit3 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-nutri-charcoal text-base sm:text-lg leading-tight">
                Edit Food Entry
              </h3>
              <p className="text-xs text-nutri-secondary truncate max-w-xs">
                {item.name}
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
        <form onSubmit={handleUpdate} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {item.isAutoLoggedFromOrder && (
            <div className="p-2.5 bg-nutri-green-soft border border-nutri-green/20 rounded-xl text-xs text-nutri-green font-semibold">
              ✓ Automatically logged from completed NutriFlexs kiosk order.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                Quantity
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-3 py-2 text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-3 py-2 text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-nutri-secondary uppercase tracking-wider block mb-1">
              Meal Category
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as any)}
              className="w-full bg-nutri-bg border border-nutri-border rounded-xl px-3 py-2 text-sm font-bold text-nutri-charcoal focus:outline-none focus:border-nutri-green cursor-pointer"
            >
              <option value="BREAKFAST">🌅 Breakfast</option>
              <option value="LUNCH">☀️ Lunch</option>
              <option value="SNACKS">☕ Evening Snacks</option>
              <option value="DINNER">🌙 Dinner</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-nutri-border-light">
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Remove Item
            </button>

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
                disabled={loading || quantity <= 0}
                className="bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs py-2 px-4 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

