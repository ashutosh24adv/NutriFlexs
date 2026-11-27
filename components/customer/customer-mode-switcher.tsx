"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Utensils, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerModeSwitcherProps {
  className?: string;
  variant?: "header" | "drawer" | "floating";
}

export function CustomerModeSwitcher({
  className = "",
  variant = "header",
}: CustomerModeSwitcherProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Strict route-based active states:
  // /menu (or /menu/*) -> Order Food highlighted
  // /nutrition (or /nutrition/*) -> Track Nutrition highlighted
  // /home or other routes -> neither highlighted
  const isOrderActive = pathname === "/menu" || pathname.startsWith("/menu/");
  const isTrackActive = pathname === "/nutrition" || pathname.startsWith("/nutrition/");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      if (isTrackActive) {
        localStorage.setItem("nutriflexs_active_mode", "track");
      } else if (isOrderActive) {
        localStorage.setItem("nutriflexs_active_mode", "order");
      }
    }
  }, [isOrderActive, isTrackActive]);

  const handleSwitchMode = (targetMode: "order" | "track") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nutriflexs_active_mode", targetMode);
    }
    if (targetMode === "track") {
      if (!isTrackActive) {
        router.push("/nutrition");
      }
    } else {
      if (!isOrderActive) {
        router.push("/menu");
      }
    }
  };

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex items-center bg-nutri-bg border border-nutri-border rounded-full p-1 shadow-2xs",
          className
        )}
      >
        <span
          className={cn(
            "px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1.5",
            isOrderActive ? "bg-nutri-green text-white" : "text-nutri-secondary"
          )}
        >
          <Utensils className="w-3.5 h-3.5" /> Order Food
        </span>
        <span
          className={cn(
            "px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1.5",
            isTrackActive ? "bg-nutri-green text-white" : "text-nutri-secondary"
          )}
        >
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
        aria-current={isOrderActive ? "page" : undefined}
        className={cn(
          "flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
          isOrderActive
            ? "bg-nutri-green text-white shadow-xs"
            : "text-nutri-secondary hover:text-nutri-charcoal hover:bg-white/60",
          variant === "drawer" && "flex-1 py-2 text-xs"
        )}
      >
        <Utensils
          className={cn("w-3.5 h-3.5", isOrderActive ? "text-white" : "text-nutri-secondary")}
        />
        <span>Order Food</span>
      </button>

      <button
        type="button"
        onClick={() => handleSwitchMode("track")}
        aria-current={isTrackActive ? "page" : undefined}
        className={cn(
          "flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
          isTrackActive
            ? "bg-nutri-green text-white shadow-xs"
            : "text-nutri-secondary hover:text-nutri-charcoal hover:bg-white/60",
          variant === "drawer" && "flex-1 py-2 text-xs"
        )}
      >
        <Flame
          className={cn("w-3.5 h-3.5", isTrackActive ? "text-white" : "text-nutri-secondary")}
        />
        <span>Track Nutrition</span>
      </button>
    </div>
  );
}
