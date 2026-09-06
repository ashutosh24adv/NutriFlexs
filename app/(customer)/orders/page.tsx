"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, ArrowRight, RotateCcw, RefreshCw, ChevronRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/components/customer/cart-context";

export default function CustomerOrdersPage() {
  const { addToCart } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
      }
    } catch (e) {
      console.error("Failed to load customer orders from PostgreSQL", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOrderAgainOrder = (order: any) => {
    if (order.items && order.items.length > 0) {
      order.items.forEach((item: any) => {
        if (item.product) {
          addToCart(item.product, item.quantity);
        }
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ORDER_PLACED":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">ORDER PLACED</Badge>;
      case "ACCEPTED":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">KITCHEN ACCEPTED</Badge>;
      case "PREPARING":
        return <Badge className="bg-amber-500 text-white font-bold animate-pulse">PREPARING (~5 MIN)</Badge>;
      case "READY_FOR_PICKUP":
        return <Badge className="bg-nutri-green text-white font-extrabold animate-bounce">READY FOR PICKUP!</Badge>;
      case "COMPLETED":
        return <Badge className="bg-nutri-green-light text-nutri-green border-nutri-border font-bold">COMPLETED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between border-b border-nutri-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
            Your Refuel Orders 📦
          </h1>
          <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
            Live PostgreSQL status • Express 5-minute kiosk pickup tracking
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="p-2 rounded-xl bg-white border border-nutri-border text-nutri-secondary hover:text-nutri-green transition-colors cursor-pointer"
          title="Refresh Orders"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-nutri-green animate-spin mx-auto" />
          <p className="text-xs font-bold text-nutri-secondary">Fetching orders from PostgreSQL...</p>
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center bg-white border-nutri-border rounded-3xl space-y-3">
          <Clock className="w-10 h-10 text-nutri-secondary mx-auto opacity-60" />
          <h3 className="text-base font-bold text-nutri-charcoal">No orders placed yet</h3>
          <p className="text-xs text-nutri-secondary max-w-sm mx-auto">
            Order your post-workout meal or cold-pressed juice right now!
          </p>
          <Link href="/menu">
            <Button size="md" className="bg-nutri-green text-white font-bold text-xs rounded-full mt-2 cursor-pointer">
              Browse Menu →
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => {
            return (
              <Card key={ord.id} className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-nutri-border-light pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-nutri-green text-base font-heading">
                        {ord.orderNumber}
                      </span>
                      {getStatusBadge(ord.status)}
                    </div>
                    <p className="text-xs text-nutri-secondary mt-1">
                      {ord.outlet?.gym?.name || "Indiranagar Cult Kiosk"} • {new Date(ord.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <Link href={`/orders/${ord.id}`}>
                    <Button size="sm" className="bg-nutri-green-soft text-nutri-green hover:bg-nutri-green-light font-bold text-xs rounded-full border border-nutri-border cursor-pointer">
                      Track Pickup Status <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </Link>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {ord.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-nutri-bg shrink-0 border border-nutri-border-light">
                          <Image
                            src={item.product?.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80"}
                            alt={item.product?.name || "Product"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-nutri-charcoal">{item.quantity}x {item.product?.name || "Fuel Pack"}</p>
                          <p className="text-[11px] text-nutri-secondary">{item.product?.protein || 30}g Protein • {item.product?.calories || 400} kcal</p>
                        </div>
                      </div>
                      <span className="font-extrabold text-nutri-green">{formatPrice(item.priceAtPurchase * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {/* Order Summary & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-nutri-border-light text-xs">
                  <div>
                    <span className="text-nutri-secondary">Total Paid: </span>
                    <span className="font-extrabold text-nutri-charcoal text-sm">{formatPrice(ord.totalAmount)}</span>
                    {ord.discount > 0 && <span className="text-[10px] text-nutri-green font-bold ml-1.5">(Saved {formatPrice(ord.discount)})</span>}
                  </div>

                  <Button
                    onClick={() => handleOrderAgainOrder(ord)}
                    size="sm"
                    className="bg-white border border-nutri-green text-nutri-green hover:bg-nutri-green hover:text-white font-bold text-xs rounded-full cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Order Again
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
