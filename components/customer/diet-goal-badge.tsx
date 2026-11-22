"use client";

import React from "react";
import { Sparkles, TrendingDown, TrendingUp, Scale } from "lucide-react";

export type DietGoalType = "WEIGHT_LOSS" | "WEIGHT_GAIN" | "WEIGHT_MAINTENANCE" | string;

interface DietGoalBadgeProps {
  goal: DietGoalType;
  size?: "sm" | "xs";
  className?: string;
}

export function normalizeDietGoal(goal: string): "WEIGHT_LOSS" | "WEIGHT_GAIN" | "WEIGHT_MAINTENANCE" | null {
  const normalized = goal.toUpperCase().trim().replace(/[-\s]+/g, "_");
  if (normalized === "WEIGHT_LOSS" || normalized === "LOSE_WEIGHT") return "WEIGHT_LOSS";
  if (normalized === "WEIGHT_GAIN" || normalized === "BUILD_MUSCLE") return "WEIGHT_GAIN";
  if (
    normalized === "WEIGHT_MAINTENANCE" ||
    normalized === "MAINTAIN" ||
    normalized === "IMPROVE_FITNESS" ||
    normalized === "HEALTHIER_HABITS"
  ) {
    return "WEIGHT_MAINTENANCE";
  }
  return null;
}

export function DietGoalBadge({ goal, size = "xs", className = "" }: DietGoalBadgeProps) {
  const norm = normalizeDietGoal(goal);

  if (norm === "WEIGHT_LOSS") {
    return (
      <span
        data-diet-goal="WEIGHT_LOSS"
        className={`inline-flex items-center gap-1 font-semibold rounded-full border transition-colors ${
          size === "xs"
            ? "text-[10px] px-2 py-0.5 leading-tight"
            : "text-xs px-2.5 py-1 leading-normal"
        } bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]/25 ${className}`}
        title="Formulated to support healthy calorie deficit, satiety, and fat loss."
      >
        <TrendingDown className="w-2.5 h-2.5 shrink-0 opacity-80" />
        <span>Weight Loss</span>
      </span>
    );
  }

  if (norm === "WEIGHT_GAIN") {
    return (
      <span
        data-diet-goal="WEIGHT_GAIN"
        className={`inline-flex items-center gap-1 font-semibold rounded-full border transition-colors ${
          size === "xs"
            ? "text-[10px] px-2 py-0.5 leading-tight"
            : "text-xs px-2.5 py-1 leading-normal"
        } bg-[#FFF6ED] text-[#C25E00] border-[#C25E00]/25 ${className}`}
        title="Rich in high-density nutrition & lean protein to support muscle growth & healthy weight gain."
      >
        <TrendingUp className="w-2.5 h-2.5 shrink-0 opacity-80" />
        <span>Weight Gain</span>
      </span>
    );
  }

  if (norm === "WEIGHT_MAINTENANCE") {
    return (
      <span
        data-diet-goal="WEIGHT_MAINTENANCE"
        className={`inline-flex items-center gap-1 font-semibold rounded-full border transition-colors ${
          size === "xs"
            ? "text-[10px] px-2 py-0.5 leading-tight"
            : "text-xs px-2.5 py-1 leading-normal"
        } bg-[#F1F5F9] text-[#334155] border-[#CBD5E1] ${className}`}
        title="Balanced macro composition ideal for daily sustained energy and healthy weight maintenance."
      >
        <Scale className="w-2.5 h-2.5 shrink-0 opacity-80" />
        <span>Weight Maintenance</span>
      </span>
    );
  }

  return null;
}

interface RecommendedGoalBadgeProps {
  className?: string;
}

export function RecommendedGoalBadge({ className = "" }: RecommendedGoalBadgeProps) {
  return (
    <span
      data-testid="recommended-goal-badge"
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs ${className}`}
      title="Personalized recommendation based on your active nutrition goal"
    >
      <Sparkles className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600 shrink-0" />
      <span>Recommended for your goal</span>
    </span>
  );
}
