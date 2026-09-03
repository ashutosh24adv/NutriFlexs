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
  const [activeOutlet, setActiveOutlet] = useState("Indiranagar Cult Kiosk");

  // Initial kitchen order queue
  const initialKitchenOrders = [
    {
      id: "ord-1043",
      orderNumber: "NF-1043",
      customerName: "Rohan M.",
      status: "ORDER_PLACED",
      createdAt: "Just now",
      totalAmount: 280,
      paymentStatus: "PAID",
      outletName: "Indiranagar Cult Kiosk",
      items: [
        { name: "Vegan Muscle Pack", quantity: 1, details: "Green Juice + Sprouts/Tofu Bowl" }
      ]
    },
    {
      id: "ord-1042",
      orderNumber: "NF-1042",
      customerName: "Ashu",
      status: "PREPARING",
      createdAt: "3 mins ago",
      totalAmount: 189,
      paymentStatus: "PAID",
      outletName: "Indiranagar Cult Kiosk",
      items: [
        { name: "Lean Grilled Chicken Breast", quantity: 1, details: "150g raw / 120g cooked with vegetables" }
      ]
    },
    {
      id: "ord-1040",
      orderNumber: "NF-1040",
      customerName: "Sneha P.",
      status: "READY_FOR_PICKUP",
      createdAt: "8 mins ago",
      totalAmount: 160,
      paymentStatus: "PAID",
      outletName: "Indiranagar Cult Kiosk",
      items: [
        { name: "ABC Stamina Rebuilder", quantity: 1, details: "Cold-pressed juice" }
      ]
    },
    {
      id: "ord-1038",
      orderNumber: "NF-1038",
      customerName: "Vikram K.",
      status: "COMPLETED",
      createdAt: "22 mins ago",
      totalAmount: 340,
      paymentStatus: "PAID",
      outletName: "Indiranagar Cult Kiosk",
      items: [
        { name: "Pro-Gainer Combo", quantity: 1, details: "Citrus Juice + Grilled Chicken" }
      ]
    }
  ];

  useEffect(() => {
    setOrders(initialKitchenOrders);
    setLoading(false);
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
              Active Outlet: <span className="text-emerald-400 font-semibold">{activeOutlet}</span> (50m from Cult.fit)
            </p>
          </div>
        </div>

        {/* Quick Portal Header Controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setOrders(initialKitchenOrders)}
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Queue
          </Button>

          <Link
            href="/home"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center gap-1"
          >
            <Shield className="w-3.5 h-3.5" /> Customer View
          </Link>
        </div>
      </div>

      {/* Operational 4-Column Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => o.status === col.key || (col.key === "ORDER_PLACED" && o.status === "ACCEPTED"));

          return (
            <div key={col.key} className="space-y-4">
              {/* Column Header Pill */}
              <div className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between ${col.color}`}>
                <span>{col.label}</span>
                <span className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-xs">
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards Column */}
              <div className="space-y-3">
                {colOrders.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                    No orders in stage
                  </div>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-slate-800 rounded-2xl p-4 border border-slate-700 shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                        <div>
                          <span className="font-extrabold text-white text-base font-heading">
                            {ord.orderNumber}
                          </span>
                          <p className="text-[11px] text-slate-400">{ord.customerName} · {ord.createdAt}</p>
                        </div>
                        <span className="text-xs bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-800 font-bold">
                          {ord.paymentStatus}
                        </span>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-1.5">
                        {ord.items.map((item: any, idx: number) => (
                          <div key={idx} className="bg-slate-900/80 p-2 rounded-xl text-xs">
                            <p className="font-bold text-slate-200">
                              {item.quantity}× {item.name}
                            </p>
                            {item.details && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.details}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Action Buttons based on status */}
                      <div className="pt-2">
                        {ord.status === "ORDER_PLACED" && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, "PREPARING")}
                            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-colors"
                          >
                            ACCEPT & PREPARE →
                          </button>
                        )}

                        {ord.status === "PREPARING" && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, "READY_FOR_PICKUP")}
                            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-colors animate-pulse"
                          >
                            MARK READY FOR PICKUP ✓
                          </button>
                        )}

                        {ord.status === "READY_FOR_PICKUP" && (
                          <button
                            onClick={() => handleUpdateStatus(ord.id, "COMPLETED")}
                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold text-xs rounded-xl transition-colors"
                          >
                            HANDOVER & COMPLETE
                          </button>
                        )}

                        {ord.status === "COMPLETED" && (
                          <div className="text-[11px] text-slate-500 text-center font-medium">
                            ✓ Handed over at counter
                          </div>
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
