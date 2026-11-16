"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Zap,
  Camera,
  Percent,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Check,
  ChevronRight,
  X,
  CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface PlanPricing {
  period: "MONTHLY" | "QUARTERLY" | "ANNUAL";
  price: number;
  durationDays: number;
  monthlyEquivalent: number;
  savingsPercent?: number;
}

interface FormattedPlan {
  id: string;
  name: string;
  slug: string | null;
  planType: "FOOD_PASS" | "NUTRITION_PASS" | "ALL_ACCESS_PASS" | "LEGACY";
  description: string;
  badgeText: string | null;
  benefits: string[];
  foodDiscountPercent: number;
  aiScanAllowance: number;
  hasFoodBenefits: boolean;
  hasNutritionBenefits: boolean;
  hasAiScan: boolean;
  hasAdvancedInsights: boolean;
  displayOrder: number;
  isActive: boolean;
  pricing: {
    monthly: PlanPricing;
    quarterly: PlanPricing | null;
    annual: PlanPricing | null;
  };
}

export default function NutriFlexsPassPage() {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<FormattedPlan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any | null>(null);
  const [entitlements, setEntitlements] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  async function loadSubscriptionsData() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions");
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans || []);
        setActiveSubscription(data.activeSubscription || null);
        setEntitlements(data.entitlements || null);
      }
    } catch (e) {
      console.error("Failed to load NutriFlexs subscription data", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscriptionsData();
  }, []);

  const handleSubscribe = async (plan: FormattedPlan) => {
    if (!session?.user) {
      window.location.href = `/login?callbackUrl=/pass`;
      return;
    }

    setCheckoutLoading(plan.id);
    setStatusMessage(null);

    try {
      // 1. Create checkout order on the backend
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          billingPeriod,
        }),
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to initialize pass checkout");
      }

      // 2. Simulated payment flow in development or test environment
      // In production, this launches Razorpay Modal:
      // const rzp = new window.Razorpay({ ...options, handler: async (response) => { ... } });
      const verifyRes = await fetch("/api/subscriptions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: orderData.razorpayOrderId,
          razorpayPaymentId: `pay_demo_${Date.now()}`,
          razorpaySignature: "demo_sig_valid",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || "Subscription payment verification failed");
      }

      setStatusMessage({
        type: "success",
        text: `Congratulations! Your ${plan.name} is now active. All entitlements are unlocked!`,
      });

      // Refresh live subscription and entitlement state
      await loadSubscriptionsData();
    } catch (err: any) {
      console.error("Subscription error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to complete subscription. Please try again.",
      });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/subscriptions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User cancelled from pass dashboard" }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: "success",
          text: "Auto-renewal has been cancelled. Your pass benefits remain active until your billing period ends.",
        });
        setShowCancelModal(false);
        await loadSubscriptionsData();
      } else {
        throw new Error(data.error || "Failed to cancel renewal");
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to cancel subscription",
      });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto pt-2">
        <Badge
          variant="gold"
          className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs uppercase px-3.5 py-1 mb-3 inline-flex items-center"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-nutri-green shrink-0" />
          NUTRIFLEXS PASS · UNIFIED MEMBERSHIP
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
          Fuel Smarter. Track Better.
        </h1>
        <p className="text-sm sm:text-base text-nutri-secondary mt-3 leading-relaxed">
          Choose the pass tailored to your lifestyle. Order high-protein meals outside your gym, unlock intelligent
          AI photo meal scanning, or get all benefits with All Access.
        </p>

        {/* Billing Period Toggle (Monthly vs Annual) */}
        <div className="mt-6 inline-flex items-center p-1 rounded-full bg-nutri-sage border border-nutri-border">
          <button
            onClick={() => setBillingPeriod("MONTHLY")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              billingPeriod === "MONTHLY"
                ? "bg-white text-nutri-charcoal shadow-xs"
                : "text-nutri-secondary hover:text-nutri-charcoal"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingPeriod("ANNUAL")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              billingPeriod === "ANNUAL"
                ? "bg-nutri-green text-white shadow-xs"
                : "text-nutri-secondary hover:text-nutri-charcoal"
            }`}
          >
            <span>Annual Billing</span>
            <span className="bg-amber-400 text-amber-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
              SAVE 25%
            </span>
          </button>
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-start justify-between gap-3 text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:bg-black/5 rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Customer Active Subscription Dashboard */}
      {activeSubscription && (
        <Card className="bg-gradient-to-br from-[#24630F] to-[#2F7D16] text-white p-6 sm:p-8 rounded-3xl shadow-float border border-[#24630F] space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/20 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="bg-white text-nutri-green font-extrabold text-[10px] uppercase px-3 py-0.5 rounded-full tracking-wider">
                  ACTIVE MEMBERSHIP
                </span>
                <span className="text-xs text-white/90 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-white/80" /> Valid through{" "}
                  {new Date(activeSubscription.endDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {" "}({entitlements?.daysRemaining || 0} days remaining)
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
                {activeSubscription.plan?.name || "NutriFlexs Pass"}
              </h2>
              <p className="text-xs text-white/80 mt-1 max-w-xl">
                {activeSubscription.plan?.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-xs font-semibold rounded-full"
              >
                Manage Renewal
              </Button>
            </div>
          </div>

          {/* Active Entitlements Meter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* 1. Food Discount Meter */}
            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15">
              <div className="flex items-center gap-2 text-white/80 text-xs font-semibold mb-1">
                <Percent className="w-4 h-4 text-emerald-300" />
                <span>Food Order Savings</span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {entitlements?.canAccessFoodDiscount ? `${entitlements.foodDiscountPercent}% OFF` : "Standard Pricing"}
              </div>
              <span className="text-[11px] text-white/70 block mt-0.5">
                {entitlements?.canAccessFoodDiscount
                  ? "Applied automatically at kiosk checkout"
                  : "Upgrade to Food or All Access Pass"}
              </span>
            </div>

            {/* 2. AI Meal Scans Meter */}
            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15">
              <div className="flex items-center justify-between text-white/80 text-xs font-semibold mb-1">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-300" />
                  <span>AI Meal Scans</span>
                </div>
                {entitlements?.canAccessAiScan && (
                  <span className="text-emerald-200 text-[11px] font-bold">
                    {entitlements.aiScansRemaining} remaining
                  </span>
                )}
              </div>
              <div className="text-xl font-extrabold text-white">
                {entitlements?.canAccessAiScan
                  ? `${entitlements.aiScansUsed} / ${entitlements.aiScanAllowance} used`
                  : "Manual Logging Only"}
              </div>
              {entitlements?.canAccessAiScan ? (
                <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-300 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (entitlements.aiScansUsed / (entitlements.aiScanAllowance || 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              ) : (
                <span className="text-[11px] text-white/70 block mt-0.5">
                  Upgrade to Nutrition or All Access Pass
                </span>
              )}
            </div>

            {/* 3. Nutrition Intelligence */}
            <div className="bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/15">
              <div className="flex items-center gap-2 text-white/80 text-xs font-semibold mb-1">
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Nutrition Analytics</span>
              </div>
              <div className="text-xl font-extrabold text-white">
                {entitlements?.canAccessAdvancedInsights ? "Unlocked" : "Basic"}
              </div>
              <span className="text-[11px] text-white/70 block mt-0.5">
                {entitlements?.canAccessAdvancedInsights
                  ? "Indian gravy separation & macro trends active"
                  : "Basic calorie & macro logging"}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Subscription Plans Section (The 3 Passes) */}
      <div className="space-y-4 pt-2">
        <div className="text-center max-w-xl mx-auto mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-nutri-charcoal">
            Compare Pass Benefits &amp; Pricing
          </h2>
          <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
            Choose the experience that fits your routine. All passes include priority kiosk prep and clear pricing.
          </p>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-nutri-green animate-spin mx-auto" />
            <p className="text-xs font-bold text-nutri-secondary">Loading pass tiers from database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {plans.map((plan) => {
              const isCurrent = activeSubscription?.planId === plan.id;
              const isAllAccess = plan.planType === "ALL_ACCESS_PASS";
              const isNutrition = plan.planType === "NUTRITION_PASS";
              const isFood = plan.planType === "FOOD_PASS";

              const activePricing =
                billingPeriod === "ANNUAL" && plan.pricing.annual
                  ? plan.pricing.annual
                  : plan.pricing.monthly;

              return (
                <Card
                  key={plan.id}
                  className={`p-6 sm:p-8 flex flex-col justify-between relative rounded-3xl transition-all ${
                    isAllAccess
                      ? "border-2 border-nutri-green bg-gradient-to-b from-white via-nutri-bg to-[#F3F7EE] shadow-float lg:-translate-y-2"
                      : "border border-nutri-border bg-white shadow-card hover:shadow-float hover:-translate-y-1"
                  }`}
                >
                  {/* Top Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${
                          isAllAccess
                            ? "bg-nutri-green text-white shadow-xs"
                            : isNutrition
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {plan.badgeText || (isAllAccess ? "ALL ACCESS" : isNutrition ? "NUTRITION" : "ORDER FOOD")}
                      </span>

                      {isAllAccess && (
                        <span className="text-[10px] font-bold text-nutri-green bg-nutri-green-light px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-nutri-green" /> POPULAR
                        </span>
                      )}
                    </div>

                    {/* Plan Title & Description */}
                    <h3 className="text-xl sm:text-2xl font-bold font-heading text-nutri-charcoal">{plan.name}</h3>
                    <p className="text-xs text-nutri-secondary mt-1.5 leading-relaxed min-h-[36px]">
                      {plan.description}
                    </p>

                    {/* Price Display */}
                    <div className="my-6 p-4 rounded-2xl bg-nutri-bg border border-nutri-border">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-extrabold text-nutri-green font-heading">
                          {formatPrice(activePricing.price)}
                        </span>
                        <span className="text-xs text-nutri-muted font-medium">
                          {billingPeriod === "ANNUAL" ? " / year" : " / month"}
                        </span>
                      </div>
                      {billingPeriod === "ANNUAL" && (
                        <p className="text-[11px] text-nutri-green font-semibold mt-1">
                          Equivalent to {formatPrice(activePricing.monthlyEquivalent)} / month (Save 25%)
                        </p>
                      )}
                    </div>

                    {/* Entitlement Highlight Pills */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      <div className="p-2.5 rounded-xl bg-white border border-nutri-border text-center">
                        <span className="text-[10px] text-nutri-muted uppercase font-bold block">Food Discount</span>
                        <span className="text-sm font-extrabold text-nutri-charcoal font-heading">
                          {plan.foodDiscountPercent > 0 ? `${plan.foodDiscountPercent}% OFF` : "Standard"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-nutri-border text-center">
                        <span className="text-[10px] text-nutri-muted uppercase font-bold block">AI Meal Scans</span>
                        <span className="text-sm font-extrabold text-nutri-charcoal font-heading">
                          {plan.aiScanAllowance > 0 ? `${plan.aiScanAllowance}/mo` : "None"}
                        </span>
                      </div>
                    </div>

                    {/* Features & Benefits List */}
                    <div className="space-y-2.5 pt-2">
                      <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">
                        Included Entitlements
                      </span>
                      {plan.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-nutri-charcoal">
                          <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0 mt-0.5 stroke-[2.5]" />
                          <span className="leading-snug">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="mt-8 pt-4 border-t border-nutri-border">
                    {isCurrent ? (
                      <Button
                        className="w-full bg-nutri-green-light text-nutri-green-deep font-bold text-xs border border-nutri-green/30 rounded-xl py-3"
                        disabled
                      >
                        <Check className="w-4 h-4 mr-1 stroke-[3]" /> CURRENT ACTIVE PLAN
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSubscribe(plan)}
                        disabled={checkoutLoading === plan.id}
                        className={`w-full font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isAllAccess
                            ? "bg-nutri-green text-white hover:bg-nutri-green-dark shadow-md hover:shadow-lg"
                            : "bg-white text-nutri-charcoal border-2 border-nutri-border hover:border-nutri-green hover:bg-nutri-bg"
                        }`}
                      >
                        {checkoutLoading === plan.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : activeSubscription ? (
                          <>
                            <span>SWITCH TO {plan.name.toUpperCase()}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>SUBSCRIBE NOW</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-nutri-border space-y-4">
            <div className="flex items-center justify-between border-b border-nutri-border pb-3">
              <h3 className="text-base font-bold font-heading text-nutri-charcoal">Cancel Auto-Renewal?</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-1.5 text-nutri-muted hover:text-nutri-charcoal rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-nutri-secondary leading-relaxed">
              Are you sure you want to turn off automatic renewal for your{" "}
              <strong>{activeSubscription?.plan?.name}</strong>?
            </p>
            <p className="text-xs text-nutri-muted bg-nutri-bg p-3 rounded-xl border border-nutri-border">
              Your member discounts and AI scanning entitlements will remain active until{" "}
              {new Date(activeSubscription?.endDate).toLocaleDateString()}. After that date, your account will revert
              to standard free tier access.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setShowCancelModal(false)}>
                Keep Pass
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
