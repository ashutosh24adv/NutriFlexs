import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "protein" | "calories" | "clean" | "veg" | "nonveg" | "outline" | "gold";
}

export function Badge({ children, variant = "protein", className, ...props }: BadgeProps) {
  const variantStyles = {
    protein: "bg-nutri-green-light text-nutri-green border-nutri-green-soft font-semibold",
    calories: "bg-orange-50 text-orange-800 border-orange-200 font-medium",
    clean: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold",
    veg: "bg-emerald-50 text-emerald-700 border-emerald-300 font-medium",
    nonveg: "bg-rose-50 text-rose-700 border-rose-200 font-medium",
    outline: "bg-transparent text-nutri-charcoal border-nutri-border",
    gold: "bg-amber-50 text-amber-900 border-amber-300 font-semibold",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border transition-colors",
        variantStyles,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
