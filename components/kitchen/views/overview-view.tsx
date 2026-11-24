"use client";

import React from "react";
import {
  ClipboardList,
  Flame,
  CheckCircle2,
  PackageCheck,
  Boxes,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface OverviewViewProps {
  ordersKpi: {
    newOrdersCount: number;
    acceptedOrdersCount: number;
    preparingOrdersCount: number;
    readyOrdersCount: number;
    completedTodayCount: number;
    totalDelayedCount: number;
  };
  inventoryOverview: {
    totalItems: number;
    inStockCount: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiringSoonCount: number;
    expiredCount: number;
    totalValuation: number;
    lowStockAlerts: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
      threshold: number;
      status: string;
    }>;
  };
  recentOrders: any[];
  onNavigateTab: (tab: any) => void;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
}

export function OverviewView({
  ordersKpi,
  inventoryOverview,
  recentOrders,
  onNavigateTab,
  onUpdateOrderStatus,
}: OverviewViewProps) {
  const activeQueueCount =
    ordersKpi.newOrdersCount +
    ordersKpi.acceptedOrdersCount +
    ordersKpi.preparingOrdersCount +
    ordersKpi.readyOrdersCount;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. New Orders */}
        <div
          onClick={() => onNavigateTab("orders")}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-rose-500/50 hover:bg-slate-900 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Orders</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 group-hover:text-rose-400 transition-colors">
            {ordersKpi.newOrdersCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-semibold">
            {ordersKpi.newOrdersCount > 0 ? (
              <span className="text-rose-400 font-bold">Needs acceptance</span>
            ) : (
              <span>Queue is clear</span>
            )}
          </p>
        </div>

        {/* 2. Preparing */}
        <div
          onClick={() => onNavigateTab("orders")}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-amber-500/50 hover:bg-slate-900 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Preparing</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 group-hover:text-amber-400 transition-colors">
            {ordersKpi.preparingOrdersCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-semibold">
            <span>In live prep</span>
          </p>
        </div>

        {/* 3. Ready for Pickup */}
        <div
          onClick={() => onNavigateTab("orders")}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-900 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ready Pickup</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 group-hover:text-emerald-400 transition-colors">
            {ordersKpi.readyOrdersCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-semibold">
            <span>Awaiting customer</span>
          </p>
        </div>

        {/* 4. Completed Today */}
        <div
          onClick={() => onNavigateTab("orders")}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-slate-700 hover:bg-slate-900 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Done Today</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 group-hover:text-blue-400 transition-colors">
            {ordersKpi.completedTodayCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-semibold">
            <span>Fulfilled orders</span>
          </p>
        </div>

        {/* 5. Total Inventory Items */}
        <div
          onClick={() => onNavigateTab("inventory")}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 hover:bg-slate-900 transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inventory</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2 group-hover:text-purple-400 transition-colors">
            {inventoryOverview.totalItems}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 truncate font-semibold">
            Val: {formatPrice(inventoryOverview.totalValuation)}
          </p>
        </div>

        {/* 6. Low Stock Alerts */}
        <div
          onClick={() => onNavigateTab("inventory")}
          className={`rounded-2xl p-4 cursor-pointer transition-all shadow-sm group border ${
            inventoryOverview.lowStockCount > 0 || inventoryOverview.outOfStockCount > 0
              ? "bg-amber-950/20 border-amber-800/60 hover:border-amber-600"
              : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Alerts</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                inventoryOverview.lowStockCount > 0 || inventoryOverview.outOfStockCount > 0
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-black mt-2 ${
              inventoryOverview.lowStockCount > 0 ? "text-amber-400" : "text-white"
            }`}
          >
            {inventoryOverview.lowStockCount + inventoryOverview.outOfStockCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-semibold">
            {inventoryOverview.outOfStockCount > 0 ? (
              <span className="text-rose-400 font-bold">{inventoryOverview.outOfStockCount} out of stock</span>
            ) : inventoryOverview.lowStockCount > 0 ? (
              <span className="text-amber-400 font-semibold">{inventoryOverview.lowStockCount} below threshold</span>
            ) : (
              <span>All items healthy</span>
            )}
          </p>
        </div>
      </div>

      {/* Main Two Columns: Live Order Queue & Critical Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Live Orders in Progress */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-extrabold text-white font-heading">
                Live Kitchen Order Queue ({activeQueueCount})
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab("orders")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              View KDS Board <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentOrders.filter(
              (o) => o.status !== "COMPLETED" && o.status !== "CANCELLED"
            ).length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs font-medium space-y-2">
                <CheckCircle2 className="w-8 h-8 text-slate-700 mx-auto" />
                <p>No active orders in the queue right now.</p>
                <p className="text-[11px] text-slate-600">New orders will chime and appear instantly.</p>
              </div>
            ) : (
              recentOrders
                .filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED")
                .slice(0, 5)
                .map((ord) => {
                  const isNew = ord.status === "ORDER_PLACED";
                  const isPrep = ord.status === "PREPARING";
                  const isReady = ord.status === "READY_FOR_PICKUP";

                  return (
                    <div
                      key={ord.id}
                      className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-emerald-400 font-heading">
                            {ord.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              isNew
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : isPrep
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {ord.status.replace(/_/g, " ")}
                          </span>

                          {ord.isDelayed && (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Delayed ({ord.elapsedMinutes}m)
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-200">
                          {ord.customerName} •{" "}
                          <span className="text-slate-400 font-normal">
                            {ord.items?.map((it: any) => `${it.quantity}x ${it.productName}`).join(", ")}
                          </span>
                        </p>

                        <p className="text-[11px] text-slate-500">
                          Placed {ord.elapsedMinutes} mins ago • Total {formatPrice(ord.totalAmount)}
                        </p>
                      </div>

                      {/* Quick action button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isNew && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, "PREPARING")}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            Start Prep →
                          </button>
                        )}
                        {isPrep && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, "READY_FOR_PICKUP")}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            Mark Ready ✔
                          </button>
                        )}
                        {isReady && (
                          <button
                            onClick={() => onUpdateOrderStatus(ord.id, "COMPLETED")}
                            className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            Deliver & Complete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Critical Stock Alerts & Restock */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-extrabold text-white font-heading">
                Stock & Expiry Alerts ({inventoryOverview.lowStockAlerts.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigateTab("inventory")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              All Inventory <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {inventoryOverview.lowStockAlerts.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs space-y-2">
                <CheckCircle2 className="w-7 h-7 text-emerald-500/50 mx-auto" />
                <p className="font-semibold text-slate-300">All kiosk ingredients have healthy stock levels.</p>
                <p className="text-[11px] text-slate-500">Thresholds are continuously audited against live orders.</p>
              </div>
            ) : (
              inventoryOverview.lowStockAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-200">{alert.name}</p>
                    <p className="text-[11px] text-slate-400">
                      Current:{" "}
                      <span className="font-bold text-amber-400">
                        {alert.quantity} {alert.unit}
                      </span>{" "}
                      • Min Threshold: {alert.threshold} {alert.unit}
                    </p>
                  </div>

                  <button
                    onClick={() => onNavigateTab("purchase")}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                  >
                    Restock
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Quick link to purchase restock */}
          <div className="pt-2 border-t border-slate-800">
            <button
              onClick={() => onNavigateTab("purchase")}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              <span>Record Stock Receipt / Restock</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
