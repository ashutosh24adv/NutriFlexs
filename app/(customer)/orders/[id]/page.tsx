"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Clock, CheckCircle2, MapPin, PhoneCall, ChevronLeft, RefreshCw, ChefHat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchOrderDetails() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(data.error || "Order not found in database");
      }
    } catch (e: any) {
      setError(e.message || "Failed to load order status from database");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
      const interval = setInterval(fetchOrderDetails, 5000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const stages = [
    { key: "ORDER_PLACED", label: "Order Placed", desc: "Sent to Express Kiosk" },
    { key: "ACCEPTED", label: "Accepted", desc: "Kitchen staff confirmed order" },
    { key: "PREPARING", label: "Preparing Fresh", desc: "Express 5-min preparation" },
    { key: "READY_FOR_PICKUP", label: "Ready for Pickup", desc: "Counter pickup at Kiosk" },
    { key: "COMPLETED", label: "Completed", desc: "Refueled & ready to hit goals" },
  ];

  const getStageIndex = (status: string) => {
    const idx = stages.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : 0;
  };

  if (loading && !order) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-nutri-green animate-spin mx-auto" />
        <p className="text-xs font-bold text-nutri-secondary">Loading live order status from PostgreSQL...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-4 text-center">
        <Card className="p-8 bg-white border border-nutri-border rounded-3xl space-y-3">
          <p className="text-sm font-bold text-nutri-charcoal">{error || "Order details unavailable"}</p>
          <Link href="/orders">
            <Button size="md" className="bg-nutri-green text-white font-bold text-xs rounded-full">
              Back to Your Orders
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const currentStageIdx = getStageIndex(order.status);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-nutri-border pb-4">
        <div>
          <Link href="/orders" className="text-xs font-semibold text-nutri-secondary hover:text-nutri-green flex items-center gap-1 mb-1">
            <ChevronLeft className="w-4 h-4" /> All Orders
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
            Order #{order.orderNumber}
          </h1>
          <p className="text-xs text-nutri-secondary mt-0.5">
            Placed on {new Date(order.createdAt).toLocaleString("en-IN")}
          </p>
        </div>

        <button
          onClick={fetchOrderDetails}
          className="p-2 rounded-xl bg-white border border-nutri-border text-nutri-secondary hover:text-nutri-green transition-colors cursor-pointer"
          title="Refresh Live Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Progress Timeline Stepper */}
      <Card className="p-6 border-nutri-border bg-white rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold font-heading text-nutri-charcoal uppercase tracking-wider">
            Live Kiosk Status
          </span>
          <span className="text-xs font-bold text-nutri-green bg-nutri-green-light px-3 py-1 rounded-full border border-nutri-border">
            {order.status.replace("_", " ")}
          </span>
        </div>

        <div className="relative flex flex-col md:flex-row justify-between gap-4">
          {stages.map((stage, idx) => {
            const isDone = idx <= currentStageIdx;
            const isCurrent = idx === currentStageIdx;

            return (
              <div key={stage.key} className="flex md:flex-col items-center gap-3 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isDone
                      ? "bg-nutri-green text-white shadow-xs"
                      : "bg-nutri-green-soft text-nutri-secondary border border-nutri-border"
                  } ${isCurrent ? "ring-4 ring-nutri-green-light" : ""}`}
                >
                  {isDone ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : idx + 1}
                </div>
                <div className="text-left md:text-center">
                  <p className={`text-xs font-bold ${isCurrent ? "text-nutri-green font-extrabold" : "text-nutri-charcoal"}`}>
                    {stage.label}
                  </p>
                  <p className="text-[10px] text-nutri-secondary">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Outlet Location Details */}
      <Card className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="font-extrabold text-nutri-charcoal text-sm">{order.outlet?.name || "Indiranagar Express Kiosk"}</h4>
              <p className="text-xs text-nutri-secondary mt-0.5">{order.outlet?.address || "100 Feet Road, Indiranagar"}</p>
            </div>
          </div>

          {order.outlet?.phone && (
            <a
              href={`tel:${order.outlet.phone}`}
              className="p-2.5 rounded-full bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft transition-colors"
            >
              <PhoneCall className="w-4 h-4 stroke-[2.5]" />
            </a>
          )}
        </div>
      </Card>

      {/* Purchased Items & Macros */}
      <Card className="p-6 border-nutri-border bg-white rounded-3xl shadow-xs space-y-4">
        <h3 className="font-extrabold text-nutri-charcoal font-heading text-base border-b border-nutri-border-light pb-3">
          Order Summary & Protein Snapshot
        </h3>

        <div className="space-y-3">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-nutri-border-light">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-nutri-bg shrink-0 border border-nutri-border-light">
                  <Image
                    src={item.product?.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80"}
                    alt={item.product?.name || "Product"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-bold text-nutri-charcoal text-sm">{item.quantity}x {item.product?.name}</p>
                  <p className="text-xs text-nutri-secondary mt-0.5">
                    <span className="text-nutri-green font-bold">{item.product?.protein}g Protein</span> • {item.product?.calories} kcal
                  </p>
                </div>
              </div>
              <span className="font-extrabold text-nutri-green text-sm">{formatPrice(item.priceAtPurchase * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 space-y-1.5 text-xs text-nutri-secondary">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-bold text-nutri-charcoal">{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-nutri-green">
              <span>Discount Applied</span>
              <span className="font-bold">-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-extrabold text-nutri-charcoal pt-2 border-t border-nutri-border">
            <span>Total Paid</span>
            <span className="text-nutri-green">{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
