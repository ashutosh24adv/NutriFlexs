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
          "relative inline-flex items-center justify-center gap-1 h-[28px] px-2.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer select-none shrink-0 shadow-xs",
          isVegetarian
            ? "bg-nutri-green text-white border-nutri-green-dark"
            : "bg-white text-nutri-secondary border-nutri-border hover:border-nutri-green hover:text-nutri-charcoal",
          className
        )}
        aria-pressed={isVegetarian}
        title={isVegetarian ? "Vegetarian Mode: ON (Click to show all)" : "Vegetarian Mode: OFF (Click for Veg only)"}
      >
        <Leaf
          className={cn(
            "w-3 h-3 shrink-0 transition-colors",
            isVegetarian ? "fill-white text-white" : "text-nutri-secondary"
          )}
        />
        <span className="text-[11px] font-bold leading-none tracking-tight">
          Veg {isVegetarian ? "ON" : "OFF"}
        </span>
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
              isVegetarian ? "bg-nutri-green text-white" : "bg-white text-nutri-secondary border border-nutri-border"
            )}
          >
            <Leaf className={cn("w-4 h-4", isVegetarian ? "fill-white text-white" : "text-nutri-secondary")} />
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
        "relative inline-flex items-center justify-center gap-1.5 h-[30px] px-3 rounded-full text-xs font-bold border transition-all cursor-pointer select-none shrink-0 shadow-xs",
        isVegetarian
          ? "bg-nutri-green text-white border-nutri-green-deep"
          : "bg-white text-nutri-secondary border-nutri-border hover:border-nutri-green hover:text-nutri-charcoal",
        className
      )}
      aria-pressed={isVegetarian}
      title={isVegetarian ? "Vegetarian Mode: ON (Click to show all)" : "Vegetarian Mode: OFF (Click for Veg only)"}
    >
      <Leaf
        className={cn(
          "w-3.5 h-3.5 shrink-0 transition-colors",
          isVegetarian ? "fill-white text-white" : "text-nutri-secondary"
        )}
      />

      <span className="text-[11px] font-bold leading-none tracking-tight">
        Veg {isVegetarian ? "ON" : "OFF"}
      </span>
    </button>
  );
}
