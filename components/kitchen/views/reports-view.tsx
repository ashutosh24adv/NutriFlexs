"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  PackageCheck,
  Trash2,
  DollarSign,
  Boxes,
  RefreshCw,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ReportsViewProps {
  outletId: string;
}

export function ReportsView({ outletId }: ReportsViewProps) {
  const [reports, setReports] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`/api/kitchen/reports?outletId=${outletId}`);
      const data = await res.json();
      if (data.success) {
        setReports(data);
      }
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, [outletId]);

  if (loading || !reports) {
    return (
      <div className="py-20 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Loading kitchen intelligence and operational reports...</span>
      </div>
    );
  }

  const { today, pastSevenDays, inventoryOverview } = reports;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white font-heading">
              Kitchen Operational Intelligence & Reports
            </h2>
            <p className="text-xs text-slate-400">
              Real-time analytics on order throughput, ingredient consumption, purchasing, and wastage
            </p>
          </div>
        </div>

        <button
          onClick={fetchReports}
          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
          title="Refresh Reports"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Orders</span>
          <p className="text-2xl font-black text-white mt-1">{today.totalOrders}</p>
          <p className="text-[10px] text-emerald-400 mt-1 font-semibold">
            {today.completedOrders} completed ({Math.round((today.completedOrders / (today.totalOrders || 1)) * 100)}%)
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Revenue</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">{formatPrice(today.revenue)}</p>
          <p className="text-[10px] text-slate-400 mt-1">From fulfilled kiosk orders</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">7-Day Restock Spend</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{formatPrice(pastSevenDays.purchasesTotal)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Total inventory received</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">7-Day Wastage Loss</span>
          <p className="text-2xl font-black text-rose-400 mt-1">{formatPrice(pastSevenDays.wastageTotal)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Spoilage & discard cost</p>
        </div>
      </div>

      {/* Two columns: Top Consumed Ingredients & Inventory Valuation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Top Consumed Ingredients past 7 days */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Top Consumed Ingredients (Past 7 Days)
            </h3>
          </div>

          <div className="space-y-3">
            {pastSevenDays.topConsumed.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No consumption records logged in the past 7 days.
              </p>
            ) : (
              pastSevenDays.topConsumed.map((item: any, idx: number) => {
                const maxVal = pastSevenDays.topConsumed[0]?.quantity || 1;
                const pct = Math.round((item.quantity / maxVal) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-200">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="font-black text-emerald-400 font-mono">
                        {Math.round(item.quantity * 10) / 10} units
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Valuation & Stock Distribution */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Boxes className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Inventory Health Breakdown
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-slate-400">Total Capital in Stock</span>
              <span className="font-black text-emerald-400 text-sm">
                {formatPrice(inventoryOverview.totalValuation)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-slate-400">In-Stock Ingredients</span>
              <span className="font-bold text-white">{inventoryOverview.inStockCount} items</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-slate-400">Low-Stock Warnings</span>
              <span className="font-bold text-amber-400">{inventoryOverview.lowStockCount} items</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-slate-400">Out-of-Stock Ingredients</span>
              <span className="font-bold text-rose-400">{inventoryOverview.outOfStockCount} items</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
              <span className="text-slate-400">Expiring in &lt; 5 Days</span>
              <span className="font-bold text-purple-400">{inventoryOverview.expiringSoonCount} items</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
