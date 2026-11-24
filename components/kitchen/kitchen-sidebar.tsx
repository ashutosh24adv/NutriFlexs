"use client";

import React from "react";
import {
  LayoutDashboard,
  ClipboardList,
  Boxes,
  ArrowLeftRight,
  PackagePlus,
  Trash2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

export type KitchenTabType =
  | "overview"
  | "orders"
  | "inventory"
  | "movements"
  | "purchase"
  | "wastage"
  | "reports"
  | "settings";

interface KitchenSidebarProps {
  activeTab: KitchenTabType;
  onTabChange: (tab: KitchenTabType) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  liveOrdersCount?: number;
  lowStockCount?: number;
}

export function KitchenSidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  liveOrdersCount = 0,
  lowStockCount = 0,
}: KitchenSidebarProps) {
  const navItems: Array<{
    id: KitchenTabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "orders",
      label: "Live Orders",
      icon: ClipboardList,
      badge: liveOrdersCount,
      badgeColor: "bg-emerald-500 text-slate-950 font-bold",
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: "bg-amber-500 text-slate-950 font-bold",
    },
    {
      id: "movements",
      label: "Stock Movements",
      icon: ArrowLeftRight,
    },
    {
      id: "purchase",
      label: "Purchase / Restock",
      icon: PackagePlus,
    },
    {
      id: "wastage",
      label: "Wastage",
      icon: Trash2,
    },
    {
      id: "reports",
      label: "Reports",
      icon: BarChart3,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`bg-slate-950/90 border-r border-slate-800/80 flex flex-col transition-all duration-200 shrink-0 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Navigation list */}
      <nav className="p-3 space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group relative ${
                isActive
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                }`}
              />

              {!collapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}

              {/* Badge */}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                    item.badgeColor || "bg-slate-800 text-slate-300"
                  } ${collapsed ? "absolute -top-1 -right-1 text-[9px] px-1" : ""}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-slate-800/80">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 text-xs font-semibold transition-colors cursor-pointer"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
