"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  ChefHat,
  RefreshCw,
  LogOut,
  Bell,
  BellOff,
  Clock,
  Building2,
  ChevronDown,
  User,
  ShieldCheck,
  Menu,
} from "lucide-react";

interface KitchenHeaderProps {
  outletName: string;
  outletId: string;
  outlets?: Array<{ id: string; name: string }>;
  onSelectOutlet?: (outletId: string) => void;
  userRole?: string;
  userName?: string;
  loading: boolean;
  onRefresh: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onToggleSidebar?: () => void;
}

export function KitchenHeader({
  outletName,
  outletId,
  outlets = [],
  onSelectOutlet,
  userRole = "KITCHEN",
  userName = "Staff",
  loading,
  onRefresh,
  soundEnabled,
  onToggleSound,
  onToggleSidebar,
}: KitchenHeaderProps) {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [outletMenuOpen, setOutletMenuOpen] = useState(false);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDateStr(
        now.toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Branding & Outlet */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              title="Toggle Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-slate-950 flex items-center justify-center font-extrabold shadow-lg shadow-emerald-950/40">
              <ChefHat className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold font-heading text-white tracking-tight">
                  NutriFlexs <span className="text-emerald-400 font-normal">Kitchen OS</span>
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>

              {/* Outlet name & switcher for Admin */}
              <div className="relative">
                {userRole === "ADMIN" && outlets.length > 1 ? (
                  <button
                    onClick={() => setOutletMenuOpen(!outletMenuOpen)}
                    className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-emerald-400 font-medium transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="max-w-[200px] truncate">{outletName}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="max-w-[200px] sm:max-w-[280px] truncate">{outletName}</span>
                  </div>
                )}

                {/* Dropdown for Admins to switch outlets */}
                {outletMenuOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 z-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Switch Kiosk Outlet
                    </p>
                    {outlets.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => {
                          if (onSelectOutlet) onSelectOutlet(o.id);
                          setOutletMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                          o.id === outletId
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{o.name}</span>
                        {o.id === outletId && <span className="text-emerald-400 text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Clock, Audio Alerts, Refresh, Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clock */}
          <div className="hidden md:flex flex-col items-end px-3 py-1 bg-slate-900/80 border border-slate-800/80 rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{timeStr || "12:00:00 PM"}</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">{dateStr}</span>
          </div>

          {/* Sound Alert Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled
                ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/60"
                : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title={soundEnabled ? "Audio Chime Enabled for New Orders" : "Audio Chime Muted"}
          >
            {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          {/* Staff Profile Pill */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-200 leading-tight max-w-[110px] truncate">
                {userName}
              </p>
              <p className="text-[10px] font-semibold text-emerald-400 leading-none">
                {userRole === "ADMIN" ? "Kitchen Admin" : "Kitchen Staff"}
              </p>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={() => signOut({ callbackUrl: "/kitchen/login" })}
            className="text-xs bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 hover:text-rose-100 px-3 py-2 rounded-xl border border-rose-800/60 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Sign Out of Kitchen Kiosk"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
