import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-nutri-green/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const variantStyles = {
    primary: "bg-nutri-green text-white hover:bg-nutri-green-hover shadow-sm hover:shadow-card",
    secondary: "bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft border border-nutri-green-soft",
    outline: "border border-nutri-border text-nutri-charcoal hover:bg-nutri-border-light",
    ghost: "text-nutri-charcoal hover:bg-nutri-green-light/60",
    gold: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm hover:brightness-105",
  }[variant];

  const sizeStyles = {
    sm: "text-xs px-3.5 py-1.5 h-8",
    md: "text-sm px-5 py-2.5 h-10",
    lg: "text-base px-7 py-3.5 h-12 font-semibold",
  }[size];

  return (
    <button
      className={cn(baseStyles, variantStyles, sizeStyles, className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
