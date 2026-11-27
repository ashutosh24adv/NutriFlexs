"use client";

import React, { useState } from "react";
import {
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Apple,
  Candy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [showInfoPopover, setShowInfoPopover] = useState<boolean>(false);
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
  const addedProgressPercent =
    addedSugarTarget > 0 ? Math.round((addedSugar / addedSugarTarget) * 100) : 0;

  const isTotalExceeded = totalSugar > sugarTarget;
  const isAddedExceeded = addedSugar > addedSugarTarget;

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleSaveTargets = async () => {
    if (loading) return;
    const parsedTotal = parseFloat(newTotalTarget);
    const parsedAdded = parseFloat(newAddedTarget);

    if (isNaN(parsedTotal) || parsedTotal <= 0 || parsedTotal > 200) {
      showToast("Total sugar target must be between 1g and 200g", "error");
      return;
    }
    if (isNaN(parsedAdded) || parsedAdded < 0 || parsedAdded > 100) {
      showToast("Added sugar target must be between 0g and 100g", "error");
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
      showToast("Sugar targets updated");
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to save sugar targets", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-white border border-nutri-border rounded-3xl shadow-2xs space-y-2.5 flex flex-col justify-between relative">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/70 shrink-0">
            <Candy className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-heading font-extrabold text-sm text-nutri-charcoal">
            Sugar Tracker
          </h3>
          <button
            type="button"
            onClick={() => setShowInfoPopover(!showInfoPopover)}
            className="p-1 rounded-full text-nutri-muted hover:text-nutri-charcoal hover:bg-nutri-bg transition-colors cursor-pointer"
            title="About natural vs added sugar"
            aria-label="Sugar guidelines info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewTotalTarget(String(sugarTarget));
            setNewAddedTarget(String(addedSugarTarget));
            setShowTargetModal(true);
          }}
          className="p-1.5 rounded-lg text-nutri-muted hover:text-nutri-green hover:bg-nutri-green-soft transition-colors cursor-pointer"
          title="Edit sugar targets"
          aria-label="Edit sugar targets"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* Optional Info Popover */}
      {showInfoPopover && (
        <div className="p-2.5 rounded-xl bg-nutri-bg border border-nutri-border text-[11px] text-nutri-secondary leading-snug flex items-start justify-between gap-2">
          <span>
            Naturally occurring sugars in fruits &amp; plain dairy come with fiber and nutrients. WHO recommends keeping added sugars under <strong>{addedSugarTarget}g/day</strong>.
          </span>
          <button
            type="button"
            onClick={() => setShowInfoPopover(false)}
            className="text-nutri-muted hover:text-nutri-charcoal font-bold shrink-0 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Side-by-Side Compact Metrics */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Sugar */}
        <div className="p-2.5 rounded-2xl bg-nutri-bg/70 border border-nutri-border/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-nutri-secondary">
              Total Sugar
            </span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                isTotalExceeded
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100/80 text-amber-900"
              }`}
            >
              {hasAnySugarData ? `${totalProgressPercent}%` : "N/A"}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-heading font-black text-lg text-nutri-charcoal">
              {hasAnySugarData ? `${totalSugar}g` : "—"}
            </span>
            <span className="text-[11px] font-semibold text-nutri-secondary">
              / {sugarTarget}g
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-nutri-border-light">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isTotalExceeded ? "bg-rose-500" : "bg-amber-500"
              }`}
              style={{
                width: `${hasAnySugarData ? Math.min(100, totalProgressPercent) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Added Sugar */}
        <div className="p-2.5 rounded-2xl bg-nutri-bg/70 border border-nutri-border/70 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-nutri-secondary">
              Added Sugar
            </span>
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                isAddedExceeded
                  ? "bg-rose-100 text-rose-800"
                  : "bg-orange-100/80 text-orange-900"
              }`}
            >
              {hasAnySugarData ? `${addedProgressPercent}%` : "N/A"}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-heading font-black text-lg text-nutri-charcoal">
              {hasAnySugarData ? `${addedSugar}g` : "—"}
            </span>
            <span className="text-[11px] font-semibold text-nutri-secondary">
              / {addedSugarTarget}g
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-nutri-border-light">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isAddedExceeded ? "bg-rose-500" : "bg-orange-500"
              }`}
              style={{
                width: `${hasAnySugarData ? Math.min(100, addedProgressPercent) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Compact Natural Sugar Row + Unavailable / Exceeded Notice */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-nutri-bg border border-nutri-border/60 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-nutri-secondary">
            <Apple className="w-3.5 h-3.5 text-nutri-green" /> Naturally Occurring Sugar
          </span>
          <span className="font-extrabold text-nutri-green">
            {hasAnySugarData ? `${naturalSugar} g` : "Not available"}
          </span>
        </div>

        {isAddedExceeded && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            <span>Added sugar exceeded ({addedSugar}g / {addedSugarTarget}g limit).</span>
          </div>
        )}

        {!hasAnySugarData && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900">
            <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Sugar data unavailable until foods with sugar info are logged.</span>
          </div>
        )}
      </div>

      {/* Compact Toast */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold ${
            feedbackMsg.type === "success"
              ? "bg-nutri-green-light text-nutri-green"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
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
                className="text-nutri-muted hover:text-nutri-charcoal font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-nutri-charcoal block mb-1">
                  Total Sugar Limit (g)
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  step={1}
                  value={newTotalTarget}
                  onChange={(e) => setNewTotalTarget(e.target.value)}
                  className="w-full text-sm font-bold py-2 px-3 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-nutri-charcoal block mb-1">
                  Added Sugar Limit (g)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={newAddedTarget}
                  onChange={(e) => setNewAddedTarget(e.target.value)}
                  className="w-full text-sm font-bold py-2 px-3 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTargetModal(false)}
                className="rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={handleSaveTargets}
                className="rounded-xl font-bold text-xs bg-nutri-green hover:bg-nutri-green-dark text-white cursor-pointer"
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
