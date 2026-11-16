"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, ArrowRight, RefreshCw, Zap, ShieldCheck, Camera, Percent } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface SubscriptionPlan {
  id: string;
  name: string;
  slug?: string | null;
  planType?: string;
  badgeText?: string | null;
  price: number;
  validityDays: number;
  foodDiscountPercent?: number;
  aiScanAllowance?: number;
  description: string;
  benefits?: string[] | string;
  isActive: boolean;
  pricing?: {
    monthly: { price: number };
  };
}

export function LandingPassSection() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/subscriptions");
        const data = await res.json();
        if (data.success && Array.isArray(data.plans)) {
          setPlans(data.plans);
        }
      } catch (e) {
        console.error("Failed to load NutriFlexs Pass plans", e);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto">
        <Badge
          variant="gold"
          className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs uppercase px-3.5 py-1 mb-3 inline-flex items-center"
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-nutri-green shrink-0" /> NUTRIFLEXS PASS · THREE PLANS
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
          Fuel Smarter. Track Better. Fuel Daily.
        </h2>
        <p className="text-xs sm:text-sm text-nutri-muted mt-2.5 leading-relaxed">
          Post-workout kiosk discounts, Indian food AI photo scanning, or the complete All Access membership.
        </p>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="py-12 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-nutri-green animate-spin mx-auto" />
          <p className="text-xs font-bold text-nutri-secondary">Loading NutriFlexs Pass options...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full items-stretch">
            {plans.map((plan) => {
              let benefitsList: string[] = [];
              if (Array.isArray(plan.benefits)) {
                benefitsList = plan.benefits;
              } else if (typeof plan.benefits === "string") {
                try {
                  const parsed = JSON.parse(plan.benefits);
                  if (Array.isArray(parsed)) benefitsList = parsed;
                  else benefitsList = plan.benefits.split(";");
                } catch {
                  benefitsList = plan.benefits.split(";");
                }
              }

              const isAllAccess = plan.planType === "ALL_ACCESS_PASS";
              const isNutrition = plan.planType === "NUTRITION_PASS";
              const isFood = plan.planType === "FOOD_PASS";
              const priceDisplay = plan.pricing?.monthly?.price ?? plan.price;

              return (
                <Card
                  key={plan.id}
                  className={`p-6 sm:p-7 flex flex-col justify-between rounded-3xl transition-all h-full ${
                    isAllAccess
                      ? "border-2 border-nutri-green bg-gradient-to-b from-white via-nutri-bg to-[#F3F7EE] shadow-md hover:shadow-float lg:-translate-y-1.5"
                      : "border border-nutri-border bg-white shadow-xs hover:shadow-float"
                  }`}
                >
                  <div className="flex flex-col flex-1">
                    {/* Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          isAllAccess
                            ? "bg-nutri-green text-white"
                            : isNutrition
                            ? "bg-amber-100 text-amber-900"
                            : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {plan.badgeText || (isAllAccess ? "ALL ACCESS" : isNutrition ? "NUTRITION" : "ORDER FOOD")}
                      </span>

                      {isAllAccess && (
                        <span className="text-[10px] font-bold text-nutri-green flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-nutri-green" /> BEST VALUE
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold font-heading text-nutri-charcoal">{plan.name}</h3>

                    {/* Description */}
                    <p className="text-xs text-nutri-muted mt-1.5 leading-relaxed min-h-[34px]">
                      {plan.description}
                    </p>

                    {/* Price Display */}
                    <div className="my-4 flex items-baseline gap-1.5 p-3 rounded-2xl bg-nutri-bg border border-nutri-border">
                      <span className="text-3xl font-extrabold text-nutri-green font-heading">
                        {formatPrice(priceDisplay)}
                      </span>
                      <span className="text-xs text-nutri-secondary font-medium"> / month</span>
                    </div>

                    {/* Benefits List */}
                    <div className="space-y-2 text-xs text-nutri-charcoal border-t border-nutri-border-light pt-3.5 flex-1">
                      {benefitsList.slice(0, 4).map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0 mt-0.5 stroke-[2.5]" />
                          <span className="leading-snug">{benefit.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button pinned to bottom */}
                  <div className="mt-6 pt-4 border-t border-nutri-border">
                    <Link href="/pass" className="block w-full">
                      <Button
                        className={`w-full font-extrabold text-xs py-3.5 rounded-2xl cursor-pointer shadow-xs flex items-center justify-center gap-2 ${
                          isAllAccess
                            ? "bg-nutri-green text-white hover:bg-nutri-green-dark"
                            : "bg-white text-nutri-charcoal border border-nutri-border hover:border-nutri-green hover:bg-nutri-bg"
                        }`}
                      >
                        EXPLORE PASS <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Guarantee Strip */}
          <div className="w-full bg-nutri-green-soft border border-nutri-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-nutri-secondary">
            <span className="flex items-center gap-2.5 font-semibold text-nutri-charcoal">
              <Zap className="w-4 h-4 text-nutri-green shrink-0" /> Priority 5-minute kiosk preparation guaranteed
              for Pass members
            </span>
            <span className="flex items-center gap-2.5 font-semibold text-nutri-charcoal">
              <ShieldCheck className="w-4 h-4 text-nutri-green shrink-0" /> Instant AI photo scanning &amp; Indian macro
              intelligence
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
