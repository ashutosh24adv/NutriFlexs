"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface FuelPointsPillProps {
  variant?: "header" | "mobile";
  onNavigate?: () => void;
}

export function FuelPointsPill({ variant = "header", onNavigate }: FuelPointsPillProps) {
  const pathname = usePathname();
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && typeof json.data?.account?.availableBalance === "number") {
        setBalance(json.data.account.availableBalance);
      }
    } catch {
      // Non-blocking navbar indicator
    }
  }, []);

  useEffect(() => {
    fetchBalance();

    const handleRefresh = () => {
      fetchBalance();
    };

    window.addEventListener("nutriflexs:rewards-updated", handleRefresh);
    return () => {
      window.removeEventListener("nutriflexs:rewards-updated", handleRefresh);
    };
  }, [fetchBalance, pathname]);

  const isActive = pathname === "/rewards" || pathname.startsWith("/rewards/");
  const displayValue = balance === null ? "..." : `${balance.toLocaleString("en-IN")} FP`;

  if (variant === "mobile") {
    return (
      <Link
        href="/rewards"
        onClick={onNavigate}
        className={cn(
          "flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-colors",
          isActive
            ? "bg-[#2F7D16] text-white border-[#2F7D16]"
            : "bg-[#EAF4E3] text-[#24630F] border-[#CFE5C3] hover:bg-[#DFF0D4]"
        )}
      >
        <span className="flex items-center gap-2">
          <Zap className="w-4 h-4 fill-current" />
          FuelPoints Rewards
        </span>
        <span className="tabular-nums font-extrabold">{displayValue}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/rewards"
      title="FuelPoints Balance & Rewards"
      className={cn(
        "inline-flex items-center gap-1.5 h-[38px] px-3 rounded-full border text-xs font-bold transition-all duration-200 whitespace-nowrap shrink-0",
        isActive
          ? "bg-[#2F7D16] text-white border-[#2F7D16] shadow-xs"
          : "bg-[#EAF4E3] text-[#24630F] border-[#CFE5C3] hover:bg-[#DFF0D4] hover:border-[#2F7D16]/40"
      )}
    >
      <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
      <span className="tabular-nums">{displayValue}</span>
    </Link>
  );
}
