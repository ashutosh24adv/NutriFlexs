"use client";

import React, { useState } from "react";
import {
  Clock,
  Search,
  Filter,
  CheckCircle2,
  ChefHat,
  X,
  AlertCircle,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface LiveOrdersViewProps {
  orders: any[];
  onUpdateOrderStatus: (orderId: string, status: string, reason?: string) => Promise<void>;
  loading: boolean;
}

export function LiveOrdersView({ orders, onUpdateOrderStatus, loading }: LiveOrdersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE"); // ACTIVE, ORDER_PLACED, ACCEPTED, PREPARING, READY_FOR_PICKUP, COMPLETED
  const [sortOrder, setSortOrder] = useState<"OLDEST" | "NEWEST">("OLDEST");

  // Selected Order for Preparation Details modal
  const [selectedOrderForPrep, setSelectedOrderForPrep] = useState<any | null>(null);
  const [checkedPrepItems, setCheckedPrepItems] = useState<Record<string, boolean>>({});

  // Cancel order modal
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const columns = [
    { key: "ORDER_PLACED", label: "NEW ORDERS", color: "bg-rose-500/15 border-rose-500/30 text-rose-300" },
    { key: "ACCEPTED", label: "ACCEPTED", color: "bg-blue-500/15 border-blue-500/30 text-blue-300" },
    { key: "PREPARING", label: "PREPARING (~5 MIN)", color: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
    { key: "READY_FOR_PICKUP", label: "READY FOR PICKUP", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
    { key: "COMPLETED", label: "COMPLETED TODAY", color: "bg-slate-800 border-slate-700 text-slate-400" },
  ];

  // Filtering & sorting
  const filteredOrders = orders.filter((ord) => {
    // Search query
    const matchesSearch =
      ord.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "ACTIVE") {
      return ord.status !== "COMPLETED" && ord.status !== "CANCELLED";
    }
    if (statusFilter !== "ALL") {
      if (statusFilter === "ACCEPTED") {
        return ord.status === "ACCEPTED" || ord.status === "CONFIRMED";
      }
      return ord.status === statusFilter;
    }
    return true;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === "OLDEST" ? timeA - timeB : timeB - timeA;
  });

  const handleOpenPrepModal = (ord: any) => {
    setSelectedOrderForPrep(ord);
    setCheckedPrepItems({});
  };

  const toggleChecklist = (key: string) => {
    setCheckedPrepItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    await onUpdateOrderStatus(orderToCancel.id, "CANCELLED", cancelReason || "Cancelled by kitchen operator");
    setOrderToCancel(null);
    setCancelReason("");
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter & Controls Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order # or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "ACTIVE", label: "Active Queue" },
            { id: "ORDER_PLACED", label: "New" },
            { id: "PREPARING", label: "Preparing" },
            { id: "READY_FOR_PICKUP", label: "Ready" },
            { id: "COMPLETED", label: "Completed" },
            { id: "ALL", label: "All Orders" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === "OLDEST" ? "NEWEST" : "OLDEST")}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-0"
            title="Toggle Sort by Time"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{sortOrder === "OLDEST" ? "Oldest First (Urgent)" : "Newest First"}</span>
          </button>
        </div>
      </div>

      {/* KDS Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
        {columns.map((col) => {
          const colOrders = sortedOrders.filter((o) => {
            if (col.key === "ACCEPTED") return o.status === "ACCEPTED" || o.status === "CONFIRMED";
            return o.status === col.key;
          });

          return (
            <div
              key={col.key}
              className="bg-slate-950/80 rounded-3xl p-4 border border-slate-800/90 space-y-3 min-h-[550px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
                <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full border ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[750px] pr-1">
                {colOrders.length === 0 ? (
                  <div className="py-16 text-center text-slate-600 text-xs font-medium">
                    No orders in queue
                  </div>
                ) : (
                  colOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className={`bg-slate-900 border rounded-2xl p-4 space-y-3 shadow-md transition-all ${
                        ord.isDelayed
                          ? "border-rose-500/60 shadow-rose-950/20"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Top Bar: Order ID, Time elapsed & Delay Tag */}
                      <div className="flex items-start justify-between border-b border-slate-800/80 pb-2.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-emerald-400 font-heading">
                              {ord.orderNumber}
                            </span>
                            {ord.isDelayed && (
                              <span className="text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded-full uppercase">
                                Urgent
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-200 mt-0.5">
                            {ord.customerName}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                              ord.isDelayed
                                ? "bg-rose-950/80 text-rose-400 border border-rose-800"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5" />
                            {ord.elapsedMinutes}m ago
                          </span>
                        </div>
                      </div>

                      {/* Items Ordered */}
                      <div className="space-y-1.5 py-1">
                        {ord.items?.map((item: any) => (
                          <div key={item.id} className="text-xs flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-200">
                              {item.quantity}x {item.productName}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-extrabold shrink-0 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              {item.protein}g P
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Special Instructions if present */}
                      {ord.specialInstructions && (
                        <div className="bg-slate-950 border border-amber-900/40 text-amber-300 text-[11px] p-2 rounded-xl">
                          <span className="font-bold">Note: </span>
                          {ord.specialInstructions}
                        </div>
                      )}

                      {/* Prep Details button */}
                      <button
                        onClick={() => handleOpenPrepModal(ord)}
                        className="w-full py-1.5 px-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[11px] font-semibold border border-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Recipe Prep Checklist</span>
                      </button>

                      {/* Action buttons bar */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-400">
                          {formatPrice(ord.totalAmount)}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {col.key === "ORDER_PLACED" && (
                            <>
                              <button
                                onClick={() => onUpdateOrderStatus(ord.id, "PREPARING")}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                              >
                                Start Prep →
                              </button>
                              <button
                                onClick={() => setOrderToCancel(ord)}
                                className="text-slate-500 hover:text-rose-400 p-1 rounded-lg text-xs"
                                title="Cancel Order"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {col.key === "ACCEPTED" && (
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, "PREPARING")}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                              Start Prep →
                            </button>
                          )}
                          {col.key === "PREPARING" && (
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, "READY_FOR_PICKUP")}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                              Mark Ready ✔
                            </button>
                          )}
                          {col.key === "READY_FOR_PICKUP" && (
                            <button
                              onClick={() => onUpdateOrderStatus(ord.id, "COMPLETED")}
                              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                              Complete ✔
                            </button>
                          )}
                          {col.key === "COMPLETED" && (
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Fulfilled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Order Preparation Details & Interactive Recipe Checklist */}
      {selectedOrderForPrep && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-black text-white font-heading">
                    Preparation Checklist • Order #{selectedOrderForPrep.orderNumber}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customer: <span className="text-slate-200 font-bold">{selectedOrderForPrep.customerName}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderForPrep(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ordered Items with Recipe breakdown */}
            <div className="space-y-4">
              {selectedOrderForPrep.items.map((it: any, itIdx: number) => (
                <div key={itIdx} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-white">
                      {it.quantity}x {it.productName}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      {it.protein}g Protein
                    </span>
                  </div>

                  {/* Recipe Ingredients list */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Required Recipe Ingredients:
                    </p>

                    {it.recipeIngredients && it.recipeIngredients.length > 0 ? (
                      it.recipeIngredients.map((ing: any, ingIdx: number) => {
                        const checkKey = `${it.id}-${ingIdx}`;
                        const isChecked = Boolean(checkedPrepItems[checkKey]);

                        return (
                          <div
                            key={ingIdx}
                            onClick={() => toggleChecklist(checkKey)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer ${
                              isChecked
                                ? "bg-emerald-950/30 border-emerald-800/60 text-slate-300"
                                : "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500 shrink-0" />
                              )}
                              <div>
                                <p className={`text-xs font-bold ${isChecked ? "line-through text-slate-500" : ""}`}>
                                  {ing.ingredientName}
                                </p>
                                {ing.prepNotes && (
                                  <p className="text-[10px] text-slate-400">{ing.prepNotes}</p>
                                )}
                              </div>
                            </div>

                            <span className="text-xs font-black text-emerald-400 font-mono">
                              {ing.requiredAmount}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        Standard packaged product (no complex kitchen recipe configured).
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Special Instructions reminder */}
            {selectedOrderForPrep.specialInstructions && (
              <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-300">
                <span className="font-bold">Customer Note: </span>
                {selectedOrderForPrep.specialInstructions}
              </div>
            )}

            {/* Quick advance status buttons inside modal */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedOrderForPrep(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                Close
              </button>
              {selectedOrderForPrep.status === "ORDER_PLACED" && (
                <button
                  onClick={async () => {
                    await onUpdateOrderStatus(selectedOrderForPrep.id, "PREPARING");
                    setSelectedOrderForPrep(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400"
                >
                  Start Preparing →
                </button>
              )}
              {selectedOrderForPrep.status === "PREPARING" && (
                <button
                  onClick={async () => {
                    await onUpdateOrderStatus(selectedOrderForPrep.id, "READY_FOR_PICKUP");
                    setSelectedOrderForPrep(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400"
                >
                  Mark Ready for Pickup ✔
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel Order Confirmation */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Cancel Order #{orderToCancel.orderNumber}?</h3>
                <p className="text-xs text-slate-400">Reserved stock will be automatically released.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Cancellation Reason</label>
              <input
                type="text"
                placeholder="e.g. Customer requested, Out of ingredient..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setOrderToCancel(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
