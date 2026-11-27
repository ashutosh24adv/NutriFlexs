"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Zap, Gift, ShieldAlert, Check, Plus } from "lucide-react";

interface RewardRule {
  id: string;
  activityType: string;
  label: string;
  description: string | null;
  points: number;
  rupeesPerPoint: number | null;
  enabled: boolean;
}

interface RewardCatalogueItem {
  id: string;
  name: string;
  description: string | null;
  pointsRequired: number;
  discountAmount: number;
  minimumOrderValue: number;
  expiryDays: number;
  enabled: boolean;
}

interface AdminTransaction {
  id: string;
  type: string;
  activityType: string;
  points: number;
  description: string;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface AdminRewardsOverview {
  rules: RewardRule[];
  catalogue: RewardCatalogueItem[];
  transactions: AdminTransaction[];
  suspiciousSummary?: {
    highVolumeUsersLast24h?: Array<{ userId: string; count: number }>;
  };
}

export function RewardsTab() {
  const [data, setData] = useState<AdminRewardsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rule draft points
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, { points: number; rupeesPerPoint: number }>>({});

  // New catalogue form
  const [newReward, setNewReward] = useState({
    name: "",
    description: "",
    pointsRequired: 300,
    discountAmount: 20,
    minimumOrderValue: 100,
    expiryDays: 30,
  });

  // Manual point adjustment form
  const [adjustForm, setAdjustForm] = useState({
    targetUserId: "",
    pointsDelta: 0,
    reason: "",
  });

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rewards", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to load FuelPoints overview");
      } else {
        setData(json.data);
        const drafts: Record<string, { points: number; rupeesPerPoint: number }> = {};
        for (const r of json.data.rules as RewardRule[]) {
          drafts[r.activityType] = {
            points: r.points,
            rupeesPerPoint: r.rupeesPerPoint ?? 10,
          };
        }
        setRuleDrafts(drafts);
      }
    } catch {
      setError("Network error loading FuelPoints admin data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const showNotice = (msg: string) => {
    setFeedback(msg);
    setError(null);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleUpdateRule = async (rule: RewardRule, nextEnabled?: boolean) => {
    setSavingId(rule.activityType);
    setError(null);
    try {
      const draft = ruleDrafts[rule.activityType] || { points: rule.points, rupeesPerPoint: rule.rupeesPerPoint ?? 10 };
      const res = await fetch("/api/admin/rewards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_rule",
          payload: {
            activityType: rule.activityType,
            points: Number(draft.points),
            rupeesPerPoint: rule.activityType === "FOOD_PURCHASE" ? Number(draft.rupeesPerPoint) : undefined,
            enabled: typeof nextEnabled === "boolean" ? nextEnabled : rule.enabled,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to update reward rule");
      } else {
        showNotice(`Updated ${rule.label}`);
        await loadOverview();
      }
    } catch {
      setError("Network error updating reward rule");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleCatalogueItem = async (item: RewardCatalogueItem) => {
    setSavingId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/rewards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_catalogue",
          payload: {
            id: item.id,
            name: item.name,
            description: item.description || undefined,
            pointsRequired: item.pointsRequired,
            discountAmount: item.discountAmount,
            minimumOrderValue: item.minimumOrderValue,
            expiryDays: item.expiryDays,
            enabled: !item.enabled,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to update reward item");
      } else {
        showNotice(`${item.name} ${item.enabled ? "disabled" : "enabled"}`);
        await loadOverview();
      }
    } catch {
      setError("Network error updating catalogue item");
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateCatalogueItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingId("create_catalogue");
    setError(null);
    try {
      const res = await fetch("/api/admin/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_catalogue",
          payload: {
            name: newReward.name.trim(),
            description: newReward.description.trim() || undefined,
            pointsRequired: Number(newReward.pointsRequired),
            discountAmount: Number(newReward.discountAmount),
            minimumOrderValue: Number(newReward.minimumOrderValue),
            expiryDays: Number(newReward.expiryDays),
            enabled: true,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to create catalogue reward");
      } else {
        setNewReward({
          name: "",
          description: "",
          pointsRequired: 300,
          discountAmount: 20,
          minimumOrderValue: 100,
          expiryDays: 30,
        });
        showNotice("Reward added to catalogue");
        await loadOverview();
      }
    } catch {
      setError("Network error creating reward");
    } finally {
      setSavingId(null);
    }
  };

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingId("manual_adjust");
    setError(null);
    try {
      const res = await fetch("/api/admin/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_points",
          payload: {
            userId: adjustForm.targetUserId.trim(),
            pointsDelta: Number(adjustForm.pointsDelta),
            reason: adjustForm.reason.trim(),
          },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to adjust points");
      } else {
        setAdjustForm({ targetUserId: "", pointsDelta: 0, reason: "" });
        showNotice("Points adjusted and logged in audit trail");
        await loadOverview();
      }
    } catch {
      setError("Network error adjusting points");
    } finally {
      setSavingId(null);
    }
  };

  if (loading && !data) {
    return (
      <Card className="p-8 border-nutri-border bg-white text-center text-sm text-nutri-secondary">
        Loading FuelPoints management...
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold font-heading text-nutri-charcoal flex items-center gap-2">
            <Zap className="w-5 h-5 text-nutri-green fill-current" />
            FuelPoints Rewards Control
          </h2>
          <p className="text-xs text-nutri-secondary">
            Configure earning rules, coupon catalogue, and audit point transactions.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOverview}
          className="px-3.5 py-2 rounded-xl bg-white border border-nutri-border text-xs font-bold text-nutri-charcoal hover:bg-nutri-bg flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {feedback && (
        <div className="px-4 py-2.5 rounded-xl bg-[#EAF4E3] border border-[#CFE5C3] text-xs font-bold text-[#24630F] flex items-center gap-2">
          <Check className="w-4 h-4" />
          {feedback}
        </div>
      )}

      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Earning Rules */}
      <Card className="p-5 border-nutri-border bg-white space-y-4">
        <h3 className="text-sm font-extrabold font-heading text-nutri-charcoal">
          Earning Rules Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(data?.rules || []).map((rule) => {
            const draft = ruleDrafts[rule.activityType] || {
              points: rule.points,
              rupeesPerPoint: rule.rupeesPerPoint ?? 10,
            };
            const isPurchase = rule.activityType === "FOOD_PURCHASE";
            return (
              <div
                key={rule.id}
                className="p-4 rounded-xl border border-nutri-border bg-[#FCFDFC] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-nutri-charcoal">{rule.label}</div>
                    <p className="text-[11px] text-nutri-secondary mt-0.5">{rule.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={savingId === rule.activityType}
                    onClick={() => handleUpdateRule(rule, !rule.enabled)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer ${
                      rule.enabled
                        ? "bg-[#EAF4E3] text-[#24630F] border-[#CFE5C3]"
                        : "bg-neutral-100 text-neutral-600 border-neutral-200"
                    }`}
                  >
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  {isPurchase ? (
                    <label className="text-[11px] font-semibold text-nutri-secondary">
                      ₹ per 1 FP
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={draft.rupeesPerPoint}
                        onChange={(e) =>
                          setRuleDrafts((prev) => ({
                            ...prev,
                            [rule.activityType]: {
                              ...draft,
                              rupeesPerPoint: Number(e.target.value),
                            },
                          }))
                        }
                        className="mt-1 block w-28 px-2.5 py-1.5 rounded-lg border border-nutri-border bg-white text-xs font-bold text-nutri-charcoal"
                      />
                    </label>
                  ) : (
                    <label className="text-[11px] font-semibold text-nutri-secondary">
                      Points (FP)
                      <input
                        type="number"
                        min={0}
                        max={500}
                        value={draft.points}
                        onChange={(e) =>
                          setRuleDrafts((prev) => ({
                            ...prev,
                            [rule.activityType]: {
                              ...draft,
                              points: Number(e.target.value),
                            },
                          }))
                        }
                        className="mt-1 block w-28 px-2.5 py-1.5 rounded-lg border border-nutri-border bg-white text-xs font-bold text-nutri-charcoal"
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    disabled={savingId === rule.activityType}
                    onClick={() => handleUpdateRule(rule)}
                    className="px-3 py-1.5 rounded-lg bg-[#2F7D16] hover:bg-[#24630F] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {savingId === rule.activityType ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Rewards Catalogue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 p-5 border-nutri-border bg-white space-y-4">
          <h3 className="text-sm font-extrabold font-heading text-nutri-charcoal flex items-center gap-2">
            <Gift className="w-4 h-4 text-nutri-green" />
            Rewards Catalogue
          </h3>
          <div className="space-y-2.5">
            {(data?.catalogue || []).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-nutri-border bg-[#FCFDFC]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-nutri-charcoal">{item.name}</span>
                    <Badge variant="protein" className="text-[10px] bg-[#EAF4E3] text-[#24630F] border-[#CFE5C3]">
                      {item.pointsRequired} FP
                    </Badge>
                  </div>
                  <p className="text-[11px] text-nutri-secondary mt-0.5">
                    ₹{item.discountAmount} off • Min order ₹{item.minimumOrderValue} • Valid {item.expiryDays} days
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingId === item.id}
                  onClick={() => handleToggleCatalogueItem(item)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer ${
                    item.enabled
                      ? "bg-[#EAF4E3] text-[#24630F] border-[#CFE5C3]"
                      : "bg-neutral-100 text-neutral-600 border-neutral-200"
                  }`}
                >
                  {item.enabled ? "Active" : "Paused"}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5 p-5 border-nutri-border bg-white space-y-4">
          <h3 className="text-sm font-extrabold font-heading text-nutri-charcoal flex items-center gap-2">
            <Plus className="w-4 h-4 text-nutri-green" />
            Add Catalogue Reward
          </h3>
          <form onSubmit={handleCreateCatalogueItem} className="space-y-3 text-xs">
            <input
              type="text"
              required
              placeholder="Reward title (e.g. ₹100 OFF)"
              value={newReward.name}
              onChange={(e) => setNewReward((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-nutri-border bg-[#FCFDFC]"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <label className="text-[11px] font-semibold text-nutri-secondary">
                Points Required
                <input
                  type="number"
                  min={10}
                  required
                  value={newReward.pointsRequired}
                  onChange={(e) => setNewReward((p) => ({ ...p, pointsRequired: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-nutri-border bg-[#FCFDFC] text-nutri-charcoal font-bold"
                />
              </label>
              <label className="text-[11px] font-semibold text-nutri-secondary">
                Discount (₹)
                <input
                  type="number"
                  min={1}
                  required
                  value={newReward.discountAmount}
                  onChange={(e) => setNewReward((p) => ({ ...p, discountAmount: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-nutri-border bg-[#FCFDFC] text-nutri-charcoal font-bold"
                />
              </label>
              <label className="text-[11px] font-semibold text-nutri-secondary">
                Min Order (₹)
                <input
                  type="number"
                  min={0}
                  required
                  value={newReward.minimumOrderValue}
                  onChange={(e) => setNewReward((p) => ({ ...p, minimumOrderValue: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-nutri-border bg-[#FCFDFC] text-nutri-charcoal font-bold"
                />
              </label>
              <label className="text-[11px] font-semibold text-nutri-secondary">
                Expiry (days)
                <input
                  type="number"
                  min={1}
                  required
                  value={newReward.expiryDays}
                  onChange={(e) => setNewReward((p) => ({ ...p, expiryDays: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-nutri-border bg-[#FCFDFC] text-nutri-charcoal font-bold"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={savingId === "create_catalogue"}
              className="w-full py-2.5 rounded-xl bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {savingId === "create_catalogue" ? "Creating..." : "Create Reward"}
            </button>
          </form>
        </Card>
      </div>

      {/* Manual Point Adjustment & Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5 p-5 border-nutri-border bg-white space-y-4">
          <h3 className="text-sm font-extrabold font-heading text-nutri-charcoal">
            Manual Point Adjustment
          </h3>
          <form onSubmit={handleManualAdjust} className="space-y-3 text-xs">
            <input
              type="text"
              required
              placeholder="Customer User ID"
              value={adjustForm.targetUserId}
              onChange={(e) => setAdjustForm((p) => ({ ...p, targetUserId: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-nutri-border bg-[#FCFDFC]"
            />
            <input
              type="number"
              required
              placeholder="Points delta (e.g. 50 or -20)"
              value={adjustForm.pointsDelta || ""}
              onChange={(e) => setAdjustForm((p) => ({ ...p, pointsDelta: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-xl border border-nutri-border bg-[#FCFDFC]"
            />
            <input
              type="text"
              required
              minLength={5}
              placeholder="Mandatory audit reason"
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-nutri-border bg-[#FCFDFC]"
            />
            <button
              type="submit"
              disabled={savingId === "manual_adjust"}
              className="w-full py-2.5 rounded-xl bg-nutri-charcoal hover:bg-black text-white font-bold cursor-pointer disabled:opacity-50"
            >
              {savingId === "manual_adjust" ? "Applying..." : "Apply Adjustment"}
            </button>
          </form>
        </Card>

        <Card className="lg:col-span-7 p-5 border-nutri-border bg-white space-y-4">
          <h3 className="text-sm font-extrabold font-heading text-nutri-charcoal">
            Recent FuelPoints Transactions
          </h3>
          <div className="max-h-72 overflow-y-auto divide-y divide-nutri-border-light">
            {(data?.transactions || []).slice(0, 20).map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-bold text-nutri-charcoal truncate">{tx.description}</div>
                  <div className="text-[11px] text-nutri-secondary truncate">
                    {tx.user?.email || tx.user?.name || "Customer"} • {new Date(tx.createdAt).toLocaleString("en-IN")}
                  </div>
                </div>
                <span
                  className={`font-extrabold tabular-nums shrink-0 ${
                    tx.points >= 0 ? "text-[#2F7D16]" : "text-rose-600"
                  }`}
                >
                  {tx.points >= 0 ? `+${tx.points}` : tx.points} FP
                </span>
              </div>
            ))}
            {(data?.transactions || []).length === 0 && (
              <p className="text-xs text-nutri-secondary py-6 text-center">
                No FuelPoints transactions recorded yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
