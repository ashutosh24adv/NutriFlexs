"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Save,
  X,
  CreditCard,
  Users,
  Shield,
  TrendingUp,
  Percent,
  Camera,
  Calendar,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export function SubscriptionsTab() {
  const [data, setData] = useState<{
    plans: any[];
    activeSubscribers: any[];
    pastSubscribers: any[];
    stats: {
      activeSubscribersCount: number;
      totalSubscribersHistorical: number;
      totalRevenue: number;
      planWiseRevenue: Record<string, number>;
      planWiseSubscribers: Record<string, number>;
    };
    auditLogs: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscriptions");
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setFeedback({ type: "error", message: json.error || "Failed to load subscription data" });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Network error loading subscriptions" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleEditPlan = (plan: any) => {
    setEditingPlan({
      ...plan,
      benefitsText: (plan.benefitsList || []).join("\n"),
    });
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    setSaving(true);
    setFeedback(null);

    try {
      const benefitsArray = editingPlan.benefitsText
        ? editingPlan.benefitsText.split("\n").map((b: string) => b.trim()).filter(Boolean)
        : [];

      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPlan.id,
          name: editingPlan.name,
          price: Number(editingPlan.price),
          quarterlyPrice: editingPlan.quarterlyPrice ? Number(editingPlan.quarterlyPrice) : null,
          annualPrice: editingPlan.annualPrice ? Number(editingPlan.annualPrice) : null,
          promotionalPrice: editingPlan.promotionalPrice ? Number(editingPlan.promotionalPrice) : null,
          validityDays: Number(editingPlan.validityDays),
          aiScanAllowance: Number(editingPlan.aiScanAllowance || 0),
          foodDiscountPercent: Number(editingPlan.foodDiscountPercent || 0),
          description: editingPlan.description,
          benefits: benefitsArray,
          badgeText: editingPlan.badgeText || null,
          isActive: Boolean(editingPlan.isActive),
          flaggedForReview: Boolean(editingPlan.flaggedForReview),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: `Successfully updated ${editingPlan.name}` });
        setEditingPlan(null);
        loadData();
      } else {
        setFeedback({ type: "error", message: json.error || "Failed to save plan changes" });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message || "Error saving plan" });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-nutri-green animate-spin mx-auto" />
        <p className="text-sm font-bold text-nutri-secondary">Loading NutriFlexs Subscription passes & analytics...</p>
      </div>
    );
  }

  const officialPlans = (data?.plans || []).filter((p) => p.planType !== "LEGACY");
  const legacyPlans = (data?.plans || []).filter((p) => p.planType === "LEGACY");

  return (
    <div className="space-y-8">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="p-1 rounded hover:bg-black/5 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-nutri-secondary mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Pass Subscribers</span>
            <Users className="w-4 h-4 text-nutri-green" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
            {data?.stats.activeSubscribersCount || 0}
          </div>
          <span className="text-[11px] text-nutri-green font-semibold mt-1 block">Live across all 3 passes</span>
        </Card>

        <Card className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-nutri-secondary mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Pass Revenue</span>
            <TrendingUp className="w-4 h-4 text-nutri-green" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-green">
            {formatPrice(data?.stats.totalRevenue || 0)}
          </div>
          <span className="text-[11px] text-nutri-muted font-medium mt-1 block">Verified Razorpay transactions</span>
        </Card>

        <Card className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-nutri-secondary mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Historical Passes</span>
            <CreditCard className="w-4 h-4 text-nutri-green" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
            {data?.stats.totalSubscribersHistorical || 0}
          </div>
          <span className="text-[11px] text-nutri-muted font-medium mt-1 block">Active + Expired + Upgraded</span>
        </Card>

        <Card className="p-5 border-nutri-border bg-white rounded-3xl shadow-xs">
          <div className="flex items-center justify-between text-nutri-secondary mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Legacy Plans Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-amber-600">
            {legacyPlans.length}
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">Flagged for admin audit</span>
        </Card>
      </div>

      {/* Official Three Passes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-heading text-nutri-charcoal">
              The Three Official NutriFlexs Passes
            </h2>
            <p className="text-xs text-nutri-muted mt-0.5">
              Configure pricing, durations, AI scan allowances, food discount percentages, and customer entitlements.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="flex items-center gap-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {officialPlans.map((plan) => {
            const isAllAccess = plan.planType === "ALL_ACCESS_PASS";
            const isNutrition = plan.planType === "NUTRITION_PASS";
            const isFood = plan.planType === "FOOD_PASS";

            return (
              <Card
                key={plan.id}
                className={`p-6 rounded-3xl relative flex flex-col justify-between transition-all ${
                  isAllAccess
                    ? "border-2 border-nutri-green bg-gradient-to-b from-white via-nutri-bg to-[#F3F7EE]/60 shadow-md"
                    : "border border-nutri-border bg-white shadow-xs"
                }`}
              >
                <div>
                  {/* Header Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${
                        isAllAccess
                          ? "bg-nutri-green text-white"
                          : isNutrition
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {plan.badgeText || (isAllAccess ? "ALL ACCESS" : isNutrition ? "NUTRITION" : "ORDER FOOD")}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        plan.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {plan.isActive ? "● Active" : "○ Inactive"}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-heading text-nutri-charcoal">{plan.name}</h3>
                  <p className="text-xs text-nutri-muted mt-1 min-h-[34px] leading-relaxed">{plan.description}</p>

                  {/* Pricing Matrix */}
                  <div className="my-4 p-3.5 rounded-2xl bg-nutri-bg border border-nutri-border space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-nutri-secondary">Monthly Price</span>
                      <span className="text-lg font-extrabold text-nutri-green font-heading">
                        {formatPrice(plan.price)}
                        <span className="text-xs text-nutri-muted font-normal"> / mo</span>
                      </span>
                    </div>
                    {plan.quarterlyPrice && (
                      <div className="flex items-baseline justify-between text-xs text-nutri-muted">
                        <span>Quarterly (90d)</span>
                        <span className="font-semibold text-nutri-charcoal">{formatPrice(plan.quarterlyPrice)}</span>
                      </div>
                    )}
                    {plan.annualPrice && (
                      <div className="flex items-baseline justify-between text-xs text-nutri-muted">
                        <span>Annual (365d)</span>
                        <span className="font-semibold text-nutri-charcoal">{formatPrice(plan.annualPrice)}</span>
                      </div>
                    )}
                  </div>

                  {/* Entitlement Summary Pills */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-nutri-border flex items-center gap-2">
                      <Percent className="w-4 h-4 text-nutri-green shrink-0" />
                      <div>
                        <span className="text-[10px] text-nutri-muted block leading-none">Food Discount</span>
                        <span className="font-bold text-nutri-charcoal">{plan.foodDiscountPercent}% OFF</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white border border-nutri-border flex items-center gap-2">
                      <Camera className="w-4 h-4 text-nutri-green shrink-0" />
                      <div>
                        <span className="text-[10px] text-nutri-muted block leading-none">AI Scans</span>
                        <span className="font-bold text-nutri-charcoal">
                          {plan.aiScanAllowance > 0 ? `${plan.aiScanAllowance}/mo` : "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Benefits Checklist */}
                  <div className="space-y-1.5 mt-4">
                    <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">
                      Configured Benefits
                    </span>
                    {(plan.benefitsList || []).map((b: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-nutri-secondary">
                        <CheckCircle2 className="w-3.5 h-3.5 text-nutri-green shrink-0 mt-0.5" />
                        <span className="leading-tight">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 border-t border-nutri-border mt-5 flex items-center justify-between">
                  <div className="text-xs text-nutri-muted">
                    <span className="font-bold text-nutri-charcoal">{plan.activeSubscribersCount || 0}</span> subscribers
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleEditPlan(plan)}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Configure Plan
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-nutri-border space-y-6">
            <div className="flex items-center justify-between border-b border-nutri-border pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-nutri-green tracking-wider">
                  Admin Plan Configuration
                </span>
                <h3 className="text-xl font-bold font-heading text-nutri-charcoal mt-0.5">
                  Edit {editingPlan.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-2 text-nutri-muted hover:text-nutri-charcoal rounded-full hover:bg-nutri-bg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-nutri-secondary block mb-1">Monthly Price (₹ INR)</label>
                <input
                  type="number"
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({ ...editingPlan, price: e.target.value })}
                  className="nutri-input"
                  min="0"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-nutri-secondary block mb-1">Validity (Days)</label>
                <input
                  type="number"
                  value={editingPlan.validityDays}
                  onChange={(e) => setEditingPlan({ ...editingPlan, validityDays: e.target.value })}
                  className="nutri-input"
                  min="1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-nutri-secondary block mb-1">Quarterly Price (₹ INR)</label>
                <input
                  type="number"
                  value={editingPlan.quarterlyPrice || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, quarterlyPrice: e.target.value })}
                  placeholder="Optional 90-day price"
                  className="nutri-input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-nutri-secondary block mb-1">Annual Price (₹ INR)</label>
                <input
                  type="number"
                  value={editingPlan.annualPrice || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, annualPrice: e.target.value })}
                  placeholder="Optional 365-day price"
                  className="nutri-input"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-nutri-secondary block mb-1">AI Scan Allowance / Month</label>
                <input
                  type="number"
                  value={editingPlan.aiScanAllowance}
                  onChange={(e) => setEditingPlan({ ...editingPlan, aiScanAllowance: e.target.value })}
                  className="nutri-input"
                  min="0"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-nutri-secondary block mb-1">Order Food Discount (%)</label>
                <input
                  type="number"
                  value={editingPlan.foodDiscountPercent}
                  onChange={(e) => setEditingPlan({ ...editingPlan, foodDiscountPercent: e.target.value })}
                  className="nutri-input"
                  min="0"
                  max="100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-nutri-secondary block mb-1">Header Badge Text</label>
                <input
                  type="text"
                  value={editingPlan.badgeText || ""}
                  onChange={(e) => setEditingPlan({ ...editingPlan, badgeText: e.target.value })}
                  placeholder="e.g. RECOMMENDED · BEST VALUE"
                  className="nutri-input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-nutri-secondary block mb-1">Plan Description</label>
                <textarea
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  rows={2}
                  className="nutri-textarea"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-nutri-secondary block mb-1">
                  Benefits List (1 item per line)
                </label>
                <textarea
                  value={editingPlan.benefitsText}
                  onChange={(e) => setEditingPlan({ ...editingPlan, benefitsText: e.target.value })}
                  rows={4}
                  className="nutri-textarea"
                  placeholder="Enter each feature entitlement on a new line"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-nutri-charcoal">
                  <input
                    type="checkbox"
                    checked={editingPlan.isActive}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                    className="w-4 h-4 text-nutri-green rounded"
                  />
                  <span>Plan Active for Customer Subscriptions</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-nutri-border">
              <Button variant="outline" size="sm" onClick={() => setEditingPlan(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSavePlan}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Subscribers Table */}
      <Card className="p-6 border-nutri-border bg-white rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">Active Customer Subscriptions</h3>
            <p className="text-xs text-nutri-muted">
              Live subscribers with active validity, scan usage metrics, and renewal dates.
            </p>
          </div>
          <span className="text-xs font-bold text-nutri-green bg-nutri-green-light px-3 py-1 rounded-full">
            {data?.activeSubscribers.length || 0} Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-nutri-bg text-nutri-secondary uppercase font-bold border-b border-nutri-border">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Pass Type</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">AI Scans Used</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Auto-Renew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nutri-border text-nutri-charcoal font-medium">
              {data?.activeSubscribers && data.activeSubscribers.length > 0 ? (
                data.activeSubscribers.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-nutri-bg/50">
                    <td className="py-3 px-4">
                      <div className="font-bold">{sub.user.name || "Customer"}</div>
                      <div className="text-[11px] text-nutri-muted">{sub.user.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-nutri-green">{sub.plan.name}</span>
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] text-nutri-secondary">
                      {sub.billingPeriod || "MONTHLY"}
                    </td>
                    <td className="py-3 px-4">
                      {sub.plan.aiScanAllowance > 0 ? (
                        <span className="font-semibold">
                          {sub.aiScansUsed || 0} / {sub.plan.aiScanAllowance}
                        </span>
                      ) : (
                        <span className="text-nutri-muted italic">N/A (Food Pass)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {new Date(sub.endDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sub.autoRenew ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {sub.autoRenew ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-nutri-muted">
                    No active subscribers currently found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legacy Plans & Audit Review */}
      {legacyPlans.length > 0 && (
        <Card className="p-6 border border-amber-200 bg-amber-50/50 rounded-3xl shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold font-heading text-amber-900">
                Legacy Plans Migration Review ({legacyPlans.length} Archived)
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed mt-0.5">
                These pre-existing plans have been safely archived to prevent new purchases while preserving historical
                billing records and grandfathered subscribers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {legacyPlans.map((legacy) => (
              <div
                key={legacy.id}
                className="p-4 rounded-2xl bg-white border border-amber-200 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-sm text-nutri-charcoal">{legacy.name}</h4>
                  <p className="text-xs text-nutri-muted">
                    Price: {formatPrice(legacy.price)} · Subscribers: {legacy.activeSubscribersCount || 0}
                  </p>
                </div>
                <Badge variant="gold" className="bg-amber-100 text-amber-800 border-none text-[10px]">
                  FLAGGED FOR REVIEW
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
