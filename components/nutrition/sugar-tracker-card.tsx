"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Apple,
  Candy,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SugarTotals } from "@/services/nutrition.service";
import { saveGuestSugarGoal } from "@/lib/guest-nutrition";

interface SugarTrackerCardProps {
  sugar: SugarTotals;
  isAuthenticated: boolean;
  onUpdate: () => void;
}

export function SugarTrackerCard({
  sugar,
  isAuthenticated,
  onUpdate,
}: SugarTrackerCardProps) {
  const [showTargetModal, setShowTargetModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [newTotalTarget, setNewTotalTarget] = useState<string>(
    String(sugar?.sugarTarget || 35)
  );
  const [newAddedTarget, setNewAddedTarget] = useState<string>(
    String(sugar?.addedSugarTarget || 25)
  );
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const totalSugar = sugar?.totalSugar || 0;
  const addedSugar = sugar?.addedSugar || 0;
  const naturalSugar = sugar?.naturalSugar || Math.max(0, totalSugar - addedSugar);
  const sugarTarget = sugar?.sugarTarget || 35;
  const addedSugarTarget = sugar?.addedSugarTarget || 25;
  const hasAnySugarData = sugar?.hasAnySugarData ?? (totalSugar > 0 || addedSugar > 0);

  const totalProgressPercent = sugarTarget > 0 ? Math.round((totalSugar / sugarTarget) * 100) : 0;
  const addedProgressPercent = addedSugarTarget > 0 ? Math.round((addedSugar / addedSugarTarget) * 100) : 0;

  const isTotalExceeded = totalSugar > sugarTarget;
  const isAddedExceeded = addedSugar > addedSugarTarget;

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSaveTargets = async () => {
    const parsedTotal = parseFloat(newTotalTarget);
    const parsedAdded = parseFloat(newAddedTarget);

    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      showToast("Total sugar target must be greater than 0g", "error");
      return;
    }
    if (isNaN(parsedAdded) || parsedAdded < 0) {
      showToast("Added sugar target must be 0g or greater", "error");
      return;
    }

    setLoading(true);
    try {
      if (isAuthenticated) {
        const res = await fetch("/api/nutrition/sugar/goal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sugarTarget: parsedTotal,
            addedSugarTarget: parsedAdded,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update sugar targets");
        }
      } else {
        saveGuestSugarGoal({
          sugarTarget: parsedTotal,
          addedSugarTarget: parsedAdded,
        });
      }
      setShowTargetModal(false);
      showToast("Daily sugar targets updated");
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to save sugar targets", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-5 bg-white border border-nutri-border rounded-3xl shadow-xs space-y-4 relative overflow-hidden transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 shadow-2xs">
            <Candy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-sm sm:text-base text-nutri-charcoal leading-none">
              Sugar Tracker
            </h3>
            <span className="text-[11px] text-nutri-secondary font-medium">
              Total &amp; Added Sugar Intake
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[11px] font-bold border-amber-200 text-amber-800 bg-amber-50/70"
          >
            Target: &lt;{sugarTarget}g
          </Badge>
          <button
            type="button"
            onClick={() => {
              setNewTotalTarget(String(sugarTarget));
              setNewAddedTarget(String(addedSugarTarget));
              setShowTargetModal(true);
            }}
            className="p-1.5 rounded-lg text-nutri-muted hover:text-amber-700 hover:bg-amber-50 transition-colors"
            title="Edit sugar targets"
            aria-label="Edit sugar targets"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Consumption Breakdown */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Total Sugar Metric */}
        <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              Total Sugar
            </span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                isTotalExceeded
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {totalProgressPercent}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-heading font-black text-xl sm:text-2xl text-nutri-charcoal">
              {totalSugar}
            </span>
            <span className="text-xs font-bold text-nutri-secondary">
              g / {sugarTarget}g
            </span>
          </div>
          <div className="w-full bg-amber-100/70 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isTotalExceeded ? "bg-red-500" : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(100, totalProgressPercent)}%` }}
            />
          </div>
        </div>

        {/* Added Sugar Metric */}
        <div className="p-3 rounded-2xl bg-orange-50/50 border border-orange-100 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-900 uppercase tracking-wider">
              Added Sugar
            </span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-md ${
                isAddedExceeded
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-orange-100 text-orange-800"
              }`}
            >
              {addedProgressPercent}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-heading font-black text-xl sm:text-2xl text-nutri-charcoal">
              {addedSugar}
            </span>
            <span className="text-xs font-bold text-nutri-secondary">
              g / {addedSugarTarget}g
            </span>
          </div>
          <div className="w-full bg-orange-100/70 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAddedExceeded ? "bg-red-500" : "bg-orange-500"
              }`}
              style={{ width: `${Math.min(100, addedProgressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Natural Sugar Breakdown & WHO / AHA Guidelines */}
      <div className="p-3 rounded-2xl bg-nutri-bg border border-nutri-border/70 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-nutri-charcoal">
            <Apple className="w-3.5 h-3.5 text-emerald-600" /> Naturally Occurring Sugar:
          </span>
          <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            {naturalSugar} g
          </span>
        </div>

        <p className="text-[11px] text-nutri-secondary leading-relaxed">
          {isAddedExceeded ? (
            <span className="text-red-700 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-600" />
              You have exceeded your recommended added sugar limit ({addedSugarTarget}g).
            </span>
          ) : (
            <span>
              Naturally occurring sugars in fruits, vegetables, and unsweetened dairy provide fiber and nutrients. WHO recommends keeping free/added sugars below <strong>{addedSugarTarget}g/day</strong>.
            </span>
          )}
        </p>
      </div>

      {/* Sugar Status Information */}
      {!hasAnySugarData && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900">
          <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>
            No food logs with recorded sugar content for this date yet. Log food items to see live sugar metrics.
          </span>
        </div>
      )}

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Edit Sugar Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-nutri-border">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-extrabold text-base text-nutri-charcoal">
                Edit Daily Sugar Targets
              </h4>
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="text-nutri-muted hover:text-nutri-charcoal font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-nutri-secondary">
              Customize your daily upper limits for total sugar and free added sugars in grams.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-nutri-charcoal block mb-1">
                  Total Sugar Limit (g)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={200}
                    step={1}
                    value={newTotalTarget}
                    onChange={(e) => setNewTotalTarget(e.target.value)}
                    className="w-full text-sm font-bold py-2.5 px-3 pr-10 rounded-xl border border-nutri-border focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                    g
                  </span>
                </div>
                <span className="text-[10px] text-nutri-muted block mt-1">
                  Includes both natural sugars (fruits, milk) and added sugars.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-nutri-charcoal block mb-1">
                  Added Sugar Limit (g)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={newAddedTarget}
                    onChange={(e) => setNewAddedTarget(e.target.value)}
                    className="w-full text-sm font-bold py-2.5 px-3 pr-10 rounded-xl border border-nutri-border focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                    g
                  </span>
                </div>
                <span className="text-[10px] text-nutri-muted block mt-1">
                  AHA / WHO guideline: max 25g/day for optimal metabolic health.
                </span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTargetModal(false)}
                className="rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={handleSaveTargets}
                className="rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                Save Targets
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
