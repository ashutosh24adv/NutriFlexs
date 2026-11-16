"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Utensils, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerModeSwitcherProps {
  className?: string;
  variant?: "header" | "drawer" | "floating";
}

export function CustomerModeSwitcher({ className = "", variant = "header" }: CustomerModeSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Determine active mode by path first, fallback to localStorage
  const isTrackActive = pathname.startsWith("/nutrition");
  const activeMode: "order" | "track" = isTrackActive ? "track" : "order";

  useEffect(() => {
    setMounted(true);
    // Keep active mode synchronized in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("nutriflexs_active_mode", activeMode);
    }
  }, [activeMode]);

  const handleSwitchMode = (targetMode: "order" | "track") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nutriflexs_active_mode", targetMode);
    }
    if (targetMode === "track") {
      if (!pathname.startsWith("/nutrition")) {
        router.push("/nutrition");
      }
    } else {
      if (pathname.startsWith("/nutrition")) {
        router.push("/menu");
      }
    }
  };

  if (!mounted) {
    // Render static SSR placeholder to prevent hydration mismatch
    return (
      <div className={cn("inline-flex items-center bg-nutri-bg border border-nutri-border rounded-full p-1 shadow-2xs", className)}>
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-nutri-green text-white flex items-center gap-1.5">
          <Utensils className="w-3.5 h-3.5" /> Order Food
        </span>
        <span className="px-2.5 py-1 text-xs font-semibold text-nutri-secondary flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" /> Track Nutrition
        </span>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Customer Mode Selector"
      className={cn(
        "inline-flex items-center bg-nutri-bg border border-nutri-border rounded-full p-1 shadow-2xs select-none",
        variant === "drawer" && "w-full justify-between bg-nutri-bg/80 p-1.5",
        className
      )}
    >
      <button
        type="button"
        onClick={() => handleSwitchMode("order")}
        className={cn(
          "flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
          activeMode === "order"
            ? "bg-nutri-green text-white shadow-xs"
            : "text-nutri-secondary hover:text-nutri-charcoal hover:bg-white/60",
          variant === "drawer" && "flex-1 py-2 text-xs"
        )}
      >
        <Utensils className={cn("w-3.5 h-3.5", activeMode === "order" ? "text-white" : "text-nutri-secondary")} />
        <span>Order Food</span>
      </button>

      <button
        type="button"
        onClick={() => handleSwitchMode("track")}
        className={cn(
          "flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
          activeMode === "track"
            ? "bg-nutri-green text-white shadow-xs"
            : "text-nutri-secondary hover:text-nutri-charcoal hover:bg-white/60",
          variant === "drawer" && "flex-1 py-2 text-xs"
        )}
      >
        <Flame className={cn("w-3.5 h-3.5", activeMode === "track" ? "text-white" : "text-nutri-secondary")} />
        <span>Track Nutrition</span>
      </button>
    </div>
  );
}

