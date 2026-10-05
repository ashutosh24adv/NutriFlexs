"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, ArrowRight, RefreshCw, Zap, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  validityDays: number;
  creditsCount: number;
  description: string;
  benefits?: string;
  isActive: boolean;
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
        <Badge variant="gold" className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs uppercase px-3.5 py-1 mb-3 inline-flex items-center">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-nutri-green shrink-0" /> NUTRIFLEXS PASS · SAVE UP TO 35%
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
          Eat More. Save More. Fuel Daily.
        </h2>
        <p className="text-xs sm:text-sm text-nutri-muted mt-2.5 leading-relaxed">
          Daily post-workout meal &amp; cold-pressed juice credits at priority kiosk preparation speeds right outside your gym.
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {plans.map((plan) => {
              let benefitsList: string[] = [];
              try {
                if (plan.benefits) {
                  const parsed = JSON.parse(plan.benefits);
                  if (Array.isArray(parsed)) benefitsList = parsed;
                  else if (typeof parsed === "string") benefitsList = parsed.split(";");
                }
              } catch {
                if (plan.benefits) benefitsList = plan.benefits.split(";");
              }

              return (
                <Card
                  key={plan.id}
                  className="p-6 sm:p-8 flex flex-col justify-between bg-white border border-nutri-border rounded-3xl shadow-xs hover:shadow-float transition-all h-full"
                >
                  <div className="flex flex-col flex-1">
                    {/* Title & Badge */}
                    <div className="flex items-center justify-between gap-3 min-h-[32px]">
                      <h3 className="text-xl font-bold font-heading text-nutri-charcoal">{plan.name}</h3>
                      <Badge variant="protein" className="text-[11px] font-bold shrink-0">
                        {plan.creditsCount} CREDITS
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-nutri-muted mt-2 leading-relaxed min-h-[36px]">
                      {plan.description}
                    </p>

                    {/* Price Display */}
                    <div className="my-5 flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-extrabold text-nutri-green font-heading">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-xs text-nutri-secondary font-medium"> / {plan.validityDays} days</span>
                    </div>

                    {/* Benefits List (flex-1 ensures bottom alignment for CTA) */}
                    <div className="space-y-2.5 text-xs text-nutri-charcoal border-t border-nutri-border-light pt-4 flex-1">
                      {benefitsList.map((benefit, idx) => (
                        <div key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0 mt-0.5 stroke-[2.5]" />
                          <span className="leading-snug">{benefit.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button pinned to bottom */}
                  <div className="mt-6 pt-4 border-t border-nutri-border">
                    <Link href="/pass" className="block w-full">
                      <Button className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs py-3.5 rounded-2xl cursor-pointer shadow-xs flex items-center justify-center gap-2">
                        EXPLORE PASS &amp; SUBSCRIBE <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Guarantee Highlight Info Strip matching Pass cards grid width */}
          <div className="w-full bg-nutri-green-soft border border-nutri-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-nutri-secondary">
            <span className="flex items-center gap-2.5 font-semibold text-nutri-charcoal">
              <Zap className="w-4 h-4 text-nutri-green shrink-0" /> Priority 3-minute kiosk preparation guaranteed for Pass members
            </span>
            <span className="flex items-center gap-2.5 font-semibold text-nutri-charcoal">
              <ShieldCheck className="w-4 h-4 text-nutri-green shrink-0" /> Pause or carry forward unused credits anytime
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
