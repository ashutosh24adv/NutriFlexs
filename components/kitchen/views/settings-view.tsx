"use client";

import React from "react";
import {
  Settings,
  Bell,
  Volume2,
  Clock,
  Building2,
  User,
  ShieldCheck,
  Database,
  CheckCircle2,
} from "lucide-react";

interface SettingsViewProps {
  outletName: string;
  outletId: string;
  userName: string;
  userRole: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onTestSound: () => void;
  refreshInterval: number;
  onChangeRefreshInterval: (interval: number) => void;
}

export function SettingsView({
  outletName,
  outletId,
  userName,
  userRole,
  soundEnabled,
  onToggleSound,
  onTestSound,
  refreshInterval,
  onChangeRefreshInterval,
}: SettingsViewProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white font-heading">
              Kitchen Display & Operations Settings
            </h2>
            <p className="text-xs text-slate-400">
              Configure kiosk notifications, auto-sync intervals, and outlet station parameters
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Audio & Alert Preferences */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Bell className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white">Audio & Sound Alerts</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800">
              <div>
                <p className="font-bold text-slate-200">New Order Audio Chime</p>
                <p className="text-[11px] text-slate-400">
                  Plays Web Audio chime when a new order arrives in queue
                </p>
              </div>

              <button
                onClick={onToggleSound}
                className={`w-12 h-6 rounded-full p-1 transition-colors relative cursor-pointer ${
                  soundEnabled ? "bg-emerald-500" : "bg-slate-800"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    soundEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={onTestSound}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Test Chime Tone</span>
            </button>
          </div>
        </div>

        {/* Live Auto-Refresh Interval */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white">Live Data Polling & Sync</h3>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-400">
              Select how frequently the KDS polls PostgreSQL for newly placed kiosk orders:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Fast (5s)", val: 5000 },
                { label: "Normal (10s)", val: 10000 },
                { label: "Eco (30s)", val: 30000 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => onChangeRefreshInterval(opt.val)}
                  className={`py-2.5 rounded-xl font-bold transition-colors cursor-pointer ${
                    refreshInterval === opt.val
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Outlet & Hardware Information */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white">Assigned Kiosk Outlet</h3>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Outlet Name</span>
              <span className="font-extrabold text-white">{outletName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Outlet ID</span>
              <span className="font-mono text-emerald-400 text-[10px]">{outletId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Operating System</span>
              <span className="text-slate-300">NutriFlexs KDS 2.0 Web Client</span>
            </div>
          </div>
        </div>

        {/* Authenticated Staff Information */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3 text-xs">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white">Staff Authorization</h3>
          </div>

          <div className="space-y-2 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Staff Name</span>
              <span className="font-extrabold text-white">{userName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Assigned Role</span>
              <span className="text-emerald-400 font-bold uppercase">{userRole}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated & Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
