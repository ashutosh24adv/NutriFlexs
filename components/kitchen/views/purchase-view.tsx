"use client";

import React, { useState } from "react";
import {
  PackagePlus,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  Calendar,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface PurchaseViewProps {
  items: any[];
  outletId: string;
  onRefresh: () => void;
  onNavigateTab: (tab: any) => void;
}

export function PurchaseView({ items, outletId, onRefresh, onNavigateTab }: PurchaseViewProps) {
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id || "");
  const [quantityReceived, setQuantityReceived] = useState(10);
  const [costPerUnit, setCostPerUnit] = useState(120);
  const [supplier, setSupplier] = useState("FreshFarms Direct Ltd.");
  const [batchNumber, setBatchNumber] = useState(`BATCH-${Date.now().toString().slice(-6)}`);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);

  const selectedItem = items.find((it) => it.id === selectedItemId);
  const totalCost = Math.round(quantityReceived * costPerUnit * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || quantityReceived <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/kitchen/inventory/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          inventoryItemId: selectedItemId,
          quantityReceived: Number(quantityReceived),
          costPerUnit: Number(costPerUnit),
          supplier,
          batchNumber,
          expiryDate: expiryDate || null,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setLastReceipt(data);
        onRefresh();
        // Reset quantities
        setBatchNumber(`BATCH-${Date.now().toString().slice(-6)}`);
        setNotes("");
      } else {
        alert(data.error || "Failed to restock ingredient.");
      }
    } catch (err: any) {
      console.error("Restock failed:", err);
      alert("Network error processing stock restock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white font-heading">
              Purchase & Stock Receiving
            </h2>
            <p className="text-xs text-slate-400">
              Record verified deliveries from approved vendors. Automatically updates average cost and inventory ledger.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {lastReceipt && (
        <div className="bg-emerald-950/40 border border-emerald-700/80 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-300 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-extrabold text-white">
                Stock Received Successfully! Receipt #{lastReceipt.receiptNumber}
              </p>
              <p className="text-slate-300">
                New Available Stock: <span className="font-black text-emerald-400">{lastReceipt.newStock}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab("movements")}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 shrink-0 flex items-center gap-1"
          >
            Audit Ledger <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Ingredient Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300">Select Ingredient to Restock *</label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                const item = items.find((it) => it.id === e.target.value);
                if (item) {
                  setCostPerUnit(item.purchasePricePerUnit || 100);
                  if (item.supplier) setSupplier(item.supplier);
                }
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.category}) — Current: {it.quantity} {it.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Current Ingredient Summary Box */}
          {selectedItem && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Category</span>
                <p className="font-bold text-white">{selectedItem.category}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Available Stock</span>
                <p className="font-bold text-emerald-400">
                  {selectedItem.quantity} {selectedItem.unit}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Reorder Level</span>
                <p className="font-bold text-slate-300">
                  {selectedItem.lowStockThreshold} {selectedItem.unit}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">Current Avg Price</span>
                <p className="font-bold text-slate-300">
                  {formatPrice(selectedItem.purchasePricePerUnit)} / {selectedItem.unit}
                </p>
              </div>
            </div>
          )}

          {/* Quantity & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">
                Quantity Received ({selectedItem?.unit || "unit"}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={quantityReceived}
                onChange={(e) => setQuantityReceived(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Cost per Unit (₹) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Total Purchase Cost</label>
              <div className="px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-emerald-400 font-black text-sm">
                {formatPrice(totalCost)}
              </div>
            </div>
          </div>

          {/* Supplier & Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Supplier / Vendor *</label>
              <input
                type="text"
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. FreshFarms Logistics"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Batch Number</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Expiry Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Batch Expiry Date (optional)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300">Delivery Notes / Remarks</label>
              <input
                type="text"
                placeholder="e.g. Quality inspected by Chef, fresh harvest"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <PackagePlus className="w-4 h-4" />
              <span>{submitting ? "Processing Delivery..." : "Confirm & Restock Stock"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
