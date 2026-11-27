"use client";

import React, { useState } from "react";
import {
  Droplets,
  Plus,
  Trash2,
  Clock,
  Settings2,
  CheckCircle2,
  AlertCircle,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WaterSummary } from "@/services/nutrition.service";
import {
  addGuestWaterEntry,
  deleteGuestWaterEntry,
  saveGuestWaterGoal,
} from "@/lib/guest-nutrition";

interface WaterIntakeCardProps {
  dateKey: string;
  water: WaterSummary;
  isAuthenticated: boolean;
  onUpdate: () => void;
}

export function WaterIntakeCard({
  dateKey,
  water,
  isAuthenticated,
  onUpdate,
}: WaterIntakeCardProps) {
  const [customMl, setCustomMl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [newGoalInput, setNewGoalInput] = useState<string>(String(water?.waterGoalMl || 3000));
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const totalMl = water?.totalMl || 0;
  const goalMl = water?.waterGoalMl || 3000;
  const totalLiters = (totalMl / 1000).toFixed(2);
  const progressPercent = Math.min(100, Math.round((totalMl / goalMl) * 100));
  const remainingMl = Math.max(0, goalMl - totalMl);
  const entries = water?.entries || [];

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 2500);
  };

  const handleAddWater = async (amount: number) => {
    if (loading || amount <= 0 || isNaN(amount)) return;
    setLoading(true);
    try {
      if (isAuthenticated) {
        const res = await fetch("/api/nutrition/water", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dateKey, amountMl: amount }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to log water");
        }
      } else {
        addGuestWaterEntry(dateKey, amount);
      }
      showToast(`+${amount} ml added`);
      setCustomMl("");
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to add water", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string, amountMl: number) => {
    if (loading) return;
    setLoading(true);
    try {
      if (isAuthenticated) {
        const res = await fetch(`/api/nutrition/water?id=${encodeURIComponent(entryId)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to remove entry");
        }
      } else {
        deleteGuestWaterEntry(entryId);
      }
      showToast(`Removed -${amountMl} ml`);
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to remove entry", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    if (loading) return;
    const parsed = parseInt(newGoalInput, 10);
    if (isNaN(parsed) || parsed < 500 || parsed > 10000) {
      showToast("Goal must be between 500 ml and 10,000 ml", "error");
      return;
    }

    setLoading(true);
    try {
      if (isAuthenticated) {
        const res = await fetch("/api/nutrition/water/goal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waterGoalMl: parsed }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update water goal");
        }
      } else {
        saveGuestWaterGoal(parsed);
      }
      setShowGoalModal(false);
      showToast(`Water goal updated to ${parsed} ml`);
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to update water goal", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  return (
    <Card className="p-4 bg-white border border-nutri-border rounded-3xl shadow-2xs space-y-2.5 flex flex-col justify-between">
      <div className="space-y-2.5">
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-nutri-green-light text-nutri-green flex items-center justify-center border border-nutri-green/20 shrink-0">
              <Droplets className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-heading font-extrabold text-sm text-nutri-charcoal">
              Water Intake
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewGoalInput(String(goalMl));
              setShowGoalModal(true);
            }}
            className="p-1.5 rounded-lg text-nutri-muted hover:text-nutri-green hover:bg-nutri-green-soft transition-colors cursor-pointer"
            title="Edit daily water goal"
            aria-label="Edit water goal"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>

        {/* One-Line Consumption & Goal + Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-heading font-black text-xl text-nutri-charcoal">
                {totalMl.toLocaleString()}
              </span>
              <span className="text-xs font-semibold text-nutri-secondary">
                / {goalMl.toLocaleString()} ml ({totalLiters} L)
              </span>
            </div>
            <span className="text-[11px] font-extrabold text-nutri-green bg-nutri-green-light px-2 py-0.5 rounded-md">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full bg-nutri-bg rounded-full h-2 overflow-hidden border border-nutri-border-light">
            <div
              className="h-full bg-nutri-green rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-nutri-secondary">
            <span>
              {remainingMl > 0 ? (
                <>
                  <strong className="text-nutri-charcoal font-bold">{remainingMl.toLocaleString()} ml</strong> remaining
                </>
              ) : (
                <span className="text-nutri-green font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Goal reached
                </span>
              )}
            </span>

            {entries.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-nutri-green hover:underline cursor-pointer"
              >
                <History className="w-3 h-3" />
                History ({entries.length})
                {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            ) : (
              <span className="text-nutri-muted">0 entries</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Row + Custom Input Row */}
      <div className="space-y-2 pt-1.5 border-t border-nutri-border/60">
        <div className="grid grid-cols-3 gap-1.5">
          {[250, 500, 750].map((amt) => (
            <Button
              key={amt}
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => handleAddWater(amt)}
              className="h-8 px-2 font-bold text-xs border-nutri-border text-nutri-charcoal bg-nutri-bg/60 hover:bg-nutri-green-light hover:text-nutri-green hover:border-nutri-green/30 cursor-pointer"
            >
              <Plus className="w-3 h-3 mr-1 text-nutri-green" />
              {amt} ml
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="number"
              min={10}
              max={5000}
              placeholder="Custom ml (e.g. 350)"
              value={customMl}
              onChange={(e) => setCustomMl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customMl) {
                  handleAddWater(parseInt(customMl, 10));
                }
              }}
              className="w-full h-8 text-xs px-3 pr-8 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green bg-nutri-bg/50 focus:bg-white"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-nutri-muted pointer-events-none">
              ml
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={loading || !customMl}
            onClick={() => customMl && handleAddWater(parseInt(customMl, 10))}
            className="h-8 px-3.5 text-xs font-bold bg-nutri-green hover:bg-nutri-green-dark text-white rounded-xl cursor-pointer"
          >
            Add
          </Button>
        </div>
      </div>

      {/* Collapsible Intake History */}
      {showHistory && entries.length > 0 && (
        <div className="pt-2 border-t border-nutri-border/60 space-y-1 max-h-32 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-nutri-bg border border-nutri-border/60 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-nutri-green">+{entry.amountMl} ml</span>
                <span className="text-[10px] text-nutri-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatTime(entry.loggedAt)}
                </span>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDeleteEntry(entry.id, entry.amountMl)}
                className="p-1 text-nutri-muted hover:text-rose-600 rounded cursor-pointer"
                title="Remove water entry"
                aria-label={`Remove ${entry.amountMl}ml entry`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Compact Toast */}
      {feedbackMsg && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold ${
            feedbackMsg.type === "success"
              ? "bg-nutri-green-light text-nutri-green"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Goal Edit Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl border border-nutri-border">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-extrabold text-base text-nutri-charcoal">
                Edit Daily Water Goal
              </h4>
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="text-nutri-muted hover:text-nutri-charcoal font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-nutri-secondary">
              Set your target daily water consumption in millilitres (500 – 10,000 ml).
            </p>
            <div className="relative">
              <input
                type="number"
                min={500}
                max={10000}
                step={100}
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                className="w-full text-sm font-bold py-2.5 px-3 pr-12 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                ml
              </span>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowGoalModal(false)}
                className="rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={handleSaveGoal}
                className="rounded-xl font-bold text-xs bg-nutri-green hover:bg-nutri-green-dark text-white cursor-pointer"
              >
                Save Goal
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
