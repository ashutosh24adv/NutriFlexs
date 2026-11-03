"use client";

import React, { useState, useEffect } from "react";
import {
  KeyRound,
  Plus,
  Shield,
  ChefHat,
  Dumbbell,
  Check,
  Copy,
  AlertTriangle,
  RefreshCw,
  Ban,
  CheckCircle2,
  Calendar,
  Layers,
  Store,
  Info,
  X,
  Link2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AccessCodeItem {
  id: string;
  codePrefix: string;
  role: "KITCHEN" | "TRAINER" | "ADMIN";
  outletId: string | null;
  outletName: string | null;
  isActive: boolean;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  description: string | null;
  isDevSeed: boolean;
  createdAt: string;
  createdByName: string;
}

interface OutletOption {
  id: string;
  name: string;
  gymName: string;
}

export function AccessCodesTab() {
  const [codes, setCodes] = useState<AccessCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Outlets for kitchen code creation
  const [outlets, setOutlets] = useState<OutletOption[]>([]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formRole, setFormRole] = useState<"KITCHEN" | "TRAINER" | "ADMIN">("KITCHEN");
  const [formOutletId, setFormOutletId] = useState<string>("");
  const [formExpiryPreset, setFormExpiryPreset] = useState<string>("30");
  const [formMaxUses, setFormMaxUses] = useState<number>(1);
  const [formDescription, setFormDescription] = useState<string>("");
  const [formCustomCode, setFormCustomCode] = useState<string>("");

  // Reveal Modal for generated plaintext code
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState<string | null>(null);
  const [newlyGeneratedRole, setNewlyGeneratedRole] = useState<string>("ADMIN");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Action loading for revocation
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCodes();
    fetchOutlets();
  }, []);

  async function fetchCodes() {
    try {
      setRefreshing(true);
      setError(null);
      const res = await fetch("/api/admin/access-codes");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load access codes");
      }
      setCodes(data.codes || []);
    } catch (err: any) {
      setError(err.message || "Failed to load access codes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchOutlets() {
    try {
      const res = await fetch("/api/gyms");
      const data = await res.json();
      if (data.success && Array.isArray(data.gyms)) {
        const flattened: OutletOption[] = [];
        data.gyms.forEach((gym: any) => {
          if (gym.outlets && Array.isArray(gym.outlets)) {
            gym.outlets.forEach((o: any) => {
              flattened.push({
                id: o.id,
                name: o.name,
                gymName: gym.name,
              });
            });
          }
        });
        setOutlets(flattened);
        if (flattened.length > 0 && !formOutletId) {
          setFormOutletId(flattened[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load outlets for code modal", err);
    }
  }

  async function handleCreateCode(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);

    try {
      // Calculate expiration date
      let expiresAt: string | null = null;
      if (formExpiryPreset !== "NEVER") {
        const days = parseInt(formExpiryPreset, 10);
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + days);
        expiresAt = expDate.toISOString();
      }

      const payload = {
        role: formRole,
        outletId: formRole === "KITCHEN" && formOutletId ? formOutletId : undefined,
        expiresAt,
        maxUses: Number(formMaxUses) || 1,
        description: formDescription.trim() || undefined,
        customCode: formCustomCode.trim() || undefined,
      };

      const res = await fetch("/api/admin/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate access code");
      }

      // Store plaintext code for the one-time reveal modal
      setNewlyGeneratedCode(data.plaintextCode);
      setNewlyGeneratedRole(payload.role);
      setIsModalOpen(false);

      // Reset form
      setFormDescription("");
      setFormCustomCode("");
      setFormMaxUses(1);
      setFormExpiryPreset("30");

      // Refresh list
      await fetchCodes();
    } catch (err: any) {
      setError(err.message || "Failed to generate access code");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleStatus(item: AccessCodeItem) {
    try {
      setUpdatingId(item.id);
      const res = await fetch("/api/admin/access-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          isActive: !item.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update code status");
      }

      // Update locally
      setCodes((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err: any) {
      setError(err.message || "Failed to toggle code status");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyInviteLink(code: string, role: string) {
    const portal = role === "ADMIN" ? "admin" : role === "KITCHEN" ? "kitchen" : "trainer";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://nutriflexs.com";
    const url = `${origin}/signup?portal=${portal}&token=${encodeURIComponent(code)}&callbackUrl=%2F${portal}&staff=true`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const filteredCodes = codes.filter((c) => {
    if (roleFilter === "ALL") return true;
    return c.role === roleFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="p-6 border-nutri-border bg-white rounded-3xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                <KeyRound className="w-5 h-5 text-amber-700" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold font-heading text-nutri-charcoal">
                  Staff Access Code Registry
                </h2>
                <p className="text-xs text-nutri-secondary">
                  Cryptographically hashed single & multi-use access tokens for Kitchen, Trainer & Admin staff.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchCodes}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-nutri-border text-nutri-secondary hover:text-nutri-green bg-white hover:bg-nutri-bg transition-colors cursor-pointer"
              title="Refresh access code registry"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>

            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-nutri-green hover:bg-nutri-green-dark text-white rounded-full font-bold text-xs px-4 py-2.5 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Generate New Access Code
            </Button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs text-rose-800 font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Pills */}
        <div className="mt-5 pt-4 border-t border-nutri-border-light flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-nutri-secondary mr-1">Role:</span>
            {[
              { id: "ALL", label: `All Staff (${codes.length})` },
              {
                id: "KITCHEN",
                label: `Kitchen (${codes.filter((c) => c.role === "KITCHEN").length})`,
              },
              {
                id: "TRAINER",
                label: `Trainer (${codes.filter((c) => c.role === "TRAINER").length})`,
              },
              {
                id: "ADMIN",
                label: `Super Admin (${codes.filter((c) => c.role === "ADMIN").length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  roleFilter === tab.id
                    ? "bg-nutri-charcoal text-white"
                    : "bg-nutri-bg text-nutri-secondary hover:text-nutri-charcoal border border-nutri-border-light"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-nutri-secondary font-medium">
            🔒 Code secrets are hashed via HMAC-SHA256 • Never stored or displayed in plaintext
          </div>
        </div>
      </Card>

      {/* Access Codes Table */}
      <Card className="border-nutri-border bg-white rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-nutri-green mx-auto" />
            <p className="text-xs font-bold text-nutri-secondary">Loading staff access registry...</p>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <KeyRound className="w-8 h-8 text-nutri-secondary mx-auto opacity-50" />
            <p className="text-sm font-bold text-nutri-charcoal">No access codes found</p>
            <p className="text-xs text-nutri-secondary max-w-sm mx-auto">
              Generate a staff invitation code above to authorize new kitchen operators, gym trainers, or administrative personnel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-nutri-border text-nutri-secondary font-bold uppercase tracking-wider bg-nutri-bg/40">
                  <th className="py-3 px-4">Role & Preview</th>
                  <th className="py-3 px-4">Outlet Authorization</th>
                  <th className="py-3 px-4">Usage & Limit</th>
                  <th className="py-3 px-4">Expiration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nutri-border-light">
                {filteredCodes.map((item) => {
                  const isUpdating = updatingId === item.id;
                  const isExpired = item.expiresAt ? new Date(item.expiresAt) < new Date() : false;
                  const isExhausted = item.usedCount >= item.maxUses;

                  const roleBadge = {
                    KITCHEN: {
                      icon: ChefHat,
                      text: "KITCHEN KIOSK",
                      color: "bg-amber-50 text-amber-900 border-amber-200",
                    },
                    TRAINER: {
                      icon: Dumbbell,
                      text: "TRAINER PARTNER",
                      color: "bg-indigo-50 text-indigo-900 border-indigo-200",
                    },
                    ADMIN: {
                      icon: Shield,
                      text: "SUPER ADMIN",
                      color: "bg-rose-50 text-rose-900 border-rose-200",
                    },
                  }[item.role];

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-nutri-green-soft/40 transition-colors"
                    >
                      {/* Role & Masked Prefix */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${roleBadge.color}`}
                          >
                            <roleBadge.icon className="w-3 h-3" />
                            {roleBadge.text}
                          </span>
                          <div className="font-mono font-bold text-xs text-nutri-charcoal tracking-wider">
                            {item.codePrefix}••••
                            {item.isDevSeed && (
                              <span className="ml-2 text-[9px] font-sans font-bold px-1.5 py-0.2 bg-nutri-green-light text-nutri-green rounded border border-nutri-border">
                                DEV SEED
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-nutri-secondary line-clamp-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Outlet */}
                      <td className="py-3.5 px-4">
                        {item.role === "KITCHEN" ? (
                          item.outletName ? (
                            <div className="flex items-center gap-1.5 text-nutri-charcoal font-semibold">
                              <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="truncate max-w-[180px]">{item.outletName}</span>
                            </div>
                          ) : (
                            <span className="text-nutri-secondary italic">Any Authorized Kiosk</span>
                          )
                        ) : (
                          <span className="text-nutri-secondary text-[11px]">—</span>
                        )}
                      </td>

                      {/* Usages */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-nutri-charcoal">
                            {item.usedCount} / {item.maxUses}{" "}
                            <span className="text-[10px] font-normal text-nutri-secondary">uses</span>
                          </div>
                          <div className="w-20 bg-nutri-border rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isExhausted ? "bg-rose-500" : "bg-nutri-green"
                              }`}
                              style={{
                                width: `${Math.min(100, (item.usedCount / item.maxUses) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Expiration */}
                      <td className="py-3.5 px-4">
                        {item.expiresAt ? (
                          <div className="space-y-0.5">
                            <span
                              className={`text-[11px] font-semibold ${
                                isExpired ? "text-rose-600 line-through" : "text-nutri-charcoal"
                              }`}
                            >
                              {new Date(item.expiresAt).toLocaleDateString()}
                            </span>
                            {isExpired && (
                              <span className="block text-[10px] text-rose-600 font-bold">
                                Expired
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-nutri-secondary font-medium">Never expires</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {!item.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <Ban className="w-3 h-3" /> Revoked
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Expired
                          </span>
                        ) : isExhausted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            Exhausted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-nutri-green-light text-nutri-green border border-nutri-border">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </td>

                      {/* Created By & Date */}
                      <td className="py-3.5 px-4 text-nutri-secondary">
                        <div className="text-[11px] font-medium text-nutri-charcoal">
                          {item.createdByName}
                        </div>
                        <div className="text-[10px]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleToggleStatus(item)}
                          className={`text-[11px] font-bold px-3 py-1 rounded-xl border transition-colors cursor-pointer ${
                            item.isActive
                              ? "bg-white hover:bg-rose-50 text-rose-600 border-rose-200 hover:border-rose-300"
                              : "bg-white hover:bg-nutri-green-light text-nutri-green border-nutri-border hover:border-nutri-green"
                          }`}
                        >
                          {isUpdating
                            ? "Saving..."
                            : item.isActive
                            ? "Revoke Code"
                            : "Re-activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL 1: Generate Access Code Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-nutri-border space-y-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-nutri-border-light">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-nutri-green-light text-nutri-green">
                  <KeyRound className="w-4 h-4 stroke-[2.5]" />
                </span>
                <h3 className="text-base font-extrabold font-heading text-nutri-charcoal">
                  Generate Staff Access Code
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-nutri-secondary hover:text-nutri-charcoal p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-nutri-charcoal mb-1.5">
                  Permitted Staff Role
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "KITCHEN", label: "Kitchen", icon: ChefHat },
                    { id: "TRAINER", label: "Trainer", icon: Dumbbell },
                    { id: "ADMIN", label: "Super Admin", icon: Shield },
                  ].map((r) => {
                    const Icon = r.icon;
                    const isSelected = formRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setFormRole(r.id as any)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-nutri-charcoal text-white border-nutri-charcoal shadow-xs"
                            : "bg-nutri-bg/50 border-nutri-border text-nutri-secondary hover:text-nutri-charcoal hover:bg-white"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outlet Selector (for Kitchen role) */}
              {formRole === "KITCHEN" && (
                <div>
                  <label className="block text-xs font-bold text-nutri-charcoal mb-1.5">
                    Assigned Kitchen Outlet
                  </label>
                  <select
                    value={formOutletId}
                    onChange={(e) => setFormOutletId(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border bg-white text-nutri-charcoal font-medium focus:outline-none focus:border-nutri-green transition-colors"
                  >
                    <option value="">Any Authorized Kiosk (Flexible)</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.gymName})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-nutri-secondary mt-1">
                    Optionally lock the access code to a single specific outlet kiosk.
                  </p>
                </div>
              )}

              {/* Expiry and Usage Limit Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-nutri-charcoal mb-1.5">
                    Code Expiration
                  </label>
                  <select
                    value={formExpiryPreset}
                    onChange={(e) => setFormExpiryPreset(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border bg-white text-nutri-charcoal font-medium focus:outline-none focus:border-nutri-green transition-colors"
                  >
                    <option value="1">24 Hours (1 Day)</option>
                    <option value="7">7 Days</option>
                    <option value="30">30 Days (Default)</option>
                    <option value="90">90 Days</option>
                    <option value="NEVER">Never Expires</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-nutri-charcoal mb-1.5">
                    Maximum Uses
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border bg-white text-nutri-charcoal font-medium focus:outline-none focus:border-nutri-green transition-colors"
                  />
                </div>
              </div>

              {/* Description / Audit Note */}
              <div>
                <label className="block text-xs font-bold text-nutri-charcoal mb-1.5">
                  Audit Description / Personnel Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Koramangala head chef onboarding"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border bg-white text-nutri-charcoal font-medium focus:outline-none focus:border-nutri-green transition-colors"
                />
              </div>

              {/* Custom Code (Optional) */}
              <div>
                <label className="block text-xs font-bold text-nutri-charcoal mb-1.5">
                  Custom Code (Optional, leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="e.g., NF-KITCHEN-PROD-2026"
                  value={formCustomCode}
                  onChange={(e) => setFormCustomCode(e.target.value.toUpperCase())}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border bg-white text-nutri-charcoal font-mono uppercase focus:outline-none focus:border-nutri-green transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-nutri-border-light flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={generating}
                  className="bg-nutri-green hover:bg-nutri-green-dark text-white rounded-full font-bold text-xs px-5 cursor-pointer shadow-xs"
                >
                  Generate Code
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: One-Time Plaintext Code Reveal Banner */}
      {newlyGeneratedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-nutri-border space-y-5 animate-scale-up text-center">
            <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center mx-auto border border-nutri-border">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold font-heading text-nutri-charcoal">
                Access Code Created
              </h3>
              <p className="text-xs text-nutri-secondary">
                Please copy and securely deliver this code to the intended staff member now.
              </p>
            </div>

            {/* Plaintext Code Box */}
            <div className="p-4 rounded-2xl bg-nutri-bg border border-nutri-border space-y-2">
              <span className="text-[10px] uppercase font-bold text-nutri-secondary tracking-wider block">
                Plaintext Staff Code
              </span>
              <div className="text-lg font-mono font-extrabold text-nutri-charcoal tracking-widest select-all">
                {newlyGeneratedCode}
              </div>
            </div>

            {/* Direct Invitation Link Box */}
            <div className="p-3.5 rounded-2xl bg-nutri-green-soft border border-nutri-border space-y-1.5 text-left">
              <span className="text-[10px] uppercase font-bold text-nutri-green tracking-wider block">
                Single-Use Invitation Link
              </span>
              <div className="text-xs font-mono text-nutri-charcoal truncate bg-white px-2.5 py-1.5 rounded-lg border border-nutri-border-light select-all">
                {(typeof window !== "undefined" ? window.location.origin : "https://nutriflexs.com") + "/signup?portal=" + (newlyGeneratedRole === "ADMIN" ? "admin" : newlyGeneratedRole === "KITCHEN" ? "kitchen" : "trainer") + "&token=" + newlyGeneratedCode}
              </div>
            </div>

            {/* Security Warning Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-left text-xs text-amber-900 leading-snug">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>One-Time Display:</strong> For cryptographic security, codes are stored as irreversible HMAC hashes. This plaintext code cannot be retrieved again after closing.
              </span>
            </div>

            {/* Buttons */}
            <div className="space-y-2 pt-1">
              <Button
                type="button"
                onClick={() => handleCopyInviteLink(newlyGeneratedCode, newlyGeneratedRole)}
                className="w-full bg-nutri-green hover:bg-nutri-green-dark text-white rounded-full font-bold text-xs py-2.5 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                {copiedLink ? "Invitation Link Copied!" : "Copy One-Click Invitation Link"}
              </Button>

              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopy(newlyGeneratedCode)}
                  className="rounded-full text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Plain Code"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setNewlyGeneratedCode(null)}
                  className="rounded-full text-xs font-bold cursor-pointer hover:bg-nutri-bg"
                >
                  I&apos;ve Stored It Safely
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
