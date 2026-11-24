"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { KitchenHeader } from "@/components/kitchen/kitchen-header";
import { KitchenSidebar, KitchenTabType } from "@/components/kitchen/kitchen-sidebar";
import { OverviewView } from "@/components/kitchen/views/overview-view";
import { LiveOrdersView } from "@/components/kitchen/views/live-orders-view";
import { InventoryView } from "@/components/kitchen/views/inventory-view";
import { MovementsView } from "@/components/kitchen/views/movements-view";
import { PurchaseView } from "@/components/kitchen/views/purchase-view";
import { WastageView } from "@/components/kitchen/views/wastage-view";
import { ReportsView } from "@/components/kitchen/views/reports-view";
import { SettingsView } from "@/components/kitchen/views/settings-view";
import { RefreshCw, AlertCircle } from "lucide-react";

export default function KitchenDashboardPage() {
  const [activeTab, setActiveTab] = useState<KitchenTabType>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Outlet & Staff details
  const [outletId, setOutletId] = useState<string>("");
  const [outletName, setOutletName] = useState<string>("Indiranagar Cult Kiosk");
  const [outlets, setOutlets] = useState<Array<{ id: string; name: string }>>([]);
  const [userRole, setUserRole] = useState<string>("KITCHEN");
  const [userName, setUserName] = useState<string>("Kitchen Chef");

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersKpi, setOrdersKpi] = useState({
    newOrdersCount: 0,
    acceptedOrdersCount: 0,
    preparingOrdersCount: 0,
    readyOrdersCount: 0,
    completedTodayCount: 0,
    totalDelayedCount: 0,
  });

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryOverview, setInventoryOverview] = useState({
    totalItems: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    expiringSoonCount: 0,
    expiredCount: 0,
    totalValuation: 0,
    lowStockAlerts: [] as any[],
  });
  const [categories, setCategories] = useState<string[]>([
    "Proteins",
    "Produce",
    "Dairy",
    "Grains",
    "Superfoods",
    "Packaging",
  ]);

  // Settings & Audio
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio tone generator
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  const playChimeTone = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      }
      const ctx = audioContextRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      // Tone 1 (D5 - 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2 (A5 - 880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn("Audio chime playback blocked or not supported:", e);
    }
  }, []);

  // 1. Fetch Outlets and User Context on Mount
  useEffect(() => {
    async function loadOutletsAndAuth() {
      try {
        const res = await fetch("/api/kitchen/outlets");
        const data = await res.json();
        if (data.success) {
          setOutletId(data.currentOutletId);
          setOutletName(data.currentOutletName);
          setUserRole(data.userRole);
          setUserName(data.userName);
          if (data.outlets && data.outlets.length > 0) {
            setOutlets(data.outlets);
          }
        } else if (data.status === 401 || data.status === 403) {
          window.location.href = "/kitchen/login";
        }
      } catch (e) {
        console.error("Failed to load kitchen authorization context:", e);
      }
    }
    loadOutletsAndAuth();
  }, []);

  // 2. Fetch Orders for active outlet
  const fetchOrders = useCallback(async () => {
    if (!outletId) return;
    try {
      const res = await fetch(`/api/kitchen/orders?outletId=${outletId}`);
      const data = await res.json();
      if (data.success && data.orders) {
        setOrders(data.orders);
        if (data.kpi) setOrdersKpi(data.kpi);

        // Check if new orders arrived to play chime
        const currentIds = new Set<string>(data.orders.map((o: any) => o.id));
        if (previousOrderIdsRef.current.size > 0 && soundEnabled) {
          const hasNew = data.orders.some(
            (o: any) => o.status === "ORDER_PLACED" && !previousOrderIdsRef.current.has(o.id)
          );
          if (hasNew) {
            playChimeTone();
          }
        }
        previousOrderIdsRef.current = currentIds;
      }
    } catch (e) {
      console.error("Failed to load orders:", e);
    }
  }, [outletId, soundEnabled, playChimeTone]);

  // 3. Fetch Inventory items & overview for active outlet
  const fetchInventory = useCallback(async () => {
    if (!outletId) return;
    try {
      const res = await fetch(`/api/kitchen/inventory?outletId=${outletId}&limit=100`);
      const data = await res.json();
      if (data.success && data.items) {
        setInventoryItems(data.items);
        if (data.overview) setInventoryOverview(data.overview);

        // Extract distinct categories
        const catSet = new Set<string>();
        data.items.forEach((it: any) => {
          if (it.category) catSet.add(it.category);
        });
        if (catSet.size > 0) setCategories(Array.from(catSet));
      }
    } catch (e) {
      console.error("Failed to load inventory:", e);
    }
  }, [outletId]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await Promise.all([fetchOrders(), fetchInventory()]);
    } catch (err: any) {
      setErrorMsg("Failed to synchronize with server. Please try refreshing.");
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [fetchOrders, fetchInventory]);

  // Initial fetch and polling interval
  useEffect(() => {
    if (outletId) {
      refreshAll();
      const interval = setInterval(fetchOrders, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [outletId, refreshInterval, fetchOrders, refreshAll]);

  // Update order status with optimistic update
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, reason?: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
    );

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to update order status.");
      }
      // Re-sync orders and inventory
      fetchOrders();
      fetchInventory();
    } catch (e) {
      console.error("Order status update failed:", e);
      fetchOrders();
    }
  };

  // Add/Update inventory item
  const handleSaveInventoryItem = async (itemData: any) => {
    try {
      const res = await fetch("/api/kitchen/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...itemData, outletId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchInventory();
        return true;
      } else {
        alert(data.error || "Failed to save ingredient.");
        return false;
      }
    } catch (e) {
      console.error("Save ingredient failed:", e);
      alert("Network error saving ingredient.");
      return false;
    }
  };

  // Adjust stock
  const handleAdjustStock = async (adjustData: any) => {
    try {
      const res = await fetch("/api/kitchen/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adjustData, outletId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchInventory();
        return true;
      } else {
        alert(data.error || "Failed to adjust stock.");
        return false;
      }
    } catch (e) {
      console.error("Adjust stock failed:", e);
      alert("Network error adjusting stock.");
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <KitchenHeader
        outletName={outletName}
        outletId={outletId}
        outlets={outlets}
        onSelectOutlet={(newId) => {
          setOutletId(newId);
          const found = outlets.find((o) => o.id === newId);
          if (found) setOutletName(found.name);
        }}
        userRole={userRole}
        userName={userName}
        loading={loading}
        onRefresh={refreshAll}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      {/* Main Workspace: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar for Desktop */}
        <div className="hidden lg:flex">
          <KitchenSidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            liveOrdersCount={
              ordersKpi.newOrdersCount + ordersKpi.acceptedOrdersCount + ordersKpi.preparingOrdersCount
            }
            lowStockCount={inventoryOverview.lowStockCount + inventoryOverview.outOfStockCount}
          />
        </div>

        {/* Mobile Slide-over Sidebar */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative z-50 w-64 bg-slate-950 flex flex-col h-full border-r border-slate-800">
              <KitchenSidebar
                activeTab={activeTab}
                onTabChange={(t) => {
                  setActiveTab(t);
                  setMobileSidebarOpen(false);
                }}
                collapsed={false}
                onToggleCollapse={() => setMobileSidebarOpen(false)}
                liveOrdersCount={ordersKpi.newOrdersCount}
                lowStockCount={inventoryOverview.lowStockCount}
              />
            </div>
          </div>
        )}

        {/* Dynamic View Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-rose-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={refreshAll}
                className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-white rounded-lg font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === "overview" && (
            <OverviewView
              ordersKpi={ordersKpi}
              inventoryOverview={inventoryOverview}
              recentOrders={orders}
              onNavigateTab={setActiveTab}
              onUpdateOrderStatus={handleUpdateOrderStatus}
            />
          )}

          {activeTab === "orders" && (
            <LiveOrdersView
              orders={orders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              loading={loading}
            />
          )}

          {activeTab === "inventory" && (
            <InventoryView
              items={inventoryItems}
              overview={inventoryOverview}
              categories={categories}
              onRefresh={fetchInventory}
              onSaveItem={handleSaveInventoryItem}
              onAdjustStock={handleAdjustStock}
              onNavigateTab={setActiveTab}
              loading={loading}
            />
          )}

          {activeTab === "movements" && <MovementsView outletId={outletId} />}

          {activeTab === "purchase" && (
            <PurchaseView
              items={inventoryItems}
              outletId={outletId}
              onRefresh={fetchInventory}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === "wastage" && (
            <WastageView
              items={inventoryItems}
              outletId={outletId}
              onRefreshInventory={fetchInventory}
            />
          )}

          {activeTab === "reports" && <ReportsView outletId={outletId} />}

          {activeTab === "settings" && (
            <SettingsView
              outletName={outletName}
              outletId={outletId}
              userName={userName}
              userRole={userRole}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onTestSound={playChimeTone}
              refreshInterval={refreshInterval}
              onChangeRefreshInterval={setRefreshInterval}
            />
          )}
        </main>
      </div>
    </div>
  );
}
