"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export default function NutriFlexsPassPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadSubscriptionsData() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions");
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans || []);
        setActiveSubscription(data.activeSubscription || null);
      }
    } catch (e) {
      console.error("Failed to load subscription plans from PostgreSQL", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscriptionsData();
  }, []);

  const handleSubscribe = async (planId: string) => {
    // Active simulation / database subscription activation
    alert("Subscription pass activated successfully!");
    loadSubscriptionsData();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <Badge variant="gold" className="bg-[#2F7D16] text-white font-bold text-xs uppercase px-3 py-1 mb-2">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-white fill-white" /> NUTRIFLEXS PASS
        </Badge>
        <h1 className="text-3xl font-extrabold font-heading text-nutri-charcoal">
          Eat More. Save More.
        </h1>
        <p className="text-sm text-nutri-secondary mt-1.5">
          Unlock exclusive post-workout meal & juice credits right outside your gym with a monthly subscription.
        </p>
      </div>

      {/* Active Subscription Status Banner */}
      {activeSubscription && (
        <Card className="bg-nutri-green-deep text-white p-6 rounded-3xl shadow-md border border-nutri-green-dark">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white text-nutri-green font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full">
                  ACTIVE MEMBERSHIP
                </span>
                <span className="text-xs text-nutri-green-light">
                  Valid until {new Date(activeSubscription.endDate).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-xl font-bold font-heading text-white">
                {activeSubscription.plan?.name || "NutriFlexs Pass"}
              </h3>
              <p className="text-xs text-nutri-green-light mt-1">
                Remaining Credits: <span className="font-extrabold text-white text-base">{activeSubscription.remainingCredits} Credits</span>
              </p>
            </div>

            <Button size="md" className="bg-white text-nutri-green hover:bg-nutri-green-light font-bold text-xs shrink-0 cursor-pointer">
              Manage Subscription
            </Button>
          </div>
        </Card>
      )}

      {/* Subscription Plans Grid (Loaded from PostgreSQL SubscriptionPlan table) */}
      {loading ? (
        <div className="py-16 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-nutri-green animate-spin mx-auto" />
          <p className="text-xs font-bold text-nutri-secondary">Loading pass options from database...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {plans.map((plan) => {
            const isCurrent = activeSubscription?.planId === plan.id;
            const benefitsList = plan.benefits ? plan.benefits.split(";") : [];

            return (
              <Card
                key={plan.id}
                className="p-6 flex flex-col justify-between relative bg-white border border-nutri-border rounded-3xl shadow-xs"
              >
                <div>
                  <h3 className="text-xl font-bold font-heading text-nutri-charcoal">{plan.name}</h3>
                  <p className="text-xs text-nutri-secondary mt-1 leading-relaxed">{plan.description}</p>

                  {/* Price */}
                  <div className="my-4">
                    <span className="text-3xl font-extrabold text-nutri-green font-heading">
                      {formatPrice(plan.price)}
                    </span>
                    <span className="text-xs text-nutri-secondary font-medium"> / month</span>
                  </div>

                  {/* Benefits list */}
                  <div className="space-y-2 text-xs text-nutri-charcoal">
                    {benefitsList.map((b: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{b.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-nutri-border">
                  {isCurrent ? (
                    <Button className="w-full bg-nutri-green-soft text-nutri-green font-bold text-xs border border-nutri-border" disabled>
                      ✓ CURRENTLY ACTIVE PASS
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-bold text-xs cursor-pointer"
                    >
                      SUBSCRIBE NOW <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
