"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeftRight,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface MovementsViewProps {
  outletId: string;
}

export function MovementsView({ outletId }: MovementsViewProps) {
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [movementType, setMovementType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchMovements() {
    setLoading(true);
    try {
      const url = `/api/kitchen/inventory/movements?outletId=${outletId}&movementType=${movementType}&page=${page}&limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.movements) {
        setMovements(data.movements);
        setTotal(data.total);
      }
    } catch (e) {
      console.error("Failed to fetch movements:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMovements();
  }, [outletId, movementType, page]);

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "STOCK_RECEIVED":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "ORDER_RESERVED":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "ORDER_CONSUMED":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "RESERVATION_RELEASED":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "WASTAGE":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "MANUAL_ADJUSTMENT":
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ArrowLeftRight className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-base font-extrabold text-white">Stock Movement Audit Trail</h2>
            <p className="text-xs text-slate-400">
              Immutable ledger of all receipt, reservation, consumption, and adjustment events
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={movementType}
            onChange={(e) => {
              setMovementType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Movement Types</option>
            <option value="STOCK_RECEIVED">STOCK_RECEIVED</option>
            <option value="ORDER_RESERVED">ORDER_RESERVED</option>
            <option value="ORDER_CONSUMED">ORDER_CONSUMED</option>
            <option value="RESERVATION_RELEASED">RESERVATION_RELEASED</option>
            <option value="WASTAGE">WASTAGE</option>
            <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT</option>
          </select>

          <button
            onClick={fetchMovements}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-3">Ingredient</th>
                <th className="py-3.5 px-3">Movement Type</th>
                <th className="py-3.5 px-3">Quantity</th>
                <th className="py-3.5 px-3">Stock Delta (Prev → New)</th>
                <th className="py-3.5 px-3">Reference / Order #</th>
                <th className="py-3.5 px-3">Reason / Details</th>
                <th className="py-3.5 px-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No movements recorded for this filter.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    <td className="py-3.5 px-3 font-extrabold text-white">
                      {m.ingredientName}
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getBadgeStyle(
                          m.movementType
                        )}`}
                      >
                        {m.movementType}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-white">
                      {m.quantity}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-xs">
                      <span className="text-slate-400">{m.previousStock}</span>
                      <span className="text-slate-600 mx-1.5">→</span>
                      <span className="font-bold text-emerald-400">{m.newStock}</span>
                    </td>

                    <td className="py-3.5 px-3">
                      {m.orderNumber ? (
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded">
                          {m.orderNumber}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-slate-400 max-w-xs truncate">
                      {m.reason}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {m.userName}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
