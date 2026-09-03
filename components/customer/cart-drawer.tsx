"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Trash2, Plus, Minus, Zap, Flame, ShieldCheck, Ticket, Dumbbell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatMacro } from "@/lib/utils";

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
  const [couponCode, setCouponCode] = useState("");
  const [trainerCode, setTrainerCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [appliedTrainer, setAppliedTrainer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalProtein = items.reduce((sum, item) => sum + item.product.protein * item.quantity, 0);
  const totalCalories = items.reduce((sum, item) => sum + item.product.calories * item.quantity, 0);

  let discount = 0;
  if (appliedCoupon) discount += appliedCoupon.discount;
  if (appliedTrainer) discount += (subtotal * 10) / 100; // 10% trainer discount

  const finalTotal = Math.max(0, subtotal - discount);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setErrorMsg("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon(data.coupon);
      } else {
        setErrorMsg(data.error || "Invalid coupon");
      }
    } catch (e: any) {
      setErrorMsg("Failed to validate coupon");
    }
  };

  const handleApplyTrainerCode = () => {
    if (!trainerCode) return;
    if (trainerCode.toUpperCase() === "NUTRI-ARJUN") {
      setAppliedTrainer({ code: "NUTRI-ARJUN", trainerName: "Trainer Arjun" });
      setErrorMsg("");
    } else {
      setErrorMsg("Trainer referral code not found");
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsLoading(true);
    setErrorMsg("");

    try {
      // 1. Create order on server
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: "outlet-1", // Indiranagar Cult Kiosk default
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          couponCode: appliedCoupon?.code,
          trainerReferralCode: appliedTrainer?.code,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      // 2. Simulate Razorpay Payment verification
      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: data.order.id,
          razorpayOrderId: data.razorpay.id,
          razorpayPaymentId: `pay_test_${Date.now()}`,
          razorpaySignature: "demo_sig_valid",
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        onClearCart();
        onClose();
        router.push(`/orders/${data.order.id}`);
      } else {
        throw new Error(verifyData.error || "Payment verification failed");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Checkout error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-slide-left">
          {/* Header */}
          <div className="p-5 bg-nutri-bg border-b border-nutri-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-nutri-green text-white flex items-center justify-center font-bold text-xs">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </div>
              <div>
                <h3 className="font-bold text-nutri-charcoal font-heading">Your Refuel Order</h3>
                <p className="text-[11px] text-nutri-muted">Indiranagar Express Kiosk (50m away)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white text-nutri-charcoal flex items-center justify-center hover:bg-nutri-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-nutri-green-light rounded-full flex items-center justify-center mx-auto mb-3 text-nutri-green">
                  <Zap className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-nutri-charcoal font-heading text-lg">Your Cart is Empty</h4>
                <p className="text-xs text-nutri-muted mt-1 max-w-xs mx-auto">
                  Fuel up your post-workout recovery with fresh juices and high-protein meals.
                </p>
              </div>
            ) : (
              <>
                {/* Macro Summary Header */}
                <div className="bg-nutri-green-light/80 p-3 rounded-2xl border border-nutri-green-soft flex items-center justify-between text-xs font-semibold text-nutri-green">
                  <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4 fill-nutri-green" /> Total Protein: {formatMacro(totalProtein)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-600 fill-orange-600" /> {totalCalories} kcal
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between gap-3 p-3 bg-nutri-bg rounded-2xl border border-nutri-border"
                    >
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-white">
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
                        <div className="text-[11px] text-nutri-muted flex items-center gap-2 mt-0.5">
                          <span className="text-nutri-green font-semibold">
                            {formatMacro(item.product.protein)} Protein
                          </span>
                          <span>·</span>
                          <span>{formatPrice(item.product.price)}</span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-full border border-nutri-border shrink-0">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="text-nutri-charcoal hover:text-nutri-green"
                        >
                          {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-rose-500" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="text-xs font-bold w-3 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="text-nutri-green font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trainer Referral & Coupon Inputs */}
                <div className="space-y-2 pt-2">
                  {/* Trainer Referral Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Dumbbell className="w-3.5 h-3.5 text-nutri-muted absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Trainer Referral (e.g. NUTRI-ARJUN)"
                        value={trainerCode}
                        onChange={(e) => setTrainerCode(e.target.value)}
                        className="w-full text-xs bg-nutri-bg pl-8 pr-3 py-2 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
                      />
                    </div>
                    <button
                      onClick={handleApplyTrainerCode}
                      className="text-xs font-semibold px-3 py-2 bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft rounded-xl transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>

                  {/* Coupon Input */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Ticket className="w-3.5 h-3.5 text-nutri-muted absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Coupon Code (e.g. GYMPOWER20)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="w-full text-xs bg-nutri-bg pl-8 pr-3 py-2 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
                      />
                    </div>
                    <button
                      onClick={handleApplyCoupon}
                      className="text-xs font-semibold px-3 py-2 bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft rounded-xl transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>

                  {appliedTrainer && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl flex items-center justify-between border border-emerald-200">
                      <span>✓ Trainer Referral 10% Discount Applied</span>
                      <button onClick={() => setAppliedTrainer(null)} className="font-bold text-rose-600">×</button>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl flex items-center justify-between border border-emerald-200">
                      <span>✓ Coupon {appliedCoupon.code} Applied</span>
                      <button onClick={() => setAppliedCoupon(null)} className="font-bold text-rose-600">×</button>
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

          {/* Footer Checkout Summary */}
          {items.length > 0 && (
            <div className="p-5 bg-nutri-bg border-t border-nutri-border space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-nutri-muted">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Total Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-nutri-charcoal pt-1 border-t border-nutri-border font-heading">
                  <span>Payable Amount</span>
                  <span className="text-nutri-green text-base">{formatPrice(finalTotal)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                isLoading={isLoading}
                size="lg"
                variant="primary"
                className="w-full font-bold shadow-lg shadow-nutri-green/20"
              >
                PAY & PICKUP IN 3-5 MIN <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>

              <p className="text-[10px] text-nutri-muted text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Secured by Razorpay · Server-side Price Verification
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
