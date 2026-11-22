"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Stethoscope,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Award,
  GraduationCap,
  Clock,
  IndianRupee,
  Users,
  Eye,
  X,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DietitianItem {
  id: string;
  userId: string;
  fullName: string;
  bio: string | null;
  qualifications: string;
  experienceYears: number;
  consultationFee: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  verifiedAt: string | null;
  languages: string[];
  specializations: string[];
  availableFormats: string[];
  profileImageUrl: string | null;
  user: {
    email: string;
    createdAt: string;
  };
  _count: {
    consultations: number;
    dietPlans: number;
  };
}

export function DietitiansTab() {
  const [dietitians, setDietitians] = useState<DietitianItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selected for Details Modal
  const [selectedDietitian, setSelectedDietitian] = useState<DietitianItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchDietitians = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/dietitians");
      const data = await res.json();
      if (data.success) {
        setDietitians(data.dietitians || []);
      } else {
        setError(data.error || "Failed to load dietitian applications.");
      }
    } catch (e: any) {
      setError(e.message || "Network error loading dietitians.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDietitians();
  }, [fetchDietitians]);

  const handleStatusUpdate = async (id: string, newStatus: "APPROVED" | "REJECTED" | "SUSPENDED" | "PENDING") => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/dietitians", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setDietitians((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  verificationStatus: newStatus,
                  isVerified: newStatus === "APPROVED",
                  verifiedAt: newStatus === "APPROVED" ? new Date().toISOString() : null,
                }
              : d
          )
        );
        if (selectedDietitian && selectedDietitian.id === id) {
          setSelectedDietitian({
            ...selectedDietitian,
            verificationStatus: newStatus,
            isVerified: newStatus === "APPROVED",
            verifiedAt: newStatus === "APPROVED" ? new Date().toISOString() : null,
          });
        }
      } else {
        alert(data.error || "Failed to update verification status.");
      }
    } catch (e: any) {
      alert(e.message || "Network error updating status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredDietitians = dietitians.filter((d) => {
    if (statusFilter !== "ALL" && d.verificationStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.fullName.toLowerCase().includes(q);
      const matchEmail = d.user?.email.toLowerCase().includes(q);
      const matchQual = d.qualifications.toLowerCase().includes(q);
      const matchSpecs = d.specializations.some((s) => s.toLowerCase().includes(q));
      if (!matchName && !matchEmail && !matchQual && !matchSpecs) return false;
    }
    return true;
  });

  const totalCount = dietitians.length;
  const approvedCount = dietitians.filter((d) => d.verificationStatus === "APPROVED").length;
  const pendingCount = dietitians.filter((d) => d.verificationStatus === "PENDING").length;
  const suspendedCount = dietitians.filter((d) => d.verificationStatus === "SUSPENDED" || d.verificationStatus === "REJECTED").length;

  return (
    <div className="space-y-6">
      {/* Top Counters & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold font-heading text-nutri-charcoal flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-nutri-green" />
            Health Coaches &amp; Nutrition Staff
          </h2>
          <p className="text-xs sm:text-sm text-nutri-secondary">
            Verify credentials, review applicants, and manage consultation access.
          </p>
        </div>

        <button
          onClick={() => {
            setRefreshing(true);
            fetchDietitians();
          }}
          disabled={refreshing}
          className="self-start sm:self-auto p-2.5 rounded-xl bg-white border border-nutri-border text-nutri-secondary hover:text-nutri-green transition-colors cursor-pointer flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-nutri-border bg-white">
          <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Total Profiles</span>
          <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal mt-1">
            {totalCount}
          </div>
          <span className="text-[10px] text-nutri-secondary font-medium mt-0.5 block">Registered Health Coaches</span>
        </Card>

        <Card className="p-4 border-nutri-border bg-white">
          <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Pending Review</span>
          <div className="text-xl sm:text-2xl font-extrabold font-heading text-amber-600 mt-1">
            {pendingCount}
          </div>
          <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">Requires Admin Action</span>
        </Card>

        <Card className="p-4 border-nutri-border bg-white">
          <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Verified &amp; Active</span>
          <div className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-green mt-1">
            {approvedCount}
          </div>
          <span className="text-[10px] text-nutri-green font-bold mt-0.5 block">Live on Marketplace</span>
        </Card>

        <Card className="p-4 border-nutri-border bg-white">
          <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Suspended / Rejected</span>
          <div className="text-xl sm:text-2xl font-extrabold font-heading text-rose-600 mt-1">
            {suspendedCount}
          </div>
          <span className="text-[10px] text-rose-600 font-medium mt-0.5 block">Hidden from Users</span>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 border-nutri-border bg-white space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by dietitian name, email, credentials, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-nutri-border focus:border-nutri-green focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "All Profiles" },
              { id: "PENDING", label: `Pending (${pendingCount})` },
              { id: "APPROVED", label: `Verified (${approvedCount})` },
              { id: "SUSPENDED", label: `Suspended (${dietitians.filter((d) => d.verificationStatus === "SUSPENDED").length})` },
              { id: "REJECTED", label: `Rejected (${dietitians.filter((d) => d.verificationStatus === "REJECTED").length})` },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all shrink-0 cursor-pointer ${
                  statusFilter === st.id
                    ? "bg-nutri-green text-white"
                    : "bg-nutri-bg text-nutri-secondary hover:text-nutri-charcoal"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Dietitians Table */}
      <Card className="border-nutri-border bg-white overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-nutri-secondary text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-nutri-green" />
            Loading dietitian records from PostgreSQL...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm font-semibold">
            {error}
          </div>
        ) : filteredDietitians.length === 0 ? (
          <div className="p-12 text-center text-nutri-secondary text-sm">
            <Stethoscope className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            No health coaches found matching the current search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-nutri-bg border-b border-nutri-border text-[11px] font-bold uppercase tracking-wider text-nutri-secondary">
                <tr>
                  <th className="py-3 px-4">Coach Profile</th>
                  <th className="py-3 px-3">Qualifications &amp; Experience</th>
                  <th className="py-3 px-3">Specializations</th>
                  <th className="py-3 px-3">Consultation &amp; Fee</th>
                  <th className="py-3 px-3">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nutri-border">
                {filteredDietitians.map((d) => {
                  const isUpdating = updatingId === d.id;

                  return (
                    <tr key={d.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={d.profileImageUrl || "https://images.unsplash.com/photo-1594824813583-9b93226a2769?auto=format&fit=crop&w=150&q=80"}
                            alt={d.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-nutri-border shrink-0"
                          />
                          <div>
                            <div className="font-extrabold text-nutri-charcoal text-sm flex items-center gap-1.5">
                              {d.fullName}
                              {d.isVerified && (
                                <span title="Verified Professional">
                                  <ShieldCheck className="w-3.5 h-3.5 text-nutri-green" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-nutri-secondary font-medium">
                              {d.user?.email}
                            </div>
                            <div className="text-[10px] text-neutral-400 mt-0.5">
                              Registered: {new Date(d.user?.createdAt).toLocaleDateString("en-IN")}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-nutri-charcoal">{d.qualifications}</div>
                        <div className="text-[11px] text-nutri-secondary mt-0.5">
                          {d.experienceYears} yrs experience
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {d.specializations.slice(0, 3).map((spec, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full bg-nutri-bg border border-nutri-border text-[10px] font-semibold text-nutri-secondary"
                            >
                              {spec}
                            </span>
                          ))}
                          {d.specializations.length > 3 && (
                            <span className="text-[10px] text-neutral-400 self-center">
                              +{d.specializations.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-nutri-green text-xs">
                          ₹{d.consultationFee} / session
                        </div>
                        <div className="text-[10px] text-nutri-secondary capitalize mt-0.5">
                          {d.availableFormats.join(", ").toLowerCase()}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          {d._count.consultations} appts • {d._count.dietPlans} plans
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {d.verificationStatus === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#EAF4E3] text-[#2F7D16] border border-[#2F7D16]/30">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : d.verificationStatus === "PENDING" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Pending Review
                          </span>
                        ) : d.verificationStatus === "SUSPENDED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedDietitian(d)}
                            className="p-1.5 rounded-lg border border-nutri-border bg-white hover:bg-neutral-50 text-nutri-secondary hover:text-nutri-charcoal transition-colors cursor-pointer"
                            title="View Full Profile Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {d.verificationStatus === "PENDING" && (
                            <>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleStatusUpdate(d.id, "APPROVED")}
                                className="px-2.5 py-1 rounded-lg bg-nutri-green text-white text-[11px] font-bold hover:bg-nutri-green-dark transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {isUpdating ? "..." : "Approve & Verify"}
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleStatusUpdate(d.id, "REJECTED")}
                                className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-bold hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {d.verificationStatus === "APPROVED" && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleStatusUpdate(d.id, "SUSPENDED")}
                              className="px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[11px] font-bold hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          )}

                          {(d.verificationStatus === "SUSPENDED" || d.verificationStatus === "REJECTED") && (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleStatusUpdate(d.id, "APPROVED")}
                              className="px-2.5 py-1 rounded-lg bg-nutri-green text-white text-[11px] font-bold hover:bg-nutri-green-dark transition-colors cursor-pointer disabled:opacity-50"
                            >
                              Re-Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Profile Details Modal */}
      {selectedDietitian && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl border border-nutri-border">
            <div className="flex items-start justify-between border-b border-nutri-border pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedDietitian.profileImageUrl || "https://images.unsplash.com/photo-1594824813583-9b93226a2769?auto=format&fit=crop&w=150&q=80"}
                  alt={selectedDietitian.fullName}
                  className="w-14 h-14 rounded-2xl object-cover border border-nutri-border shrink-0"
                />
                <div>
                  <h3 className="text-xl font-extrabold font-heading text-nutri-charcoal flex items-center gap-2">
                    {selectedDietitian.fullName}
                    {selectedDietitian.isVerified && (
                      <Badge className="bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]/30 text-[10px]">
                        Verified Professional
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-nutri-secondary">{selectedDietitian.qualifications}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{selectedDietitian.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDietitian(null)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-nutri-charcoal cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-nutri-bg border border-nutri-border">
                <span className="text-[10px] font-bold text-nutri-secondary uppercase block">Experience</span>
                <span className="text-sm font-extrabold text-nutri-charcoal mt-0.5 block">{selectedDietitian.experienceYears} Years</span>
              </div>
              <div className="p-3 rounded-2xl bg-nutri-bg border border-nutri-border">
                <span className="text-[10px] font-bold text-nutri-secondary uppercase block">Consultation Fee</span>
                <span className="text-sm font-extrabold text-nutri-green mt-0.5 block">₹{selectedDietitian.consultationFee}</span>
              </div>
              <div className="p-3 rounded-2xl bg-nutri-bg border border-nutri-border">
                <span className="text-[10px] font-bold text-nutri-secondary uppercase block">Mode</span>
                <span className="text-sm font-extrabold text-nutri-charcoal mt-0.5 block capitalize">{selectedDietitian.availableFormats.join(", ").toLowerCase()}</span>
              </div>
            </div>

            {selectedDietitian.bio && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-nutri-secondary mb-1">Professional Bio</h4>
                <p className="text-xs text-nutri-charcoal leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  {selectedDietitian.bio}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-nutri-secondary mb-1.5">Specializations</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedDietitian.specializations.map((spec, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-nutri-green-light text-nutri-green border border-nutri-border text-xs font-semibold">
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-nutri-secondary mb-1.5">Languages</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedDietitian.languages.map((lang, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold">
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-nutri-border">
              <div className="text-xs text-nutri-secondary font-medium">
                Current Status: <span className="font-bold text-nutri-charcoal">{selectedDietitian.verificationStatus}</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedDietitian.verificationStatus !== "APPROVED" && (
                  <button
                    onClick={() => handleStatusUpdate(selectedDietitian.id, "APPROVED")}
                    className="px-4 py-2 rounded-xl bg-nutri-green text-white text-xs font-bold hover:bg-nutri-green-dark transition-colors cursor-pointer"
                  >
                    Approve &amp; Verify Credentials
                  </button>
                )}
                {selectedDietitian.verificationStatus === "APPROVED" && (
                  <button
                    onClick={() => handleStatusUpdate(selectedDietitian.id, "SUSPENDED")}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors cursor-pointer"
                  >
                    Suspend Dietitian
                  </button>
                )}
                <button
                  onClick={() => setSelectedDietitian(null)}
                  className="px-4 py-2 rounded-xl border border-nutri-border text-nutri-secondary hover:text-nutri-charcoal text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
