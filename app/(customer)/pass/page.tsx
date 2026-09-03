"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export default function NutriFlexsPassPage() {
  const [subscribedPlan, setSubscribedPlan] = useState<string | null>("plan-1");

  const plans = [
    {
      id: "plan-1",
      name: "NutriFlexs Daily Fuel Pass",
      price: 2999,
      validityDays: 30,
      creditsCount: 30,
      tagline: "MOST POPULAR FOR REGULAR GYM GOERS",
      description: "1 Post-Workout Meal or Juice every day for 30 days. Save over 35% on daily orders.",
      benefits: [
        "30 Post-Workout Fuel Credits",
        "Free Priority 3-Min Preparation",
        "10% Off Additional A-la-carte Items",
        "Free Monthly Trainer Consultation",
        "Carry forward up to 5 unused credits"
      ],
      isBestValue: true,
    },
    {
      id: "plan-2",
      name: "Cold-Pressed Juice Pass",
      price: 1999,
      validityDays: 30,
      creditsCount: 20,
      tagline: "ESSENTIAL HYDRATION & ALKALIZING",
      description: "20 Cold-Pressed Juices per month. Freshly extracted right after your workout.",
      benefits: [
        "20 Juice Credits (ABC, Green, Citrus)",
        "Zero added sugar guaranteed",
        "Free eco-friendly glass bottle",
        "Pause subscription anytime"
      ],
      isBestValue: false,
    }
  ];

  const handleSubscribe = (planId: string) => {
    setSubscribedPlan(planId);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <Badge variant="gold" className="bg-amber-500 text-white font-bold text-xs uppercase px-3 py-1 mb-2">
          <Sparkles className="w-3.5 h-3.5 mr-1" /> NUTRIFLEXS PASS
        </Badge>
        <h1 className="text-3xl font-extrabold font-heading text-nutri-charcoal">
          Eat More. Save More.
        </h1>
        <p className="text-sm text-nutri-muted mt-1.5">
          Unlock exclusive post-workout meal & juice credits right outside your gym with a monthly subscription.
        </p>
      </div>

      {/* Active Subscription Status Banner if subscribed */}
      {subscribedPlan && (
        <Card className="bg-gradient-to-r from-nutri-green to-emerald-900 text-white p-6 rounded-3xl shadow-float">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-400 text-nutri-charcoal font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full">
                  ACTIVE MEMBERSHIP
                </span>
                <span className="text-xs text-emerald-200">Renews in 18 days</span>
              </div>
              <h3 className="text-xl font-bold font-heading text-white">
                NutriFlexs Daily Fuel Pass
              </h3>
              <p className="text-xs text-emerald-100 mt-1">
                Remaining Credits: <span className="font-extrabold text-white text-base">18 / 30 Credits</span>
              </p>
            </div>

            <Button size="md" variant="secondary" className="bg-white text-nutri-green hover:bg-nutri-green-light font-bold text-xs shrink-0">
              Manage Subscription
            </Button>
          </div>
        </Card>
      )}

      {/* Subscription Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {plans.map((plan) => {
          const isCurrent = subscribedPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col justify-between relative transition-all ${
                plan.isBestValue
                  ? "border-2 border-nutri-green shadow-float"
                  : "border border-nutri-border shadow-card"
              }`}
            >
              {plan.isBestValue && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-nutri-green text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full shadow-sm">
                  {plan.tagline}
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold font-heading text-nutri-charcoal">{plan.name}</h3>
                <p className="text-xs text-nutri-muted mt-1 leading-relaxed">{plan.description}</p>

                {/* Price */}
                <div className="my-5">
                  <span className="text-3xl font-extrabold text-nutri-green font-heading">
                    {formatPrice(plan.price)}
                  </span>
                  <span className="text-xs text-nutri-muted font-medium"> / month</span>
                </div>

                {/* Benefits list */}
                <div className="space-y-2.5 text-xs text-nutri-charcoal">
                  {plan.benefits.map((b, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-nutri-border">
                {isCurrent ? (
                  <Button variant="secondary" className="w-full font-bold text-xs disabled:opacity-80" disabled>
                    ✓ CURRENTLY ACTIVE
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    variant={plan.isBestValue ? "primary" : "outline"}
                    className="w-full font-bold text-xs"
                  >
                    SUBSCRIBE NOW <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
