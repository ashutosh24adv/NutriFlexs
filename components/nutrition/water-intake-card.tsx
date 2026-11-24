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
import { Badge } from "@/components/ui/badge";
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
  const goalLiters = (goalMl / 1000).toFixed(1);
  const progressPercent = Math.min(100, Math.round((totalMl / goalMl) * 100));
  const remainingMl = Math.max(0, goalMl - totalMl);
  const entries = water?.entries || [];

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleAddWater = async (amount: number) => {
    if (amount <= 0 || isNaN(amount)) return;
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
      showToast(`Added +${amount} ml water`);
      setCustomMl("");
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to add water", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string, amountMl: number) => {
    setLoading(true);
    try {
      if (isAuthenticated) {
        const res = await fetch(`/api/nutrition/water?id=${entryId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to remove entry");
        }
      } else {
        deleteGuestWaterEntry(entryId);
      }
      showToast(`Removed entry (-${amountMl} ml)`);
      onUpdate();
    } catch (err: any) {
      showToast(err.message || "Failed to remove entry", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
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
      showToast(`Daily water goal set to ${parsed} ml`);
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
    <Card className="p-5 bg-white border border-nutri-border rounded-3xl shadow-xs space-y-4 relative overflow-hidden transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-2xs">
            <Droplets className="w-4 h-4 fill-blue-500/20" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-sm sm:text-base text-nutri-charcoal leading-none">
              Water Intake
            </h3>
            <span className="text-[11px] text-nutri-secondary font-medium">
              Daily Hydration Tracker
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[11px] font-bold border-blue-200 text-blue-700 bg-blue-50/70"
          >
            Goal: {goalMl} ml ({goalLiters}L)
          </Badge>
          <button
            type="button"
            onClick={() => {
              setNewGoalInput(String(goalMl));
              setShowGoalModal(true);
            }}
            className="p-1.5 rounded-lg text-nutri-muted hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Edit water goal"
            aria-label="Edit water goal"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Consumption Metric & Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading font-black text-2xl sm:text-3xl text-nutri-charcoal">
              {totalMl.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-nutri-secondary">
              ml / {goalMl.toLocaleString()} ml
            </span>
            <span className="text-xs font-semibold text-blue-600 ml-1">
              ({totalLiters} L)
            </span>
          </div>
          <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
            {progressPercent}%
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-blue-50/70 rounded-full h-3 overflow-hidden border border-blue-100 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500 ease-out shadow-xs"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-nutri-secondary font-medium pt-0.5">
          <span>
            {remainingMl > 0 ? (
              <>
                <strong className="text-blue-700 font-bold">{remainingMl} ml</strong> remaining today
              </>
            ) : (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Daily goal reached!
              </span>
            )}
          </span>
          <span className="text-nutri-muted">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} logged
          </span>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="space-y-2 pt-1 border-t border-nutri-border/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-nutri-charcoal">Quick Add</span>
          <span className="text-[10px] text-nutri-muted">Tap to log immediately</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => handleAddWater(250)}
            className="h-9 font-bold text-xs border-blue-200 text-blue-800 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-blue-600" />
            +250 ml
            <span className="text-[9px] text-blue-500 font-normal ml-0.5 hidden sm:inline">(Glass)</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => handleAddWater(500)}
            className="h-9 font-bold text-xs border-blue-200 text-blue-800 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-blue-600" />
            +500 ml
            <span className="text-[9px] text-blue-500 font-normal ml-0.5 hidden sm:inline">(Bottle)</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => handleAddWater(750)}
            className="h-9 font-bold text-xs border-blue-200 text-blue-800 bg-blue-50/50 hover:bg-blue-100 hover:text-blue-900 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-blue-600" />
            +750 ml
            <span className="text-[9px] text-blue-500 font-normal ml-0.5 hidden sm:inline">(Flask)</span>
          </Button>
        </div>
      </div>

      {/* Custom Amount Input */}
      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <input
            type="number"
            min={10}
            max={5000}
            placeholder="Custom amount (e.g. 350)"
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customMl) {
                handleAddWater(parseInt(customMl, 10));
              }
            }}
            className="w-full text-xs py-2 px-3 pr-10 rounded-xl border border-nutri-border focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-nutri-muted pointer-events-none">
            ml
          </span>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={loading || !customMl}
          onClick={() => customMl && handleAddWater(parseInt(customMl, 10))}
          className="h-8.5 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
        >
          Add
        </Button>
      </div>

      {/* History & Undo Toggle */}
      {entries.length > 0 && (
        <div className="pt-2 border-t border-nutri-border/60">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-xs font-bold text-nutri-secondary hover:text-nutri-charcoal py-1 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-600" />
              Intake History ({entries.length})
            </span>
            {showHistory ? (
              <ChevronUp className="w-3.5 h-3.5 text-nutri-muted" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-nutri-muted" />
            )}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-blue-50/40 border border-blue-100 text-xs text-nutri-charcoal"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-blue-800">
                      +{entry.amountMl} ml
                    </span>
                    <span className="text-[10px] text-nutri-muted flex items-center gap-1">
                      <Clock className="w-3 h-3 text-nutri-muted" />
                      {formatTime(entry.loggedAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDeleteEntry(entry.id, entry.amountMl)}
                    className="p-1 text-nutri-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Undo / delete this water entry"
                    aria-label={`Remove ${entry.amountMl}ml entry`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
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
                className="text-nutri-muted hover:text-nutri-charcoal font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-nutri-secondary">
              Set your target daily water consumption in millilitres (e.g., 2,500 ml or 3,000 ml).
            </p>
            <div className="relative">
              <input
                type="number"
                min={500}
                max={10000}
                step={100}
                value={newGoalInput}
                onChange={(e) => setNewGoalInput(e.target.value)}
                className="w-full text-sm font-bold py-2.5 px-3 pr-12 rounded-xl border border-nutri-border focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-nutri-muted">
                ml
              </span>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowGoalModal(false)}
                className="rounded-xl font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={handleSaveGoal}
                className="rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Target
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
