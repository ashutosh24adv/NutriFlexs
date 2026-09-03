"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock, CheckCircle2, MapPin, Zap, PhoneCall, ChevronLeft, Sparkles, ChefHat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatMacro } from "@/lib/utils";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Demo fallback order data
  const demoOrder = {
    id: orderId || "ord-1042",
    orderNumber: "NF-1042",
    status: "READY_FOR_PICKUP",
    estimatedPrepMinutes: 3,
    subtotal: 210,
    discount: 21,
    totalAmount: 189,
    totalProtein: 36.0,
    totalCalories: 220,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    outlet: {
      name: "Indiranagar Cult Express Kiosk (50m from Gym)",
      address: "Express Kiosk #1, 100 Feet Road, Indiranagar",
      phone: "+91 98765 43210",
    },
    items: [
      {
        quantity: 1,
        priceAtPurchase: 210,
        product: {
          name: "Lean Grilled Chicken Breast",
          protein: 36.0,
          calories: 220,
          imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
        }
      }
    ]
  };

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          setOrder(demoOrder);
        }
      } catch (e) {
        setOrder(demoOrder);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  const stages = [
    { key: "ORDER_PLACED", label: "Order Placed", desc: "Sent to Indiranagar Kiosk" },
    { key: "ACCEPTED", label: "Accepted", desc: "Kitchen staff confirmed order" },
    { key: "PREPARING", label: "Preparing Fresh", desc: "Hot protein preparation" },
    { key: "READY_FOR_PICKUP", label: "Ready for Pickup", desc: "Pickup at Express Kiosk counter" },
    { key: "COMPLETED", label: "Completed", desc: "Refueled & ready to hit goals" },
  ];

  const getStageIndex = (status: string) => {
    const idx = stages.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 3; // Default to READY_FOR_PICKUP stage for demo
  };

  const currentStageIdx = order ? getStageIndex(order.status) : 3;
  const isReady = order?.status === "READY_FOR_PICKUP" || currentStageIdx >= 3;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Top Back Nav */}
      <div className="flex items-center justify-between">
        <Link href="/orders" className="text-xs font-semibold text-nutri-muted hover:text-nutri-green flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <span className="text-xs font-bold text-nutri-muted">Order #{order?.orderNumber || "NF-1042"}</span>
      </div>

      {/* Main Status Hero Card */}
      <Card className={`p-6 sm:p-8 text-center rounded-3xl relative overflow-hidden ${
        isReady
          ? "bg-gradient-to-br from-nutri-green via-emerald-900 to-nutri-green-dark text-white shadow-float"
          : "bg-white border-nutri-border shadow-card"
      }`}>
        {isReady && (
          <div className="inline-flex items-center gap-1.5 bg-amber-400 text-nutri-charcoal font-extrabold text-xs uppercase px-3 py-1 rounded-full mb-3 shadow-md animate-bounce">
            <Sparkles className="w-3.5 h-3.5 fill-current" /> YOUR ORDER IS READY!
          </div>
        )}

        <h1 className={`text-2xl sm:text-3xl font-extrabold font-heading ${isReady ? "text-white" : "text-nutri-charcoal"}`}>
          {isReady ? "Pickup at Express Kiosk Counter" : "Preparing Your Clean Fuel..."}
        </h1>

        <p className={`text-xs sm:text-sm mt-1 max-w-md mx-auto ${isReady ? "text-emerald-100" : "text-nutri-muted"}`}>
          {isReady
            ? "Your order has been freshly prepared and is waiting for you at the kiosk counter (50m from Cult.fit)."
            : "Estimated prep time ~3 minutes. Our express kitchen staff is preparing your high-protein meal."}
        </p>

        {/* Countdown Pill */}
        <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-md px-5 py-2.5 rounded-full mt-5 text-sm font-bold text-white border border-white/20">
          <Clock className="w-4 h-4 text-nutri-accent animate-pulse" />
          <span>{isReady ? "READY NOW" : "ESTIMATED READY IN ~3 MIN"}</span>
        </div>
      </Card>

      {/* Live Order Timeline Progress */}
      <Card className="p-6">
        <h3 className="text-sm font-bold font-heading text-nutri-charcoal mb-4">
          Live Pickup Timeline
        </h3>

        <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-nutri-border-light">
          {stages.map((stage, idx) => {
            const isDone = idx <= currentStageIdx;
            const isCurrent = idx === currentStageIdx;

            return (
              <div key={stage.key} className="relative flex items-start gap-4 z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  isDone
                    ? "bg-nutri-green text-white shadow-sm"
                    : "bg-nutri-bg text-nutri-muted border border-nutri-border"
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>

                <div className="pt-0.5">
                  <h4 className={`text-xs font-bold ${isCurrent ? "text-nutri-green text-sm" : isDone ? "text-nutri-charcoal" : "text-nutri-muted"}`}>
                    {stage.label}
                  </h4>
                  <p className="text-[11px] text-nutri-muted mt-0.5">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Outlet Location Details */}
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-nutri-green" /> Pickup Express Kiosk Location
          </div>
          <h4 className="font-bold text-nutri-charcoal text-sm mt-1">
            {order?.outlet?.name || "Indiranagar Cult Express Kiosk"}
          </h4>
          <p className="text-xs text-nutri-muted mt-0.5">
            {order?.outlet?.address || "Express Kiosk #1, 100 Feet Road, Indiranagar"}
          </p>
        </div>

        <a
          href={`tel:${order?.outlet?.phone || "+919876543210"}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft rounded-full transition-colors shrink-0"
        >
          <PhoneCall className="w-3.5 h-3.5" /> Call Kiosk Counter
        </a>
      </Card>

      {/* Order Summary & Nutrition */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-bold font-heading text-nutri-charcoal border-b border-nutri-border-light pb-2">
          Order Summary & Nutrition
        </h3>

        <div className="space-y-3">
          {(order?.items || demoOrder.items).map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-nutri-charcoal">{item.quantity}× {item.product?.name}</p>
                <p className="text-[11px] text-nutri-green font-medium">
                  {formatMacro(item.product?.protein || 0)} Protein · {item.product?.calories || 0} kcal
                </p>
              </div>
              <span className="font-bold text-nutri-charcoal">
                {formatPrice(item.priceAtPurchase || item.product?.price || 0)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-nutri-border-light space-y-1 text-xs">
          <div className="flex justify-between text-nutri-muted">
            <span>Total Protein Provided</span>
            <span className="text-nutri-green font-bold">{formatMacro(order?.totalProtein || 36)}</span>
          </div>
          <div className="flex justify-between font-bold text-nutri-charcoal text-sm font-heading pt-1">
            <span>Total Paid</span>
            <span>{formatPrice(order?.totalAmount || 189)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
