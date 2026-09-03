"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Shield, ShoppingBag, DollarSign, Users, Award, Tag, Box, BarChart3, Plus, Edit, Trash2, Check, RefreshCw, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Sample analytics revenue chart data
  const revenueData = [
    { time: "8 AM", revenue: 1400, orders: 6 },
    { time: "10 AM", revenue: 3200, orders: 14 },
    { time: "12 PM", revenue: 4800, orders: 22 },
    { time: "2 PM", revenue: 3900, orders: 17 },
    { time: "4 PM", revenue: 6100, orders: 28 },
    { time: "6 PM", revenue: 9400, orders: 42 },
    { time: "8 PM", revenue: 11200, orders: 51 },
  ];

  const categoryData = [
    { category: "Juices", sales: 180 },
    { category: "Protein Bites", sales: 240 },
    { category: "Clean Bowls", sales: 310 },
    { category: "Combos", sales: 195 },
  ];

  const [productsList, setProductsList] = useState([
    { id: "1", name: "Lean Grilled Chicken Breast", category: "Protein", price: 210, protein: 36, calories: 220, isAvailable: true },
    { id: "2", name: "ABC Stamina Rebuilder Juice", category: "Juices", price: 160, protein: 1.8, calories: 145, isAvailable: true },
    { id: "3", name: "Grilled Chicken & Quinoa Energy Bowl", category: "Bowls", price: 250, protein: 32, calories: 430, isAvailable: true },
    { id: "4", name: "Herb-Grilled Organic Paneer Skewers", category: "Protein", price: 180, protein: 27, calories: 410, isAvailable: true },
  ]);

  const [couponsList, setCouponsList] = useState([
    { id: "c1", code: "GYMPOWER20", type: "PERCENTAGE", val: "20%", minOrder: 150, active: true },
    { id: "c2", code: "FIRST50", type: "FLAT", val: "₹50", minOrder: 200, active: true },
  ]);

  const toggleProductAvailability = (id: string) => {
    setProductsList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isAvailable: !p.isAvailable } : p))
    );
  };

  return (
    <div className="min-h-screen bg-nutri-bg p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-nutri-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/home" className="text-xs font-semibold text-nutri-muted hover:text-nutri-green flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Customer App View
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal mt-1">
            NutriFlexs Operations Suite
          </h1>
          <p className="text-xs sm:text-sm text-nutri-muted">
            Kiosk Network, Product Catalog, Trainer Commissions & System Analytics
          </p>
        </div>

        <Badge variant="protein" className="bg-rose-50 text-rose-800 border-rose-200 text-xs px-3 py-1 font-bold self-start sm:self-auto">
          <Shield className="w-3.5 h-3.5 mr-1 text-rose-600" /> SUPER ADMIN ACCESS
        </Badge>
      </div>

      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "overview", label: "Overview & Analytics", icon: BarChart3 },
          { id: "products", label: "Product Catalog", icon: ShoppingBag },
          { id: "coupons", label: "Coupons & Offers", icon: Tag },
          { id: "inventory", label: "Kiosk Inventory", icon: Box },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-bold px-4 py-2.5 rounded-full transition-all flex items-center gap-2 shrink-0 ${
                activeTab === tab.id
                  ? "bg-nutri-green text-white shadow-sm"
                  : "bg-white text-nutri-muted border border-nutri-border hover:text-nutri-charcoal"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4 border-nutri-border">
              <span className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider block">Today&apos;s Revenue</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-green mt-1">
                ₹39,900
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">+18.4% from yesterday</span>
            </Card>

            <Card className="p-4 border-nutri-border">
              <span className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider block">Today&apos;s Orders</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal mt-1">
                180
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Avg 3.2 min prep</span>
            </Card>

            <Card className="p-4 border-nutri-border">
              <span className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider block">Active Customers</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal mt-1">
                1,420
              </div>
              <span className="text-[10px] text-nutri-muted font-medium mt-0.5 block">Across 3 Gym Outlets</span>
            </Card>

            <Card className="p-4 border-nutri-border">
              <span className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider block">NutriFlexs Pass</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-amber-600 mt-1">
                245 Active
              </div>
              <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">Recurring monthly</span>
            </Card>

            <Card className="p-4 border-nutri-border">
              <span className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider block">Avg Order Value</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal mt-1">
                ₹221
              </div>
              <span className="text-[10px] text-nutri-muted font-medium mt-0.5 block">High protein focus</span>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Chart */}
            <Card className="p-5 lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-nutri-charcoal font-heading text-base">Today&apos;s Revenue Trend</h3>
                  <p className="text-xs text-nutri-muted">Peak hours correspond to morning & evening gym workout slots</p>
                </div>
                <Badge variant="protein" className="text-[10px]">REALTIME RECHARTS</Badge>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1B4D3E" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#1B4D3E" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F1" />
                    <XAxis dataKey="time" stroke="#5F6B65" fontSize={11} />
                    <YAxis stroke="#5F6B65" fontSize={11} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#1B4D3E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Category Breakdown Chart */}
            <Card className="p-5 space-y-3">
              <h3 className="font-bold text-nutri-charcoal font-heading text-base">Category Sales Breakdown</h3>
              <p className="text-xs text-nutri-muted">Unit sales by food category</p>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F1" />
                    <XAxis dataKey="category" stroke="#5F6B65" fontSize={10} />
                    <YAxis stroke="#5F6B65" fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#1B4D3E" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 2. PRODUCTS TAB */}
      {activeTab === "products" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">Menu Products CRUD</h3>
            <Button size="sm" variant="primary" className="text-xs font-bold">
              <Plus className="w-4 h-4 mr-1" /> Add New Product
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-nutri-bg border-b border-nutri-border text-nutri-muted uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Protein</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nutri-border-light font-medium">
                {productsList.map((p) => (
                  <tr key={p.id} className="hover:bg-nutri-bg/50">
                    <td className="p-3 font-bold text-nutri-charcoal">{p.name}</td>
                    <td className="p-3 text-nutri-muted">{p.category}</td>
                    <td className="p-3 font-bold text-nutri-green">{formatPrice(p.price)}</td>
                    <td className="p-3 font-bold">{p.protein}g</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleProductAvailability(p.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {p.isAvailable ? "AVAILABLE" : "DISABLED"}
                      </button>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button className="p-1 text-nutri-muted hover:text-nutri-green">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 3. COUPONS TAB */}
      {activeTab === "coupons" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">Active Promo Coupons</h3>
            <Button size="sm" variant="primary" className="text-xs font-bold">
              <Plus className="w-4 h-4 mr-1" /> Create Coupon
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {couponsList.map((c) => (
              <div key={c.id} className="p-4 bg-nutri-bg rounded-2xl border border-nutri-border flex items-center justify-between">
                <div>
                  <span className="font-mono font-extrabold text-nutri-green text-base">{c.code}</span>
                  <p className="text-xs text-nutri-muted mt-0.5">Discount: {c.val} · Min Order: ₹{c.minOrder}</p>
                </div>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. INVENTORY TAB */}
      {activeTab === "inventory" && (
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-bold font-heading text-nutri-charcoal">Express Kiosk Ingredient Stock</h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-nutri-bg rounded-2xl border border-nutri-border flex items-center justify-between">
              <div>
                <p className="font-bold text-nutri-charcoal">Lean Chicken Breast Raw (Indiranagar Kiosk)</p>
                <p className="text-[11px] text-nutri-muted">Threshold: 5.0 kg</p>
              </div>
              <span className="font-extrabold text-nutri-green text-sm">25.5 kg In Stock</span>
            </div>

            <div className="p-3 bg-nutri-bg rounded-2xl border border-nutri-border flex items-center justify-between">
              <div>
                <p className="font-bold text-nutri-charcoal">Organic Egg Whites Pack (Indiranagar Kiosk)</p>
                <p className="text-[11px] text-nutri-muted">Threshold: 20 pcs</p>
              </div>
              <span className="font-extrabold text-nutri-green text-sm">120 pcs In Stock</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
