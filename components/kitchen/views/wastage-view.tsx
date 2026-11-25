"use client";

import React, { useState, useEffect } from "react";
import {
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  X,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface WastageViewProps {
  items: any[];
  outletId: string;
  onRefreshInventory: () => void;
}

export function WastageView({ items, outletId, onRefreshInventory }: WastageViewProps) {
  const [wastages, setWastages] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    todayCount: 0,
    todayCost: 0,
    monthCount: 0,
    monthCost: 0,
  });
  const [loading, setLoading] = useState(true);

  // Record Wastage Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || "");
  const [quantityWasted, setQuantityWasted] = useState(1);
  const [reason, setReason] = useState("Spoiled / Past Expiry");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedItem = items.find((it) => it.id === selectedItemId);

  async function fetchWastages() {
    setLoading(true);
    try {
      const res = await fetch(`/api/kitchen/inventory/wastage?outletId=${outletId}&limit=50`);
      const data = await res.json();
      if (data.success && data.wastages) {
        setWastages(data.wastages);
        if (data.summary) setSummary(data.summary);
      }
    } catch (e) {
      console.error("Failed to fetch wastages:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchWastages();
  }, [outletId]);

  const handleRecordWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || quantityWasted <= 0 || !reason.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/kitchen/inventory/wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          inventoryItemId: selectedItemId,
          quantityWasted: Number(quantityWasted),
          reason: reason.trim(),
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsRecordModalOpen(false);
        setNotes("");
        fetchWastages();
        onRefreshInventory();
      } else {
        alert(data.error || "Failed to record wastage.");
      }
    } catch (err: any) {
      console.error("Wastage record error:", err);
      alert("Network error recording wastage.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Today&apos;s Wastage Events</span>
          <p className="text-2xl font-black text-rose-400 mt-1">{summary.todayCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Logged today</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Today&apos;s Wastage Loss</span>
          <p className="text-2xl font-black text-rose-400 mt-1">{formatPrice(summary.todayCost)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Direct material cost</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">MTD Wastage Items</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{summary.monthCount}</p>
          <p className="text-[10px] text-slate-400 mt-1">Month-to-date events</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">MTD Wastage Loss</span>
          <p className="text-2xl font-black text-amber-400 mt-1">{formatPrice(summary.monthCost)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Month-to-date cost</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Trash2 className="w-5 h-5 text-rose-400" />
          <div>
            <h2 className="text-base font-extrabold text-white">Kitchen Wastage & Spoilage Log</h2>
            <p className="text-xs text-slate-400">
              Auditable records of all food waste, prep discard, and expired ingredients
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchWastages}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            title="Refresh Wastages"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Wastage</span>
          </button>
        </div>
      </div>

      {/* Wastages Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-3">Ingredient</th>
                <th className="py-3.5 px-3">Quantity Wasted</th>
                <th className="py-3.5 px-3">Reason</th>
                <th className="py-3.5 px-3">Material Cost Loss</th>
                <th className="py-3.5 px-3">Notes</th>
                <th className="py-3.5 px-4">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {wastages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No wastage events recorded for this outlet.
                  </td>
                </tr>
              ) : (
                wastages.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(w.createdAt).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3.5 px-3 font-extrabold text-white">
                      {w.ingredientName}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-rose-400">
                      {w.quantity} {w.unit}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
                        {w.reason}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-bold text-white">
                      {formatPrice(w.cost)}
                    </td>

                    <td className="py-3.5 px-3 text-slate-400 max-w-xs truncate">
                      {w.notes || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {w.recordedBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Record Wastage */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-extrabold text-white">Record Ingredient Wastage</h3>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordWastage} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Ingredient *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-rose-500"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} (Available: {it.quantity} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  Quantity to Discard ({selectedItem?.unit || "unit"}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedItem?.quantity || 999}
                  required
                  value={quantityWasted}
                  onChange={(e) => setQuantityWasted(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Reason for Waste *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="Spoiled / Past Expiry">Spoiled / Past Expiry</option>
                  <option value="Dropped / Physical Damage">Dropped / Physical Damage</option>
                  <option value="Preparation Mistake / Overcooked">Preparation Mistake / Overcooked</option>
                  <option value="Packaging Broken / Contaminated">Packaging Broken / Contaminated</option>
                  <option value="Customer Return / Spill">Customer Return / Spill</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Notes / Details</label>
                <input
                  type="text"
                  placeholder="e.g. Broken packaging upon opening"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  {submitting ? "Recording..." : "Confirm & Deduct Wastage"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
