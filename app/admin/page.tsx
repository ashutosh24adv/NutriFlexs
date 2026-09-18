"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, ShoppingBag, Box, BarChart3, Tag, Check, RefreshCw, ChevronLeft, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [adminData, setAdminData] = useState<{
    stats: {
      totalOrdersCount: number;
      todayOrdersCount: number;
      todayRevenue: number;
      totalRevenue: number;
      activeCustomersCount: number;
      activeSubscriptionsCount: number;
    };
    categoryData: any[];
    recentOrders: any[];
    products: any[];
    coupons: any[];
    inventoryItems: any[];
  }>({
    stats: {
      totalOrdersCount: 0,
      todayOrdersCount: 0,
      todayRevenue: 0,
      totalRevenue: 0,
      activeCustomersCount: 0,
      activeSubscriptionsCount: 0,
    },
    categoryData: [],
    recentOrders: [],
    products: [],
    coupons: [],
    inventoryItems: [],
  });

  async function fetchAdminStats() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (data.success) {
        setAdminData({
          stats: data.stats,
          categoryData: data.categoryData || [],
          recentOrders: data.recentOrders || [],
          products: data.products || [],
          coupons: data.coupons || [],
          inventoryItems: data.inventoryItems || [],
        });
      }
    } catch (e) {
      console.error("Failed to load admin stats from PostgreSQL", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const avgOrderValue = adminData.stats.totalOrdersCount > 0
    ? Math.round(adminData.stats.totalRevenue / adminData.stats.totalOrdersCount)
    : 0;

  return (
    <div className="min-h-screen bg-nutri-bg p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-12">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-nutri-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/home" className="text-xs font-semibold text-nutri-secondary hover:text-nutri-green flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Customer App View
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal mt-1">
            NutriFlexs Operations Suite
          </h1>
          <p className="text-xs sm:text-sm text-nutri-secondary">
            PostgreSQL Live Data • Kiosk Network, Product Catalog & System Analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminStats}
            className="p-2 rounded-xl bg-white border border-nutri-border text-nutri-secondary hover:text-nutri-green transition-colors cursor-pointer"
            title="Refresh Live Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Badge variant="protein" className="bg-rose-50 text-rose-800 border-rose-200 text-xs px-3 py-1 font-bold">
            <Shield className="w-3.5 h-3.5 mr-1 text-rose-600" /> SUPER ADMIN ACCESS
          </Badge>
        </div>
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
              className={`text-xs font-bold px-4 py-2.5 rounded-full transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-nutri-green text-white shadow-xs"
                  : "bg-white text-nutri-secondary border border-nutri-border hover:text-nutri-charcoal"
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
          {/* Top KPI Cards (Loaded Live from PostgreSQL) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="p-4 border-nutri-border bg-white">
              <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Today&apos;s Revenue</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-green mt-1">
                {formatPrice(adminData.stats.todayRevenue)}
              </div>
              <span className="text-[10px] text-nutri-green font-bold mt-0.5 block">Live from PostgreSQL</span>
            </Card>

            <Card className="p-4 border-nutri-border bg-white">
              <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Today&apos;s Orders</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal mt-1">
                {adminData.stats.todayOrdersCount}
              </div>
              <span className="text-[10px] text-nutri-green font-bold mt-0.5 block">Express Pickup Queue</span>
            </Card>

            <Card className="p-4 border-nutri-border bg-white">
              <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Active Customers</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal mt-1">
                {adminData.stats.activeCustomersCount}
              </div>
              <span className="text-[10px] text-nutri-secondary font-medium mt-0.5 block">Registered User Profiles</span>
            </Card>

            <Card className="p-4 border-nutri-border bg-white">
              <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">NutriFlexs Pass</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-amber-600 mt-1">
                {adminData.stats.activeSubscriptionsCount} Active
              </div>
              <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">Monthly Pass Subscribers</span>
            </Card>

            <Card className="p-4 border-nutri-border bg-white">
              <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Avg Order Value</span>
              <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal mt-1">
                {formatPrice(avgOrderValue)}
              </div>
              <span className="text-[10px] text-nutri-secondary font-medium mt-0.5 block">Calculated Server-Side</span>
            </Card>
          </div>

          {/* Sales by Category Chart & Live Orders Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6 p-5 border-nutri-border bg-white space-y-4">
              <h3 className="text-base font-extrabold font-heading text-nutri-charcoal">
                Category Units Sold (PostgreSQL)
              </h3>
              <div className="h-64">
                {adminData.categoryData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-nutri-secondary font-bold">
                    No order items recorded yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={adminData.categoryData}>
                      <XAxis dataKey="category" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="sales" fill="#2F7D16" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Recent Orders Live Stream */}
            <Card className="lg:col-span-6 p-5 border-nutri-border bg-white space-y-4">
              <h3 className="text-base font-extrabold font-heading text-nutri-charcoal">
                Live Orders Stream
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {adminData.recentOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-nutri-secondary font-medium">
                    No orders recorded yet.
                  </div>
                ) : (
                  adminData.recentOrders.map((ord: any) => (
                    <div key={ord.id} className="flex items-center justify-between p-2.5 rounded-xl bg-nutri-green-soft border border-nutri-border text-xs">
                      <div>
                        <span className="font-bold text-nutri-charcoal">{ord.orderNumber}</span>
                        <span className="text-nutri-secondary text-[11px] ml-2">{ord.user?.name} · {ord.outlet?.gym?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-nutri-green">{formatPrice(ord.totalAmount)}</span>
                        <span className="bg-white text-nutri-green font-bold text-[10px] px-2 py-0.5 rounded-full border border-nutri-border">
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 2. PRODUCTS CATALOG TAB (Loaded from PostgreSQL Product Table) */}
      {activeTab === "products" && (
        <AdminProductsCatalog
          products={adminData.products}
          onProductUpdated={(updatedProd) => {
            setAdminData((prev) => ({
              ...prev,
              products: prev.products.map((p) => (p.id === updatedProd.id ? updatedProd : p)),
            }));
          }}
        />
      )}

      {/* 3. COUPONS TAB (Loaded from PostgreSQL Coupon Table) */}
      {activeTab === "coupons" && (
        <Card className="p-6 border-nutri-border bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold font-heading text-nutri-charcoal">
              Active Promo Coupons ({adminData.coupons.length} Coupons)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminData.coupons.map((c: any) => (
              <div key={c.id} className="p-4 rounded-2xl border border-nutri-border bg-nutri-green-soft space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-nutri-green text-sm tracking-wider font-heading">{c.code}</span>
                  <span className="text-[10px] font-bold text-nutri-green bg-white px-2 py-0.5 rounded-full border border-nutri-border">
                    {c.discountType === "PERCENTAGE" ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                  </span>
                </div>
                <p className="text-xs text-nutri-secondary font-medium">Min Order: {formatPrice(c.minOrderAmount)}</p>
                <div className="text-[10px] text-nutri-secondary flex items-center gap-1 pt-1 border-t border-nutri-border-light">
                  <Check className="w-3 h-3 text-nutri-green" /> Verified Server-Side
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. KIOSK INVENTORY TAB (Loaded from PostgreSQL InventoryItem Table) */}
      {activeTab === "inventory" && (
        <Card className="p-6 border-nutri-border bg-white space-y-4">
          <h3 className="text-base font-extrabold font-heading text-nutri-charcoal">
            Express Kiosk Ingredients Stock ({adminData.inventoryItems.length} Items)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-nutri-border text-nutri-secondary font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">Ingredient</th>
                  <th className="py-3 px-2">Kiosk Outlet</th>
                  <th className="py-3 px-2">Stock Level</th>
                  <th className="py-3 px-2">Threshold</th>
                  <th className="py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {adminData.inventoryItems.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-nutri-border-light">
                    <td className="py-3 px-2 font-bold text-nutri-charcoal">{inv.ingredient?.name}</td>
                    <td className="py-3 px-2 text-nutri-secondary">{inv.outlet?.name}</td>
                    <td className="py-3 px-2 font-extrabold text-nutri-green">{inv.quantity} {inv.unit}</td>
                    <td className="py-3 px-2 text-nutri-secondary">{inv.lowStockThreshold} {inv.unit}</td>
                    <td className="py-3 px-2">
                      <span className="bg-nutri-green-light text-nutri-green font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-nutri-border">
                        In Stock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AdminProductsCatalog({
  products,
  onProductUpdated,
}: {
  products: any[];
  onProductUpdated: (product: any) => void;
}) {
  const [dietaryFilter, setDietaryFilter] = useState<"ALL" | "VEG" | "NON_VEG">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const vegCount = products.filter((p) => p.isVeg).length;
  const nonVegCount = products.filter((p) => !p.isVeg).length;

  const filteredProducts = products.filter((p) => {
    if (dietaryFilter === "VEG") return p.isVeg;
    if (dietaryFilter === "NON_VEG") return !p.isVeg;
    return true;
  });

  const handleToggleDietary = async (product: any) => {
    const newIsVeg = !product.isVeg;
    setUpdatingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/dietary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVeg: newIsVeg }),
      });
      const data = await res.json();
      if (data.success && data.product) {
        onProductUpdated(data.product);
      } else {
        alert(data.error || "Failed to update product dietary classification");
      }
    } catch (e: any) {
      alert("Network error updating product");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card className="p-6 border-nutri-border bg-white space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nutri-border-light pb-3">
        <div>
          <h3 className="text-base font-extrabold font-heading text-nutri-charcoal">
            Database Product Catalog ({products.length} Products)
          </h3>
          <p className="text-xs text-nutri-secondary mt-0.5">
            Manage product pricing, macros, availability and dietary classifications in PostgreSQL
          </p>
        </div>

        {/* Dietary Filters */}
        <div className="flex items-center gap-1.5 bg-nutri-bg p-1 rounded-full border border-nutri-border">
          <button
            type="button"
            onClick={() => setDietaryFilter("ALL")}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-all cursor-pointer ${
              dietaryFilter === "ALL"
                ? "bg-white text-nutri-charcoal shadow-xs"
                : "text-nutri-secondary hover:text-nutri-charcoal"
            }`}
          >
            All ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setDietaryFilter("VEG")}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
              dietaryFilter === "VEG"
                ? "bg-nutri-green text-white shadow-xs"
                : "text-nutri-secondary hover:text-nutri-green"
            }`}
          >
            <span>🥬 Vegetarian ({vegCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setDietaryFilter("NON_VEG")}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer ${
              dietaryFilter === "NON_VEG"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-nutri-secondary hover:text-amber-700"
            }`}
          >
            <span>🥩 Non-Veg ({nonVegCount})</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-nutri-border text-nutri-secondary font-bold uppercase tracking-wider">
              <th className="py-3 px-2">Product Name</th>
              <th className="py-3 px-2">Dietary Type</th>
              <th className="py-3 px-2">Category</th>
              <th className="py-3 px-2">Price</th>
              <th className="py-3 px-2">Protein</th>
              <th className="py-3 px-2">Calories</th>
              <th className="py-3 px-2">Status</th>
              <th className="py-3 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p: any) => {
              const isUpdating = updatingId === p.id;
              return (
                <tr key={p.id} className="border-b border-nutri-border-light hover:bg-nutri-green-soft transition-colors">
                  <td className="py-3 px-2 font-bold text-nutri-charcoal">{p.name}</td>
                  <td className="py-3 px-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                        p.isVeg
                          ? "bg-nutri-green-light text-nutri-green border-nutri-green-soft"
                          : "bg-amber-50 text-amber-900 border-amber-200"
                      }`}
                    >
                      {p.isVeg ? "🥬 VEGETARIAN" : "🥩 NON-VEG"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-nutri-secondary font-medium">{p.category?.name || "General"}</td>
                  <td className="py-3 px-2 font-extrabold text-nutri-green">{formatPrice(p.price)}</td>
                  <td className="py-3 px-2 font-semibold text-nutri-charcoal">{p.protein}g</td>
                  <td className="py-3 px-2 text-nutri-secondary">{p.calories} kcal</td>
                  <td className="py-3 px-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${p.isAvailable ? "bg-nutri-green-light text-nutri-green border border-nutri-border" : "bg-rose-50 text-rose-800"}`}>
                      {p.isAvailable ? "Available" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleDietary(p)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white border border-nutri-border hover:border-nutri-green text-nutri-secondary hover:text-nutri-charcoal transition-colors cursor-pointer disabled:opacity-50"
                      title="Toggle between Vegetarian and Non-Vegetarian in database"
                    >
                      {isUpdating ? "Saving..." : p.isVeg ? "Set Non-Veg" : "Set Vegetarian"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

