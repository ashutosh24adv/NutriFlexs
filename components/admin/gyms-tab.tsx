"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  MapPin,
  Clock,
  Phone,
  Plus,
  Edit2,
  Check,
  X,
  Power,
  PowerOff,
  Store,
  Loader2,
  RefreshCw,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OutletRecord {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  operatingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isAvailable: boolean;
  isActive: boolean;
}

interface GymRecord {
  id: string;
  name: string;
  address: string;
  city: string;
  area?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  operatingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  outlets: OutletRecord[];
  _count?: { users: number };
}

export function GymsTab() {
  const [gyms, setGyms] = useState<GymRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal Dialogs
  const [isAddGymModalOpen, setIsAddGymModalOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<GymRecord | null>(null);
  const [kioskGymId, setKioskGymId] = useState<string | null>(null);
  const [editingOutlet, setEditingOutlet] = useState<{ gymId: string; outlet: OutletRecord } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Add / Edit Gym
  const [gymForm, setGymForm] = useState({
    name: "",
    address: "",
    city: "Bengaluru",
    area: "",
    phone: "",
    operatingHours: "6:00 AM – 10:00 PM",
    latitude: "",
    longitude: "",
    kioskName: "",
    kioskAddress: "",
    kioskPhone: "",
  });

  // Form state for Kiosk
  const [kioskForm, setKioskForm] = useState({
    name: "",
    address: "",
    phone: "",
    operatingHours: "6:00 AM – 10:00 PM",
    latitude: "",
    longitude: "",
    isAvailable: true,
  });

  const fetchGyms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gyms");
      const data = await res.json();
      if (data.success && Array.isArray(data.gyms)) {
        setGyms(data.gyms);
      } else {
        setError(data.error || "Failed to load gyms");
      }
    } catch (err: any) {
      setError("Network error loading gyms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGyms();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Toggle Gym Active / Inactive
  const handleToggleGymActive = async (gym: GymRecord) => {
    try {
      const res = await fetch(`/api/admin/gyms/${gym.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !gym.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Gym "${gym.name}" is now ${!gym.isActive ? "ACTIVE" : "INACTIVE"}.`);
        fetchGyms();
      } else {
        setError(data.error || "Failed to update gym status");
      }
    } catch (e: any) {
      setError("Failed to toggle gym status");
    }
  };

  // Toggle Kiosk Live Pickup Availability
  const handleToggleKioskAvailability = async (outlet: OutletRecord) => {
    try {
      const res = await fetch(`/api/admin/outlets/${outlet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !outlet.isAvailable }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(
          `Kiosk "${outlet.name}" pickup status updated to ${!outlet.isAvailable ? "LIVE" : "CLOSED"}.`
        );
        fetchGyms();
      } else {
        setError(data.error || "Failed to update kiosk availability");
      }
    } catch (e: any) {
      setError("Failed to toggle kiosk availability");
    }
  };

  // Submit Add Gym
  const handleCreateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gymForm.name || !gymForm.address || !gymForm.city) {
      setError("Please fill required fields (Name, Address, City)");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        name: gymForm.name.trim(),
        address: gymForm.address.trim(),
        city: gymForm.city.trim(),
        area: gymForm.area.trim() || undefined,
        phone: gymForm.phone.trim() || undefined,
        operatingHours: gymForm.operatingHours.trim() || undefined,
      };

      if (gymForm.latitude) payload.latitude = parseFloat(gymForm.latitude);
      if (gymForm.longitude) payload.longitude = parseFloat(gymForm.longitude);
      if (gymForm.kioskName) {
        payload.kioskName = gymForm.kioskName.trim();
        payload.kioskAddress = gymForm.kioskAddress.trim() || gymForm.address.trim();
        payload.kioskPhone = gymForm.kioskPhone.trim() || gymForm.phone.trim() || undefined;
      }

      const res = await fetch("/api/admin/gyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showSuccess(`Partner gym "${data.gym.name}" created successfully!`);
        setIsAddGymModalOpen(false);
        setGymForm({
          name: "",
          address: "",
          city: "Bengaluru",
          area: "",
          phone: "",
          operatingHours: "6:00 AM – 10:00 PM",
          latitude: "",
          longitude: "",
          kioskName: "",
          kioskAddress: "",
          kioskPhone: "",
        });
        fetchGyms();
      } else {
        setError(data.error || "Failed to create partner gym");
      }
    } catch (err: any) {
      setError("Failed to create partner gym");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Gym
  const handleUpdateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGym) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        name: gymForm.name.trim(),
        address: gymForm.address.trim(),
        city: gymForm.city.trim(),
        area: gymForm.area.trim() || null,
        phone: gymForm.phone.trim() || null,
        operatingHours: gymForm.operatingHours.trim() || null,
      };

      if (gymForm.latitude) payload.latitude = parseFloat(gymForm.latitude);
      if (gymForm.longitude) payload.longitude = parseFloat(gymForm.longitude);

      const res = await fetch(`/api/admin/gyms/${editingGym.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showSuccess(`Partner gym "${data.gym.name}" updated successfully!`);
        setEditingGym(null);
        fetchGyms();
      } else {
        setError(data.error || "Failed to update gym");
      }
    } catch (err: any) {
      setError("Failed to update gym");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Add or Edit Kiosk
  const handleSaveKiosk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kioskForm.name || !kioskForm.address) {
      setError("Please fill kiosk name and address");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: any = {
        name: kioskForm.name.trim(),
        address: kioskForm.address.trim(),
        phone: kioskForm.phone.trim() || null,
        operatingHours: kioskForm.operatingHours.trim() || null,
        isAvailable: kioskForm.isAvailable,
      };
      if (kioskForm.latitude) payload.latitude = parseFloat(kioskForm.latitude);
      if (kioskForm.longitude) payload.longitude = parseFloat(kioskForm.longitude);

      if (editingOutlet) {
        // Update outlet
        const res = await fetch(`/api/admin/outlets/${editingOutlet.outlet.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showSuccess(`Kiosk "${data.outlet.name}" updated!`);
          setEditingOutlet(null);
          fetchGyms();
        } else {
          setError(data.error || "Failed to update kiosk");
        }
      } else if (kioskGymId) {
        // Create outlet
        const res = await fetch(`/api/admin/gyms/${kioskGymId}/kiosks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showSuccess(`Kiosk "${data.outlet.name}" added to gym!`);
          setKioskGymId(null);
          fetchGyms();
        } else {
          setError(data.error || "Failed to add kiosk");
        }
      }
    } catch (err: any) {
      setError("Failed to save kiosk");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
            Partner Gyms &amp; Express Kiosks
          </h2>
          <p className="text-xs text-nutri-secondary mt-0.5">
            Manage physical partner gyms, express pickup kiosks, operating hours &amp; live availability in Neon PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={fetchGyms}
            variant="outline"
            className="text-xs font-bold border-nutri-border cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setGymForm({
                name: "",
                address: "",
                city: "Bengaluru",
                area: "",
                phone: "",
                operatingHours: "6:00 AM – 10:00 PM",
                latitude: "",
                longitude: "",
                kioskName: "",
                kioskAddress: "",
                kioskPhone: "",
              });
              setIsAddGymModalOpen(true);
            }}
            className="bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" /> Add Partner Gym
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2 animate-slide-down">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-center justify-between gap-2 animate-slide-down">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-bold underline cursor-pointer text-rose-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && gyms.length === 0 ? (
        <div className="py-16 text-center text-nutri-secondary text-xs flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-nutri-green" />
          <span>Loading partner gyms from database...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {gyms.map((gym) => (
            <Card
              key={gym.id}
              className={cn(
                "p-5 bg-white border rounded-3xl shadow-xs transition-all space-y-4",
                gym.isActive ? "border-nutri-border" : "border-gray-300 bg-gray-50/50 opacity-80"
              )}
            >
              {/* Gym Header Row */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-bold font-heading text-nutri-charcoal">
                      {gym.name}
                    </span>
                    <Badge
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        gym.isActive
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-gray-200 text-gray-700 border-gray-300"
                      )}
                    >
                      {gym.isActive ? "Active Gym" : "Inactive"}
                    </Badge>
                    <span className="text-[11px] font-semibold text-nutri-secondary bg-nutri-bg px-2 py-0.5 rounded-md border border-nutri-border">
                      {gym.city}{gym.area ? ` • ${gym.area}` : ""}
                    </span>
                  </div>

                  <p className="text-xs text-nutri-secondary flex items-center gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                    <span>{gym.address}</span>
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-nutri-muted pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                      <span>{gym.operatingHours || "6:00 AM – 10:00 PM"}</span>
                    </span>
                    {gym.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-nutri-secondary shrink-0" />
                        <span>{gym.phone}</span>
                      </span>
                    )}
                    {gym.latitude && gym.longitude && (
                      <span className="text-[10px] text-nutri-muted">
                        Coordinates: {gym.latitude.toFixed(4)}, {gym.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Gym Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingGym(gym);
                      setGymForm({
                        name: gym.name,
                        address: gym.address,
                        city: gym.city,
                        area: gym.area || "",
                        phone: gym.phone || "",
                        operatingHours: gym.operatingHours || "6:00 AM – 10:00 PM",
                        latitude: gym.latitude ? String(gym.latitude) : "",
                        longitude: gym.longitude ? String(gym.longitude) : "",
                        kioskName: "",
                        kioskAddress: "",
                        kioskPhone: "",
                      });
                    }}
                    className="text-xs font-bold border-nutri-border hover:bg-nutri-bg cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Gym
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleGymActive(gym)}
                    className={cn(
                      "text-xs font-bold cursor-pointer flex items-center gap-1",
                      gym.isActive
                        ? "text-rose-700 hover:bg-rose-50 border-rose-200"
                        : "text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                    )}
                  >
                    {gym.isActive ? (
                      <>
                        <PowerOff className="w-3.5 h-3.5" /> Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="w-3.5 h-3.5" /> Activate
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setKioskGymId(gym.id);
                      setEditingOutlet(null);
                      setKioskForm({
                        name: `Express Kiosk #${(gym.outlets?.length || 0) + 1}`,
                        address: gym.address,
                        phone: gym.phone || "",
                        operatingHours: gym.operatingHours || "6:00 AM – 10:00 PM",
                        latitude: gym.latitude ? String(gym.latitude) : "",
                        longitude: gym.longitude ? String(gym.longitude) : "",
                        isAvailable: true,
                      });
                    }}
                    className="bg-nutri-green hover:bg-nutri-green-dark text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Kiosk
                  </Button>
                </div>
              </div>

              {/* Associated Kiosks Section */}
              <div className="pt-3 border-t border-nutri-border-light space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-nutri-secondary">
                  NutriFlexs Express Kiosks ({gym.outlets?.length || 0})
                </span>

                {gym.outlets && gym.outlets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {gym.outlets.map((outlet) => (
                      <div
                        key={outlet.id}
                        className={cn(
                          "p-3 rounded-2xl border transition-all flex items-start justify-between gap-3",
                          outlet.isAvailable
                            ? "bg-white border-nutri-border"
                            : "bg-gray-50 border-gray-200 text-gray-500"
                        )}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-nutri-charcoal truncate">
                              {outlet.name}
                            </span>
                            <Badge
                              className={cn(
                                "text-[9px] font-extrabold px-1.5 py-0.2 rounded-full",
                                outlet.isAvailable
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                              )}
                            >
                              {outlet.isAvailable ? "● Live for Orders" : "✕ Closed"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-nutri-secondary truncate">
                            {outlet.address}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-nutri-muted">
                            <span>{outlet.operatingHours || "6:00 AM – 10:00 PM"}</span>
                            {outlet.phone && <span>• {outlet.phone}</span>}
                          </div>
                        </div>

                        {/* Kiosk Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleKioskAvailability(outlet)}
                            className={cn(
                              "text-xs font-bold px-2 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1",
                              outlet.isAvailable
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                            )}
                            title={outlet.isAvailable ? "Click to Mark Closed" : "Click to Mark Live"}
                          >
                            {outlet.isAvailable ? "Mark Closed" : "Mark Live"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingOutlet({ gymId: gym.id, outlet });
                              setKioskGymId(null);
                              setKioskForm({
                                name: outlet.name,
                                address: outlet.address,
                                phone: outlet.phone || "",
                                operatingHours: outlet.operatingHours || "6:00 AM – 10:00 PM",
                                latitude: outlet.latitude ? String(outlet.latitude) : "",
                                longitude: outlet.longitude ? String(outlet.longitude) : "",
                                isAvailable: outlet.isAvailable,
                              });
                            }}
                            className="p-1 rounded-lg hover:bg-nutri-bg text-nutri-secondary cursor-pointer"
                            title="Edit Kiosk"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-nutri-secondary italic py-1">
                    No express kiosks currently assigned to this gym. Click &quot;Add Kiosk&quot; to assign one.
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Add Partner Gym */}
      {isAddGymModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border border-nutri-border">
            <div className="flex items-center justify-between pb-3 border-b border-nutri-border">
              <h3 className="text-lg font-bold font-heading text-nutri-charcoal flex items-center gap-2">
                <Building2 className="w-5 h-5 text-nutri-green" /> Add New Partner Gym
              </h3>
              <button
                type="button"
                onClick={() => setIsAddGymModalOpen(false)}
                className="p-1 rounded-full text-nutri-secondary hover:text-nutri-charcoal cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGym} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-nutri-charcoal block mb-1">Gym Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cult.fit HSR Layout"
                  value={gymForm.name}
                  onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru"
                    value={gymForm.city}
                    onChange={(e) => setGymForm({ ...gymForm, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Area / Locality</label>
                  <input
                    type="text"
                    placeholder="e.g. HSR Sector 2"
                    value={gymForm.area}
                    onChange={(e) => setGymForm({ ...gymForm, area: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-nutri-charcoal block mb-1">Full Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 27th Main Rd, Sector 2, HSR Layout"
                  value={gymForm.address}
                  onChange={(e) => setGymForm({ ...gymForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={gymForm.operatingHours}
                    onChange={(e) => setGymForm({ ...gymForm, operatingHours: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 00000"
                    value={gymForm.phone}
                    onChange={(e) => setGymForm({ ...gymForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="12.9116"
                    value={gymForm.latitude}
                    onChange={(e) => setGymForm({ ...gymForm, latitude: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="77.6389"
                    value={gymForm.longitude}
                    onChange={(e) => setGymForm({ ...gymForm, longitude: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
              </div>

              {/* Initial Express Kiosk Setup */}
              <div className="pt-2 border-t border-nutri-border-light space-y-2">
                <p className="font-bold text-xs text-nutri-green flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" /> Initial Express Kiosk (Optional)
                </p>
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Kiosk Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HSR Cult Kiosk (50m from Gym)"
                    value={gymForm.kioskName}
                    onChange={(e) => setGymForm({ ...gymForm, kioskName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddGymModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-nutri-green text-white font-bold text-xs cursor-pointer"
                >
                  {submitting ? "Saving..." : "Create Partner Gym"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Partner Gym */}
      {editingGym && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border border-nutri-border">
            <div className="flex items-center justify-between pb-3 border-b border-nutri-border">
              <h3 className="text-lg font-bold font-heading text-nutri-charcoal flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-nutri-green" /> Edit Gym: {editingGym.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingGym(null)}
                className="p-1 rounded-full text-nutri-secondary hover:text-nutri-charcoal cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateGym} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-nutri-charcoal block mb-1">Gym Name *</label>
                <input
                  type="text"
                  required
                  value={gymForm.name}
                  onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={gymForm.city}
                    onChange={(e) => setGymForm({ ...gymForm, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={gymForm.area}
                    onChange={(e) => setGymForm({ ...gymForm, area: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-nutri-charcoal block mb-1">Full Address *</label>
                <input
                  type="text"
                  required
                  value={gymForm.address}
                  onChange={(e) => setGymForm({ ...gymForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={gymForm.operatingHours}
                    onChange={(e) => setGymForm({ ...gymForm, operatingHours: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Phone</label>
                  <input
                    type="text"
                    value={gymForm.phone}
                    onChange={(e) => setGymForm({ ...gymForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={gymForm.latitude}
                    onChange={(e) => setGymForm({ ...gymForm, latitude: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={gymForm.longitude}
                    onChange={(e) => setGymForm({ ...gymForm, longitude: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingGym(null)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-nutri-green text-white font-bold text-xs cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Kiosk */}
      {(kioskGymId || editingOutlet) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-nutri-border">
            <div className="flex items-center justify-between pb-3 border-b border-nutri-border">
              <h3 className="text-lg font-bold font-heading text-nutri-charcoal flex items-center gap-2">
                <Store className="w-5 h-5 text-nutri-green" />
                {editingOutlet ? "Edit Kiosk" : "Add Express Kiosk"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setKioskGymId(null);
                  setEditingOutlet(null);
                }}
                className="p-1 rounded-full text-nutri-secondary hover:text-nutri-charcoal cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKiosk} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-nutri-charcoal block mb-1">Kiosk Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Express Kiosk #2"
                  value={kioskForm.name}
                  onChange={(e) => setKioskForm({ ...kioskForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-nutri-charcoal block mb-1">Kiosk Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outside gate #1, 50m from entrance"
                  value={kioskForm.address}
                  onChange={(e) => setKioskForm({ ...kioskForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 00000"
                    value={kioskForm.phone}
                    onChange={(e) => setKioskForm({ ...kioskForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-nutri-charcoal block mb-1">Operating Hours</label>
                  <input
                    type="text"
                    value={kioskForm.operatingHours}
                    onChange={(e) => setKioskForm({ ...kioskForm, operatingHours: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-nutri-bg border border-nutri-border">
                <span className="font-bold text-xs text-nutri-charcoal">Live for Customer Orders:</span>
                <button
                  type="button"
                  onClick={() => setKioskForm({ ...kioskForm, isAvailable: !kioskForm.isAvailable })}
                  className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full cursor-pointer flex items-center gap-1",
                    kioskForm.isAvailable
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-300 text-gray-700"
                  )}
                >
                  {kioskForm.isAvailable ? "✓ Live" : "✕ Closed"}
                </button>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setKioskGymId(null);
                    setEditingOutlet(null);
                  }}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-nutri-green text-white font-bold text-xs cursor-pointer"
                >
                  {submitting ? "Saving..." : editingOutlet ? "Update Kiosk" : "Create Kiosk"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

