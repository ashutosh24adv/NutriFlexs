"use client";

import React, { useState } from "react";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Edit3,
  DollarSign,
  PackageCheck,
  Building2,
  X,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface InventoryViewProps {
  items: any[];
  overview: any;
  categories: string[];
  onRefresh: () => void;
  onSaveItem: (itemData: any) => Promise<boolean>;
  onAdjustStock: (data: any) => Promise<boolean>;
  onNavigateTab: (tab: any) => void;
  loading: boolean;
}

export function InventoryView({
  items,
  overview,
  categories,
  onRefresh,
  onSaveItem,
  onAdjustStock,
  onNavigateTab,
  loading,
}: InventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    ingredientName: "",
    category: "Produce",
    unit: "kg",
    quantity: 10,
    lowStockThreshold: 5,
    maxStockThreshold: 50,
    purchasePricePerUnit: 100,
    supplier: "",
    batchNumber: "",
    expiryDate: "",
    storageLocation: "Chiller 1",
    notes: "",
  });

  // Adjust Stock Modal
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<any | null>(null);
  const [adjustType, setAdjustType] = useState<"SET" | "ADD" | "DEDUCT">("SET");
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Filter items in UI
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedCategory !== "All" && item.category !== selectedCategory) {
      return false;
    }

    if (statusFilter !== "all") {
      return item.status.toLowerCase() === statusFilter.toLowerCase();
    }

    return true;
  });

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.ingredientName.trim()) return;

    const ok = await onSaveItem(addForm);
    if (ok) {
      setIsAddModalOpen(false);
      setAddForm({
        ingredientName: "",
        category: "Produce",
        unit: "kg",
        quantity: 10,
        lowStockThreshold: 5,
        maxStockThreshold: 50,
        purchasePricePerUnit: 100,
        supplier: "",
        batchNumber: "",
        expiryDate: "",
        storageLocation: "Chiller 1",
        notes: "",
      });
    }
  };

  const handleConfirmAdjust = async () => {
    if (!selectedItemForAdjust || !adjustReason.trim()) return;
    setSubmittingAdjust(true);
    try {
      const ok = await onAdjustStock({
        inventoryItemId: selectedItemForAdjust.id,
        adjustmentType: adjustType,
        quantity: Number(adjustQty),
        reason: adjustReason.trim(),
      });
      if (ok) {
        setSelectedItemForAdjust(null);
        setAdjustReason("");
      }
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "all"
              ? "bg-slate-800 border-slate-700"
              : "bg-slate-900/80 border-slate-800/80 hover:bg-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Items</span>
          <p className="text-xl font-black text-white mt-1">{overview.totalItems}</p>
        </div>

        <div
          onClick={() => setStatusFilter("in_stock")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "in_stock"
              ? "bg-emerald-950/40 border-emerald-700"
              : "bg-slate-900/80 border-slate-800/80 hover:bg-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-400 uppercase">In Stock</span>
          <p className="text-xl font-black text-emerald-400 mt-1">{overview.inStockCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter("low_stock")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "low_stock"
              ? "bg-amber-950/40 border-amber-700"
              : "bg-slate-900/80 border-slate-800/80 hover:bg-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-amber-400 uppercase">Low Stock</span>
          <p className="text-xl font-black text-amber-400 mt-1">{overview.lowStockCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter("out_of_stock")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "out_of_stock"
              ? "bg-rose-950/40 border-rose-700"
              : "bg-slate-900/80 border-slate-800/80 hover:bg-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-rose-400 uppercase">Out of Stock</span>
          <p className="text-xl font-black text-rose-400 mt-1">{overview.outOfStockCount}</p>
        </div>

        <div
          onClick={() => setStatusFilter("expiring_soon")}
          className={`p-3 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === "expiring_soon"
              ? "bg-purple-950/40 border-purple-700"
              : "bg-slate-900/80 border-slate-800/80 hover:bg-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-purple-400 uppercase">Expiring Soon</span>
          <p className="text-xl font-black text-purple-400 mt-1">{overview.expiringSoonCount}</p>
        </div>

        <div className="p-3 rounded-2xl border bg-slate-900/80 border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Valuation</span>
          <p className="text-xl font-black text-emerald-400 mt-1">
            {formatPrice(overview.totalValuation)}
          </p>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Action Button */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ingredient by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab("purchase")}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <span>Restock Stock</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Ingredient</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">Available Stock</th>
                <th className="py-3.5 px-3">Reorder Threshold</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Expiry Date</th>
                <th className="py-3.5 px-3">Location</th>
                <th className="py-3.5 px-3">Cost / Unit</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No ingredients match current filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.status === "LOW_STOCK";
                  const isOut = item.status === "OUT_OF_STOCK";
                  const isExpiring = item.status === "EXPIRING_SOON";
                  const isExpired = item.status === "EXPIRED";

                  return (
                    <tr key={item.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-xs">{item.name}</span>
                          {item.isOrganic && (
                            <span className="text-[9px] font-extrabold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                              Organic
                            </span>
                          )}
                        </div>
                        {item.supplier && (
                          <p className="text-[10px] text-slate-500 mt-0.5">{item.supplier}</p>
                        )}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="text-slate-400 font-semibold">{item.category}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-baseline gap-1">
                          <span
                            className={`text-sm font-black ${
                              isOut
                                ? "text-rose-400"
                                : isLow
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                          >
                            {item.quantity}
                          </span>
                          <span className="text-[11px] text-slate-500">{item.unit}</span>
                        </div>
                        {item.reservedQuantity > 0 && (
                          <span className="text-[10px] text-amber-400/80 block">
                            ({item.reservedQuantity} {item.unit} reserved)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-slate-400">
                        {item.lowStockThreshold} {item.unit}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                            isOut
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : isExpired
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : isLow
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isExpiring
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                        {item.expiryDate ? (
                          <span
                            className={
                              isExpired
                                ? "text-rose-400 font-bold"
                                : isExpiring
                                ? "text-amber-400 font-bold"
                                : ""
                            }
                          >
                            {new Date(item.expiryDate).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {item.daysUntilExpiry !== null && (
                              <span className="block text-[9px] text-slate-500">
                                {item.daysUntilExpiry < 0
                                  ? `${Math.abs(item.daysUntilExpiry)}d ago`
                                  : `in ${item.daysUntilExpiry}d`}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                        {item.storageLocation || "Main"}
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-300">
                        {formatPrice(item.purchasePricePerUnit)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedItemForAdjust(item);
                              setAdjustQty(item.quantity);
                              setAdjustType("SET");
                              setAdjustReason("");
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-bold transition-colors"
                            title="Adjust Stock"
                          >
                            Adjust
                          </button>

                          <button
                            onClick={() => onNavigateTab("purchase")}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-400 text-[11px] font-bold transition-colors"
                            title="Restock"
                          >
                            Restock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add Ingredient Form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-extrabold text-white">Add New Kitchen Ingredient</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Ingredient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Baby Spinach"
                  value={addForm.ingredientName}
                  onChange={(e) => setAddForm({ ...addForm, ingredientName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Category</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Proteins">Proteins</option>
                    <option value="Produce">Produce</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Grains">Grains</option>
                    <option value="Superfoods">Superfoods</option>
                    <option value="Oils & Condiments">Oils & Condiments</option>
                    <option value="Packaging">Packaging</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Standard Unit</label>
                  <select
                    value={addForm.unit}
                    onChange={(e) => setAddForm({ ...addForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="kg">kg (Kilogram)</option>
                    <option value="g">g (Gram)</option>
                    <option value="litre">litre (Litre)</option>
                    <option value="ml">ml (Millilitre)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="packets">packets</option>
                    <option value="boxes">boxes</option>
                    <option value="bottles">bottles</option>
                    <option value="units">units</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Initial Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={addForm.quantity}
                    onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Reorder Level</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={addForm.lowStockThreshold}
                    onChange={(e) =>
                      setAddForm({ ...addForm, lowStockThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Price / Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={addForm.purchasePricePerUnit}
                    onChange={(e) =>
                      setAddForm({ ...addForm, purchasePricePerUnit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Supplier</label>
                  <input
                    type="text"
                    placeholder="e.g. FreshFarms Co."
                    value={addForm.supplier}
                    onChange={(e) => setAddForm({ ...addForm, supplier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Storage Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Walk-in Chiller 1"
                    value={addForm.storageLocation}
                    onChange={(e) => setAddForm({ ...addForm, storageLocation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Batch Number (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. BATCH-2026-09"
                    value={addForm.batchNumber}
                    onChange={(e) => setAddForm({ ...addForm, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Expiry Date (optional)</label>
                  <input
                    type="date"
                    value={addForm.expiryDate}
                    onChange={(e) => setAddForm({ ...addForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adjust Stock */}
      {selectedItemForAdjust && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Stock Adjustment • {selectedItemForAdjust.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Current Stock:{" "}
                  <span className="text-emerald-400 font-bold">
                    {selectedItemForAdjust.quantity} {selectedItemForAdjust.unit}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedItemForAdjust(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Adjustment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "SET", label: "Set Exact" },
                    { id: "ADD", label: "+ Add Stock" },
                    { id: "DEDUCT", label: "- Deduct Stock" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAdjustType(m.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                        adjustType === m.id
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  {adjustType === "SET"
                    ? "New Total Quantity"
                    : adjustType === "ADD"
                    ? "Quantity to Add"
                    : "Quantity to Deduct"}{" "}
                  ({selectedItemForAdjust.unit})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Audit Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical inventory recount, Spill damage..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItemForAdjust(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingAdjust || !adjustReason.trim()}
                  onClick={handleConfirmAdjust}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {submittingAdjust ? "Updating..." : "Confirm Audit Adjustment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
