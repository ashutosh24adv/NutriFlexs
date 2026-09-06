"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, Zap, Flame, ChevronLeft, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/customer/cart-context";
import { formatPrice, formatMacro } from "@/lib/utils";

export default function CartPage() {
  const router = useRouter();
  const { cartItems, updateQuantity, removeItem, clearCart, getSubtotal } = useCart();

  const subtotal = getSubtotal();
  const totalProtein = cartItems.reduce((sum, item) => sum + (item.product.protein || 0) * item.quantity, 0);
  const totalCalories = cartItems.reduce((sum, item) => sum + (item.product.calories || 0) * item.quantity, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Card className="p-8 bg-white border border-nutri-border rounded-3xl space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-nutri-green-light rounded-full flex items-center justify-center mx-auto text-nutri-green shadow-xs">
            <ShoppingBag className="w-8 h-8 stroke-[2]" />
          </div>
          <h2 className="text-xl font-extrabold font-heading text-nutri-charcoal">
            Your Cart is Empty
          </h2>
          <p className="text-xs text-nutri-secondary leading-relaxed">
            Fuel up your post-workout recovery with fresh cold-pressed organic juices and high-protein meals.
          </p>
          <div className="pt-2">
            <Link href="/menu">
              <Button size="md" className="bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs px-6 py-2.5 rounded-full shadow-xs cursor-pointer">
                Browse Full Menu →
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-nutri-border pb-4">
        <div>
          <Link href="/menu" className="text-xs font-semibold text-nutri-secondary hover:text-nutri-green flex items-center gap-1 mb-1">
            <ChevronLeft className="w-4 h-4" /> Back to Menu
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
            Your Refuel Cart 🛒
          </h1>
          <p className="text-xs sm:text-sm text-nutri-secondary mt-0.5">
            Express 5-minute kiosk pickup • Fresh organic post-workout fuel
          </p>
        </div>

        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-full border border-rose-200 transition-colors cursor-pointer"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Cart Items & Macro Overview */}
        <div className="lg:col-span-7 space-y-4">
          {/* Macro Overview Banner */}
          <div className="bg-nutri-green-light/80 p-4 rounded-3xl border border-nutri-green-soft flex items-center justify-between text-xs font-bold text-nutri-green">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 fill-nutri-green" /> Total Protein: {formatMacro(totalProtein)}
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-600 fill-orange-600" /> {totalCalories} kcal
            </span>
          </div>

          {/* Cart Items List */}
          <Card className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs space-y-3">
            <h3 className="font-extrabold text-nutri-charcoal text-sm border-b border-nutri-border-light pb-2">
              Cart Items ({totalItems})
            </h3>

            <div className="space-y-3 pt-1">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-3 p-3 bg-nutri-bg rounded-2xl border border-nutri-border"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white border border-nutri-border-light">
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-nutri-charcoal truncate">
                      {item.product.name}
                    </h4>
                    <div className="text-[11px] text-nutri-secondary flex items-center gap-2 mt-0.5">
                      <span className="text-nutri-green font-bold">
                        {formatMacro(item.product.protein)} Protein
                      </span>
                      <span>•</span>
                      <span>{item.product.calories} kcal</span>
                    </div>
                  </div>

                  {/* Price and Quantity Controls */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-extrabold text-nutri-charcoal">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>

                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-full border border-nutri-border">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="text-nutri-charcoal hover:text-rose-600 transition-colors cursor-pointer"
                        title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                      >
                        {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <Minus className="w-3 h-3" />}
                      </button>
                      <span className="text-xs font-bold w-3 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="text-nutri-green font-bold cursor-pointer"
                        title="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Order Summary & CTAs */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 border-nutri-border bg-white rounded-3xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-nutri-charcoal text-base border-b border-nutri-border-light pb-3 font-heading">
              Order Summary
            </h3>

            <div className="space-y-2 text-xs text-nutri-secondary">
              <div className="flex justify-between">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-bold text-nutri-charcoal">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Pickup Time</span>
                <span className="font-bold text-nutri-green">~5 minutes</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-nutri-charcoal pt-3 border-t border-nutri-border">
                <span>Total Payable</span>
                <span className="text-nutri-green text-base">{formatPrice(subtotal)}</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <Link href="/checkout" className="block w-full">
                <Button size="lg" className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs rounded-full shadow-md cursor-pointer">
                  PROCEED TO CHECKOUT <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>

              <Link href="/menu" className="block w-full">
                <Button size="md" className="w-full bg-white border border-nutri-border text-nutri-charcoal hover:bg-nutri-green-soft font-bold text-xs rounded-full cursor-pointer">
                  Continue Shopping
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-1 text-[10px] text-nutri-secondary pt-2 border-t border-nutri-border-light">
              <ShieldCheck className="w-3.5 h-3.5 text-nutri-green" />
              100% Organic & Database-Verified Nutrition
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
