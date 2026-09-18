"use client";

import React from "react";
import { useDietary } from "@/components/customer/dietary-context";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

interface VegetarianToggleProps {
  variant?: "header" | "mobile-header" | "drawer" | "compact";
  className?: string;
}

export function VegetarianToggle({ variant = "header", className }: VegetarianToggleProps) {
  const { isVegetarian, toggleVegetarian } = useDietary();

  if (variant === "mobile-header") {
    return (
      <button
        type="button"
        onClick={toggleVegetarian}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border transition-all cursor-pointer select-none shrink-0",
          isVegetarian
            ? "bg-nutri-green text-white border-nutri-green-dark shadow-xs"
            : "bg-white text-nutri-secondary border-nutri-border hover:border-nutri-green hover:text-nutri-charcoal",
          className
        )}
        aria-pressed={isVegetarian}
        title={isVegetarian ? "Vegetarian Mode: ON (Click to show all)" : "Vegetarian Mode: OFF (Click for Veg only)"}
      >
        <Leaf className={cn("w-3.5 h-3.5", isVegetarian ? "fill-white text-white" : "text-nutri-green")} />
        <span className="text-[11px] font-bold">Veg {isVegetarian ? "ON" : "OFF"}</span>
      </button>
    );
  }

  if (variant === "drawer") {
    return (
      <div className={cn("flex items-center justify-between p-3 rounded-2xl bg-nutri-bg border border-nutri-border", className)}>
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              isVegetarian ? "bg-nutri-green text-white" : "bg-white text-nutri-green border border-nutri-border"
            )}
          >
            <Leaf className={cn("w-4 h-4", isVegetarian && "fill-white")} />
          </div>
          <div>
            <p className="text-xs font-bold text-nutri-charcoal">Vegetarian Mode</p>
            <p className="text-[10px] text-nutri-secondary">
              {isVegetarian ? "Only 100% vegetarian products" : "Show all NutriFlexs products"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleVegetarian}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
            isVegetarian ? "bg-nutri-green" : "bg-neutral-300"
          )}
          role="switch"
          aria-checked={isVegetarian}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
              isVegetarian ? "translate-x-5" : "translate-x-0"
            )}
          />
        </button>
      </div>
    );
  }

  // Desktop Header variant
  return (
    <button
      type="button"
      onClick={toggleVegetarian}
      className={cn(
        "relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer select-none",
        isVegetarian
          ? "bg-nutri-green text-white border-nutri-green-deep shadow-xs"
          : "bg-nutri-green-soft text-nutri-charcoal border-nutri-border hover:border-nutri-green hover:bg-nutri-green-light/60",
        className
      )}
      aria-pressed={isVegetarian}
      title={isVegetarian ? "Vegetarian Mode: ON (Click to show all)" : "Vegetarian Mode: OFF (Click for Veg only)"}
    >
      <div
        className={cn(
          "w-4 h-4 rounded-full flex items-center justify-center transition-transform",
          isVegetarian ? "text-white" : "text-nutri-green"
        )}
      >
        <Leaf className={cn("w-3.5 h-3.5", isVegetarian ? "fill-white text-white" : "text-nutri-green fill-nutri-green/30")} />
      </div>

      <span className="text-xs font-extrabold tracking-tight">
        🥬 Vegetarian
      </span>

      <span
        className={cn(
          "text-[10px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
          isVegetarian
            ? "bg-white text-nutri-green font-black"
            : "bg-white/80 text-nutri-secondary border border-nutri-border"
        )}
      >
        {isVegetarian ? "ON" : "OFF"}
      </span>
    </button>
  );
}
