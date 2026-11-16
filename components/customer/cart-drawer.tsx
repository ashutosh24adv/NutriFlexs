"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  Trash2,
  Plus,
  Minus,
  Zap,
  Flame,
  ShieldCheck,
  Ticket,
  Dumbbell,
  ArrowRight,
  ShoppingBag,
  MapPin,
  Leaf,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatMacro } from "@/lib/utils";
import { useDietary } from "@/components/customer/dietary-context";
import { useGym } from "@/components/customer/gym-context";

export interface CartItemType {
  product: any;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItemType[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const router = useRouter();
  const { isVegetarian } = useDietary();
  const { selectedGym, selectedOutlet } = useGym();
  const [couponCode, setCouponCode] = useState("");
  const [trainerCode, setTrainerCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [appliedTrainer, setAppliedTrainer] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const nonVegItems = isVegetarian ? items.filter((i) => !i.product.isVeg) : [];
  const hasDietaryConflict = nonVegItems.length > 0;

  const handleRemoveNonVeg = () => {
    nonVegItems.forEach((i) => onRemoveItem(i.product.id));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
  const totalProtein = items.reduce((sum, item) => sum + (item.product.protein || 0) * item.quantity, 0);
  const totalCalories = items.reduce((sum, item) => sum + (item.product.calories || 0) * item.quantity, 0);

  let discount = 0;
  if (appliedCoupon) discount += appliedCoupon.discount;
  if (appliedTrainer) discount += (subtotal * 10) / 100; // 10% trainer discount

  const finalTotal = Math.max(0, subtotal - discount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), orderAmount: subtotal }),
      });
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon(data.coupon);
        setCouponCode("");
      } else {
        setErrorMsg(data.error || "Invalid coupon code");
      }
    } catch {
      setErrorMsg("Failed to validate coupon");
    }
  };

  const handleApplyTrainerCode = () => {
    if (!trainerCode.trim()) return;
    if (trainerCode.toUpperCase().trim() === "NUTRI-ARJUN") {
      setAppliedTrainer({ code: "NUTRI-ARJUN", trainerName: "Trainer Arjun" });
      setTrainerCode("");
      setErrorMsg("");
    } else {
      setErrorMsg("Trainer referral code not found");
    }
  };

  const handleProceedToCheckout = () => {
    if (hasDietaryConflict) {
      setErrorMsg("Please remove non-vegetarian items before proceeding to checkout.");
      return;
    }
    onClose();
    router.push("/checkout");
  };

  const handleContinueShopping = () => {
    onClose();
    router.push("/menu");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-nutri-charcoal/60 backdrop-blur-xs animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div
          className="w-screen max-w-md sm:max-w-lg bg-[#FCFDFC] shadow-2xl flex flex-col justify-between animate-slide-left border-l border-nutri-border text-nutri-charcoal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-white border-b border-nutri-border flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-nutri-green text-white flex items-center justify-center font-heading font-extrabold text-xs shadow-2xs shrink-0">
                {totalQuantity}
              </div>
              <div className="min-w-0">
                <h3 id="cart-drawer-title" className="font-heading font-extrabold text-base text-nutri-charcoal leading-tight">
                  Your Refuel Order
                </h3>
                <p className="text-[11px] text-nutri-secondary flex items-center gap-1 mt-0.5 truncate max-w-[220px] sm:max-w-[280px]">
                  <MapPin className="w-3 h-3 text-nutri-green shrink-0" />
                  <span className="truncate">
                    {selectedOutlet
                      ? `${selectedOutlet.name}${selectedOutlet.formattedDistance ? ` (${selectedOutlet.formattedDistance})` : ""}`
                      : selectedGym
                      ? selectedGym.name
                      : "Express Kiosk (5 min pickup)"}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-nutri-bg hover:bg-nutri-green-light hover:text-nutri-green text-nutri-secondary flex items-center justify-center transition-colors cursor-pointer border border-nutri-border/60 shrink-0"
              aria-label="Close cart drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-3.5">
                <div className="w-16 h-16 bg-nutri-green-light rounded-2xl flex items-center justify-center mx-auto text-nutri-green shadow-xs border border-nutri-green/20">
                  <ShoppingBag className="w-8 h-8 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-heading font-extrabold text-nutri-charcoal text-lg">Your Cart is Empty</h4>
                  <p className="text-xs text-nutri-secondary max-w-xs mx-auto leading-relaxed">
                    Fuel up your post-workout recovery with fresh juices, high-protein bowls, and clean meals.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleContinueShopping}
                    className="inline-flex items-center gap-1.5 bg-nutri-green text-white hover:bg-nutri-green-dark font-heading font-extrabold text-xs px-6 py-3 rounded-2xl cursor-pointer shadow-sm hover:shadow-md transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" /> Browse Fuel Menu
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Dietary conflict warning banner */}
                {hasDietaryConflict && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-amber-700 shrink-0" />
                      <p className="font-bold">Vegetarian Mode is active</p>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-snug">
                      Your cart includes {nonVegItems.length} non-vegetarian item(s).
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveNonVeg}
                      className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors"
                    >
                      Remove Non-Veg ({nonVegItems.length})
                    </button>
                  </div>
                )}

                {/* Macro Summary Header */}
                <div className="bg-nutri-green-soft p-3 rounded-2xl border border-nutri-green/20 flex items-center justify-between text-xs font-bold text-nutri-green shadow-2xs">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 fill-nutri-green shrink-0" />
                    <span>Total Protein: <strong>{formatMacro(totalProtein)}</strong></span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-600 fill-orange-600 shrink-0" />
                    <span className="text-nutri-charcoal font-extrabold">{totalCalories} kcal</span>
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-nutri-border shadow-2xs hover:border-nutri-green/30 transition-all"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 bg-nutri-bg border border-nutri-border-light">
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Product Information */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.product.isVeg ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                            title={item.product.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          />
                          <h4 className="font-heading font-bold text-xs sm:text-sm text-nutri-charcoal truncate">
                            {item.product.name}
                          </h4>
                        </div>

                        <div className="text-[11px] text-nutri-secondary flex items-center gap-1.5 mt-1">
                          <span className="text-nutri-green font-semibold">
                            {formatMacro(item.product.protein)} Protein
                          </span>
                          <span className="text-nutri-border">·</span>
                          <span className="font-extrabold text-nutri-charcoal">
                            {formatPrice(item.product.price)}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Stepper Selector */}
                      <div className="flex items-center gap-1 bg-nutri-bg px-2 py-1 rounded-xl border border-nutri-border shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-nutri-secondary hover:text-rose-600 transition-colors cursor-pointer"
                          title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                          aria-label={item.quantity === 1 ? `Remove ${item.product.name}` : `Decrease ${item.product.name}`}
                        >
                          {item.quantity === 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Minus className="w-3 h-3 text-nutri-charcoal" />
                          )}
                        </button>
                        <span className="text-xs font-extrabold text-nutri-charcoal w-4 text-center select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white text-nutri-green hover:text-nutri-green-dark transition-colors cursor-pointer"
                          title="Increase quantity"
                          aria-label={`Increase ${item.product.name}`}
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trainer Referral & Coupon Inputs Card */}
                <div className="p-3.5 bg-white rounded-2xl border border-nutri-border shadow-2xs space-y-2.5">
                  {/* Trainer Referral Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Dumbbell className="w-3.5 h-3.5 text-nutri-secondary absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Trainer Referral (e.g. NUTRI-ARJUN)"
                        value={trainerCode}
                        onChange={(e) => setTrainerCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyTrainerCode();
                          }
                        }}
                        className="w-full text-xs bg-nutri-bg pl-8 pr-3 py-2 rounded-xl border border-nutri-border text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:border-nutri-green focus:bg-white transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyTrainerCode}
                      className="text-xs font-bold px-3.5 py-2 bg-nutri-green-light text-nutri-green hover:bg-nutri-green hover:text-white rounded-xl transition-all shrink-0 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Coupon Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Ticket className="w-3.5 h-3.5 text-nutri-secondary absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Coupon Code (e.g. WELCOME10)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleApplyCoupon();
                          }
                        }}
                        className="w-full text-xs bg-nutri-bg pl-8 pr-3 py-2 rounded-xl border border-nutri-border text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:border-nutri-green focus:bg-white transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="text-xs font-bold px-3.5 py-2 bg-nutri-green-light text-nutri-green hover:bg-nutri-green hover:text-white rounded-xl transition-all shrink-0 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Applied Discount Badges */}
                  {appliedTrainer && (
                    <div className="text-[11px] font-semibold text-nutri-green bg-nutri-green-light/80 px-3 py-1.5 rounded-xl flex items-center justify-between border border-nutri-green/20">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Trainer Referral 10% Discount Applied
                      </span>
                      <button
                        onClick={() => setAppliedTrainer(null)}
                        className="font-bold text-rose-600 hover:text-rose-800 text-sm px-1 cursor-pointer"
                        title="Remove trainer discount"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="text-[11px] font-semibold text-nutri-green bg-nutri-green-light/80 px-3 py-1.5 rounded-xl flex items-center justify-between border border-nutri-green/20">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Coupon {appliedCoupon.code} Applied
                      </span>
                      <button
                        onClick={() => setAppliedCoupon(null)}
                        className="font-bold text-rose-600 hover:text-rose-800 text-sm px-1 cursor-pointer"
                        title="Remove coupon discount"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {errorMsg && (
                    <p className="text-xs text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                      {errorMsg}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Checkout Summary (Strict CTA Hierarchy) */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 bg-white border-t border-nutri-border space-y-3.5 shrink-0 shadow-lg">
              {/* 1. Subtotal & 2. Payable Amount */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-nutri-secondary">
                  <span>Subtotal</span>
                  <span className="font-bold text-nutri-charcoal">{formatPrice(subtotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between items-center text-nutri-green font-semibold">
                    <span>Total Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-nutri-border">
                  <div>
                    <span className="font-heading font-extrabold text-sm text-nutri-charcoal block">
                      Payable Amount
                    </span>
                    <span className="text-[10px] text-nutri-secondary">
                      Incl. all taxes &amp; express packaging
                    </span>
                  </div>
                  <span className="font-heading font-extrabold text-xl text-nutri-green">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>

              {/* 3. Primary PROCEED TO CHECKOUT Button & 4. Secondary CONTINUE SHOPPING Button */}
              <div className="space-y-2 pt-1">
                {/* Primary CTA */}
                <Button
                  onClick={handleProceedToCheckout}
                  size="lg"
                  variant="primary"
                  className="w-full h-12 rounded-2xl bg-nutri-green hover:bg-nutri-green-dark text-white font-heading font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg shadow-nutri-green/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>PROCEED TO CHECKOUT · {formatPrice(finalTotal)}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </Button>

                {/* Secondary CTA */}
                <button
                  type="button"
                  onClick={handleContinueShopping}
                  className="w-full h-11 rounded-2xl bg-white hover:bg-nutri-green-light/50 border border-nutri-green/30 hover:border-nutri-green text-nutri-green-dark hover:text-nutri-green font-heading font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <ShoppingBag className="w-4 h-4 text-nutri-green stroke-[2.2]" />
                  <span>Continue Shopping</span>
                </button>
              </div>

              {/* 5. Small Pickup Information below the buttons */}
              <p className="text-[11px] text-nutri-secondary text-center flex items-center justify-center gap-1.5 pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                <span>Ready in ~5 minutes · Express Kiosk Pickup</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
