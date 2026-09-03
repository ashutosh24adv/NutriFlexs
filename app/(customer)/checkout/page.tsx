"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Lock, ArrowRight, ShieldCheck, MapPin, Tag, Dumbbell, ShoppingBag, CheckCircle2, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GymSelector } from "@/components/customer/gym-selector";
import { useCart } from "@/components/customer/cart-context";
import { formatPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { cart, getSubtotal, clearCart } = useCart();

  const [selectedOutletId, setSelectedOutletId] = useState("outlet-1");
  const [selectedOutletName, setSelectedOutletName] = useState("Indiranagar Cult Kiosk");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [trainerCode, setTrainerCode] = useState("");
  const [appliedTrainer, setAppliedTrainer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAuthenticated = status === "authenticated";
  const subtotal = getSubtotal();
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // 1. Guest Authentication Intercept Card
  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <Card className="p-6 sm:p-8 bg-white border border-nutri-border rounded-3xl shadow-md space-y-5 text-center">
          <div className="w-12 h-12 rounded-full bg-nutri-green-light text-nutri-green flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold font-heading text-nutri-charcoal">
              Sign In to Complete Order
            </h2>
            <p className="text-xs text-nutri-secondary leading-relaxed pt-1">
              You can browse products and build your cart as a guest. Please sign in or create an account to complete your checkout.
            </p>
          </div>

          {/* Cart items preview banner */}
          <div className="bg-nutri-green-soft border border-nutri-border rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-nutri-charcoal font-bold">
              <ShoppingBag className="w-4 h-4 text-nutri-green" />
              <span>Your Cart ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
            </div>
            <span className="font-extrabold text-nutri-green">{formatPrice(subtotal)}</span>
          </div>

          <p className="text-[11px] font-bold text-nutri-green">
            ✓ Your cart will be preserved after signing in!
          </p>

          <div className="space-y-2.5 pt-2">
            <Link href="/login?callbackUrl=/checkout" className="block w-full">
              <Button size="md" className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs rounded-full cursor-pointer shadow-xs">
                Sign In to Account <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
              </Button>
            </Link>

            <Link href="/signup?callbackUrl=/checkout" className="block w-full">
              <Button size="md" className="w-full bg-white border border-nutri-border text-nutri-charcoal hover:bg-nutri-green-soft font-bold text-xs rounded-full cursor-pointer">
                Create New Account
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 2. Empty Cart Check
  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Card className="p-8 bg-white border border-nutri-border rounded-3xl space-y-3">
          <ShoppingBag className="w-10 h-10 text-nutri-secondary mx-auto opacity-60" />
          <h3 className="text-base font-bold text-nutri-charcoal">Your cart is empty</h3>
          <p className="text-xs text-nutri-secondary">Select your favorite post-workout meals or cold-pressed juices from our menu.</p>
          <Link href="/menu">
            <Button size="md" className="bg-nutri-green text-white font-bold text-xs rounded-full">
              Browse Menu →
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // 3. Coupon Validation
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, orderAmount: subtotal }),
      });
      const data = await res.json();
      if (data.success) {
        setDiscountAmount(data.discount);
        setAppliedCoupon(data.coupon.code);
        setCouponError(null);
      } else {
        setCouponError(data.error || "Invalid coupon code");
      }
    } catch (e: any) {
      setCouponError("Coupon validation error");
    }
  };

  // 4. Trainer Referral Validation
  const handleApplyTrainer = () => {
    if (trainerCode.toUpperCase().trim() === "NUTRI-ARJUN") {
      const trainerDiscount = Math.round(subtotal * 0.1);
      setDiscountAmount(trainerDiscount);
      setAppliedTrainer("NUTRI-ARJUN");
    }
  };

  // 5. Final Order Submission (PostgreSQL & Server-Side Verified)
  const handleCreateOrder = async () => {
    setIsSubmitting(true);
    try {
      const items = cart.map((c) => ({
        productId: c.product.id,
        quantity: c.quantity,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: selectedOutletId,
          items,
          couponCode: appliedCoupon,
          trainerCode: appliedTrainer,
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        clearCart();
        router.push(`/orders/${data.order.id}`);
      } else {
        alert(data.error || "Failed to create order");
      }
    } catch (e: any) {
      alert("Network error creating order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-nutri-border pb-4">
        <div>
          <Link href="/menu" className="text-xs font-semibold text-nutri-secondary hover:text-nutri-green flex items-center gap-1 mb-1">
            <ChevronLeft className="w-4 h-4" /> Back to Menu
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
            Refuel Checkout 🛒
          </h1>
          <p className="text-xs text-nutri-secondary mt-0.5">
            Express 3-minute kiosk pickup • Server-validated pricing & nutrition
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Outlet Selector & Order Items */}
        <div className="lg:col-span-7 space-y-5">
          {/* Pickup Outlet Selector */}
          <Card className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-nutri-border-light pb-2">
              <MapPin className="w-4 h-4 text-nutri-green stroke-[2.5]" />
              <h3 className="font-extrabold text-nutri-charcoal text-sm">Express Kiosk Pickup Location</h3>
            </div>
            <GymSelector
              currentOutletName={selectedOutletName}
              onSelectOutlet={(id, name) => {
                setSelectedOutletId(id);
                setSelectedOutletName(name);
              }}
            />
          </Card>

          {/* Cart Items Summary */}
          <Card className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs space-y-4">
            <h3 className="font-extrabold text-nutri-charcoal text-sm border-b border-nutri-border-light pb-2">
              Order Items ({cart.length})
            </h3>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-nutri-bg shrink-0 border border-nutri-border-light">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-nutri-charcoal text-sm">{item.quantity}x {item.product.name}</p>
                      <p className="text-xs text-nutri-secondary mt-0.5">
                        <span className="text-nutri-green font-bold">{item.product.protein}g Protein</span> • {item.product.calories} kcal
                      </p>
                    </div>
                  </div>
                  <span className="font-extrabold text-nutri-green text-sm">{formatPrice(item.product.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Coupons & Trainer Discounts */}
          <Card className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs space-y-4">
            {/* Promo Coupon */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-nutri-charcoal flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-nutri-green" /> Apply Promo Coupon
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. WELCOME10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 text-xs px-3 py-2 border border-nutri-border rounded-xl font-mono uppercase text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                />
                <Button onClick={handleApplyCoupon} size="sm" className="bg-nutri-green text-white font-bold text-xs rounded-xl">
                  Apply
                </Button>
              </div>
              {appliedCoupon && <p className="text-xs text-nutri-green font-bold">✓ Coupon {appliedCoupon} applied!</p>}
              {couponError && <p className="text-xs text-rose-600 font-medium">{couponError}</p>}
            </div>

            {/* Trainer Referral */}
            <div className="space-y-2 border-t border-nutri-border-light pt-3">
              <label className="text-xs font-extrabold text-nutri-charcoal flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-indigo-600" /> Trainer Referral Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. NUTRI-ARJUN"
                  value={trainerCode}
                  onChange={(e) => setTrainerCode(e.target.value.toUpperCase())}
                  className="flex-1 text-xs px-3 py-2 border border-nutri-border rounded-xl font-mono uppercase text-nutri-charcoal focus:outline-none focus:border-nutri-green"
                />
                <Button onClick={handleApplyTrainer} size="sm" className="bg-indigo-600 text-white font-bold text-xs rounded-xl">
                  Apply
                </Button>
              </div>
              {appliedTrainer && <p className="text-xs text-indigo-600 font-bold">✓ Trainer referral 10% discount applied!</p>}
            </div>
          </Card>
        </div>

        {/* Right Column: Payment Summary */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-6 border-nutri-border bg-white rounded-3xl shadow-sm space-y-4">
            <h3 className="font-extrabold text-nutri-charcoal text-base border-b border-nutri-border-light pb-3 font-heading">
              Payment Summary
            </h3>

            <div className="space-y-2 text-xs text-nutri-secondary">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-nutri-charcoal">{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-nutri-green">
                  <span>Discount</span>
                  <span className="font-bold">-{formatPrice(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-nutri-charcoal pt-3 border-t border-nutri-border">
                <span>Total Payable</span>
                <span className="text-nutri-green text-base">{formatPrice(totalAmount)}</span>
              </div>
            </div>

            <div className="pt-3">
              <Button
                onClick={handleCreateOrder}
                isLoading={isSubmitting}
                className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-sm py-3 rounded-full shadow-md cursor-pointer"
              >
                PAY & PLACE ORDER ({formatPrice(totalAmount)})
              </Button>
            </div>

            <div className="flex items-center justify-center gap-1 text-[10px] text-nutri-secondary pt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-nutri-green" /> 100% Secure Transaction & Server Verification
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
