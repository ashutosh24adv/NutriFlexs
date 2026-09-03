"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChefHat, Clock, Check, Zap, AlertCircle, ArrowRight, RefreshCw, Volume2, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOutlet, setActiveOutlet] = useState("Indiranagar Express Kiosk");

  async function fetchKitchenOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders?view=kitchen");
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error("Failed to fetch kitchen orders from database", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchKitchenOrders();
    } catch (e) {
      console.error("Status update error", e);
    }
  };

  const columns = [
    { key: "ORDER_PLACED", label: "NEW ORDERS", color: "bg-rose-50 border-rose-200 text-rose-800" },
    { key: "PREPARING", label: "PREPARING (~3 MIN)", color: "bg-amber-50 border-amber-200 text-amber-900" },
    { key: "READY_FOR_PICKUP", label: "READY FOR PICKUP", color: "bg-emerald-50 border-emerald-200 text-emerald-900" },
    { key: "COMPLETED", label: "COMPLETED", color: "bg-gray-50 border-gray-200 text-gray-700" },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 space-y-6 font-sans">
      {/* Kiosk Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold shadow-lg">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-heading text-white">Kiosk Kitchen Display System</h1>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-400">
              Express Kiosk Orders • Live PostgreSQL Connection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchKitchenOrders}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            title="Refresh Live Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/home"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl border border-slate-700 font-semibold transition-colors"
          >
            Customer App View →
          </Link>
        </div>
      </div>

      {/* KDS Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key);

          return (
            <div key={col.key} className="bg-slate-950/60 rounded-3xl p-4 border border-slate-800 space-y-3 min-h-[500px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs font-bold text-slate-400">{colOrders.length}</span>
              </div>

              <div className="space-y-3">
                {colOrders.length === 0 ? (
                  <div className="py-12 text-center text-slate-600 text-xs font-medium">
                    No orders in this queue
                  </div>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div>
                          <span className="text-sm font-extrabold text-emerald-400 font-heading">
                            {ord.orderNumber}
                          </span>
                          <p className="text-[11px] font-bold text-slate-300 mt-0.5">
                            {ord.user?.name || "Customer"}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                          {new Date(ord.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 py-1">
                        {ord.items?.map((item: any) => (
                          <div key={item.id} className="text-xs flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-200">
                              {item.quantity}x {item.product?.name || item.name}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-extrabold shrink-0">
                              {item.product?.protein || 30}g P
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400">
                          {formatPrice(ord.totalAmount)}
                        </span>

                        {col.key === "ORDER_PLACED" && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, "PREPARING")}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            Start Prep →
                          </button>
                        )}
                        {col.key === "PREPARING" && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, "READY_FOR_PICKUP")}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            Mark Ready →
                          </button>
                        )}
                        {col.key === "READY_FOR_PICKUP" && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, "COMPLETED")}
                            className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            Complete ✔
                          </button>
                        )}
                        {col.key === "COMPLETED" && (
                          <span className="text-[10px] font-bold text-slate-500 uppercase">
                            Delivered
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
