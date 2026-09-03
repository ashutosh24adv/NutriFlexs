"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, CheckCircle2, RotateCcw, ChevronRight, Zap, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatMacro } from "@/lib/utils";
import { useCart } from "@/components/customer/cart-context";

export default function CustomerOrdersPage() {
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Demo fallback orders if API call returns empty
  const initialOrders = [
    {
      id: "ord-1042",
      orderNumber: "NF-1042",
      status: "READY_FOR_PICKUP",
      outletName: "Indiranagar Cult Kiosk (50m away)",
      createdAt: "5 mins ago",
      totalAmount: 189,
      totalProtein: 36.0,
      totalCalories: 220,
      items: [
        {
          quantity: 1,
          product: {
            id: "prod-7",
            name: "Lean Grilled Chicken Breast",
            price: 210,
            protein: 36.0,
            calories: 220,
            imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
          }
        }
      ]
    },
    {
      id: "ord-1039",
      orderNumber: "NF-1039",
      status: "COMPLETED",
      outletName: "Indiranagar Cult Kiosk (50m away)",
      createdAt: "Yesterday at 7:45 PM",
      totalAmount: 230,
      totalProtein: 17.8,
      totalCalories: 217,
      items: [
        {
          quantity: 1,
          product: {
            id: "prod-11",
            name: "Lean Refuel Combo",
            price: 230,
            protein: 17.8,
            calories: 217,
            imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
          }
        }
      ]
    }
  ];

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (data.success && data.orders && data.orders.length > 0) {
          setOrders(data.orders);
        } else {
          setOrders(initialOrders);
        }
      } catch (e) {
        setOrders(initialOrders);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ORDER_PLACED":
        return <Badge variant="gold">ORDER PLACED</Badge>;
      case "ACCEPTED":
        return <Badge variant="gold">KITCHEN ACCEPTED</Badge>;
      case "PREPARING":
        return <Badge variant="gold" className="bg-amber-500 text-white font-bold animate-pulse">PREPARING (~3 MIN)</Badge>;
      case "READY_FOR_PICKUP":
        return <Badge variant="clean" className="bg-emerald-600 text-white font-extrabold animate-bounce">READY FOR PICKUP!</Badge>;
      case "COMPLETED":
        return <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">COMPLETED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
          Your Refuel Orders
        </h1>
        <p className="text-xs sm:text-sm text-nutri-muted mt-1">
          Track live pickup status or re-order your favorite post-workout combinations.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-5 border border-nutri-border h-32 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-nutri-border p-8">
          <Clock className="w-12 h-12 text-nutri-muted mx-auto mb-3" />
          <h3 className="text-lg font-bold text-nutri-charcoal font-heading">No Orders Yet</h3>
          <p className="text-xs text-nutri-muted mt-1">Place your first 3-minute post-workout order now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <Card key={ord.id} className="p-5 space-y-4 border-nutri-border hover:border-nutri-green/40 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-nutri-border-light">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold font-heading text-nutri-charcoal text-base">
                      {ord.orderNumber}
                    </span>
                    {getStatusBadge(ord.status)}
                  </div>
                  <p className="text-xs text-nutri-muted flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-nutri-green" /> {ord.outletName || ord.outlet?.name || "Express Kiosk"} · {ord.createdAt}
                  </p>
                </div>

                <Link
                  href={`/orders/${ord.id}`}
                  className="text-xs font-bold text-nutri-green hover:underline flex items-center gap-0.5"
                >
                  Track Live Status <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2">
                {ord.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-nutri-charcoal">
                      {item.quantity}× {item.product?.name || "NutriFlexs Meal"}
                    </span>
                    <span className="text-nutri-muted">{formatPrice(item.priceAtPurchase || item.product?.price || 0)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-nutri-border-light">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-nutri-green font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-nutri-green" /> {formatMacro(ord.totalProtein)} Protein
                  </span>
                  <span className="text-nutri-muted">·</span>
                  <span className="font-bold text-nutri-charcoal">{formatPrice(ord.totalAmount)}</span>
                </div>

                <Button
                  onClick={() => {
                    if (ord.items[0]?.product) {
                      addToCart(ord.items[0].product, 1);
                    }
                  }}
                  variant="secondary"
                  size="sm"
                  className="text-xs font-bold rounded-full"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> ORDER AGAIN
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
